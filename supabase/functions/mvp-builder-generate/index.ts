import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS, type CreditFeature } from "../_shared/credit-constants.ts";
import {
  finalizeMVPBuilderCredits,
  releaseMVPBuilderCredits,
  reserveMVPBuilderCredits,
} from "../_shared/mvp-builder-credit-reservations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Google Gemini models run through the Lovable AI gateway (OpenAI-compatible).
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const FALLBACK_MODEL = "claude-haiku-4-5-20251001";
const MAX_COMBO_MODELS = 3;
const MODEL_TIMEOUT_MS = 120000;

const SUPPORTED_MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-8",
  "claude-haiku-4-5-20251001",
  "google/gemini-3-flash",
  "google/gemini-2.5-flash",
] as const;

const SUPPORTED_MODEL_SET = new Set<string>(SUPPORTED_MODELS);
const HTML_CAPABLE_MODEL_SET = new Set<string>(SUPPORTED_MODELS);

// Provider routing: Claude → Anthropic Messages API; Gemini → Lovable gateway.
function isGeminiModel(model: string): boolean {
  return model.startsWith("google/") || model.startsWith("gemini");
}

type MVPBuilderActionType = "generation" | "targeted_edit" | "debug" | "add_page" | "add_feature" | "design_overhaul" | "chat";
type MVPBuilderTemplateId = "waitlist_landing" | "saas_landing" | "community_landing" | "portfolio" | "simple_dashboard" | "marketplace_mvp" | "admin_panel" | "blank";
type MVPBuilderPaletteId = "minimal" | "bold" | "warm";

// Templates that produce html_single output vs react_vite
const LANDING_TEMPLATES = new Set<MVPBuilderTemplateId>([
  "waitlist_landing", "saas_landing", "community_landing", "portfolio", "blank",
]);

// model: which Claude to use by default for each action.
// Sonnet for quality-critical operations; Haiku for constrained, deterministic tasks.
// If the user explicitly selects a non-default model in the UI, their choice takes precedence.
const ACTION_CONFIG: Record<MVPBuilderActionType, { feature: CreditFeature; temperature: number; maxTokens: number; model: string }> = {
  generation:      { feature: "APP_BUILDER_GENERATE",        temperature: 0.45, maxTokens: 8192, model: "claude-sonnet-4-6" },
  targeted_edit:   { feature: "APP_BUILDER_REFINE",          temperature: 0.25, maxTokens: 6000, model: "claude-haiku-4-5-20251001" },
  debug:           { feature: "APP_BUILDER_DEBUG",           temperature: 0.15, maxTokens: 4000, model: "claude-haiku-4-5-20251001" },
  add_page:        { feature: "APP_BUILDER_ADD_PAGE",        temperature: 0.3,  maxTokens: 8192, model: "claude-sonnet-4-6" },
  add_feature:     { feature: "APP_BUILDER_ADD_FEATURE",     temperature: 0.35, maxTokens: 8192, model: "claude-sonnet-4-6" },
  design_overhaul: { feature: "APP_BUILDER_DESIGN_OVERHAUL", temperature: 0.45, maxTokens: 8192, model: "claude-sonnet-4-6" },
  chat:            { feature: "APP_BUILDER_CHAT",            temperature: 0.35, maxTokens: 1200, model: "claude-haiku-4-5-20251001" },
};

