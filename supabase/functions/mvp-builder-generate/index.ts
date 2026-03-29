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
const MAX_COMBO_MODELS = 4;
const SUPPORTED_MODELS = [
  "google/gemini-3-flash",
  "google/gemini-3-pro",
  "google/nano-banana-pro",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash-image",
  "openai/gpt-5.2",
  "openai/gpt-5-2025-08-07",
  "openai/gpt-5-mini-2025-08-07",
  "openai/gpt-5-nano-2025-08-07",
] as const;
const SUPPORTED_MODEL_SET = new Set<string>(SUPPORTED_MODELS);
const HTML_CAPABLE_MODEL_SET = new Set<string>([
  "google/gemini-3-flash",
  "google/gemini-3-pro",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5.2",
  "openai/gpt-5-2025-08-07",
  "openai/gpt-5-mini-2025-08-07",
  "openai/gpt-5-nano-2025-08-07",
]);

// ── System prompts ──────────────────────────────────────────────────────────

const GENERATE_SYSTEM_PROMPT = `You are a senior product engineer building a polished MVP preview.

Return only a single self-contained HTML document with inline CSS and inline JavaScript.

Strict rules:
1. Output code only. No markdown fences, no commentary, no explanations, no labels.
2. The response must be a complete HTML document starting with <!DOCTYPE html>.
3. Inline all CSS inside <style> and all JavaScript inside <script>.
4. Make the experience feel premium, fast, and production-minded.
5. Every interactive control must do something real.
6. Use accessible labels, responsive layout, and sensible empty/loading/success states.
7. Persist useful user-facing state with localStorage when appropriate.
8. Do not rely on a backend or build step. Everything must run in the browser as-is.
9. Prefer small, readable vanilla JavaScript over framework code.
10. If the prompt is ambiguous, make strong product decisions and ship a coherent first version.`;

const REFINE_SYSTEM_PROMPT = `You are a senior product engineer refining an existing MVP preview.

You will receive the current HTML document and a follow-up request.

Strict rules:
1. Return only the full updated HTML document. No markdown fences, no commentary, no explanations.
2. Preserve the existing working structure unless the user explicitly requests a different direction.
3. Make only the requested changes plus any minimal fixes required to keep the product coherent.
4. Keep the output as a single self-contained HTML document with inline CSS and inline JavaScript.
5. Preserve user-facing functionality and localStorage keys whenever reasonable.
6. The response must be a complete HTML document starting with <!DOCTYPE html>.`;

// ── HTML extraction ─────────────────────────────────────────────────────────

function extractHtml(fullText: string): string | null {
  const start = fullText.indexOf("<html-output>");
  const end = fullText.indexOf("</html-output>");
  if (start !== -1 && end !== -1) {
    return fullText.slice(start + "<html-output>".length, end).trim();
  }

  const cleaned = fullText
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const doctypeIndex = cleaned.search(/<!doctype html>/i);
  if (doctypeIndex >= 0) {
    return cleaned.slice(doctypeIndex).trim();
  }
  const htmlIndex = cleaned.search(/<html[\s>]/i);
  if (htmlIndex >= 0) {
    return cleaned.slice(htmlIndex).trim();
  }
  return cleaned.startsWith("<") ? cleaned : null;
}

function normalizeProjectPath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .split("/")
    .reduce<string[]>((parts, segment) => {
      if (!segment || segment === ".") return parts;
      if (segment === "..") {
        parts.pop();
        return parts;
      }
      parts.push(segment);
      return parts;
    }, [])
    .join("/");
}

function extractProjectJson(fullText: string): string | null {
  const start = fullText.indexOf("<project-output>");
  const end = fullText.indexOf("</project-output>");
  if (start === -1 || end === -1) return null;
  return fullText.slice(start + "<project-output>".length, end).trim();
}

function buildLegacyProjectFromHtml(html: string) {
  return {
    projectName: "Generated App",
    framework: "static-html",
    projectType: "web-app",
    entryFile: "index.html",
    summary: "Generated with MVP Builder.",
    dependencies: [],
    files: [
      {
        path: "index.html",
        content: html,
      },
    ],
  };
}

