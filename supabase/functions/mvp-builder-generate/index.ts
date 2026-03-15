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

const GENERATE_SYSTEM_PROMPT = `You are an expert MVP web app builder focused on production-minded, editable code.

Your task is to generate a COMPLETE small web product for the user's idea as a structured project that can be previewed and manually edited.

STRICT RULES:
1. Return a project with real files. Default to static-html unless the user explicitly asks for React, Vite, Next, TSX, JSX, or a component-based framework architecture as the output format.
2. Prefer static-html for dashboards, landing pages, admin panels, SaaS tools, browser tools, internal tools, and MVP demos. These should normally ship as index.html + styles.css + app.js so the live preview works immediately.
3. Use react-vite only when the user explicitly asks for a React/Vite-style codebase. Use next-like only for client-side page/app router demos without server code.
4. React/Vite projects should include package.json, index.html, and a src/ entry (for example src/main.tsx and src/App.tsx). Next-like projects should include package.json and either app/page.tsx or pages/index.tsx.
5. Keep the code readable and trustworthy. Clear names, small functions, and only brief comments where necessary.
6. Persist meaningful user data with localStorage when useful.
7. Mobile-responsive layout with strong UX defaults, clear hierarchy, and accessible labels.
8. Every button, form, tab, and filter must do something real.
9. Include empty states, validation states, and at least basic success feedback.
10. Do not add backend code, shell scripts, or native dependencies. Keep everything client-side and previewable.
11. If there is any doubt, choose static-html over a framework so the product can preview immediately.
12. Do NOT wrap the JSON in markdown fences.

RESPONSE FORMAT:
- First write a short plain-text "MVP Snapshot" with EXACTLY these 4 lines:
MVP Snapshot: <one sentence product summary>
Core Features: <comma-separated feature list>
Primary Workflow: <one sentence user flow>
Next Iteration: <one sentence improvement suggestion>
- Then immediately output the full project wrapped EXACTLY like this:
<project-output>
{
  "projectName": "Short project name",
  "framework": "static-html",
  "projectType": "web-app",
  "entryFile": "index.html",
  "summary": "One-sentence summary of the generated product.",
  "dependencies": [
    { "name": "Browser APIs", "source": "browser", "purpose": "Core interactions" }
  ],
  "files": [
    { "path": "index.html", "content": "<!DOCTYPE html>..." },
    { "path": "styles.css", "content": "..." },
    { "path": "app.js", "content": "..." }
  ]
}
</project-output>`;

const REFINE_SYSTEM_PROMPT = `You are an expert MVP web app builder refining an existing project.

The user will describe a change. Your job:
1. Understand EXACTLY what they want to add, change, or remove.
2. Make ONLY the requested change unless the current code is broken and needs a minimal fix to support it.
3. Preserve file paths, localStorage keys, and working functionality whenever possible.
4. Return the FULL updated project, not a partial patch.
5. Preserve the current framework only when it is already preview-safe or the user explicitly asks to keep it. If the current project uses TSX, JSX, module entrypoints, React, Vite, or Next-style files and the user did not explicitly ask for that framework, migrate it to static-html so it previews reliably.
 6. Keep the code easy to trust and edit manually.

RESPONSE FORMAT:
- First write a short plain-text "Update Summary" with EXACTLY these 3 lines:
Change Applied: <one sentence summary>
What Stayed Stable: <one sentence summary>
How to Prompt Next: <one sentence suggestion>
- Then immediately output the FULL updated project wrapped EXACTLY like this:
<project-output>
{
  "projectName": "Short project name",
    "framework": "static-html",
    "projectType": "web-app",
    "entryFile": "index.html",
    "summary": "One-sentence summary of the generated product.",
    "dependencies": [],
    "files": [
      { "path": "index.html", "content": "<!DOCTYPE html>..." },
      { "path": "styles.css", "content": "..." },
      { "path": "app.js", "content": "..." }
    ]
  }
  </project-output>`;

// ── HTML extraction ─────────────────────────────────────────────────────────