function getActionFeatureName(feature: CreditFeature): string {
  switch (feature) {
    case "APP_BUILDER_GENERATE":       return "MVP Builder Generation";
    case "APP_BUILDER_REFINE":         return "MVP Builder Refinement";
    case "APP_BUILDER_DEBUG":          return "MVP Builder Bug Fix";
    case "APP_BUILDER_ADD_PAGE":       return "MVP Builder Add Page";
    case "APP_BUILDER_ADD_FEATURE":    return "MVP Builder Add Feature";
    case "APP_BUILDER_DESIGN_OVERHAUL": return "MVP Builder Design Overhaul";
    case "APP_BUILDER_CHAT":           return "MVP Builder Chat";
    default:                           return "MVP Builder";
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are a senior full-stack developer specializing in building MVPs for early-stage startups. Your output is always complete, working, deployable code.

Return only valid JSON. No markdown fences, commentary, labels, XML tags, or trailing prose before or after the JSON object.

Core principles:

1. COMPLETE OUTPUT ONLY. Every file must be complete and runnable. Never output partial files, placeholders, TODOs, or continuation markers like "// rest of code here." If a file would be too long, output the most important file complete and note the others in generation_notes. Never leave the project in a broken state.

2. MOBILE-FIRST, ALWAYS. All generated UIs are responsive by default. Mobile layout is designed first. Desktop layout is an enhancement.

3. CLEAN, READABLE CODE. Well-named variables and functions. Semantic HTML. Proper ARIA labels. Code that a junior developer can understand without comments.

4. REAL CONTENT ONLY, TRUE TO THE REQUEST. Build exactly what the user asked for — the product, audience, and industry named in their request define the content. Invent a fitting brand name and specific, believable copy for THAT product. Only use the founder's own product/audience details when the user's request is about their own product or leaves the subject unspecified; never override the user's stated subject with the founder's. Never use Lorem ipsum, bracket placeholders like [Your Company], or the word "placeholder". Every sentence must read as if it belongs in a live product.

5. PRODUCTION-READY DEFAULTS. Every generated app must include: a unique <title> tag, a <meta name="description"> tag, Open Graph tags (og:title, og:description, og:type), and PostHog analytics initialized with the literal string POSTHOG_KEY (the platform substitutes the real key at deploy time). Track: page_view on load, cta_clicked on every primary CTA button, form_submitted on every form.

6. PROJECT TYPE RULE. Choose the output type based on the template:
   - html_single (self-contained HTML + Tailwind CSS CDN + vanilla JS, no build step): use for waitlist_landing, saas_landing, community_landing, portfolio, blank.
   - react_vite (Vite + React 18 + Tailwind, full project): use for simple_dashboard, marketplace_mvp, admin_panel, or when the user explicitly requests React.
   Never use react_vite for a project that can be expressed as a landing page or single-purpose marketing site.

7. NO REAL BACKEND IN THIS PHASE. If the user requests auth, database, payments, or server-side logic: build a polished mocked frontend UX (simulate loading states, success states, error states in frontend state) and explain exactly what to connect in generation_notes. Never write hardcoded credentials.

8. NEVER BREAK EXISTING CODE. When making targeted edits, modify only what the instruction specifies. Return the rest of each file exactly as it was. Never refactor, rename, or restructure anything not mentioned in the request.

9. VISUAL QUALITY STANDARD. Every generated project must look like a polished, modern, production SaaS site — never a generic template. Non-negotiable for html_single:
   - LOAD TAILWIND FIRST: the very first element inside <head> must be <script src="https://cdn.tailwindcss.com"></script>. CRITICAL: never reference the global tailwind object and never emit a tailwind.config assignment script — it runs before the CDN initializes and throws "tailwind is not defined", which breaks the whole page. For custom brand colors, use Tailwind ARBITRARY VALUES directly in classes (e.g. bg-[#0f172a], text-[#3b82f6], from-[#6366f1] to-[#8b5cf6]) and/or CSS variables in an inline <style> block. Never use a tailwind config object.
   - TYPOGRAPHY: load one modern Google Font (Inter, Plus Jakarta Sans, or Space Grotesk) via <link> and apply it site-wide. Headings are bold and tight (font-black tracking-tight); body text has comfortable leading and muted color.
   - RESILIENT BASELINE: include a small inline <style> block that sets the base font, background, and an --accent CSS variable, so the page still has visual identity even before the Tailwind CDN finishes loading.
   - HERO: min-h-[90vh] flex layout, a rich layered background (multi-stop gradient, soft radial glow, or deep color with a subtle grid/noise overlay), an oversized headline (text-5xl md:text-7xl font-black tracking-tight) with a gradient-text accent (bg-gradient-to-r from-[..] to-[..] bg-clip-text text-transparent), a clear subheadline, ONE prominent primary CTA plus a secondary action, and a social-proof line.
   - DEPTH & POLISH: generous whitespace, consistent rounded-2xl corners, soft shadows (shadow-xl shadow-black/5), hairline borders (border border-black/5), and a hover transition on every interactive element. Use real inline-SVG icons, never emoji.
   - CARDS: rounded-2xl, soft shadow, hover:-translate-y-1 hover:shadow-2xl transition-all duration-200.
   - SECTIONS: py-20 md:py-28, max-w-6xl mx-auto px-6, with clear rhythm and alternating background shades.
   - ACCENT: pick ONE accent color that fits the product's industry/mood and apply it consistently to CTAs, links, active states, and highlights.
   - MOTION: at least one tasteful @keyframes animation (fadeIn or slideUp) on hero elements; keep it subtle.
   - BUTTONS: px-8 py-4 font-semibold, rounded-xl or rounded-full, hover:scale-[1.03] active:scale-100 transition, visible focus-visible ring.
   - FORMS: rounded-xl fields with focus:ring-2, visible labels, and smooth client-side success/error states.
   Keep the full HTML file under 700 lines so the output completes in one response.

10. COPY QUALITY STANDARD. The key_pain_language field contains EXACT phrases from real user interviews. You MUST use at least 2-3 of these verbatim as headlines, subheadlines, card titles, or CTA microcopy. Do not paraphrase — quote them directly. The hero headline should sound like something a real frustrated customer said, not polished marketing copy. This is the single most important copy instruction.

Output schema — return a JSON object with exactly this structure:
{
  "project_type": "html_single" or "react_vite",
  "files": [
    {
      "path": "index.html",
      "content": "complete file contents — never truncated",
      "description": "one sentence describing this file"
    }
  ],
  "package_json": { "scripts": {}, "dependencies": {}, "devDependencies": {} },
  "dev_command": "npm run dev",
  "build_command": "npm run build",
  "preview_port": 5173,
  "setup_instructions": "plain-language steps for the founder",
  "posthog_events": [
    { "event_name": "page_view", "trigger": "on page load", "properties": "none" }
  ],
  "generation_notes": "brief founder-friendly explanation of decisions made"
}
For html_single projects, package_json / dev_command / build_command are not needed — omit them or set to null.`;

// Per-action additions appended to the base system prompt
const ACTION_SYSTEM_ADDITIONS: Record<MVPBuilderActionType, string> = {
  generation: `
You are generating a new project from scratch. Generate the complete application in one response. Do not ask clarifying questions — infer reasonable decisions from the context and document them in generation_notes. When in doubt, build the simpler version. Founders can iterate; they cannot iterate on something that was never generated.`,

  targeted_edit: `
You are making a targeted edit to an existing project. Rules:
1. Modify ONLY what the instruction asks. Do not touch anything else.
2. Return ONLY the modified file(s). Do not return files that were not changed.
3. Return each modified file in its entirety — not just the changed lines.
4. Never introduce new dependencies or change project structure unless explicitly asked.
5. If the instruction is ambiguous, make the most reasonable interpretation and document it in generation_notes.`,

  debug: `
You are debugging an existing project. Rules:
1. Diagnose the most likely cause of the reported issue from the code and the description.
2. Fix only the bug. Do not refactor, improve, or change anything unrelated to the reported issue.
3. Explain the bug to the founder in plain, non-technical language in generation_notes.
4. If the bug cannot be definitively diagnosed, state your best hypothesis, apply the most likely fix, and tell the founder what to check if it does not resolve the issue.
5. Return only the files you modified, in their entirety.`,

  add_page: `
You are adding a new page or screen to an existing project. Rules:
1. Match the existing code style exactly: same naming conventions, same indentation, same component patterns.
2. Match the existing visual design exactly: same colors, same spacing, same typography scale.
3. Wire up navigation to the new page (add nav link, update routing).
4. No breaking changes to existing functionality.
5. Return all modified files in their entirety.`,

  add_feature: `
You are adding a new feature to an existing project. Rules:
1. Integrate the feature into the existing code — do not restructure the project.
2. Match the existing code style exactly: same naming conventions, same indentation, same component patterns.
3. Match the existing visual style exactly: same colors, same spacing, same typography scale.
4. If the feature requires new dependencies, add them and document them in setup_instructions.
5. Add appropriate PostHog tracking events for the new feature.
6. Document the feature in generation_notes: what it does, how it works, any founder actions needed.
7. Return all modified files in their entirety.`,

  design_overhaul: `
You are redesigning the visual style of an existing project. Rules:
1. Change ONLY the visual layer: colors, typography, spacing, border radius, shadows, layout presentation.
2. Do NOT change: functionality, copy/text content, component structure, JavaScript logic, PostHog events, or routing.
3. All interactive behavior must remain exactly the same.
4. The result must be visually cohesive — one design language applied consistently across all files.
5. Return all files that contain visual styling changes, in their entirety.`,

  chat: `
You are advising a founder about their MVP Builder project. Reply with concise plain text only.
Do not return JSON and do not make code changes. Answer the founder's question directly.`,
};

// ─── Template requirements ────────────────────────────────────────────────────

const TEMPLATE_REQUIREMENTS: Record<MVPBuilderTemplateId, string> = {
  waitlist_landing: `
Template: Waitlist Landing Page (html_single)

Required sections in order:
1. STICKY NAV — product name on the left, single "Join Waitlist" CTA button on the right that scrolls to the waitlist form
2. HERO — min-h-screen with a bold gradient background; large headline (use exact pain-language verbatim); subheadline that names the target audience and outcome; email input + CTA button in-line or stacked; social proof line below ("Join 2,300+ founders already on the waitlist" or similar realistic number)
3. PROBLEM SECTION — "The problem" heading; 3 pain-point cards with icons; each card title must use a specific phrase from key_pain_language verbatim
4. SOLUTION/FEATURES — "How it works" or "What you get"; 3 benefit cards derived from the product context; use concrete outcomes, not vague features
5. HOW IT WORKS — 3-step numbered timeline: short action → short action → outcome
6. SOCIAL PROOF — 2-3 realistic testimonials (specific full names, specific roles/companies, specific quotes about the pain and the solution — not generic praise)
7. SECOND CTA — repeat the email capture form at the bottom above the footer
8. FOOTER — product name, "© 2026", Privacy Policy link (#), minimal

Form behavior: on submit, hide the form and replace with an inline thank-you message ("You're on the list — we'll be in touch."). No page reload. Fire PostHog events: form_submitted {source: 'waitlist_form'} and waitlist_signup {email: emailValue, source: 'hero_form'}.`,

  saas_landing: `
Template: SaaS Landing Page (html_single)

Required sections (one-page with anchor navigation):
1. STICKY NAV — product name, anchor links (Features, Pricing, FAQ), CTA button ("Get Started" or "Try Free")
2. HERO — bold headline and subheadline, primary CTA button, secondary link ("See how it works"), optional product UI mockup (a rounded div with a gradient/screenshot-like placeholder)
3. SOCIAL PROOF BAR — "Trusted by X companies" or 3-4 company logo placeholders (styled boxes with names)
4. FEATURES — 3 feature cards with icon, bold title, and 2-sentence description derived from the product context; use concrete outcomes
5. HOW IT WORKS — 3-step numbered process with short step title and description
6. PRICING — 2-3 pricing tiers; infer tier names and prices from context (default: Free / Pro $29/mo / Enterprise); middle/recommended tier visually highlighted with a "Most Popular" badge and border accent; each tier lists 4-5 bullet point features
7. FAQ — 4-5 questions with accordion expand/collapse in vanilla JS; infer questions from the product and common SaaS objections
8. FULL-WIDTH CTA BAND — bold background section with headline and CTA button before the footer
9. FOOTER — product name, section links, © 2026

All nav links must anchor-scroll. Use smooth-scroll behavior.`,

  community_landing: `
Template: Community Landing Page (html_single)

Required sections:
1. HERO — identity statement headline ("For [founders/creators/operators] who [pain]..."); subheadline describing what changes when they join; CTA button ("Apply to Join" or "Get Access")
2. ABOUT/MISSION — what this community is, why it exists, who runs it; 3 bullet-point member benefits with icons
3. MEMBER BENEFITS — 3-4 benefit cards with icon, short title, and 2-sentence description
4. TESTIMONIALS — 3 realistic testimonials: specific first and last names, specific roles (e.g., "Founder, Acme Labs"), specific quotes about what changed for them in the community — not generic phrases
5. APPLICATION/JOIN FORM — fields: Name, Email, "What are you building?" (text), "How far along are you?" (dropdown: Just an idea / Building now / Already launched), CTA button; form submit shows inline thank-you state; PostHog event: form_submitted {form_type: 'community_application'}
6. FAQ — 4 questions inferred from the community's value proposition and common objections
7. FOOTER — community name, © 2026, social links (# placeholders)`,

  portfolio: `
Template: Portfolio / Showcase (html_single)

Required sections:
1. HERO — founder/creator name as headline, role/title as subheadline, 1-sentence value proposition, 2 CTA buttons (View Work, Contact Me); minimal high-contrast background
2. ABOUT — short bio paragraph (2-3 sentences using context to infer background and expertise); a "Currently" line (what they're building now, from product context)
3. WORK/PROJECTS — grid of 4-6 project cards; each card: project title, 1-line description, 2-3 tech/skill tags, hover overlay with "View project →"; use realistic project names relevant to the founder's domain
4. SKILLS/EXPERTISE — compact tag grid or icon-label grid; infer skills from context
5. CONTACT — email form (Name, Email, Message fields) with submit button; or a simple "Get in touch" link section with email + social links
6. FOOTER — name, © 2026, minimal

Project cards must have distinct hover states (scale, overlay, or border change). Design should be clean and professional — this is a credibility tool.`,

  simple_dashboard: `
Template: Simple Dashboard (react_vite)

Required pages and components:
1. Login page (src/pages/Login.tsx or inline in App):
   - Email + password form
   - "Sign in" button: on click, show 1-second loading spinner, then set isAuthenticated=true in React state, navigate to /dashboard
   - No real Supabase call — mock auth in frontend state
   - Clean centered card layout

2. Dashboard page (src/pages/Dashboard.tsx):
   - Sidebar: product name/logo, nav links (Dashboard, Settings, Log Out); Log Out clears auth state and navigates to /login
   - Main header: "Good morning, [Product Name]" greeting
   - 3 metric cards: infer 3 relevant KPIs from the product context (e.g., for a SaaS tool: "Monthly Revenue $0", "Active Users 0", "Tasks Completed 0"); each card has the metric value, label, and a small trend indicator (green ↑ or gray —)
   - Data section: a simple table or list showing 4-6 mock data rows relevant to the product (e.g., recent signups, recent tasks, recent transactions)

3. Settings page (src/pages/Settings.tsx):
   - Profile form: name input, email input (read-only), Save button
   - Notifications section: 2-3 toggle switches
   - Clean form layout

Auth guard: all routes except /login redirect to /login if isAuthenticated is false. Use React Router v6.
Note in generation_notes: "Authentication is mocked in frontend state for rapid prototyping. Replace the mock login handler with Supabase Auth to go live."`,

  marketplace_mvp: `
Template: Marketplace MVP (react_vite)

Required pages:
1. Landing (src/pages/Landing.tsx):
   - Hero: what the marketplace connects (buyers ↔ sellers), who it's for, CTA buttons ("Browse Listings", "Post a Listing")
   - How it works: 3-step flow (Post → Browse → Connect)
   - Featured listings: 3 preview cards linking to browse

2. Browse Listings (src/pages/Browse.tsx):
   - Sticky filter bar (category dropdown, price range — non-functional in v1, just UI)
   - Grid of 8 mock listing cards: realistic title, 1-line description, price/rate, seller name, 2 category tags, star rating (4.2-4.9 range)
   - Mock data must be realistic and specific to the marketplace context from product setup

3. Post a Listing (src/pages/PostListing.tsx):
   - Form: Title, Description (textarea), Category (dropdown), Price/Rate, Contact Email
   - Submit: show a success screen with "Your listing is live" message and a preview of the listing card
   - PostHog event: form_submitted {form_type: 'post_listing'}

4. Login page (src/pages/Login.tsx):
   - Simple email/password form, mock auth in state

Shared: consistent sticky nav across all pages. React Router v6.
Note in generation_notes: "Listings are frontend mock data. Connect to Supabase to persist real listings and enable real auth."`,

  admin_panel: `
Template: Admin Panel (react_vite)

Required pages:
1. Login page — email/password, mock auth in state, clean centered card layout

2. Data Table page (main dashboard):
   - Left sidebar: product name/logo, nav items relevant to the product (infer 3-4 section names from context), logout
   - Main content: page title, search input (filters displayed rows client-side), column-header table with 8-10 mock data rows relevant to the product domain; each row has an Edit button (shows a simple edit modal or expands inline) and a Delete button (removes row from state with confirmation); pagination UI (1 / 3 pages — non-functional)
   - Mock data must be specific to the product context (e.g., if the product is a freelancer tool: rows = client records with name, email, outstanding invoice, status)

3. Record Detail — clicking a row title navigates to /record/:id showing all fields for that record in a read form with an "Edit" toggle that makes the fields editable; Save and Cancel buttons

4. Settings — profile form, 2-3 config toggles

Design aesthetic: clean internal-tool aesthetic — white/light gray background, dense information layout, compact table rows, no hero/marketing sections. Functional over decorative.
Note in generation_notes: "Table data is frontend mock data. Connect to Supabase to power the data table."`,

  blank: `
Template: Blank (follow founder's custom prompt)

Choose html_single for landing pages, marketing sites, and simple tools. Choose react_vite for multi-page apps, dashboards, or when the founder explicitly mentions React.

Follow the founder's custom prompt precisely while applying all 10 core principles. Use the founder context to make the output specific and relevant — never generic. If the prompt is ambiguous, make the most useful interpretation and document it in generation_notes.`,
};

// ─── Palette guidance ─────────────────────────────────────────────────────────

const PALETTE_GUIDANCE: Record<MVPBuilderPaletteId, string> = {
  minimal: "Minimal palette: white or very light gray background (#f8fafc), dark slate text (#0f172a), one calm accent color (choose from: slate blue #3b82f6, sage green #10b981, or indigo #6366f1). Use the accent for CTAs, links, and highlights only.",
  bold: "Bold palette: deep dark background (#0f172a or #09090b), near-white text (#f1f5f9), one strong accent (electric blue #3b82f6, vibrant orange #f97316, or emerald #10b981). High contrast, launch-product energy.",
  warm: "Warm palette: off-white or cream background (#faf7f2 or #fffbf5), warm dark text (#292524), warm accent (terracotta #ea580c, golden amber #d97706, or rose #e11d48). Human, approachable feel.",
};

// ─── Validation helpers ───────────────────────────────────────────────────────

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

// ─── Model helpers ────────────────────────────────────────────────────────────

function normalizeSelectedModels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [DEFAULT_MODEL];
  const unique = Array.from(new Set(raw.filter((item): item is string => typeof item === "string")))
    .filter((model) => SUPPORTED_MODEL_SET.has(model))
    .slice(0, MAX_COMBO_MODELS);
  return unique.length > 0 ? unique : [DEFAULT_MODEL];
}

function getFallbackCandidates(primaryModel: string): string[] {
  return Array.from(new Set([primaryModel, DEFAULT_MODEL, FALLBACK_MODEL]));
}

// ─── Input normalizers ────────────────────────────────────────────────────────

const VALID_TEMPLATES = new Set<string>([
  "waitlist_landing", "saas_landing", "community_landing",
  "portfolio", "simple_dashboard", "marketplace_mvp", "admin_panel", "blank",
]);

function normalizeTemplate(value: unknown): MVPBuilderTemplateId {
  return VALID_TEMPLATES.has(value as string) ? (value as MVPBuilderTemplateId) : "waitlist_landing";
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
    value === "generation" || value === "targeted_edit" || value === "debug" ||
    value === "add_page" || value === "add_feature" || value === "design_overhaul" ||
    value === "chat"
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
      if (segment === "..") { parts.pop(); return parts; }
      parts.push(segment);
      return parts;
    }, [])
    .join("/");
}

