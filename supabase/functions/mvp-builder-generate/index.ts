import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS, resolveMVPActionDefaultModelForPlan, resolveModelAdjustedCreditCost, type CreditFeature } from "../_shared/credit-constants.ts";
import { isPlanAtLeast, normalizePlan, type Plan } from "../_shared/plan-enforcement.ts";
import {
  finalizeMVPBuilderCredits,
  releaseMVPBuilderCredits,
  reserveMVPBuilderCredits,
} from "../_shared/mvp-builder-credit-reservations.ts";
import { emitBusinessEvent } from "../_shared/analytics.ts";

// Per-model provider pricing (USD per million tokens) for live margin
// measurement. Used only for telemetry, not for charging.
const MODEL_PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 15, output: 75 },
  "gemini-3.5-flash": { input: 0.3, output: 2.5 },
  "gemini-3.1-flash-lite": { input: 0.1, output: 0.4 },
  "deepseek-v4-flash": { input: 0.14, output: 0.28 },
};
// Lowest revenue-per-credit we sell (Starter annual: $79/12/100). Margin is
// measured against this floor so the alert reflects the worst-case plan.
const CREDIT_REVENUE_FLOOR_USD = 0.0658;
const MARGIN_FLOOR_RATIO = 0.4;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key",
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_OPENAI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEEPSEEK_OPENAI_API_URL = "https://api.deepseek.com/chat/completions";
const FREE_DEFAULT_MODEL = "gemini-3.5-flash";
const GEMINI_FALLBACK_MODEL = "gemini-3.1-flash-lite";
const PREMIUM_DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MODEL = FREE_DEFAULT_MODEL;
const DEEPSEEK_FALLBACK_MODEL = "deepseek-v4-flash";
const MAX_COMBO_MODELS = 3;
const MODEL_TIMEOUT_MS = 120000;
const PROVIDER_ERROR_TEXT_MAX = 600;

const SUPPORTED_MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-8",
  "claude-haiku-4-5-20251001",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "deepseek-v4-flash",
] as const;

const SUPPORTED_MODEL_SET = new Set<string>(SUPPORTED_MODELS);
const HTML_CAPABLE_MODEL_SET = new Set<string>(SUPPORTED_MODELS);
const SELECTABLE_MODEL_SET = new Set<string>(SUPPORTED_MODELS.filter((model) => model !== DEEPSEEK_FALLBACK_MODEL));

// Provider routing: Claude -> Anthropic, Gemini -> Google, DeepSeek -> DeepSeek.
function isClaudeModel(model: string): boolean {
  return model.startsWith("claude-");
}

function isGeminiModel(model: string): boolean {
  return model.startsWith("gemini-");
}

function isDeepSeekModel(model: string): boolean {
  return model.startsWith("deepseek-");
}

function isOpenAICompatibleModel(model: string): boolean {
  return isGeminiModel(model) || isDeepSeekModel(model);
}

type ModelProvider = "anthropic" | "google" | "deepseek";
type ModelAttemptFailure = {
  model: string;
  provider: ModelProvider;
  status?: number;
  category: string;
  message: string;
};

function getModelProvider(model: string): ModelProvider {
  if (isGeminiModel(model)) return "google";
  if (isDeepSeekModel(model)) return "deepseek";
  return "anthropic";
}

function compactProviderMessage(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "");
  return text.replace(/\s+/g, " ").trim().slice(0, PROVIDER_ERROR_TEXT_MAX);
}

function classifyProviderFailure(status: number | null, error: unknown): string {
  const message = compactProviderMessage(error).toLowerCase();
  const name = error instanceof Error ? error.name.toLowerCase() : "";
  if (name === "aborterror" || message.includes("abort")) return "timeout";
  if (message.includes("not configured")) return "missing_key";
  if (status === 401 || status === 403) return "auth";
  if (status === 400) return "invalid_request";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429 || message.includes("rate limit") || message.includes("quota") || message.includes("resource_exhausted")) {
    return "rate_limited";
  }
  if (typeof status === "number" && status >= 500) return "provider_unavailable";
  return "provider_error";
}

function createModelAttemptFailure(model: string, status: number | null, error: unknown): ModelAttemptFailure {
  return {
    model,
    provider: getModelProvider(model),
    ...(typeof status === "number" ? { status } : {}),
    category: classifyProviderFailure(status, error),
    message: compactProviderMessage(error) || "No provider error body returned",
  };
}

type MVPBuilderActionType = "generation" | "targeted_edit" | "debug" | "add_page" | "add_feature" | "design_overhaul" | "chat";
type MVPBuilderTemplateId = "waitlist_landing" | "saas_landing" | "community_landing" | "portfolio" | "simple_dashboard" | "marketplace_mvp" | "admin_panel" | "blank";
type MVPBuilderPaletteId = "minimal" | "bold" | "warm";

// Templates that produce html_single output vs react_vite
const LANDING_TEMPLATES = new Set<MVPBuilderTemplateId>([
  "waitlist_landing", "saas_landing", "community_landing", "portfolio", "blank",
]);

// model remains the premium default reference for each action. Runtime defaults
// are plan-specific: Gemini for Rookie/Starter, Sonnet for Rising/Pro.
// If the user explicitly selects an allowed model in the UI, their choice takes precedence.
// maxTokens must comfortably exceed a full ~700-line page embedded (escaped) in
// JSON, or the output gets truncated mid-string -> "Unterminated string in JSON".
const ACTION_CONFIG: Record<MVPBuilderActionType, { feature: CreditFeature; temperature: number; maxTokens: number; model: string }> = {
  generation:      { feature: "APP_BUILDER_GENERATE",        temperature: 0.45, maxTokens: 16000, model: "claude-sonnet-4-6" },
  targeted_edit:   { feature: "APP_BUILDER_REFINE",          temperature: 0.25, maxTokens: 12000, model: "claude-sonnet-4-6" },
  debug:           { feature: "APP_BUILDER_DEBUG",           temperature: 0.15, maxTokens: 10000, model: "claude-sonnet-4-6" },
  add_page:        { feature: "APP_BUILDER_ADD_PAGE",        temperature: 0.3,  maxTokens: 16000, model: "claude-sonnet-4-6" },
  add_feature:     { feature: "APP_BUILDER_ADD_FEATURE",     temperature: 0.35, maxTokens: 16000, model: "claude-sonnet-4-6" },
  design_overhaul: { feature: "APP_BUILDER_DESIGN_OVERHAUL", temperature: 0.45, maxTokens: 16000, model: "claude-sonnet-4-6" },
  chat:            { feature: "APP_BUILDER_CHAT",            temperature: 0.4,  maxTokens: 2000,  model: "claude-sonnet-4-6" },
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

8. NEVER BREAK EXISTING CODE. When making edits, modify only what the instruction specifies. Return the complete contents of every file you changed. The platform merges changed files back into the existing project, so do not recreate, rename, or restructure anything not mentioned in the request.

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
  "generation_notes": "2 to 3 short casual paragraphs written like a quick message from a builder friend. Say what you built and the main choices you made. NEVER use dashes of any kind (no em dash, no en dash, no hyphen as a pause). Write the way people actually text: short sentences, commas, periods. No bullet points, no numbered lists, no bold headers, no technical jargon, no mention of analytics or PostHog, no deployment or hosting instructions, no code references. Just talk to the founder like a human."
}
For html_single projects, package_json / dev_command / build_command are not needed — omit them or set to null.`;

// Per-action additions appended to the base system prompt
const ACTION_SYSTEM_ADDITIONS: Record<MVPBuilderActionType, string> = {
  generation: `
