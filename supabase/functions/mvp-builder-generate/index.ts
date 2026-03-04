import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAndDeductCredits, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key",
};

// ── System prompts ──────────────────────────────────────────────────────────

const GENERATE_SYSTEM_PROMPT = `You are an expert full-stack web developer and UX designer specialising in building beautiful, functional web applications.

Your task is to generate a COMPLETE, self-contained HTML file that implements exactly what the user describes.

STRICT RULES:
1. Output ONE file: valid HTML with embedded <style> and <script> blocks.
2. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
3. Use Chart.js via CDN if the user needs charts: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
4. Persist data with localStorage — no backend required.
5. Mobile-responsive layout with CSS Grid / Flexbox.
6. Professional design: clean typography, clear hierarchy, subtle shadows, smooth micro-animations.
7. Hover states and focus styles for all interactive elements.
8. Graceful empty states when there is no data yet.
9. Fully functional — every button and form must do something.
10. Do NOT include any markdown fences, code blocks, or explanatory text OUTSIDE the <html-output> tags.

RESPONSE FORMAT:
- First write a ONE-sentence description of what you built (plain text, no markdown).
- Then immediately output the full HTML wrapped EXACTLY like this (no extra whitespace before/after):
<html-output>
<!DOCTYPE html>
...complete HTML file...
</html>
</html-output>`;

const REFINE_SYSTEM_PROMPT = `You are an expert web developer refining an existing web application.

The user will describe a change. Your job:
1. Understand EXACTLY what they want to add, change, or remove.
2. Make ONLY the requested change — preserve all other functionality unchanged.
3. Keep the same overall design language unless the user asks otherwise.
4. Maintain localStorage key compatibility (don't rename keys).
5. The app must still be complete and self-contained after your edit.

RESPONSE FORMAT:
- First write a ONE-sentence summary of the change you made (plain text).
- Then immediately output the FULL updated HTML wrapped EXACTLY like this:
<html-output>
<!DOCTYPE html>
...complete updated HTML file...
</html>
</html-output>`;

// ── HTML extraction ─────────────────────────────────────────────────────────

function extractHtml(fullText: string): string | null {
  const start = fullText.indexOf("<html-output>");
  const end = fullText.indexOf("</html-output>");
  if (start === -1 || end === -1) return null;
  return fullText.slice(start + "<html-output>".length, end).trim();
}

function extractExplanation(fullText: string): string {
  const start = fullText.indexOf("<html-output>");
  const raw = start > 0 ? fullText.slice(0, start).trim() : fullText.trim();
  // Remove any stray markdown fences
  return raw.replace(/```[\s\S]*?```/g, "").trim();
}

// ── SSE helpers ─────────────────────────────────────────────────────────────