// ─── Output parsing & validation ──────────────────────────────────────────────

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
    const htmlFile = files.find((f) => f.filename.toLowerCase() === "index.html") ?? files.find((f) => f.filename.endsWith(".html"));
    if (!htmlFile) throw new Error("html_single output must include index.html or another HTML file");
    if (!/<title>[^<]+<\/title>/i.test(htmlFile.content)) throw new Error("HTML must include a title tag");
    if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(htmlFile.content)) throw new Error("HTML must include a meta description");
    for (const eventName of ["page_view", "cta_clicked", "form_submitted"]) {
      if (!htmlFile.content.includes(eventName)) throw new Error(`HTML must track ${eventName}`);
    }
  } else {
    for (const required of ["package.json", "index.html"]) {
      if (!files.some((f) => f.filename === required)) throw new Error(`react_vite output must include ${required}`);
    }
    const packageFile = files.find((f) => f.filename === "package.json");
    let packageJson: Record<string, unknown>;
    try { packageJson = JSON.parse(packageFile?.content ?? ""); } catch { throw new Error("react_vite package.json must be valid JSON"); }
    const deps = {
      ...((packageJson.dependencies as Record<string, unknown> | undefined) ?? {}),
      ...((packageJson.devDependencies as Record<string, unknown> | undefined) ?? {}),
    };
    if (!deps.react || !deps["react-dom"] || !deps.vite) {
      throw new Error("react_vite package.json must include react, react-dom, and vite");
    }
    if (!files.some((f) => /^(src\/)?main\.(tsx|jsx)$/.test(f.filename) && /createRoot|ReactDOM/.test(f.content))) {
      throw new Error("react_vite output must include a React main entry that mounts the app");
    }
    if (!files.some((f) => /^src\/App\.(tsx|jsx)$/.test(f.filename))) {
      throw new Error("react_vite output must include src/App.tsx or src/App.jsx");
    }
  }

  return {
    project_type: candidate.project_type as "html_single" | "react_vite",
    files,
    package_json: candidate.project_type === "react_vite"
      ? JSON.parse(files.find((f) => f.filename === "package.json")?.content ?? "{}")
      : undefined,
    dev_command: typeof candidate.dev_command === "string" && candidate.dev_command.trim() ? candidate.dev_command.trim() : "npm run dev",
    build_command: typeof candidate.build_command === "string" && candidate.build_command.trim() ? candidate.build_command.trim() : "npm run build",
    preview_port: typeof candidate.preview_port === "number" ? candidate.preview_port : 5173,
    setup_instructions:
      typeof candidate.setup_instructions === "string" && candidate.setup_instructions.trim()
        ? candidate.setup_instructions.trim()
        : "Open index.html in a browser to preview, or deploy as a static site.",
    posthog_events: Array.isArray(candidate.posthog_events) ? candidate.posthog_events : [],
    generation_notes:
      typeof candidate.generation_notes === "string" && candidate.generation_notes.trim()
        ? candidate.generation_notes.trim()
        : "Generated with MVP Builder.",
  };
}