You are generating a new project from scratch. Generate the complete application in one response. Do not ask clarifying questions. Make strong decisions and go.

For generation_notes: write like you are texting a friend who just asked you to build something. 2 to 3 short paragraphs, casual and direct. Tell them what you built and why you made the main choices.

Hard rules for the message:
- NEVER use dashes. No em dash, no en dash, no hyphen used as a pause or aside. Use a comma, a period, or just split the sentence instead.
- No bullet points, no numbered lists, no bold headers.
- Do not mention analytics, PostHog, tracking events, hosting, or deployment.
- No technical jargon and no code references.
- Sound like a smart builder who gets product, not a documentation page.`,

  targeted_edit: `
You are making a targeted edit to an existing project. Rules:
1. Modify ONLY what the instruction asks. Do not touch anything else.
2. Return ONLY the modified file(s) inside the standard JSON schema. Do not return files that were not changed.
3. Return each modified file in its entirety — not just the changed lines.
4. Never introduce new dependencies or change project structure unless explicitly asked.
5. If the instruction is ambiguous, make the most reasonable interpretation and document it in generation_notes.`,

  debug: `
You are debugging an existing project. Rules:
1. Diagnose the most likely cause of the reported issue from the code and the description.
2. Fix only the bug. Do not refactor, improve, or change anything unrelated to the reported issue.
3. In generation_notes: tell the founder what was wrong and what you fixed, casually, like you are explaining it over Slack. One or two short paragraphs. Never use dashes (no em dash, en dash, or hyphen as a pause). No jargon, no code snippets, no bullet points.
4. If the bug cannot be definitively diagnosed, state your best hypothesis, apply the most likely fix, and tell the founder what to check if it does not resolve the issue.
5. Return only the files you modified, in their entirety, inside the standard JSON schema.`,

  add_page: `
You are adding a new page or screen to an existing project. Rules:
1. Match the existing code style exactly: same naming conventions, same indentation, same component patterns.
2. Match the existing visual design exactly: same colors, same spacing, same typography scale.
3. Wire up navigation to the new page (add nav link, update routing).
4. No breaking changes to existing functionality.
5. Return all modified files in their entirety inside the standard JSON schema.`,

  add_feature: `
You are adding a new feature to an existing project. Rules:
1. Integrate the feature into the existing code — do not restructure the project.
2. Match the existing code style exactly: same naming conventions, same indentation, same component patterns.
3. Match the existing visual style exactly: same colors, same spacing, same typography scale.
4. If the feature requires new dependencies, add them and document them in setup_instructions.
5. Add appropriate PostHog tracking events for the new feature.
6. In generation_notes: tell the founder what you added and how to use it, in 1 or 2 casual paragraphs. Conversational tone. Never use dashes (no em dash, en dash, or hyphen as a pause). No bullet points, no technical breakdown.
7. Return all modified files in their entirety inside the standard JSON schema.`,

  design_overhaul: `
You are redesigning the visual style of an existing project. Rules:
1. Change ONLY the visual layer: colors, typography, spacing, border radius, shadows, layout presentation.
2. Do NOT change: functionality, copy/text content, component structure, JavaScript logic, PostHog events, or routing.
3. All interactive behavior must remain exactly the same.
4. The result must be visually cohesive — one design language applied consistently across all files.
5. Return all files that contain visual styling changes, in their entirety, inside the standard JSON schema.`,

  chat: `
You are in chat mode. Reply conversationally in plain English.`,
};

// Chat mode uses its own standalone system prompt. It must NOT inherit the
// code-generation BASE prompt (that forces JSON output and breaks conversation).
const CHAT_SYSTEM_PROMPT = `You are a senior full-stack engineer and product advisor pairing with a founder inside an MVP builder tool. You are in CHAT mode: you talk with the founder, you do NOT write code or generate files.

How to respond:
- Reply in plain, natural English, like a sharp colleague messaging back. Short paragraphs. Get to the point.
- Read the conversation so far and the current project context, and give specific answers that reference what they actually built or asked. Never give generic boilerplate when you have real context to use.
- If they ask what something does, how to improve it, what to build next, a tradeoff, or how something works, answer directly and concretely.
- If they ask you to change or build something, say in a sentence what you would do, then tell them to switch to Build mode to make it happen. Do not output the code yourself.
- If a question is genuinely ambiguous, ask one short clarifying question instead of guessing.