function extractProject(fullText: string) {
  const rawProject = extractProjectJson(fullText);

  if (rawProject) {
    try {
      const parsed = JSON.parse(rawProject) as {
        projectName?: unknown;
        framework?: unknown;
        projectType?: unknown;
        entryFile?: unknown;
        summary?: unknown;
        dependencies?: Array<{
          name?: unknown;
          source?: unknown;
          version?: unknown;
          url?: unknown;
          purpose?: unknown;
        }>;
        files?: Array<{ path?: unknown; content?: unknown }>;
      };

      const files = Array.isArray(parsed.files)
        ? parsed.files
            .map((file) => {
              if (typeof file?.path !== "string" || typeof file?.content !== "string") {
                return null;
              }
              return {
                path: normalizeProjectPath(file.path),
                content: file.content,
              };
            })
            .filter((file): file is { path: string; content: string } => Boolean(file && file.path))
        : [];

      if (files.length > 0) {
        return {
          projectName:
            typeof parsed.projectName === "string" && parsed.projectName.trim()
              ? parsed.projectName.trim()
              : "Generated App",
          framework:
            parsed.framework === "react-vite" ||
            parsed.framework === "next-like" ||
            parsed.framework === "code-only"
              ? parsed.framework
              : "static-html",
          projectType:
            parsed.projectType === "landing-page" ||
            parsed.projectType === "dashboard" ||
            parsed.projectType === "marketplace" ||
            parsed.projectType === "directory" ||
            parsed.projectType === "internal-tool"
              ? parsed.projectType
              : "web-app",
          entryFile:
            typeof parsed.entryFile === "string" && parsed.entryFile.trim()
              ? normalizeProjectPath(parsed.entryFile)
              : files[0].path,
          summary:
            typeof parsed.summary === "string" && parsed.summary.trim()
              ? parsed.summary.trim()
              : "Generated with MVP Builder.",
          dependencies: Array.isArray(parsed.dependencies)
            ? parsed.dependencies
                .map((dependency) => {
                  if (typeof dependency?.name !== "string" || !dependency.name.trim()) {
                    return null;
                  }
                  return {
                    name: dependency.name.trim(),
                    source:
                      dependency.source === "cdn"
                        ? "cdn"
                        : dependency.source === "npm"
                        ? "npm"
                        : "browser",
                    version:
                      typeof dependency.version === "string" && dependency.version.trim()
                        ? dependency.version.trim()
                        : undefined,
                    url:
                      typeof dependency.url === "string" && dependency.url.trim()
                        ? dependency.url.trim()
                        : undefined,
                    purpose:
                      typeof dependency.purpose === "string" && dependency.purpose.trim()
                        ? dependency.purpose.trim()
                        : undefined,
                  };
                })
                .filter(Boolean)
            : [],
          files,
        };
      }
    } catch {
      // fall back to legacy html extraction below
    }
  }

  const html = extractHtml(fullText);
  return html ? buildLegacyProjectFromHtml(html) : null;
}

function extractExplanation(fullText: string): string {
  const projectStart = fullText.indexOf("<project-output>");
  const htmlStart = fullText.indexOf("<html-output>");
  const doctypeStart = fullText.search(/<!doctype html>/i);
  const htmlDocumentStart = fullText.search(/<html[\s>]/i);
  const candidates = [projectStart, htmlStart].filter((value) => value >= 0);
  if (doctypeStart >= 0) candidates.push(doctypeStart);
  if (htmlDocumentStart >= 0) candidates.push(htmlDocumentStart);
  const start = candidates.length > 0 ? Math.min(...candidates) : -1;
  const raw = start > 0 ? fullText.slice(0, start).trim() : fullText.trim();
  // Remove any stray markdown fences
  return raw.replace(/```[\s\S]*?```/g, "").trim();
}

function normalizeSelectedModels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [DEFAULT_MODEL];
  const unique = Array.from(
    new Set(raw.filter((item): item is string => typeof item === "string"))
  )
    .filter((model) => SUPPORTED_MODEL_SET.has(model))
    .slice(0, MAX_COMBO_MODELS);
  return unique.length > 0 ? unique : [DEFAULT_MODEL];
}