function outputToProject(output: ReturnType<typeof validateOutput>, productName: string) {
  const reactEntry =
    output.files.find((f) => /^(src\/)?main\.(tsx|jsx)$/.test(f.filename))?.filename ??
    output.files.find((f) => /^(src\/)?main\.(ts|js)$/.test(f.filename))?.filename ??
    output.files.find((f) => f.filename === "index.html")?.filename ??
    output.files[0].filename;
  return {
    projectName: productName || "Generated MVP",
    framework: output.project_type === "react_vite" ? "react-vite" : "static-html",
    projectType: output.project_type === "react_vite" ? "web-app" : "landing-page",
    entryFile: reactEntry,
    summary: output.generation_notes,
    dependencies: [],
    files: output.files.map((f) => ({ path: f.filename, content: f.content })),
    phase1Output: output,
  };
}

function hasMaterialProjectChange(currentProject: unknown, output: ReturnType<typeof validateOutput>) {
  if (!currentProject || typeof currentProject !== "object") return true;
  const rawFiles = (currentProject as Record<string, unknown>).files;
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) return true;

  const currentFiles = new Map(
    rawFiles
      .filter((file): file is Record<string, unknown> => Boolean(file && typeof file === "object"))
      .map((file) => [
        normalizeProjectPath(String(file.path ?? file.filename ?? "")),
        typeof file.content === "string" ? file.content : "",
      ])
  );

  return output.files.some((file) =>
    currentFiles.get(normalizeProjectPath(file.filename)) !== file.content
  );
}