function enc(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

function encDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

function errorStream(message: string, errorCode?: string): Response {
  const body = new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(enc({ type: "error", error: message, errorCode }));
      ctrl.enqueue(encDone());
      ctrl.close();
    },
  });
  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!anthropicKey) {
    return errorStream("ANTHROPIC_API_KEY not configured", "CONFIGURATION_ERROR");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Parse request ──────────────────────────────────────────────────────

  let userMessage: string;
  let currentHtml: string | null;
  let conversationHistory: Array<{ role: string; content: string }>;
  let userId: string | null;

  try {
    const body = await req.json();
    userMessage = body.userMessage ?? "";
    currentHtml = body.currentHtml ?? null;
    conversationHistory = Array.isArray(body.conversationHistory)
      ? body.conversationHistory
      : [];
    userId = body.userId ?? null;
  } catch {
    return errorStream("Invalid request body", "BAD_REQUEST");
  }

  if (!userMessage.trim()) {
    return errorStream("userMessage is required", "BAD_REQUEST");
  }

  // ── Credit deduction ───────────────────────────────────────────────────

  const isFirstGeneration = currentHtml === null;
  const creditFeature = isFirstGeneration ? "APP_BUILDER_GENERATE" : "APP_BUILDER_REFINE";
  const creditCost = isFirstGeneration
    ? CREDIT_COSTS.APP_BUILDER_GENERATE
    : CREDIT_COSTS.APP_BUILDER_REFINE;

  if (userId) {
    const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
    const creditCheck = await checkAndDeductCredits(
      userId,
      creditCost,
      creditFeature,
      undefined,
      { idempotencyKey }
    );

    if (!creditCheck.success) {
      return errorStream(
        creditCheck.errorCode === "INSUFFICIENT_CREDITS"
          ? `You need ${creditCost} credits to use the AI App Builder. Please upgrade your plan or purchase more credits.`
          : "Unable to process credits. Please try again.",
        creditCheck.errorCode
      );
    }
  }

  // ── Build messages for Anthropic ───────────────────────────────────────

  const systemPrompt = isFirstGeneration
    ? GENERATE_SYSTEM_PROMPT
    : REFINE_SYSTEM_PROMPT;

  // Keep last 6 turns for context (3 user + 3 assistant)
  const recentHistory = conversationHistory.slice(-6).map((m) => ({
    role: m.role === "user" ? "user" : ("assistant" as "user" | "assistant"),
    content: m.content,
  }));

  // For refinements, inject the current HTML as context
  let userContent = userMessage;
  if (!isFirstGeneration && currentHtml) {
    userContent =
      `Here is the current app code:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nUser request: ${userMessage}`;
  }

  const messages = [
    ...recentHistory,
    { role: "user" as const, content: userContent },
  ];

  // ── Stream from Anthropic ──────────────────────────────────────────────

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      temperature: 0.3,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("Anthropic API error:", anthropicRes.status, errText);

    // Refund credits on API failure
    if (userId) {
      await refundCredits(userId, creditCost, creditFeature, "Anthropic API error").catch(
        () => {}
      );
    }

    return errorStream(
      "AI service temporarily unavailable. Credits have been refunded. Please try again.",
      "AI_ERROR"
    );
  }

  // ── Proxy Anthropic SSE → our SSE format ──────────────────────────────

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const reader = anthropicRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = ""; // accumulate to extract HTML at end

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          if (
            event.type === "content_block_delta" &&
            (event.delta as any)?.type === "text_delta"
          ) {
            const chunk = (event.delta as any).text as string;
            fullText += chunk;

            // Stream explanation text only (before <html-output> tag)
            const htmlStart = fullText.indexOf("<html-output>");
            if (htmlStart === -1) {
              // Still in explanation — stream the chunk
              await writer.write(enc({ type: "delta", content: chunk }));
            } else if (fullText.indexOf("<html-output>") > 0) {
              // We just crossed the boundary — stream any trailing explanation text
              const explanationChunk = chunk.slice(
                0,
                Math.max(0, htmlStart - (fullText.length - chunk.length))
              );
              if (explanationChunk) {
                await writer.write(enc({ type: "delta", content: explanationChunk }));
              }
              // Now in code territory — don't stream raw HTML tokens
            }
          }
        }
      }

      // ── Emit extracted HTML ────────────────────────────────────────────
      const html = extractHtml(fullText);
      const explanation = extractExplanation(fullText);

      if (html) {
        // Emit explanation as a complete message if we couldn't stream it incrementally
        if (!explanation && fullText.startsWith("<html-output>")) {
          await writer.write(enc({ type: "delta", content: "Your app is ready!" }));
        }
        await writer.write(enc({ type: "code", html }));
      } else {
        // No valid HTML found — treat entire response as explanation (shouldn't happen normally)
        console.warn("No <html-output> tag found in AI response");
        await writer.write(
          enc({
            type: "delta",
            content:
              "\n\n⚠️ The AI didn't return valid code. Please try rephrasing your prompt.",
          })
        );

        // Refund on bad output
        if (userId) {
          await refundCredits(
            userId,
            creditCost,
            creditFeature,
            "No HTML output generated"
          ).catch(() => {});
        }
      }

      await writer.write(enc({ type: "complete" }));
      await writer.write(encDone());
    } catch (err) {
      console.error("Stream processing error:", err);
      await writer.write(
        enc({ type: "error", error: "Stream interrupted. Please try again." })
      );
      await writer.write(encDone());

      if (userId) {
        await refundCredits(userId, creditCost, creditFeature, "Stream error").catch(
          () => {}
        );
      }
    } finally {
      await writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