function extractHtml(fullText: string): string | null {
  const start = fullText.indexOf("<html-output>");
  const end = fullText.indexOf("</html-output>");
  if (start === -1 || end === -1) return null;
  return fullText.slice(start + "<html-output>".length, end).trim();
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
  const candidates = [projectStart, htmlStart].filter((value) => value >= 0);
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

async function requestModelCompletion(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(AI_GATEWAY_URL, {
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
        max_tokens: 2400,
        stream: false,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((part: Record<string, unknown>) =>
          typeof part?.text === "string" ? part.text : ""
        )
        .join("")
        .trim();
    }
    return null;
  } catch {
    return null;
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
  } catch {
    return errorStream("Invalid request body", "BAD_REQUEST");
  }

  const selectedModels = normalizeSelectedModels(selectedModelsRaw);

  if (!userMessage.trim()) {
    return errorStream("userMessage is required", "BAD_REQUEST");
  }

  // ── Credit deduction ───────────────────────────────────────────────────

  const hasExistingProject =
    Boolean(currentProject) &&
    Array.isArray(currentProject?.files) &&
    currentProject!.files!.length > 0;
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
      ? "Preferred framework: static-html. Keep the project directly previewable with plain HTML, CSS, and browser JavaScript. If the current project uses TSX, JSX, or module bundling, convert it to static-html."
      : `Preferred framework: ${preferredFramework}. Only use this framework because the user explicitly asked for it. Keep the output client-side and previewable.`
    : "";
  if (!isFirstGeneration && currentProject) {
    userContent =
      `Current project files (edit this exact project):\n<project-source>\n${JSON.stringify(
        currentProject,
        null,
        2
      )}\n</project-source>\n\n${projectTypeInstruction}\n${frameworkInstruction}\n\nUser request:\n${userMessage}`;
  } else if (projectTypeInstruction || frameworkInstruction) {
    userContent = `${projectTypeInstruction}\n${frameworkInstruction}\n\nUser request:\n${userMessage}`;
  }

  // Resolve selected model set (single or multi-model combo)
  const textCapableModels = selectedModels.filter((model) =>
    HTML_CAPABLE_MODEL_SET.has(model)
  );
  const skippedImageModels = selectedModels.filter(
    (model) => !HTML_CAPABLE_MODEL_SET.has(model)
  );
  const requestedPrimaryModel = textCapableModels[0] ?? DEFAULT_MODEL;
  const advisorModels = textCapableModels.slice(1, MAX_COMBO_MODELS);

  // For multi-model mode, gather concise advisor notes and inject into final request context.
  if (advisorModels.length > 0) {
    const advisorMessages = [
      ...recentHistory,
      { role: "user" as const, content: userContent },
    ];
    const advisorOutputs = await Promise.all(
      advisorModels.map(async (model) => {
        const raw = await requestModelCompletion(
          lovableApiKey,
          model,
          systemPrompt,
          advisorMessages
        );
        if (!raw) return null;
        const explanation = extractExplanation(raw) || raw;
        return `Advisor (${model}): ${explanation.slice(0, 1200)}`;
      })
    );

    const advisorNotes = advisorOutputs.filter(
      (note): note is string => typeof note === "string" && note.length > 0
    );
    if (advisorNotes.length > 0) {
      userContent +=
        `\n\nMulti-model collaboration notes:\n` +
        advisorNotes.join("\n\n") +
        `\n\nUse these notes if useful, then produce a single final result using the required response format.`;
    }
  }

  if (skippedImageModels.length > 0) {
    userContent +=
      `\n\nImage-focused models selected: ${skippedImageModels.join(", ")}.` +
      ` Prioritize stronger visual polish and image-friendly layout decisions while still returning a full static project.`;
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
    let streamedExplanationUntil = 0;
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
            const beforeLength = fullText.length;
            const previousProjectStart = fullText.indexOf("<project-output>");
            const previousHtmlStart = fullText.indexOf("<html-output>");
            const previousBoundaryCandidates = [previousProjectStart, previousHtmlStart].filter(
              (value) => value >= 0
            );
            const previousBoundary =
              previousBoundaryCandidates.length > 0
                ? Math.min(...previousBoundaryCandidates)
                : beforeLength;

            const nextText = fullText + content;
            const nextProjectStart = nextText.indexOf("<project-output>");
            const nextHtmlStart = nextText.indexOf("<html-output>");
            const nextBoundaryCandidates = [nextProjectStart, nextHtmlStart].filter(
              (value) => value >= 0
            );
            const nextBoundary =
              nextBoundaryCandidates.length > 0
                ? Math.min(...nextBoundaryCandidates)
                : nextText.length;

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

      const project = extractProject(fullText);
      const explanation = extractExplanation(fullText);

      if (project) {
        if (!explanation.trim()) {
          await writer.write(enc({ type: "delta", content: "Your MVP is ready." }));
        }
        await writer.write(enc({ type: "project", project }));
      } else {
        console.warn("No <project-output> or <html-output> tag found in AI response");
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