// ─── Context formatting ───────────────────────────────────────────────────────

function formatFounderContext(context: Record<string, unknown> | null): string {
  if (!context) return "";

  const lines: string[] = ["FOUNDER CONTEXT (pre-loaded from validated research — use this to make the output specific, not generic)"];

  const quiz = context.onboardingQuiz as Record<string, unknown> | null | undefined;
  const dashboard = context.dashboardHome as Record<string, unknown> | null | undefined;
  const waitlist = context.waitlistLaunchKit as Record<string, unknown> | null | undefined;
  const icp = context.icpFallback as Record<string, unknown> | null | undefined;

  // Founder stage
  if (quiz?.founderStageLabel) lines.push(`Founder stage: ${quiz.founderStageLabel}`);
  if (quiz?.quizBiggestChallenge) lines.push(`Biggest challenge: ${quiz.quizBiggestChallenge}`);
  if (quiz?.primaryPain) lines.push(`Primary pain: ${quiz.primaryPain}`);
  if (Array.isArray(quiz?.startupSectors) && (quiz!.startupSectors as unknown[]).length > 0) {
    lines.push(`Industry: ${(quiz!.startupSectors as string[]).join(", ")}`);
  }

  // Dashboard / business model
  if (dashboard?.targetMarket) lines.push(`Target market (validated): ${dashboard.targetMarket}`);
  if (dashboard?.revenueModel) lines.push(`Revenue model: ${dashboard.revenueModel}`);

  const manual = dashboard?.manualProfile as Record<string, unknown> | null | undefined;
  if (manual?.startup_name) lines.push(`Startup name: ${manual.startup_name}`);
  if (manual?.positioning_statement) lines.push(`Positioning statement: ${manual.positioning_statement}`);

  // Waitlist kit
  if (waitlist?.positioningStatement) lines.push(`Validated positioning: ${waitlist.positioningStatement}`);

  // ICP fallback
  if (icp?.target_audience) lines.push(`ICP target audience: ${icp.target_audience}`);
  if (icp?.business_description) lines.push(`Business description: ${icp.business_description}`);

  // PMF signals
  const generated = dashboard?.generated as Record<string, unknown> | null | undefined;
  const pmf = generated?.pmf as Record<string, unknown> | null | undefined;
  if (pmf?.pmf_score) lines.push(`PMF Score: ${pmf.pmf_score}`);
  if (pmf?.verdict) lines.push(`PMF Verdict: ${pmf.verdict}`);

  return lines.filter(Boolean).join("\n");
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

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
  const productName    = typeof setup.productName === "string" ? setup.productName : "Untitled MVP";
  const description    = typeof setup.oneLineDescription === "string" ? setup.oneLineDescription : params.userMessage;
  const problem        = typeof setup.validatedProblemStatement === "string" ? setup.validatedProblemStatement : "";
  const audience       = typeof setup.validatedTargetSegment === "string" ? setup.validatedTargetSegment : "";
  const painLanguage   = typeof setup.keyPainLanguage === "string" ? setup.keyPainLanguage : "";
  const tagline        = typeof setup.existingTagline === "string" ? setup.existingTagline : "";
  const customPrompt   = typeof setup.customPrompt === "string" ? setup.customPrompt : params.userMessage;
  const founderContext = formatFounderContext(params.projectContext);

  if (params.actionType === "chat") {
    return `Answer the founder's MVP Builder question.

FOUNDER QUESTION
${params.userMessage}

CURRENT PROJECT
${JSON.stringify(params.currentProject, null, 2)}

${founderContext}`;
  }

  if (params.actionType === "generation") {
    // The user's typed request is authoritative. Founder/setup data is optional
    // background only — it must never override the subject the user asked for.
    const backgroundLines: string[] = [];
    if (productName && productName !== "Untitled MVP") {
      backgroundLines.push(`- The founder's own product (tone/quality reference only — NOT the subject unless the request asks for it): ${productName}`);
    }
    if (problem) backgroundLines.push(`- A problem the founder has described before: ${problem}`);
    if (audience) backgroundLines.push(`- The founder's usual audience: ${audience}`);
    if (painLanguage) backgroundLines.push(`- Pain language the founder tends to use: ${painLanguage}`);
    if (tagline) backgroundLines.push(`- An existing tagline: ${tagline}`);
    const background = [backgroundLines.join("\n"), founderContext].filter(Boolean).join("\n");

    return `Build a complete ${params.template} based on the user's request.

THE USER'S REQUEST (authoritative — this defines exactly what to build):
${params.userMessage || description}

HOW TO INTERPRET THE REQUEST
- The request above is the single source of truth for WHAT to build: the product/idea, its audience, its industry, and its purpose. Build precisely that.
- If the request names a subject (e.g. "a landing page for trading learners"), that subject IS the product. Invent a fitting brand name, realistic copy, audience, and value props for THAT subject.
- Do NOT substitute the founder's own product or a different topic. The background section below is reference only — use it solely to fill details the request leaves unspecified (e.g. visual taste), and ignore anything in it that conflicts with the request.

GENERATION REQUIREMENTS
- Template: ${params.template}
- Color palette: ${params.palette}. ${PALETTE_GUIDANCE[params.palette]}
- Write complete, specific copy tailored to the REQUESTED product. Zero placeholder text, zero Lorem ipsum.
- Include PostHog: posthog.init('POSTHOG_KEY', {api_host: 'https://app.posthog.com'})
- Track: page_view on load, cta_clicked on all primary CTAs, form_submitted on all form submissions.
- Every page state and section must have complete, real copy.

${TEMPLATE_REQUIREMENTS[params.template]}

${params.template === "blank" ? `ADDITIONAL DETAIL FROM THE USER\n${customPrompt}\n` : ""}${background ? `OPTIONAL FOUNDER BACKGROUND (reference only — never override the request above):\n${background}` : ""}`;
  }

  const actionInstruction: Record<MVPBuilderActionType, string> = {
    generation:      "Generate a new MVP application",
    targeted_edit:   "Apply a targeted edit",
    debug:           "Fix the reported bug",
    add_page:        "Add a new page/screen",
    add_feature:     "Add a new frontend feature",
    design_overhaul: "Apply a cohesive design overhaul",
    chat:            "Answer a founder question",
  };

  return `${actionInstruction[params.actionType]} to the existing project.

FOUNDER REQUEST
${params.userMessage}

CURRENT PROJECT
${JSON.stringify(params.currentProject, null, 2)}

${founderContext}`;
}