Hard rules:
- Never use dashes. No em dash, no en dash, no hyphen as a pause. Use commas or periods.
- No JSON, no markdown headers, no bullet lists unless they explicitly ask for a list of options.
- Do not dump code. A tiny inline snippet is fine only if they directly ask for one.
- No filler like "Great question". Just answer and keep the conversation moving.`;

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

type MVPBuilderStatusPhase =
  | "reserved"
  | "deterministic_edit"
  | "model_attempt"
  | "streaming"
  | "local_repair"
  | "model_repair"
  | "validating"
  | "finalizing";

const STATUS_MESSAGES: Record<MVPBuilderStatusPhase, string> = {
  reserved: "Credits are held while I work.",
  deterministic_edit: "This is a simple text change. I can apply it directly.",
  model_attempt: "I am asking the selected model to make the change.",
  streaming: "The model is drafting the update.",
  local_repair: "I am cleaning up the output.",
  model_repair: "The output needs repair. I am fixing it before applying.",
  validating: "Checking the project before updating the preview.",
  finalizing: "The preview is ready.",
};

function statusEvent(phase: MVPBuilderStatusPhase) {
  return { type: "status", phase, message: STATUS_MESSAGES[phase] };
}

async function writeStatus(writer: WritableStreamDefaultWriter<Uint8Array>, phase: MVPBuilderStatusPhase) {
  await writer.write(enc(statusEvent(phase)));
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

function getPlanDefaultModel(plan: Plan): string {
  return isPlanAtLeast(plan, "rising") ? PREMIUM_DEFAULT_MODEL : FREE_DEFAULT_MODEL;
}

function isModelAllowedForPlan(model: string, plan: Plan): boolean {
  if (!SUPPORTED_MODEL_SET.has(model)) return false;
  return !isClaudeModel(model) || isPlanAtLeast(plan, "rising");
}

function normalizeSelectedModels(raw: unknown, plan: Plan): string[] {
  const defaultModel = getPlanDefaultModel(plan);
  if (!Array.isArray(raw)) return [defaultModel];
  const unique = Array.from(new Set(raw.filter((item): item is string => typeof item === "string")))
    .filter((model) => SELECTABLE_MODEL_SET.has(model) && isModelAllowedForPlan(model, plan))
    .slice(0, MAX_COMBO_MODELS);
  return unique.length > 0 ? unique : [defaultModel];
}

function getFallbackCandidates(primaryModel: string, plan: Plan): string[] {
  const geminiBackups = [FREE_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL].filter((model) => model !== primaryModel);
  const candidates = isGeminiModel(primaryModel)
    ? [primaryModel, ...geminiBackups, DEEPSEEK_FALLBACK_MODEL, getPlanDefaultModel(plan)]
    : [primaryModel, DEEPSEEK_FALLBACK_MODEL, getPlanDefaultModel(plan), ...geminiBackups];

  return Array.from(
    new Set(candidates)
  ).filter((model) => isModelAllowedForPlan(model, plan));
}

function getRepairCandidates(selectedModel: string, plan: Plan): string[] {
  return Array.from(
    new Set([
      DEEPSEEK_FALLBACK_MODEL,
      selectedModel,
      getPlanDefaultModel(plan),
      FREE_DEFAULT_MODEL,
      GEMINI_FALLBACK_MODEL,
    ])
  ).filter((model) => isModelAllowedForPlan(model, plan));
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

async function resolveUserPlan(userId: string): Promise<Plan> {
  const supabase = getAdminClient();
  if (!supabase) return "rookie";

  try {
    const { data: rpcTier } = await supabase.rpc("get_user_normalized_subscription_tier", {
      p_user_id: userId,
    });
    if (typeof rpcTier === "string" && rpcTier.trim()) {
      return normalizePlan(rpcTier);
    }

    const [{ data: subscriber }, { data: credits }, { data: profile }] = await Promise.all([
      supabase
        .from("subscribers")
        .select("subscription_tier")
        .eq("user_id", userId)
        .eq("subscribed", true)
        .maybeSingle(),
      supabase
        .from("user_credits")
        .select("subscription_tier")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    return normalizePlan(subscriber?.subscription_tier || credits?.subscription_tier || profile?.subscription_tier);
  } catch (error) {
    console.error("Unable to resolve MVP Builder plan, defaulting to rookie", error);
    return "rookie";
  }
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
  if (/\b(redesign|design overhaul|make it beautiful|modernize|visual refresh|new look|polish the design|theme|thematic|tematic|brand|rebrand|palette|colou?r scheme|aesthetic|look and feel|skin care|skincare)\b/.test(normalized)) return "design_overhaul";
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
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const jsonObject = extractBalancedJsonObject(cleaned);
    if (jsonObject) return JSON.parse(jsonObject);
    const htmlDocument = extractHtmlDocument(cleaned);
    if (htmlDocument) {
      return {
        project_type: "html_single",
        files: [{ path: "index.html", content: htmlDocument, description: "Generated HTML page." }],
      };
    }
    throw error;
  }
}

function extractHtmlDocument(value: string): string | null {
  const trimmed = value.trim();
  const fullDocument = trimmed.match(/(?:<!doctype\s+html[^>]*>\s*)?<html\b[\s\S]*?<\/html>/i)?.[0];
  if (fullDocument) return fullDocument.trim();
  return null;
}

function modelOutputNeedsLocalRepair(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^```/i.test(trimmed)
    || /<project-output>/i.test(trimmed)
    || Boolean(extractHtmlDocument(trimmed))
    || (trimmed[0] !== "{" && trimmed.includes("{"))
    || /"\s*filename"\s*:/.test(trimmed)
    || /"\s*patches"\s*:/.test(trimmed);
}

function extractBalancedJsonObject(value: string): string | null {
  const start = value.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < value.length; i += 1) {
    const char = value[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return value.slice(start, i + 1);
    }
  }

  return null;
}

function inferProjectTypeFromCurrentProject(currentProject: unknown): "html_single" | "react_vite" | null {
  if (!currentProject || typeof currentProject !== "object") return null;
  const project = currentProject as Record<string, unknown>;
  const framework = typeof project.framework === "string" ? project.framework : "";
  const projectType = typeof project.project_type === "string" ? project.project_type : "";
  if (framework === "react-vite" || framework === "react_vite" || projectType === "react_vite") {
    return "react_vite";
  }

  const files = normalizeCurrentProjectFiles(currentProject);
  const hasPackage = files.some((file) => file.path === "package.json");
  const hasReactEntry = files.some((file) => /^(src\/)?main\.(tsx|jsx|ts|js)$/.test(file.path));
  if (hasPackage && hasReactEntry) return "react_vite";
  if (files.some((file) => file.path.toLowerCase().endsWith(".html"))) return "html_single";
  return null;
}

function normalizeCurrentProjectFiles(currentProject: unknown): Array<{ path: string; content: string; description: string }> {
  if (!currentProject || typeof currentProject !== "object") return [];
  const rawFiles = (currentProject as Record<string, unknown>).files;
  if (!Array.isArray(rawFiles)) return [];

  return rawFiles.flatMap((file, index) => {
    if (!file || typeof file !== "object") return [];
    const item = file as Record<string, unknown>;
    const rawPath = typeof item.path === "string" ? item.path : item.filename;
    const path = typeof rawPath === "string" ? normalizeProjectPath(rawPath) : "";
    const content = typeof item.content === "string" ? item.content : "";
    if (!path || !content) return [];
    const description =
      typeof item.description === "string" && item.description.trim()
        ? item.description.trim()
        : index === 0
          ? "Primary project file."
          : `Existing project file ${path}.`;
    return [{ path, content, description }];
  });
}