function getFallbackCandidates(primaryModel: string): string[] {
  const candidates = [primaryModel, DEFAULT_MODEL, FALLBACK_MODEL, "openai/gpt-5-mini-2025-08-07"];
  return Array.from(new Set(candidates));
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  try {
    return await fetch(AI_GATEWAY_URL, {
      method: "POST",
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeoutId);
  }
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
  let currentProject:
    | {
        projectName?: string;
        framework?: string;
        projectType?: string;
        entryFile?: string;
        summary?: string;
        dependencies?: Array<{
          name?: string;
          source?: string;
          version?: string;
          url?: string;
          purpose?: string;
        }>;
        files?: Array<{ path?: string; content?: string }>;
      }
    | null;
  let conversationHistory: Array<{ role: string; content: string }>;
  let userId: string | null;
  let selectedModelsRaw: unknown;
  let preferredProjectType: string | null;
  let preferredFramework: string | null;
  let currentCode: string | null;

  try {
    const body = await req.json();
    userMessage = body.userMessage ?? "";
    currentProject = body.currentProject ?? null;
    conversationHistory = Array.isArray(body.conversationHistory)
      ? body.conversationHistory
      : [];
    userId = body.userId ?? null;
    selectedModelsRaw = body.selectedModels;
    preferredProjectType = typeof body.preferredProjectType === "string" ? body.preferredProjectType : null;
    preferredFramework = typeof body.preferredFramework === "string" ? body.preferredFramework : null;
    currentCode = typeof body.currentCode === "string" ? body.currentCode : null;
  } catch {
    return errorStream("Invalid request body", "BAD_REQUEST");
  }

  const selectedModels = normalizeSelectedModels(selectedModelsRaw);

  if (!userMessage.trim()) {
    return errorStream("userMessage is required", "BAD_REQUEST");
  }

  // ── Credit deduction ───────────────────────────────────────────────────

  const hasExistingProject =
    Boolean(currentCode?.trim()) ||
    (Boolean(currentProject) &&
      Array.isArray(currentProject?.files) &&
      currentProject!.files!.length > 0);
  const isFirstGeneration = !hasExistingProject;
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
  const projectTypeInstruction = preferredProjectType
    ? `Preferred project type: ${preferredProjectType}. Honor this unless the request strongly contradicts it.`
    : "";
  const frameworkInstruction = preferredFramework
    ? preferredFramework === "static-html"
      ? "Preferred framework: static-html. Keep the project directly previewable with plain HTML, inline CSS, and inline browser JavaScript."
      : `Preferred framework request: ${preferredFramework}. Even so, still return a single self-contained HTML document that captures the requested look and behavior.`
    : "";
  if (!isFirstGeneration && currentCode) {
    userContent =
      `${projectTypeInstruction}\n${frameworkInstruction}\n\nCurrent HTML (edit this exact build):\n<html-source>\n${currentCode}\n</html-source>\n\nUser request:\n${userMessage}`;
  } else if (!isFirstGeneration && currentProject) {
    userContent =
      `${projectTypeInstruction}\n${frameworkInstruction}\n\nCurrent project files:\n<project-source>\n${JSON.stringify(
        currentProject,
        null,
        2
      )}\n</project-source>\n\nUser request:\n${userMessage}`;
  } else if (projectTypeInstruction || frameworkInstruction) {
    userContent = `${projectTypeInstruction}\n${frameworkInstruction}\n\nUser request:\n${userMessage}`;
  }

  // Resolve selected model set
  const textCapableModels = selectedModels.filter((model) =>
    HTML_CAPABLE_MODEL_SET.has(model)
  );
  const skippedImageModels = selectedModels.filter(
    (model) => !HTML_CAPABLE_MODEL_SET.has(model)
  );
  const requestedPrimaryModel = textCapableModels[0] ?? DEFAULT_MODEL;

  if (skippedImageModels.length > 0) {
    userContent +=
      `\n\nImage-focused models selected: ${skippedImageModels.join(", ")}.` +
      ` Prioritize stronger visual polish and image-friendly layout decisions while still returning a single HTML document.`;
  }

  const messages = [
    ...recentHistory,
    { role: "user" as const, content: userContent },
  ];

  // ── Stream from AI gateway using requested primary, then fallback chain ─
  const modelCandidates = getFallbackCandidates(requestedPrimaryModel);
  let selectedModel = modelCandidates[0];
  let aiResponse: Response | null = null;

  for (const candidate of modelCandidates) {
    selectedModel = candidate;
    try {
      const attempt = await requestModelStream(
        lovableApiKey,
        candidate,
        systemPrompt,
        messages
      );
      if (attempt.ok) {
        aiResponse = attempt;
        break;
      }

      const errText = await attempt.text();
      console.error("AI gateway model attempt failed:", candidate, attempt.status, errText);
    } catch (err) {
      console.error("AI gateway request failed:", candidate, err);
    }
  }

  if (!aiResponse) {
    if (userId) {
      await refundCredits(
        userId,
        creditCost,
        creditFeature,
        "AI gateway error (all model attempts failed)"
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
    let sawDone = false;

    try {
      while (!sawDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            sawDone = true;
            break;
          }

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
            fullText += content;
            await writer.write(enc({ type: "code-delta", content }));
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

      const project = extractProject(fullText);

      if (project) {
        await writer.write(enc({ type: "project", project }));
      } else {
        console.warn("No HTML document found in AI response");
        await writer.write(
          enc({
            type: "error",
            error: "The AI did not return a valid HTML document. Please try rephrasing your prompt.",
          })
        );

        if (userId) {
          await refundCredits(
            userId,
            creditCost,
            creditFeature,
            "No project output generated"
          ).catch(() => {});
        }
      }

      await writer.write(
        enc({ type: "complete", model: selectedModel, requestedModels: selectedModels })
      );
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