// ─── Anthropic API functions ──────────────────────────────────────────────────

async function requestModelStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    if (isGeminiModel(model)) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured for Gemini models");
      return await fetch(AI_GATEWAY_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: true,
        }),
      });
    }
    return await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    if (isGeminiModel(model)) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured for Gemini models");
      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: false,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const json = await response.json();
      // OpenAI-compatible response: { choices: [{ message: { content } }] }
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Repair response did not include content");
      }
      return content;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const json = await response.json();
    // Anthropic response: { content: [{ type: "text", text: "..." }] }
    const content = (json?.content as Array<{ type: string; text: string }> | undefined)
      ?.find((block) => block.type === "text")?.text;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Repair response did not include content");
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readModelStreamChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("MVP Builder model stream timed out")), MODEL_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) return errorStream("ANTHROPIC_API_KEY not configured", "CONFIGURATION_ERROR");
  if (!userMessage.trim()) return errorStream("userMessage is required", "BAD_REQUEST");
  if (classifiedAction === "unclear") return errorStream("Please clarify what you want MVP Builder to change.", "UNCLEAR_ACTION");
  if (classifiedAction === "unsupported") {
    return errorStream(
      "That request needs backend/auth/payment support planned for a later phase. Phase 2 supports frontend app generation, targeted edits, bug fixes, add-page, add-feature, and design overhaul.",
      "UNSUPPORTED_ACTION"
    );
  }

  const user = await getUserFromAuth(req);
  if (!user) return errorStream("Authentication required", "UNAUTHORIZED");

  const template  = normalizeTemplate(body.template ?? (body.setupInput as Record<string, unknown> | undefined)?.template);
  const palette   = normalizePalette(body.palettePreference ?? (body.setupInput as Record<string, unknown> | undefined)?.palettePreference);
  const userId    = user.id;
  const creditFeature = ACTION_CONFIG[classifiedAction].feature;
  const creditCost    = CREDIT_COSTS[creditFeature];
  const idempotencyKey = req.headers.get("Idempotency-Key") ?? crypto.randomUUID();
  const reservation = await reserveMVPBuilderCredits(
    userId,
    creditFeature,
    creditCost,
    idempotencyKey,
    {
      entitlementFeature: creditFeature,
      featureCode: creditFeature,
      mvpBuilderActionType: classifiedAction,
      projectId: typeof body.projectId === "string" ? body.projectId : undefined,
      currentVersion: typeof body.currentVersion === "number" ? body.currentVersion : undefined,
    }
  );

  if (!reservation.success || !reservation.reservationId) {
    return errorStream(
      reservation.errorCode === "INSUFFICIENT_CREDITS"
        ? `You need ${creditCost} credits for this MVP Builder action. Upgrade your plan or buy a credit pack.`
        : "Unable to reserve credits. Please try again.",
      reservation.errorCode
    );
  }
  const reservationId = reservation.reservationId;
  const heldCredits = Number(reservation.heldCredits ?? 0);

  const selectedModels = normalizeSelectedModels(body.selectedModels);
  const textCapableModels = selectedModels.filter((m) => HTML_CAPABLE_MODEL_SET.has(m));
  const userExplicitModel = textCapableModels[0];
  // Use action-specific default unless the user explicitly picked a non-default model
  const primaryModel = (userExplicitModel && userExplicitModel !== DEFAULT_MODEL)
    ? userExplicitModel
    : ACTION_CONFIG[classifiedAction].model;
  const modelCandidates = getFallbackCandidates(primaryModel);
  const setupInput = body.setupInput && typeof body.setupInput === "object" ? body.setupInput as Record<string, unknown> : {};
  const productName = typeof setupInput.productName === "string" ? setupInput.productName : "Generated MVP";
  const posthogKey = Deno.env.get("POSTHOG_API_KEY") ?? "";

  // Build conversation history: keep first message for context + last 11 messages
  const rawHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
  let recentHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (rawHistory.length > 0) {
    const normalize = (m: unknown) => {
      const msg = m as Record<string, unknown>;
      return {
        role: msg.role === "user" ? "user" as const : "assistant" as const,
        content: typeof msg.content === "string" ? msg.content : "",
      };
    };
    if (rawHistory.length <= 12) {
      recentHistory = rawHistory.map(normalize);
    } else {
      // Always keep the first message (original generation prompt) + last 11
      recentHistory = [normalize(rawHistory[0]), ...rawHistory.slice(-11).map(normalize)];
    }
  }

  // Build the per-action system prompt
  const actionAddition = ACTION_SYSTEM_ADDITIONS[classifiedAction];
  const systemPrompt = actionAddition
    ? `${BASE_SYSTEM_PROMPT}\n\n---\n${actionAddition}`
    : BASE_SYSTEM_PROMPT;

  const prompt = buildPrompt({
    actionType: classifiedAction,
    userMessage,
    template,
    palette,
    setupInput,
    projectContext: body.projectContext && typeof body.projectContext === "object"
      ? body.projectContext as Record<string, unknown>
      : null,
    currentProject,
  });

  const messages = [...recentHistory, { role: "user" as const, content: prompt }];

  let selectedModel = modelCandidates[0];
  let aiResponse: Response | null = null;
  let lastApiError = "";

  for (const candidate of modelCandidates) {
    selectedModel = candidate;
    try {
      const attempt = await requestModelStream(
        anthropicApiKey,
        candidate,
        systemPrompt,
        messages,
        ACTION_CONFIG[classifiedAction]
      );
      if (attempt.ok) {
        aiResponse = attempt;
        break;
      }
      lastApiError = await attempt.text();
      console.error("AI model attempt failed:", candidate, attempt.status, lastApiError);
    } catch (err) {
      lastApiError = err instanceof Error ? err.message : String(err);
      console.error("AI model request failed:", candidate, err);
    }
  }

  if (!aiResponse) {
    await releaseMVPBuilderCredits(reservationId, "AI API error", { lastApiError }).catch(() => {});
    return errorStream("AI service temporarily unavailable. Held credits have been released. Please try again.", "AI_ERROR");
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const reader = aiResponse!.body!.getReader();
    const decoder = new TextDecoder();
    const usingGemini = isGeminiModel(selectedModel);
    let buffer = "";
    let fullText = "";
    let sawStop = false;

    try {
      await writer.write(enc({
        type: "credit-reserved",
        reservationId,
        reservationStatus: "pending",
        listedCreditCost: creditCost,
        heldCredits,
        creditsUsed: 0,
        balanceAfter: reservation.balanceAfter,
      }));

      while (!sawStop) {
        const { done, value } = await readModelStreamChunk(reader);
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          // SSE: lines may be "event: ..." or "data: ..."
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          // OpenAI/Lovable-gateway terminator (Gemini)
          if (raw === "[DONE]") {
            sawStop = true;
            break;
          }

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          if (usingGemini) {
            // OpenAI-compatible stream: choices[0].delta.content
            const choice = (event.choices as Array<Record<string, unknown>> | undefined)?.[0];
            const delta = choice?.delta as Record<string, unknown> | undefined;
            const content = typeof delta?.content === "string" ? delta.content : "";
            if (content) {
              fullText += content;
              await writer.write(enc({ type: classifiedAction === "chat" ? "delta" : "code-delta", content }));
            }
            if (typeof choice?.finish_reason === "string" && choice.finish_reason) {
              sawStop = true;
              break;
            }
            continue;
          }

          // Anthropic Messages SSE termination signal
          if (event.type === "message_stop") {
            sawStop = true;
            break;
          }

          // Anthropic text content delta
          if (event.type === "content_block_delta") {
            const delta = event.delta as Record<string, unknown> | undefined;
            const content = typeof delta?.text === "string" ? delta.text : "";
            if (content) {
              fullText += content;
              await writer.write(enc({ type: classifiedAction === "chat" ? "delta" : "code-delta", content }));
            }
          }
        }
      }

      if (classifiedAction === "chat") {
        if (!fullText.trim()) {
          const released = await releaseMVPBuilderCredits(reservationId, "Empty MVP Builder chat response");
          await writer.write(enc({
            type: "credit-released",
            ...released,
            releaseReason: "empty_output",
          }));
          await writer.write(enc({ type: "error", error: "The assistant returned an empty reply. Held credits were released.", errorCode: "EMPTY_OUTPUT" }));
          await writer.write(encDone());
          return;
        }

        const finalized = await finalizeMVPBuilderCredits(reservationId, {
          mvpBuilderActionType: classifiedAction,
          completionBoundary: "successful_chat_reply",
        });
        if (!finalized.success) throw new Error("Unable to finalize MVP Builder chat credits");
        await writer.write(enc({ type: "credit-finalized", ...finalized }));
        await writer.write(enc({ type: "complete", model: selectedModel, requestedModels: selectedModels }));
        await writer.write(encDone());
        return;
      }

      // Validate and emit the structured project event
      let validated: ReturnType<typeof validateOutput>;
      try {
        validated = validateOutput(parseModelJson(fullText));
      } catch (validationError) {
        // Attempt repair with a non-streaming call. Escalate to the stronger
        // model (Sonnet) for the repair so a fast Haiku generation that fails
        // validation gets a quality second pass instead of repeating the miss.
        const repairModel = selectedModel === DEFAULT_MODEL ? DEFAULT_MODEL : "claude-sonnet-4-6";
        try {
          const repaired = await requestModelJson(
            anthropicApiKey,
            repairModel,
            systemPrompt,
            [
              ...messages,
              {
                role: "user",
                content: `Repair the previous response into valid complete project JSON only. Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}\n\nPrevious response:\n${fullText}`,
              },
            ],
            { temperature: 0.1, maxTokens: ACTION_CONFIG[classifiedAction].maxTokens + 2000 }
          );
          validated = validateOutput(parseModelJson(repaired));
        } catch (repairError) {
          const released = await releaseMVPBuilderCredits(
            reservationId,
            "Invalid MVP Builder JSON output",
            {
              validationError: validationError instanceof Error ? validationError.message : String(validationError),
              repairError: repairError instanceof Error ? repairError.message : String(repairError),
            }
          );
          await writer.write(enc({ type: "credit-released", ...released, releaseReason: "validation_failed" }));
          await writer.write(enc({
            type: "error",
            error: "The AI returned an invalid project after repair. Held credits have been released. Please try again.",
            errorCode: "VALIDATION_FAILED",
          }));
          await writer.write(encDone());
          return;
        }
      }

      // Substitute the real PostHog key into generated files
      if (posthogKey) {
        validated.files = validated.files.map((f) => ({
          ...f,
          content: f.content.replace(/POSTHOG_KEY/g, posthogKey),
        }));
      }

      if (!hasMaterialProjectChange(currentProject, validated)) {
        const released = await releaseMVPBuilderCredits(reservationId, "MVP Builder produced no material project change");
        await writer.write(enc({ type: "credit-released", ...released, releaseReason: "no_material_change" }));
        await writer.write(enc({
          type: "error",
          error: "No project changes were needed. Held credits have been released.",
          errorCode: "NO_MATERIAL_CHANGE",
        }));
        await writer.write(encDone());
        return;
      }

      const finalized = await finalizeMVPBuilderCredits(reservationId, {
        mvpBuilderActionType: classifiedAction,
        completionBoundary: "valid_artifact_accepted",
      });
      if (!finalized.success) throw new Error("Unable to finalize MVP Builder credits");
      await writer.write(enc({ type: "credit-finalized", ...finalized }));
      await writer.write(enc({
        type: "project",
        project: outputToProject(validated, productName),
        output: validated,
        actionType: classifiedAction,
        creditFeature,
        reservationId,
        reservationStatus: finalized.reservationStatus,
        heldCredits,
        creditCost: finalized.creditsUsed,
        listedCreditCost: creditCost,
        wallet: "platform",
      }));
      await writer.write(enc({ type: "complete", model: selectedModel, requestedModels: selectedModels }));
      await writer.write(encDone());
    } catch (err) {
      console.error("Stream processing error:", err);
      await reader.cancel().catch(() => {});
      const released = await releaseMVPBuilderCredits(reservationId, "Stream error", {
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => ({ success: false }));
      await writer.write(enc({ type: "credit-released", ...released, releaseReason: "stream_error" }));
      await writer.write(enc({ type: "error", error: "Stream interrupted. Held credits have been released. Please try again.", errorCode: "STREAM_ERROR" }));
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
