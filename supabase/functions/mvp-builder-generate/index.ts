import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndDeductCredits, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS, type CreditFeature } from "../_shared/credit-constants.ts";

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

type MVPBuilderActionType = "generation" | "targeted_edit" | "debug" | "add_page" | "add_feature" | "design_overhaul";
type MVPBuilderTemplateId = "waitlist_landing" | "saas_landing" | "community_landing" | "blank";
type MVPBuilderPaletteId = "minimal" | "bold" | "warm";

const ACTION_CONFIG: Record<MVPBuilderActionType, { feature: CreditFeature; temperature: number; maxTokens: number }> = {
  generation: { feature: "APP_BUILDER_GENERATE", temperature: 0.45, maxTokens: 22000 },
  targeted_edit: { feature: "APP_BUILDER_REFINE", temperature: 0.25, maxTokens: 14000 },
  debug: { feature: "APP_BUILDER_DEBUG", temperature: 0.15, maxTokens: 10000 },
  add_page: { feature: "APP_BUILDER_ADD_PAGE", temperature: 0.3, maxTokens: 16000 },
  add_feature: { feature: "APP_BUILDER_ADD_FEATURE", temperature: 0.35, maxTokens: 18000 },
  design_overhaul: { feature: "APP_BUILDER_DESIGN_OVERHAUL", temperature: 0.45, maxTokens: 18000 },
};

function getActionFeatureName(feature: CreditFeature): string {
  switch (feature) {
    case "APP_BUILDER_GENERATE":
      return "MVP Builder Generation";
    case "APP_BUILDER_REFINE":
      return "MVP Builder Refinement";
    case "APP_BUILDER_DEBUG":
      return "MVP Builder Bug Fix";
    case "APP_BUILDER_ADD_PAGE":
      return "MVP Builder Add Page";
    case "APP_BUILDER_ADD_FEATURE":
      return "MVP Builder Add Feature";
    case "APP_BUILDER_DESIGN_OVERHAUL":
      return "MVP Builder Design Overhaul";
    default:
      return "MVP Builder";
  }
}

const BASE_SYSTEM_PROMPT = `You are a senior full-stack developer specializing in building MVPs for early-stage startups. Your output is always complete, working, deployable code.

Return only valid JSON. No markdown fences, commentary, labels, XML tags, or trailing prose.

Core principles:
1. Complete output only. Every file must be complete and runnable. Never output partial files, placeholders, TODOs, or continuation markers.
2. Mobile-first, responsive UI. Desktop is an enhancement.
3. Clean, readable code with semantic HTML and accessible labels.
4. Real content only. Use the founder's product name, target audience, and pain language. Never use Lorem ipsum or bracket placeholders.
5. Production-ready defaults: title, meta description, OG tags, keyboard-friendly controls, and PostHog analytics initialization with the literal placeholder POSTHOG_KEY.
6. Phase 2 default is react_vite. Use a complete Vite + React project with package.json, index.html, src/main.tsx, src/App.tsx, and src/styles.css unless the user explicitly asks for a simple static HTML file.
7. Do not implement real backend/database/auth/payment code in this phase. If requested, create a polished mocked frontend UX and explain the mocked boundary in generation_notes.
8. Every generated app must track page_view on load, cta_clicked on primary CTAs, and form_submitted on forms through a small PostHog wrapper using the literal placeholder POSTHOG_KEY.

Output schema:
{
  "project_type": "react_vite",
  "files": [
    {
      "path": "package.json",
      "content": "complete file contents",
      "description": "one sentence describing the file"
    }
  ],
  "package_json": { "scripts": { "dev": "vite", "build": "vite build" }, "dependencies": {}, "devDependencies": {} },
  "dev_command": "npm run dev",
  "build_command": "npm run build",
  "preview_port": 5173,
  "setup_instructions": "plain-language steps for the founder to run the project locally",
  "posthog_events": [
    { "event_name": "page_view", "trigger": "when the page loads", "properties": "project metadata" }
  ],
  "generation_notes": "brief founder-friendly explanation of architectural decisions"
}`;

