import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndDeductCredits, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash";
const FALLBACK_MODEL = "google/gemini-2.5-flash";

// ── System prompts ──────────────────────────────────────────────────────────

const GENERATE_SYSTEM_PROMPT = `You are an expert MVP web app builder focused on speed, clarity, and usability.

Your task is to generate a COMPLETE, self-contained HTML file for the user's product idea, features, and workflow.

STRICT RULES:
1. Output ONE file: valid HTML with embedded <style> and <script> blocks.
2. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
3. Use Chart.js via CDN if the user needs charts: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
4. Persist data with localStorage — no backend required.
5. Mobile-responsive layout with CSS Grid / Flexbox.
6. Professional design: clean typography, clear hierarchy, subtle shadows.
7. Hover states and focus styles for all interactive elements.
8. Graceful empty states when there is no data yet.
9. Fully functional — every button and form must do something.
10. Prioritize fast runtime and simple implementation: lightweight JavaScript and clear UI labels.
11. Do NOT include markdown fences or extra wrapper tags around the HTML output.

RESPONSE FORMAT:
- First write a short plain-text "MVP Snapshot" with EXACTLY these 4 lines:
MVP Snapshot: <one sentence product summary>
Core Features: <comma-separated feature list>
Primary Workflow: <one sentence user flow>
Next Iteration: <one sentence improvement suggestion>
- Then immediately output the full HTML wrapped EXACTLY like this:
<html-output>
<!DOCTYPE html>
...complete HTML file...
</html>
</html-output>`;

const REFINE_SYSTEM_PROMPT = `You are an expert MVP web app builder refining an existing app.

The user will describe a change. Your job:
1. Understand EXACTLY what they want to add, change, or remove.
2. Make ONLY the requested change — preserve all other functionality unchanged.
3. Keep the same overall design language unless the user asks otherwise.
4. Maintain localStorage key compatibility (don't rename keys).
5. The app must still be complete and self-contained after your edit.
6. Keep implementation lightweight and easy to iterate.

RESPONSE FORMAT:
- First write a short plain-text "Update Summary" with EXACTLY these 3 lines:
Change Applied: <one sentence summary>
What Stayed Stable: <one sentence summary>
How to Prompt Next: <one sentence suggestion>
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

async function requestModelStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<Response> {
  return fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.2,
      max_tokens: 7000,
      stream: true,
    }),
  });
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!lovableApiKey) {
    return errorStream("LOVABLE_API_KEY not configured", "CONFIGURATION_ERROR");
  }

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

  // ── Build messages for model call ──────────────────────────────────────

  const systemPrompt = isFirstGeneration
    ? GENERATE_SYSTEM_PROMPT
    : REFINE_SYSTEM_PROMPT;

  // Keep last 4 turns for speed-focused context (2 user + 2 assistant)
  const recentHistory = conversationHistory.slice(-4).map((m) => ({
    role: m.role === "user" ? "user" : ("assistant" as "user" | "assistant"),
    content: m.content,
  }));

  // For refinements, inject the current HTML as context
  let userContent = userMessage;
  if (!isFirstGeneration && currentHtml) {
    userContent =
      `Current app HTML (edit this exact app):\n<html-source>\n${currentHtml}\n</html-source>\n\nUser request:\n${userMessage}`;
  }

  const messages = [
    ...recentHistory,
    { role: "user" as const, content: userContent },
  ];

  // ── Stream from AI gateway (Gemini 3 Flash default) ───────────────────
  let selectedModel = DEFAULT_MODEL;
  let aiResponse: Response;
  try {
    aiResponse = await requestModelStream(
      lovableApiKey,
      selectedModel,
      systemPrompt,
      messages
    );
  } catch (err) {
    console.error("AI gateway request failed:", err);
    if (userId) {
      await refundCredits(userId, creditCost, creditFeature, "AI gateway request failed").catch(
        () => {}
      );
    }
    return errorStream(
      "AI service temporarily unavailable. Credits have been refunded. Please try again.",
      "AI_ERROR"
    );
  }

  if (!aiResponse.ok) {
    const primaryErr = await aiResponse.text();
    console.error("AI gateway primary model error:", aiResponse.status, primaryErr);

    selectedModel = FALLBACK_MODEL;
    try {
      aiResponse = await requestModelStream(
        lovableApiKey,
        selectedModel,
        systemPrompt,
        messages
      );
    } catch (err) {
      console.error("AI gateway fallback request failed:", err);
      if (userId) {
        await refundCredits(
          userId,
          creditCost,
          creditFeature,
          "AI gateway fallback request failed"
        ).catch(() => {});
      }
      return errorStream(
        "AI service temporarily unavailable. Credits have been refunded. Please try again.",
        "AI_ERROR"
      );
    }
  }

  if (!aiResponse.ok) {
    const fallbackErr = await aiResponse.text();
    console.error("AI gateway fallback model error:", aiResponse.status, fallbackErr);

    if (userId) {
      await refundCredits(
        userId,
        creditCost,
        creditFeature,
        "AI gateway error (primary + fallback)"
      ).catch(() => {});
    }

    return errorStream(
      "AI service temporarily unavailable. Credits have been refunded. Please try again.",
      "AI_ERROR"
    );
  }

  // ── Proxy gateway SSE → our SSE format ────────────────────────────────

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const reader = aiResponse.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let streamedExplanationUntil = 0;

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

          const chunk = (event.choices as Array<Record<string, unknown>> | undefined)?.[0]
            ?.delta as Record<string, unknown> | undefined;
          const content = chunk?.content;

          if (typeof content === "string" && content) {
            const beforeLength = fullText.length;
            const previousHtmlStart = fullText.indexOf("<html-output>");
            const previousBoundary =
              previousHtmlStart === -1 ? beforeLength : previousHtmlStart;

            const nextText = fullText + content;
            const nextHtmlStart = nextText.indexOf("<html-output>");
            const nextBoundary = nextHtmlStart === -1 ? nextText.length : nextHtmlStart;

            if (nextBoundary > previousBoundary) {
              const explanationChunk = nextText.slice(previousBoundary, nextBoundary);
              if (explanationChunk) {
                await writer.write(enc({ type: "delta", content: explanationChunk }));
              }
            } else if (nextBoundary > streamedExplanationUntil) {
              const explanationChunk = nextText.slice(streamedExplanationUntil, nextBoundary);
              if (explanationChunk) {
                await writer.write(enc({ type: "delta", content: explanationChunk }));
              }
            }

            fullText = nextText;
            streamedExplanationUntil = nextBoundary;
          } else if (
            typeof event.error === "object" &&
            event.error !== null &&
            typeof (event.error as Record<string, unknown>).message === "string"
          ) {
            throw new Error((event.error as Record<string, unknown>).message as string);
          } else if (typeof event.error === "string") {
            throw new Error(event.error);
          }
        }
      }

      const html = extractHtml(fullText);
      const explanation = extractExplanation(fullText);

      if (html) {
        if (!explanation.trim()) {
          await writer.write(enc({ type: "delta", content: "Your MVP is ready." }));
        }
        await writer.write(enc({ type: "code", html }));
      } else {
        console.warn("No <html-output> tag found in AI response");
        await writer.write(
          enc({
            type: "delta",
            content:
              "\n\n⚠️ The AI didn't return valid code. Please try rephrasing your prompt.",
          })
        );

        if (userId) {
          await refundCredits(
            userId,
            creditCost,
            creditFeature,
            "No HTML output generated"
          ).catch(() => {});
        }
      }

      await writer.write(enc({ type: "complete", model: selectedModel }));
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