function normalizeOutputFile(file: unknown, index: number): { path: string; content: string; description: string } | null {
  if (!file || typeof file !== "object") return null;
  const item = file as Record<string, unknown>;
  const rawPath = typeof item.path === "string" ? item.path : item.filename;
  const path = typeof rawPath === "string" ? normalizeProjectPath(rawPath) : "";
  if (!path) return null;
  const content = typeof item.content === "string" ? item.content : "";
  const description =
    typeof item.description === "string" && item.description.trim()
      ? item.description.trim()
      : index === 0
        ? "Primary modified project file."
        : `Modified project file ${path}.`;
  return { path, content, description };
}

function normalizeReplaceFilePatch(patch: unknown, index: number): { path: string; content: string; description: string } | null {
  if (!patch || typeof patch !== "object") return null;
  const item = patch as Record<string, unknown>;
  if (item.operation !== "replace_file") return null;
  const rawPath = typeof item.path === "string" ? item.path : item.filename;
  const path = typeof rawPath === "string" ? normalizeProjectPath(rawPath) : "";
  const content = typeof item.content === "string" ? item.content : "";
  if (!path || !content) return null;
  return {
    path,
    content,
    description: typeof item.description === "string" && item.description.trim()
      ? item.description.trim()
      : index === 0
        ? "Primary modified project file."
        : `Modified project file ${path}.`,
  };
}

function normalizeProjectTypeValue(value: unknown): "html_single" | "react_vite" | null {
  if (value === "html_single" || value === "react_vite") return value;
  if (value === "static-html" || value === "static_html" || value === "html") return "html_single";
  if (value === "react-vite" || value === "react" || value === "vite") return "react_vite";
  return null;
}

function normalizeModelOutputShape(
  raw: unknown,
  currentProject: unknown,
  actionType: MVPBuilderActionType
): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const source = raw as Record<string, unknown>;
  const projectEnvelope =
    source.project && typeof source.project === "object"
      ? source.project as Record<string, unknown>
      : source;
  const candidate: Record<string, unknown> = { ...projectEnvelope };

  const rawFiles = Array.isArray(candidate.files)
    ? candidate.files
    : Array.isArray(candidate.project_files)
      ? candidate.project_files
      : [];
  const patchFiles = Array.isArray(candidate.patches)
    ? candidate.patches.flatMap((patch, index) => {
        const normalized = normalizeReplaceFilePatch(patch, index);
        return normalized ? [normalized] : [];
      })
    : [];

  if (rawFiles.length > 0) {
    candidate.files = rawFiles;
  } else if (patchFiles.length > 0) {
    candidate.files = patchFiles;
  }

  const inferredProjectType =
    normalizeProjectTypeValue(candidate.project_type)
    ?? normalizeProjectTypeValue(candidate.projectType)
    ?? normalizeProjectTypeValue(candidate.framework)
    ?? inferProjectTypeFromCurrentProject(currentProject)
    ?? (Array.isArray(candidate.files) && candidate.files.some((file) => normalizeOutputFile(file, 0)?.path.endsWith(".html"))
      ? "html_single"
      : null);
  if (inferredProjectType) candidate.project_type = inferredProjectType;

  if (actionType !== "generation" && actionType !== "chat") {
    return mergeOutputWithCurrentProject(candidate, currentProject, actionType);
  }
  return candidate;
}

function mergeOutputWithCurrentProject(
  raw: unknown,
  currentProject: unknown,
  actionType: MVPBuilderActionType
): unknown {
  if (actionType === "generation" || actionType === "chat") return raw;
  if (!raw || typeof raw !== "object") return raw;

  const currentFiles = normalizeCurrentProjectFiles(currentProject);
  if (currentFiles.length === 0) return raw;

  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.files) || candidate.files.length === 0) return raw;

  const merged = new Map<string, { path: string; content: string; description: string }>();
  currentFiles.forEach((file) => merged.set(file.path, file));
  candidate.files.forEach((file, index) => {
    const normalized = normalizeOutputFile(file, index);
    if (normalized) merged.set(normalized.path, normalized);
  });

  const currentProjectType = inferProjectTypeFromCurrentProject(currentProject);
  const projectType =
    currentProjectType ??
    (candidate.project_type === "html_single" || candidate.project_type === "react_vite"
      ? candidate.project_type
      : null);

  return {
    ...candidate,
    project_type: projectType ?? candidate.project_type,
    files: Array.from(merged.values()).map((file) => ({
      path: file.path,
      content: file.content,
      description: file.description,
    })),
  };
}

