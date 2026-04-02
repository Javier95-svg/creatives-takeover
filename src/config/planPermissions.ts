/**
 * SINGLE SOURCE OF TRUTH for all plan-based access rules.
 *
 * Never scatter plan logic in individual components.
 * Components should call usePlanAccess(feature) instead of reading this directly.
 */

export type Plan = 'rookie' | 'rising' | 'pro';

export type AccessRule =
  | 'full'                        // Fully accessible, no restrictions
  | 'free'                        // Accessible, no credits charged
  | 'credits'                     // Accessible, costs credits per use
  | 'locked'                      // Hard locked — show upgrade prompt (Pattern A or B)
  | 'locked_progressive'          // Locked until prior stages completed (Rookie only, Pattern B)
  | 'list_only'                   // Can browse list but cannot open profiles
  | 'quota_3_per_month'           // Up to 3 uses per calendar month
  | 'quota_3_free_then_credits'   // 3 free per month, then 10 credits each
  | 'business_case_only';         // Only "Business Case" category unlocked (Prompt Library)

/**
 * Feature permission matrix.
 * Key = feature identifier used by usePlanAccess()
 * Value = { rookie, rising, pro } access rules
 */
export const PLAN_PERMISSIONS: Record<string, Record<Plan, AccessRule>> = {
  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard_mode: { rookie: 'full', rising: 'full', pro: 'full' },

  // ─── Stage 1–3 Tools (all plans can access) ───────────────────────────────
  icp_builder:    { rookie: 'free',    rising: 'free',    pro: 'free' },
  waitlist_maker: { rookie: 'credits', rising: 'credits', pro: 'credits' },
  pmf_lab:        { rookie: 'credits', rising: 'credits', pro: 'credits' },

  // ─── Stage 4–5 Tools (Rookie: progressive lock; Rising/Pro: credits) ──────
  mvp_builder:    { rookie: 'locked_progressive', rising: 'credits', pro: 'credits' },
  tech_stack:     { rookie: 'locked_progressive', rising: 'credits', pro: 'credits' },
  gtm_strategist: { rookie: 'locked_progressive', rising: 'credits', pro: 'credits' },
  directories:    { rookie: 'locked_progressive', rising: 'credits', pro: 'credits' },

  // ─── Community ────────────────────────────────────────────────────────────
  // Discovery calls: Rookie = 10 credits each; Rising = 3 free/month then 10 credits; Pro = unlimited
  discovery_calls:  { rookie: 'credits', rising: 'quota_3_free_then_credits', pro: 'full' },
  cofounder_posts:  { rookie: 'credits', rising: 'credits',                    pro: 'credits' },
  angels_community: { rookie: 'locked',  rising: 'locked',                     pro: 'full' },

  // ─── VC Search & Accelerator Hunt ─────────────────────────────────────────
  // All plans can browse the list; profile views are gated
  vc_search_browse:        { rookie: 'full',   rising: 'full',              pro: 'full' },
  vc_search_profile:       { rookie: 'locked', rising: 'quota_3_per_month', pro: 'full' },
  accelerator_browse:      { rookie: 'full',   rising: 'full',              pro: 'full' },
  accelerator_profile:     { rookie: 'locked', rising: 'quota_3_per_month', pro: 'full' },

  // ─── Insighta Tools ───────────────────────────────────────────────────────
  email_templates:      { rookie: 'locked',  rising: 'full',    pro: 'full' },
  pitch_deck_analyzer:  { rookie: 'locked',  rising: 'credits', pro: 'credits' },
  prompt_library:       { rookie: 'business_case_only', rising: 'full', pro: 'full' },
  insighta_test:        { rookie: 'full',    rising: 'full',    pro: 'full' },

  // ─── Open to all ──────────────────────────────────────────────────────────
  newspaper: { rookie: 'full', rising: 'full', pro: 'full' },
  profile:   { rookie: 'full', rising: 'full', pro: 'full' },

  // ─── Pro Exclusives ───────────────────────────────────────────────────────
  whatsapp_group: { rookie: 'locked', rising: 'locked', pro: 'full' },
};

/**
 * Monthly free quotas per plan.
 * Infinity = unlimited (Pro tier).
 * 0 = no free quota (must use credits or is locked).
 */
export const MONTHLY_FREE_QUOTAS: Record<string, Record<Plan, number>> = {
  discovery_calls:        { rookie: 0, rising: 3, pro: Infinity },
  vc_profiles:            { rookie: 0, rising: 3, pro: Infinity },
  accelerator_profiles:   { rookie: 0, rising: 3, pro: Infinity },
};

/** Human-readable plan labels */
export const PLAN_LABELS: Record<Plan, string> = {
  rookie: 'Rookie',
  rising: 'Rising',
  pro: 'Pro',
};

/** Upgrade target for each locked rule */
export const UPGRADE_TARGET: Partial<Record<AccessRule, Plan>> = {
  locked: 'rising',             // default; override per-feature in component if needed
  locked_progressive: 'rising', // Stage 4-5 tools unlock by completing stages first
  list_only: 'rising',
  quota_3_per_month: 'pro',
  business_case_only: 'rising',
};