const TEMPLATE_REQUIREMENTS: Record<MVPBuilderTemplateId, string> = {
  waitlist_landing: `Template-specific requirements:
- Hero section: headline, subheadline, email capture form, primary CTA.
- Features section: 3 benefit cards derived from product context.
- Social proof section with a realistic waitlist number.
- Footer with product name, current year, and privacy policy link to #.
- Form submit shows inline thank-you state and logs form_submitted with source: hero_form.`,
  saas_landing: `Template-specific requirements:
- One-page SaaS landing page with sticky nav sections for Home, Features, Pricing, and FAQ.
- Hero, three feature cards, social proof, pricing CTA, 2-3 pricing cards, and FAQ.
- Navigation anchors must work in-page.`,
  community_landing: `Template-specific requirements:
- Hero with identity statement for the community.
- About/mission section, what members get, application form, FAQ, and three realistic testimonials.
- Form submit shows inline thank-you state and logs form_submitted.`,
  blank: `Template-specific requirements:
- Follow the founder's custom prompt while staying within React/Vite frontend-only Phase 2 limits.`,
};

const PALETTE_GUIDANCE: Record<MVPBuilderPaletteId, string> = {
  minimal: "Minimal palette: white/gray background, dark text, one calm accent such as slate blue or sage green.",
  bold: "Bold palette: high contrast, confident dark/light composition, strong accent such as electric blue or vibrant orange.",
  warm: "Warm palette: soft neutral background, warm accents such as terracotta or golden yellow, readable contrast.",
};

const FORBIDDEN_PATTERNS = [
  /lorem ipsum/i,
  /\[(?:insert|your|company|placeholder)[^\]]*\]/i,
  /todo:/i,
  /add your logic here/i,
  /rest of code here/i,
];

function enc(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

function encDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

function normalizeSelectedModels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [DEFAULT_MODEL];
  const unique = Array.from(new Set(raw.filter((item): item is string => typeof item === "string")))
    .filter((model) => SUPPORTED_MODEL_SET.has(model))
    .slice(0, MAX_COMBO_MODELS);
  return unique.length > 0 ? unique : [DEFAULT_MODEL];
}

function getFallbackCandidates(primaryModel: string): string[] {
  return Array.from(new Set([primaryModel, DEFAULT_MODEL, FALLBACK_MODEL, "openai/gpt-5-mini-2025-08-07"]));
}

function normalizeTemplate(value: unknown): MVPBuilderTemplateId {
  return value === "saas_landing" || value === "community_landing" || value === "blank"
    ? value
    : "waitlist_landing";
}

function normalizePalette(value: unknown): MVPBuilderPaletteId {
  return value === "bold" || value === "warm" ? value : "minimal";
}