function parseAndNormalizeModelOutput(
  fullText: string,
  currentProject: unknown,
  actionType: MVPBuilderActionType
): unknown {
  return normalizeModelOutputShape(parseModelJson(fullText), currentProject, actionType);
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
    const description =
      typeof item.description === "string" && item.description.trim()
        ? item.description.trim()
        : `Project file ${filename || index + 1}.`;
    if (!filename || !content.trim()) {
      throw new Error(`File ${index + 1} is missing filename or content`);
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

type SimpleTextEditKind = "hero_title" | "subheadline" | "button_text";
type SimpleTextEditResult =
  | { status: "updated"; output: ReturnType<typeof validateOutput> }
  | { status: "no_change" }
  | null;

const DASH_TEXT_PATTERN = /[-\u2010-\u2015]+/g;

function promptRequestsDashRemoval(input: string): boolean {
  return /\b(?:avoid|remove|without|no|do not use|don't use)\b.{0,40}\b(?:dash|dashes|hyphen|hyphens)\b/i.test(input)
    || /\b(?:dash|hyphen)[ -]?free\b/i.test(input);
}

function normalizeUserFacingText(input: string, avoidDashes: boolean): string {
  if (!avoidDashes) return input.trim();
  return input
    .replace(DASH_TEXT_PATTERN, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

function extractQuotedReplacement(input: string): string | null {
  const quotedMatches = [
    ...input.matchAll(/["“]([^"”]+)["”]/g),
    ...input.matchAll(/[‘']([^‘’']{3,})[’']/g),
  ];
  const last = quotedMatches.at(-1)?.[1];
  return typeof last === "string" && last.trim() ? last.trim() : null;
}

function getSimpleTextEditKind(input: string): SimpleTextEditKind | null {
  const normalized = input.toLowerCase();
  const asksForTextChange = /\b(change|replace|update|set|rename|remove)\b/.test(normalized);
  if (!asksForTextChange) return null;
  if (/\b(button|cta)(?:\s+text|\s+copy)?\b/.test(normalized)) return "button_text";
  if (/\b(subheadline|subheading|subtitle|sub\s+headline)\b/.test(normalized)) return "subheadline";
  if (/\b(hero(?:\s+section)?\s+(?:title|headline)|headline|title)\b/.test(normalized)) return "hero_title";
  return null;
}

function escapeMarkupText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/{/g, "&#123;")
    .replace(/}/g, "&#125;");
}

function replaceFirstTagText(content: string, tags: string[], replacement: string): string | null {
  const escaped = escapeMarkupText(replacement);
  for (const tag of tags) {
    const pattern = new RegExp(`(<${tag}\\b[^>]*>)[\\s\\S]*?(<\\/${tag}>)`, "i");
    if (pattern.test(content)) return content.replace(pattern, `$1${escaped}$2`);
  }
  return null;
}

function selectDeterministicEditTarget(
  files: Array<{ path: string; content: string; description: string }>,
  projectType: "html_single" | "react_vite" | null
) {
  if (projectType === "html_single") {
    return files.find((file) => file.path === "index.html")
      ?? files.find((file) => file.path.toLowerCase().endsWith(".html"))
      ?? null;
  }

  return files.find((file) => file.path === "src/App.tsx")
    ?? files.find((file) => file.path === "src/App.jsx")
    ?? files.find((file) => /(^|\/)App\.(tsx|jsx)$/.test(file.path))
    ?? files.find((file) => /\.(tsx|jsx)$/.test(file.path) && !/(^|\/)main\.(tsx|jsx)$/.test(file.path))
    ?? null;
}

function applySimpleTextEditToCurrentProject(
  userMessage: string,
  currentProject: unknown,
  actionType: MVPBuilderActionType
): SimpleTextEditResult {
  if (actionType === "generation" || actionType === "chat") return null;
  const files = normalizeCurrentProjectFiles(currentProject);
  if (files.length === 0) return null;

  const kind = getSimpleTextEditKind(userMessage);
  const replacement = extractQuotedReplacement(userMessage);
  if (!kind || !replacement) return null;

  const projectType =
    inferProjectTypeFromCurrentProject(currentProject)
    ?? (files.some((file) => file.path.toLowerCase().endsWith(".html")) ? "html_single" : "react_vite");
  const target = selectDeterministicEditTarget(files, projectType);
  if (!target) return null;

  const normalizedReplacement = normalizeUserFacingText(replacement, promptRequestsDashRemoval(userMessage));
  const tags =
    kind === "hero_title"
      ? ["h1"]
      : kind === "subheadline"
        ? ["p"]
        : ["button", "a"];
  const updatedContent = replaceFirstTagText(target.content, tags, normalizedReplacement);
  if (!updatedContent) return null;
  if (updatedContent === target.content) return { status: "no_change" };

  const output = validateOutput({
    project_type: projectType,
    files: files.map((file) => ({
      path: file.path,
      content: file.path === target.path ? updatedContent : file.content,
      description: file.path === target.path ? "Updated project text." : file.description,
    })),
    generation_notes: "I found the text and updated it. The rest of the project stayed the same.",
    posthog_events: [],
  });
  return { status: "updated", output };
}

function validationErrorCategory(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/JSON|object|project_type|files|filename|content/i.test(message)) return "schema";
  if (/title tag|meta description|track|HTML/i.test(message)) return "html_contract";
  if (/package\.json|React|vite|main entry|App\./i.test(message)) return "react_contract";
  if (/placeholder|incomplete copy/i.test(message)) return "placeholder_or_incomplete";
  if (/empty/i.test(message)) return "empty_output";
  return "unknown";
}

function logMVPBuilderFailedAttempt(details: {
  actionType: MVPBuilderActionType;
  selectedModel: string;
  repairModel?: string | null;
  validationErrorCategory: string;
  deterministicEditAttempted: boolean;
  creditsReleased: boolean;
}) {
  console.warn(JSON.stringify({
    level: "warn",
    message: "mvp_builder_failed_attempt",
    action_type: details.actionType,
    selected_model: details.selectedModel,
    repair_model: details.repairModel ?? null,
    validation_error_category: details.validationErrorCategory,
    deterministic_edit_attempted: details.deterministicEditAttempted,
    credits_released: details.creditsReleased,
  }));
}

function emitMVPBuilderTelemetry(eventName: string, userId: string, properties: Record<string, unknown>) {
  void emitBusinessEvent({
    eventName,
    userId,
    properties,
  }).catch((error) => {
    console.error("MVP Builder telemetry failed", eventName, error);
  });
}

function emitMVPGenerationFailed({
  userId,
  reservationId,
  errorCode,
  released,
  heldCredits,
}: {
  userId: string;
  reservationId: string;
  errorCode: string;
  released: { success?: boolean; wasReleased?: boolean; heldCredits?: number };
  heldCredits: number;
}) {
  if (!released.success || !released.wasReleased) return;
  emitMVPBuilderTelemetry("generation_failed", userId, {
    tool: "mvp_builder",
    error_code: errorCode,
    credits_refunded: Number(released.heldCredits ?? heldCredits),
    operation_id: reservationId,
  });
}

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
    const hasProject = params.currentProject && typeof params.currentProject === "object"
      && Array.isArray((params.currentProject as Record<string, unknown>).files)
      && ((params.currentProject as Record<string, unknown>).files as unknown[]).length > 0;
    const projectBlock = hasProject
      ? `Their current project (for reference, so your answer is specific to what they actually built):\n${JSON.stringify(params.currentProject, null, 2)}`
      : `They have not generated a project yet.`;
    const contextBlock = founderContext ? `\n\n${founderContext}` : "";
    return `Use the conversation so far plus the context below to answer the founder accurately.

The founder just said:
${params.userMessage}

${projectBlock}${contextBlock}

Reply directly and conversationally.`;
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

// ─── AI provider functions ────────────────────────────────────────────────────

async function requestModelStream(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    if (isOpenAICompatibleModel(model)) {
      const apiKey = isGeminiModel(model)
        ? Deno.env.get("GEMINI_API_KEY")
        : Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) {
        throw new Error(`${isGeminiModel(model) ? "GEMINI_API_KEY" : "DEEPSEEK_API_KEY"} not configured`);
      }
      const body: Record<string, unknown> = {
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      };
      if (isGeminiModel(model)) {
        body.reasoning_effort = "low";
      }
      if (isDeepSeekModel(model)) {
        body.thinking = { type: "disabled" };
      }
      return await fetch(isGeminiModel(model) ? GEMINI_OPENAI_API_URL : DEEPSEEK_OPENAI_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured for Claude models");
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
        // Cache the large static system prompt so repeated iterations start
        // faster and cost less (cache hit on calls within ~5 min).
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
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
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    if (isOpenAICompatibleModel(model)) {
      const apiKey = isGeminiModel(model)
        ? Deno.env.get("GEMINI_API_KEY")
        : Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) {
        throw new Error(`${isGeminiModel(model) ? "GEMINI_API_KEY" : "DEEPSEEK_API_KEY"} not configured`);
      }
      const body: Record<string, unknown> = {
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false,
      };
      if (isGeminiModel(model)) {
        body.reasoning_effort = "low";
      }
      if (isDeepSeekModel(model)) {
        body.thinking = { type: "disabled" };
      }
      const response = await fetch(isGeminiModel(model) ? GEMINI_OPENAI_API_URL : DEEPSEEK_OPENAI_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured for Claude models");
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
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
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

async function repairModelOutputWithFallback(
  modelCandidates: string[],
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: { temperature: number; maxTokens: number },
  currentProject: unknown,
  actionType: MVPBuilderActionType,
  onRepairAccepted?: (model: string, usedLocalRepair: boolean) => void | Promise<void>
): Promise<ReturnType<typeof validateOutput>> {
  let lastError: unknown = null;
  for (const candidate of modelCandidates) {
    try {
      const repaired = await requestModelJson(candidate, systemPrompt, messages, config);
      const usedLocalRepair = modelOutputNeedsLocalRepair(repaired);
      const validated = validateOutput(parseAndNormalizeModelOutput(repaired, currentProject, actionType));
      await onRepairAccepted?.(candidate, usedLocalRepair);
      return validated;
    } catch (error) {
      lastError = error;
      console.error("AI repair model failed:", candidate, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No repair model produced a valid project");
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
  const authUser = await getUserFromAuth(req);
  const userPlan = authUser ? await resolveUserPlan(authUser.id) : "rookie";

  if (mode === "classify") {
    const isActionable = classifiedAction !== "unsupported" && classifiedAction !== "unclear";
    const feature = isActionable ? ACTION_CONFIG[classifiedAction].feature : null;
    let classifyCost = 0;
    if (isActionable && feature) {
      const actionDefaultModel = resolveMVPActionDefaultModelForPlan(feature, userPlan);
      const classifyModels = normalizeSelectedModels(body.selectedModels, userPlan).filter((m) => HTML_CAPABLE_MODEL_SET.has(m));
      const classifyModel = classifyModels[0] ?? actionDefaultModel;
      classifyCost = resolveModelAdjustedCreditCost(CREDIT_COSTS[feature], classifyModel, actionDefaultModel);
    }
    return jsonResponse({
      actionType: classifiedAction,
      creditFeature: feature,
      creditCost: classifyCost,
      wallet: "platform",
    });
  }

  if (!userMessage.trim()) return errorStream("userMessage is required", "BAD_REQUEST");
  if (classifiedAction === "unclear") return errorStream("Please clarify what you want MVP Builder to change.", "UNCLEAR_ACTION");
  if (classifiedAction === "unsupported") {
    return errorStream(
      "That request needs backend/auth/payment support planned for a later phase. Phase 2 supports frontend app generation, targeted edits, bug fixes, add-page, add-feature, and design overhaul.",
      "UNSUPPORTED_ACTION"
    );
  }

  const user = authUser;
  if (!user) return errorStream("Authentication required", "UNAUTHORIZED");

  const template  = normalizeTemplate(body.template ?? (body.setupInput as Record<string, unknown> | undefined)?.template);
  const palette   = normalizePalette(body.palettePreference ?? (body.setupInput as Record<string, unknown> | undefined)?.palettePreference);
  const userId    = user.id;
  const creditFeature = ACTION_CONFIG[classifiedAction].feature;
  const defaultModel  = resolveMVPActionDefaultModelForPlan(creditFeature, userPlan);

  // Resolve the model BEFORE reserving so the charge reflects the model choice.
  const selectedModels = normalizeSelectedModels(body.selectedModels, userPlan);
  const textCapableModels = selectedModels.filter((m) => HTML_CAPABLE_MODEL_SET.has(m));
  const userExplicitModel = textCapableModels[0];
  const primaryModel = userExplicitModel ?? defaultModel;
  const modelCandidates = getFallbackCandidates(primaryModel, userPlan);

  // Charge the base cost at the action's default model; surcharge proportionally
  // when the user upgrades to a pricier model so cost-per-credit stays bounded
  // and margin is guaranteed regardless of model. (A premium model also costs
  // enough credits to be unaffordable on the free tier, self-gating it there.)
  const baseCreditCost = CREDIT_COSTS[creditFeature];
  const creditCost     = resolveModelAdjustedCreditCost(baseCreditCost, primaryModel, defaultModel);
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
      model: primaryModel,
      baseCreditCost,
      projectId: typeof body.projectId === "string" ? body.projectId : undefined,
      currentVersion: typeof body.currentVersion === "number" ? body.currentVersion : undefined,
    }
  );

  if (!reservation.success || !reservation.reservationId) {
    return errorStream(
      reservation.errorCode === "INSUFFICIENT_CREDITS"
        ? `You need ${creditCost} credits for this MVP Builder action${primaryModel !== defaultModel ? ` with the selected model` : ""}. Upgrade your plan, switch to a lighter model, or buy a credit pack.`
        : "Unable to reserve credits. Please try again.",
      reservation.errorCode
    );
  }
  const reservationId = reservation.reservationId;
  const heldCredits = Number(reservation.heldCredits ?? 0);
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

  // Build the per-action system prompt. Chat mode uses a standalone
  // conversational prompt; all build actions extend the code-generation BASE.
  const actionAddition = ACTION_SYSTEM_ADDITIONS[classifiedAction];
  const systemPrompt = classifiedAction === "chat"
    ? CHAT_SYSTEM_PROMPT
    : actionAddition
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

  const deterministicEditAttempted = Boolean(
    hasExistingProject &&
      classifiedAction !== "generation" &&
      classifiedAction !== "chat" &&
      getSimpleTextEditKind(userMessage) &&
      extractQuotedReplacement(userMessage)
  );
  let deterministicEdit: SimpleTextEditResult = null;
  if (deterministicEditAttempted) {
    try {
      deterministicEdit = applySimpleTextEditToCurrentProject(userMessage, currentProject, classifiedAction);
    } catch (error) {
      console.error("MVP Builder deterministic edit failed before model fallback", {
        action_type: classifiedAction,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (deterministicEdit) {
    const deterministicResult = deterministicEdit;
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    (async () => {
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
        await writeStatus(writer, "reserved");
        await writeStatus(writer, "deterministic_edit");

        if (deterministicResult.status === "no_change") {
          const released = await releaseMVPBuilderCredits(reservationId, "MVP Builder deterministic edit produced no material change");
          emitMVPGenerationFailed({ userId, reservationId, errorCode: "NO_MATERIAL_CHANGE", released, heldCredits });
          await writer.write(enc({ type: "credit-released", ...released, releaseReason: "no_material_change" }));
          await writer.write(enc({
            type: "error",
            error: "No project changes were needed. Held credits have been released.",
            errorCode: "NO_MATERIAL_CHANGE",
          }));
          await writer.write(encDone());
          return;
        }

        await writeStatus(writer, "validating");
        let validated = deterministicResult.output;
        if (posthogKey) {
          validated = {
            ...validated,
            files: validated.files.map((file) => ({
              ...file,
              content: file.content.replace(/POSTHOG_KEY/g, posthogKey),
            })),
          };
        }

        if (!hasMaterialProjectChange(currentProject, validated)) {
          const released = await releaseMVPBuilderCredits(reservationId, "MVP Builder deterministic edit produced no material change");
          emitMVPGenerationFailed({ userId, reservationId, errorCode: "NO_MATERIAL_CHANGE", released, heldCredits });
          await writer.write(enc({ type: "credit-released", ...released, releaseReason: "no_material_change" }));
          await writer.write(enc({
            type: "error",
            error: "No project changes were needed. Held credits have been released.",
            errorCode: "NO_MATERIAL_CHANGE",
          }));
          await writer.write(encDone());
          return;
        }

        await writeStatus(writer, "finalizing");
        const finalized = await finalizeMVPBuilderCredits(reservationId, {
          mvpBuilderActionType: classifiedAction,
          completionBoundary: "deterministic_edit_accepted",
        });
        if (!finalized.success) throw new Error("Unable to finalize MVP Builder credits");
        await writer.write(enc({ type: "credit-finalized", ...finalized }));
        emitMVPBuilderTelemetry("mvp_builder_deterministic_edit_used", userId, {
          action_type: classifiedAction,
          model: primaryModel,
        });
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
        await writer.write(enc({ type: "complete", model: primaryModel, requestedModels: selectedModels }));
        await writer.write(encDone());
      } catch (err) {
        console.error("Deterministic edit stream error:", err);
        const released = await releaseMVPBuilderCredits(reservationId, "Deterministic edit stream error", {
          error: err instanceof Error ? err.message : String(err),
        }).catch(() => ({ success: false }));
        emitMVPGenerationFailed({ userId, reservationId, errorCode: "STREAM_ERROR", released, heldCredits });
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
  }

  let selectedModel = modelCandidates[0];
  let aiResponse: Response | null = null;
  let lastApiError = "";
  const providerErrors: ModelAttemptFailure[] = [];

  for (const candidate of modelCandidates) {
    selectedModel = candidate;
    try {
      const attempt = await requestModelStream(
        candidate,
        systemPrompt,
        messages,
        ACTION_CONFIG[classifiedAction]
      );
      if (attempt.ok) {
        aiResponse = attempt;
        break;
      }
      const errorText = await attempt.text();
      const failure = createModelAttemptFailure(candidate, attempt.status, errorText);
      providerErrors.push(failure);
      lastApiError = `${failure.model}:${failure.status ?? "exception"}:${failure.category}:${failure.message}`;
      console.error("AI model attempt failed:", failure);
    } catch (err) {
      const failure = createModelAttemptFailure(candidate, null, err);
      providerErrors.push(failure);
      lastApiError = `${failure.model}:exception:${failure.category}:${failure.message}`;
      console.error("AI model request failed:", failure);
    }
  }

  if (!aiResponse) {
    const released = await releaseMVPBuilderCredits(
      reservationId,
      "AI API error",
      { lastApiError, providerErrors },
    ).catch(() => ({ success: false }));
    emitMVPGenerationFailed({ userId, reservationId, errorCode: "AI_ERROR", released, heldCredits });
    console.error("All MVP Builder model attempts failed", {
      actionType: classifiedAction,
      primaryModel,
      selectedModel,
      deterministicEditAttempted,
      providerErrors,
    });
    logMVPBuilderFailedAttempt({
      actionType: classifiedAction,
      selectedModel,
      repairModel: null,
      validationErrorCategory: "ai_error",
      deterministicEditAttempted,
      creditsReleased: true,
    });
    return errorStream("AI service temporarily unavailable. Held credits have been released. Please try again.", "AI_ERROR");
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    const reader = aiResponse!.body!.getReader();
    const decoder = new TextDecoder();
    const usingOpenAICompatible = isOpenAICompatibleModel(selectedModel);
    let buffer = "";
    let fullText = "";
    let sawStop = false;
    // Live margin measurement: captured from Anthropic stream usage events.
    let inputTokens = 0;
    let outputTokens = 0;

    // Emit per-action cost + margin telemetry once credits are finalized.
    const emitCostTelemetry = async (creditsCharged: number) => {
      try {
        const pricing = MODEL_PRICING_PER_MTOK[selectedModel] ?? MODEL_PRICING_PER_MTOK[DEFAULT_MODEL];
        const usdCost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        const revenueFloor = creditsCharged * CREDIT_REVENUE_FLOOR_USD;
        const marginRatio = revenueFloor > 0 ? (revenueFloor - usdCost) / revenueFloor : 1;
        await emitBusinessEvent({
          eventName: "mvp_builder_action_cost",
          userId,
          properties: {
            action_type: classifiedAction,
            model: selectedModel,
            requested_models: selectedModels,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            usd_cost: Number(usdCost.toFixed(6)),
            credits_charged: creditsCharged,
            credit_revenue_floor_usd: Number(revenueFloor.toFixed(6)),
            margin_ratio: Number(marginRatio.toFixed(4)),
          },
        });
        if (marginRatio < MARGIN_FLOOR_RATIO) {
          console.warn(JSON.stringify({
            level: "warn", message: "mvp_builder_margin_below_floor",
            model: selectedModel, action: classifiedAction, usdCost, creditsCharged, marginRatio,
          }));
          await emitBusinessEvent({
            eventName: "mvp_builder_margin_alert",
            userId,
            properties: {
              action_type: classifiedAction, model: selectedModel,
              usd_cost: Number(usdCost.toFixed(6)), credits_charged: creditsCharged,
              margin_ratio: Number(marginRatio.toFixed(4)),
            },
          });
        }
      } catch (telemetryError) {
        console.error("emitCostTelemetry failed", telemetryError);
      }
    };

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
      await writeStatus(writer, "reserved");
      await writeStatus(writer, "model_attempt");
      await writeStatus(writer, "streaming");

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
          // OpenAI-compatible stream terminator (Gemini and DeepSeek)
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

          if (usingOpenAICompatible) {
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

          // Anthropic usage accounting (for live margin measurement).
          if (event.type === "message_start") {
            const usage = (event.message as Record<string, unknown> | undefined)?.usage as Record<string, unknown> | undefined;
            if (usage) {
              inputTokens = Number(usage.input_tokens ?? 0)
                + Number(usage.cache_creation_input_tokens ?? 0)
                + Number(usage.cache_read_input_tokens ?? 0);
            }
          }
          if (event.type === "message_delta") {
            const usage = event.usage as Record<string, unknown> | undefined;
            if (usage && typeof usage.output_tokens === "number") outputTokens = usage.output_tokens;
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
          emitMVPGenerationFailed({ userId, reservationId, errorCode: "EMPTY_OUTPUT", released, heldCredits });
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
        void emitCostTelemetry(Number(finalized.creditsUsed ?? heldCredits));
        await writer.write(enc({ type: "complete", model: selectedModel, requestedModels: selectedModels }));
        await writer.write(encDone());
        return;
      }

      // Validate and emit the structured project event
      let validated: ReturnType<typeof validateOutput>;
      const usedLocalRepair = modelOutputNeedsLocalRepair(fullText);
      try {
        if (usedLocalRepair) await writeStatus(writer, "local_repair");
        await writeStatus(writer, "validating");
        validated = validateOutput(parseAndNormalizeModelOutput(fullText, currentProject, classifiedAction));
        if (usedLocalRepair) {
          emitMVPBuilderTelemetry("mvp_builder_local_repair_used", userId, {
            action_type: classifiedAction,
            model: selectedModel,
          });
        }
      } catch (validationError) {
        const repairModels = getRepairCandidates(selectedModel, userPlan);
        await writeStatus(writer, "model_repair");
        try {
          validated = await repairModelOutputWithFallback(
            repairModels,
            systemPrompt,
            [
              ...messages,
              {
                role: "user",
                content: `Repair the previous response into valid MVP Builder JSON only. Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}

For edit, debug, add page, add feature, and design overhaul actions, returning only changed files is allowed. Keep each returned file complete. The platform will merge changed files into the current project before validation.

Current project:
${JSON.stringify(currentProject, null, 2)}

Previous response:
${fullText}`,
              },
            ],
            { temperature: 0.1, maxTokens: ACTION_CONFIG[classifiedAction].maxTokens + 2000 },
            currentProject,
            classifiedAction,
            async (repairModel, repairUsedLocalRepair) => {
              emitMVPBuilderTelemetry("mvp_builder_model_repair_used", userId, {
                action_type: classifiedAction,
                selected_model: selectedModel,
                repair_model: repairModel,
              });
              if (repairUsedLocalRepair) {
                emitMVPBuilderTelemetry("mvp_builder_local_repair_used", userId, {
                  action_type: classifiedAction,
                  model: repairModel,
                  source: "repair_candidate",
                });
              }
            }
          );
        } catch (repairError) {
          const retry = deterministicEditAttempted
            ? (() => {
                try {
                  return applySimpleTextEditToCurrentProject(userMessage, currentProject, classifiedAction);
                } catch (error) {
                  console.error("MVP Builder deterministic retry failed", {
                    action_type: classifiedAction,
                    error: error instanceof Error ? error.message : String(error),
                  });
                  return null;
                }
              })()
            : null;
          if (retry?.status === "updated") {
            await writeStatus(writer, "deterministic_edit");
            validated = retry.output;
            emitMVPBuilderTelemetry("mvp_builder_deterministic_edit_used", userId, {
              action_type: classifiedAction,
              model: selectedModel,
              source: "final_retry",
            });
          } else if (retry?.status === "no_change") {
            const released = await releaseMVPBuilderCredits(reservationId, "MVP Builder deterministic retry produced no material change");
            emitMVPGenerationFailed({ userId, reservationId, errorCode: "NO_MATERIAL_CHANGE", released, heldCredits });
            await writer.write(enc({ type: "credit-released", ...released, releaseReason: "no_material_change" }));
            await writer.write(enc({
              type: "error",
              error: "No project changes were needed. Held credits have been released.",
              errorCode: "NO_MATERIAL_CHANGE",
            }));
            await writer.write(encDone());
            return;
          } else {
            const released = await releaseMVPBuilderCredits(
              reservationId,
              "Invalid MVP Builder JSON output",
              {
                validationError: validationError instanceof Error ? validationError.message : String(validationError),
                repairError: repairError instanceof Error ? repairError.message : String(repairError),
              }
            );
            emitMVPGenerationFailed({ userId, reservationId, errorCode: "VALIDATION_FAILED", released, heldCredits });
            logMVPBuilderFailedAttempt({
              actionType: classifiedAction,
              selectedModel,
              repairModel: repairModels.join(","),
              validationErrorCategory: validationErrorCategory(validationError),
              deterministicEditAttempted,
              creditsReleased: true,
            });
            emitMVPBuilderTelemetry("mvp_builder_validation_failed_after_all_repair", userId, {
              action_type: classifiedAction,
              selected_model: selectedModel,
              repair_models: repairModels,
              validation_error_category: validationErrorCategory(validationError),
              deterministic_edit_attempted: deterministicEditAttempted,
            });
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
        emitMVPGenerationFailed({ userId, reservationId, errorCode: "NO_MATERIAL_CHANGE", released, heldCredits });
        logMVPBuilderFailedAttempt({
          actionType: classifiedAction,
          selectedModel,
          repairModel: null,
          validationErrorCategory: "no_material_change",
          deterministicEditAttempted,
          creditsReleased: true,
        });
        await writer.write(enc({ type: "credit-released", ...released, releaseReason: "no_material_change" }));
        await writer.write(enc({
          type: "error",
          error: "No project changes were needed. Held credits have been released.",
          errorCode: "NO_MATERIAL_CHANGE",
        }));
        await writer.write(encDone());
        return;
      }

      await writeStatus(writer, "finalizing");
      const finalized = await finalizeMVPBuilderCredits(reservationId, {
        mvpBuilderActionType: classifiedAction,
        completionBoundary: "valid_artifact_accepted",
      });
      if (!finalized.success) throw new Error("Unable to finalize MVP Builder credits");
      await writer.write(enc({ type: "credit-finalized", ...finalized }));
      void emitCostTelemetry(Number(finalized.creditsUsed ?? heldCredits));
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
      emitMVPGenerationFailed({ userId, reservationId, errorCode: "STREAM_ERROR", released, heldCredits });
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