function classifyAction(input: string, hasProject: boolean): MVPBuilderActionType | "unclear" | "unsupported" {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return "unclear";
  if (!hasProject) return "generation";
  if (/\b(error|bug|broken|fix|doesn'?t work|not working|console|crash)\b/.test(normalized)) return "debug";
  if (/\b(auth|database|supabase|stripe|payment|marketplace|backend|server action)\b/.test(normalized)) return "unsupported";
  if (/\b(add|create|build)\b.{0,40}\b(page|route|screen)\b|\b(new page|new route|another screen)\b/.test(normalized)) return "add_page";
  if (/\b(add|build|create|implement)\b.*\b(feature|flow|component|wizard|form|dashboard|table|chart|modal|settings)\b/.test(normalized)) return "add_feature";
  if (/\b(redesign|design overhaul|make it beautiful|modernize|visual refresh|new look|polish the design)\b/.test(normalized)) return "design_overhaul";
  return "targeted_edit";
}

function normalizeAction(value: unknown, userMessage: string, hasProject: boolean): MVPBuilderActionType | "unclear" | "unsupported" {
  if (
    value === "generation" ||
    value === "targeted_edit" ||
    value === "debug" ||
    value === "add_page" ||
    value === "add_feature" ||
    value === "design_overhaul"
  ) return value;
  return classifyAction(userMessage, hasProject);
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

function parseModelJson(fullText: string): unknown {
  const tagged = fullText.match(/<project-output>\s*([\s\S]*?)\s*<\/project-output>/i)?.[1];
  const cleaned = (tagged ?? fullText)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function validateOutput(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("Output must be a JSON object");
  const candidate = raw as Record<string, unknown>;
  if (candidate.project_type !== "html_single" && candidate.project_type !== "react_vite") {
    throw new Error("Output must use project_type html_single or react_vite");
  }
  if (!Array.isArray(candidate.files) || candidate.files.length === 0) throw new Error("Output must include files");

  const files = candidate.files.map((file, index) => {
    const item = file as Record<string, unknown>;
    const rawPath = typeof item.path === "string" ? item.path : item.filename;
    const filename = typeof rawPath === "string" ? normalizeProjectPath(rawPath) : "";
    const content = typeof item.content === "string" ? item.content : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!filename || !content.trim() || !description) {
      throw new Error(`File ${index + 1} is missing filename, content, or description`);
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) throw new Error(`File ${filename} contains placeholder or incomplete copy`);
    }
    return { filename, content, description };
  });

  if (candidate.project_type === "html_single") {
    const htmlFile = files.find((file) => file.filename.toLowerCase() === "index.html") ?? files.find((file) => file.filename.endsWith(".html"));
    if (!htmlFile) throw new Error("html_single output must include index.html or another HTML file");
    if (!/<title>[^<]+<\/title>/i.test(htmlFile.content)) throw new Error("HTML must include a title tag");
    if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(htmlFile.content)) throw new Error("HTML must include a meta description");
    for (const eventName of ["page_view", "cta_clicked", "form_submitted"]) {
      if (!htmlFile.content.includes(eventName)) throw new Error(`HTML must track ${eventName}`);
    }
  } else {
    const required = ["package.json", "index.html"];
    for (const path of required) {
      if (!files.some((file) => file.filename === path)) throw new Error(`react_vite output must include ${path}`);
    }
    const packageFile = files.find((file) => file.filename === "package.json");
    let packageJson: Record<string, unknown>;
    try {
      packageJson = JSON.parse(packageFile?.content ?? "");
    } catch {
      throw new Error("react_vite package.json must be valid JSON");
    }
    const deps = {
      ...((packageJson.dependencies as Record<string, unknown> | undefined) ?? {}),
      ...((packageJson.devDependencies as Record<string, unknown> | undefined) ?? {}),
    };
    if (!deps.react || !deps["react-dom"] || !deps.vite) {
      throw new Error("react_vite package.json must include react, react-dom, and vite");
    }
    if (!files.some((file) => /^(src\/)?main\.(tsx|jsx)$/.test(file.filename) && /createRoot|ReactDOM/.test(file.content))) {
      throw new Error("react_vite output must include a React main entry that mounts the app");
    }
    if (!files.some((file) => /^src\/App\.(tsx|jsx)$/.test(file.filename))) {
      throw new Error("react_vite output must include src/App.tsx or src/App.jsx");
    }
  }

  return {
    project_type: candidate.project_type,
    files,
    package_json: candidate.project_type === "react_vite"
      ? JSON.parse(files.find((file) => file.filename === "package.json")?.content ?? "{}")
      : undefined,
    dev_command: typeof candidate.dev_command === "string" && candidate.dev_command.trim() ? candidate.dev_command.trim() : "npm run dev",
    build_command: typeof candidate.build_command === "string" && candidate.build_command.trim() ? candidate.build_command.trim() : "npm run build",
    preview_port: typeof candidate.preview_port === "number" ? candidate.preview_port : 5173,
    setup_instructions:
      typeof candidate.setup_instructions === "string" && candidate.setup_instructions.trim()
        ? candidate.setup_instructions.trim()
        : "Open index.html in a browser or deploy it as a static site.",
    posthog_events: Array.isArray(candidate.posthog_events) ? candidate.posthog_events : [],
    generation_notes:
      typeof candidate.generation_notes === "string" && candidate.generation_notes.trim()
        ? candidate.generation_notes.trim()
        : "Generated a portable single-file MVP for fast validation.",
  };
}

function outputToProject(output: ReturnType<typeof validateOutput>, productName: string) {
  const reactEntry =
    output.files.find((file) => /^(src\/)?main\.(tsx|jsx)$/.test(file.filename))?.filename ??
    output.files.find((file) => /^(src\/)?main\.(ts|js)$/.test(file.filename))?.filename ??
    output.files.find((file) => file.filename === "index.html")?.filename ??
    output.files[0].filename;
  return {
    projectName: productName || "Generated MVP",
    framework: output.project_type === "react_vite" ? "react-vite" : "static-html",
    projectType: output.project_type === "react_vite" ? "web-app" : "landing-page",
    entryFile: reactEntry,
    summary: output.generation_notes,
    dependencies: [],
    files: output.files.map((file) => ({
      path: file.filename,
      content: file.content,
    })),
    phase1Output: output,
  };
}

function buildPrompt(params: {
  actionType: MVPBuilderActionType;
  userMessage: string;
  template: MVPBuilderTemplateId;
  palette: MVPBuilderPaletteId;
  setupInput: Record<string, unknown>;
  projectContext: Record<string, unknown> | null;
  currentProject: unknown;
}) {
  const setup = params.setupInput || {};
  const productName = typeof setup.productName === "string" ? setup.productName : "Untitled MVP";
  const oneLineDescription = typeof setup.oneLineDescription === "string" ? setup.oneLineDescription : params.userMessage;
  const problem = typeof setup.validatedProblemStatement === "string" ? setup.validatedProblemStatement : "";
  const audience = typeof setup.validatedTargetSegment === "string" ? setup.validatedTargetSegment : "";
  const painLanguage = typeof setup.keyPainLanguage === "string" ? setup.keyPainLanguage : "";
  const tagline = typeof setup.existingTagline === "string" ? setup.existingTagline : "";
  const customPrompt = typeof setup.customPrompt === "string" ? setup.customPrompt : params.userMessage;

  if (params.actionType === "generation") {
    return `Generate a complete ${params.template} application for the following product.

PRODUCT CONTEXT
Product name: ${productName}
Problem being solved: ${problem || "Infer from the founder request."}
Target audience: ${audience || "Early-stage startup customers"}
How the product solves it: ${oneLineDescription}
Key language from real users: ${painLanguage || "Use concrete, founder-ready language inferred from the context."}
${tagline ? `Tagline: ${tagline}` : ""}

GENERATION REQUIREMENTS
- Template: ${params.template}
- Color palette: ${params.palette}. ${PALETTE_GUIDANCE[params.palette]}
- Use the founder's actual product name, audience, and pain language throughout.
- Include PostHog tracking with posthog.init('POSTHOG_KEY', {api_host: 'https://app.posthog.com'}).
- Track page_view, cta_clicked, and form_submitted.
- Every page state must have complete real copy.

${TEMPLATE_REQUIREMENTS[params.template]}

${params.template === "blank" ? `CUSTOM PROMPT\n${customPrompt}` : ""}

CROSS-TOOL CONTEXT
${JSON.stringify(params.projectContext ?? {}, null, 2)}`;
  }

  const actionInstruction: Record<MVPBuilderActionType, string> = {
    generation: "Generate a new React/Vite MVP",
    targeted_edit: "Apply a targeted edit",
    debug: "Fix the reported bug",
    add_page: "Add a new frontend page/screen",
    add_feature: "Add a new frontend feature",
    design_overhaul: "Apply a cohesive design overhaul",
  };

  return `${actionInstruction[params.actionType]} to the existing project.

Rules:
- Return the complete updated JSON output, not only changed snippets.
- Preserve or upgrade the project as React/Vite unless the current project is explicitly html_single.
- Do not implement real auth, database, payments, or backend calls in this release; mock those experiences in frontend state when requested.
- Preserve working structure and existing copy unless the request requires changing it.
- Keep PostHog initialization and page_view, cta_clicked, form_submitted events.

FOUNDER REQUEST
${params.userMessage}

CURRENT PROJECT
${JSON.stringify(params.currentProject, null, 2)}`;
}

async function requestModelStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
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
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
        response_format: { type: "json_object" },
      }),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestModelJson(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<string> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Repair response did not include content");
  }
  return content;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorStream("Invalid request body", "BAD_REQUEST");
  }

  const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
  const currentProject = body.currentProject ?? null;
  const hasExistingProject = Boolean(
    currentProject &&
      typeof currentProject === "object" &&
      Array.isArray((currentProject as Record<string, unknown>).files) &&
      ((currentProject as Record<string, unknown>).files as unknown[]).length > 0
  );
  const mode = body.mode === "classify" ? "classify" : "generate";
  const classifiedAction = normalizeAction(body.actionType, userMessage, hasExistingProject);

  if (mode === "classify") {
    const feature = classifiedAction === "unsupported" || classifiedAction === "unclear"
      ? null
      : ACTION_CONFIG[classifiedAction].feature;
    return jsonResponse({
      actionType: classifiedAction,
      creditFeature: feature,
      creditCost: feature ? CREDIT_COSTS[feature] : 0,
      wallet: "platform",
    });
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) return errorStream("LOVABLE_API_KEY not configured", "CONFIGURATION_ERROR");
  if (!userMessage.trim()) return errorStream("userMessage is required", "BAD_REQUEST");
  if (classifiedAction === "unclear") return errorStream("Please clarify what you want MVP Builder to change.", "UNCLEAR_ACTION");
  if (classifiedAction === "unsupported") {
    return errorStream("That request needs backend/auth/payment support planned for a later phase. Phase 2 supports frontend app generation, targeted edits, bug fixes, add-page, add-feature, and design overhaul.", "UNSUPPORTED_ACTION");
  }

  const template = normalizeTemplate(body.template ?? (body.setupInput as Record<string, unknown> | undefined)?.template);
  const palette = normalizePalette(body.palettePreference ?? (body.setupInput as Record<string, unknown> | undefined)?.palettePreference);
  const userId = typeof body.userId === "string" ? body.userId : null;
  const creditFeature = ACTION_CONFIG[classifiedAction].feature;
  const creditCost = CREDIT_COSTS[creditFeature];
  let chargedCredits = 0;

  if (userId) {
    const idempotencyKey = req.headers.get("Idempotency-Key") ?? undefined;
    const creditCheck = await checkAndDeductCredits(
      userId,
      creditCost,
      getActionFeatureName(creditFeature),
      undefined,
      {
        idempotencyKey,
        entitlementFeature: creditFeature,
        featureCode: creditFeature,
        mvpBuilderActionType: classifiedAction,
        projectId: typeof body.projectId === "string" ? body.projectId : undefined,
        currentVersion: typeof body.currentVersion === "number" ? body.currentVersion : undefined,
      }
    );

    if (!creditCheck.success) {
      return errorStream(
        creditCheck.errorCode === "INSUFFICIENT_CREDITS"
          ? `You need ${creditCost} credits for this MVP Builder action. Upgrade your plan or buy a credit pack.`
          : "Unable to process credits. Please try again.",
        creditCheck.errorCode
      );
    }
    chargedCredits = (creditCheck.usedFromQuota ?? 0) + (creditCheck.usedFromBalance ?? 0);
  }

  const selectedModels = normalizeSelectedModels(body.selectedModels);
  const textCapableModels = selectedModels.filter((model) => HTML_CAPABLE_MODEL_SET.has(model));
  const requestedPrimaryModel = textCapableModels[0] ?? DEFAULT_MODEL;
  const modelCandidates = getFallbackCandidates(requestedPrimaryModel);
  const setupInput = body.setupInput && typeof body.setupInput === "object" ? body.setupInput as Record<string, unknown> : {};
  const productName = typeof setupInput.productName === "string" ? setupInput.productName : "Generated MVP";
  const recentHistory = Array.isArray(body.conversationHistory)
    ? body.conversationHistory.slice(-4).map((m) => {
        const message = m as Record<string, unknown>;
        return {
          role: message.role === "user" ? "user" as const : "assistant" as const,
          content: typeof message.content === "string" ? message.content : "",
        };
      })
    : [];
  const prompt = buildPrompt({
    actionType: classifiedAction,
    userMessage,
    template,
    palette,
    setupInput,
    projectContext: body.projectContext && typeof body.projectContext === "object" ? body.projectContext as Record<string, unknown> : null,
    currentProject,
  });
  const messages = [...recentHistory, { role: "user" as const, content: prompt }];

  let selectedModel = modelCandidates[0];
  let aiResponse: Response | null = null;
  let lastGatewayError = "";

  for (const candidate of modelCandidates) {
    selectedModel = candidate;
    try {
      const attempt = await requestModelStream(
        lovableApiKey,
        candidate,
        BASE_SYSTEM_PROMPT,
        messages,
        ACTION_CONFIG[classifiedAction]
      );
      if (attempt.ok) {
        aiResponse = attempt;
        break;
      }
      lastGatewayError = await attempt.text();
      console.error("AI gateway model attempt failed:", candidate, attempt.status, lastGatewayError);
    } catch (err) {
      lastGatewayError = err instanceof Error ? err.message : String(err);
      console.error("AI gateway request failed:", candidate, err);
    }
  }

  if (!aiResponse) {
    if (userId && chargedCredits > 0) {
      await refundCredits(userId, chargedCredits, getActionFeatureName(creditFeature), "AI gateway error", { lastGatewayError }).catch(() => {});
    }
    return errorStream("AI service temporarily unavailable. Credits have been refunded. Please try again.", "AI_ERROR");
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const reader = aiResponse!.body!.getReader();
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
          const chunk = (event.choices as Array<Record<string, unknown>> | undefined)?.[0]?.delta as Record<string, unknown> | undefined;
          const content = chunk?.content;
          if (typeof content === "string" && content) {
            fullText += content;
            await writer.write(enc({ type: "code-delta", content }));
          }
        }
      }

      let validated: ReturnType<typeof validateOutput>;
      try {
        validated = validateOutput(parseModelJson(fullText));
      } catch (validationError) {
        try {
          const repaired = await requestModelJson(
            lovableApiKey,
            selectedModel,
            BASE_SYSTEM_PROMPT,
            [
              ...messages,
              {
                role: "user",
                content: `Repair the previous response into valid complete project JSON only. Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}\n\nPrevious response:\n${fullText}`,
              },
            ],
            { temperature: 0.1, maxTokens: ACTION_CONFIG[classifiedAction].maxTokens + 4000 }
          );
          validated = validateOutput(parseModelJson(repaired));
        } catch (repairError) {
          if (userId && chargedCredits > 0) {
            await refundCredits(
              userId,
              chargedCredits,
              getActionFeatureName(creditFeature),
              "Invalid MVP Builder JSON output",
              {
                validationError: validationError instanceof Error ? validationError.message : String(validationError),
                repairError: repairError instanceof Error ? repairError.message : String(repairError),
              }
            ).catch(() => {});
          }
          await writer.write(enc({
            type: "error",
            error: "The AI returned invalid project JSON after repair. Credits have been refunded. Please try again.",
            errorCode: "VALIDATION_FAILED",
          }));
          await writer.write(encDone());
          return;
        }
      }

      await writer.write(enc({
        type: "project",
        project: outputToProject(validated, productName),
        output: validated,
        actionType: classifiedAction,
        creditFeature,
        creditCost,
        wallet: "platform",
      }));
      await writer.write(enc({ type: "complete", model: selectedModel, requestedModels: selectedModels }));
      await writer.write(encDone());
    } catch (err) {
      console.error("Stream processing error:", err);
      if (userId && chargedCredits > 0) {
        await refundCredits(userId, chargedCredits, getActionFeatureName(creditFeature), "Stream error").catch(() => {});
      }
      await writer.write(enc({ type: "error", error: "Stream interrupted. Credits have been refunded. Please try again.", errorCode: "STREAM_ERROR" }));
      await writer.write(encDone());
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
