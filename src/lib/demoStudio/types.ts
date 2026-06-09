// Demo Studio domain types. These mirror the demo_studio_* tables created in
// supabase/migrations/20260607120000_demo_studio_foundation.sql. The generated
// Supabase types do not yet include these tables, so the data layer casts table
// names with `as any` and relies on these interfaces for type safety.

export type DemoStatus = 'draft' | 'published';
export type HotspotType = 'hotspot' | 'tooltip' | 'callout';
export type HotspotAction = 'next' | 'goto' | 'url';
export type CaptureMethod = 'upload' | 'screen' | 'extension';
export type DemoStudioGeneratorMode = 'full_kit' | 'storyboard' | 'vsl_scripts' | 'launch_copy';
export type DemoStudioTone = 'professional' | 'friendly' | 'bold' | 'conversational' | 'inspirational';
export type DemoStudioProductStage = 'idea' | 'prototype' | 'mvp' | 'launched';
export type DemoStudioGoal = 'collect_signups' | 'book_calls' | 'validate_interest' | 'sell_product';
export type DemoStudioMetricsWindow = 'all' | '7d' | '30d';
export type DemoStudioEventType =
  | 'demo_view'
  | 'demo_start'
  | 'demo_complete'
  | 'demo_step'
  | 'launch_page_view'
  | 'vsl_impression'
  | 'vsl_play'
  | 'vsl_complete'
  | 'cta_click'
  | 'signup_attempt'
  | 'signup'
  | 'waitlist_signup';

export interface DemoTheme {
  primaryColor?: string;
  buttonStyle?: 'solid' | 'outline';
  watermark?: boolean;
  endCtaLabel?: string;
  endCtaHref?: string;
  brief?: {
    audience?: string;
    promise?: string;
    ahaMoment?: string;
    cta?: string;
  };
}

export interface DemoStudioProject {
  id: string;
  owner_id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  category: string | null;
  slug: string | null;
  launch_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DemoStudioDemo {
  id: string;
  project_id: string;
  owner_id: string;
  title: string;
  public_id: string | null;
  status: DemoStatus;
  capture_method: CaptureMethod;
  theme: DemoTheme;
  created_at: string;
  updated_at: string;
}

export interface DemoStudioStep {
  id: string;
  demo_id: string;
  position: number;
  asset_url: string | null;
  asset_width: number | null;
  asset_height: number | null;
  title: string | null;
  caption: string | null;
  speaker_notes: string | null;
  created_at: string;
}

export interface DemoStudioHotspot {
  id: string;
  step_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: HotspotType;
  label: string | null;
  action: HotspotAction;
  action_target: string | null;
  created_at: string;
}

export interface DemoStepWithHotspots extends DemoStudioStep {
  hotspots: DemoStudioHotspot[];
}

export interface PublicDemo {
  demo: DemoStudioDemo;
  steps: DemoStepWithHotspots[];
}

export interface DemoStudioStoryboardStep {
  title: string;
  caption: string;
  speaker_notes: string;
  hotspot_label: string;
  suggested_action: HotspotAction;
}

export interface DemoStudioVslScript {
  variation: 'A' | 'B' | 'C';
  title: string;
  hook: string;
  outline: string[];
  script: string;
  target_duration_seconds: number;
}

export interface DemoStudioLaunchHeadline {
  variant: 'A' | 'B' | 'C';
  headline: string;
  subheadline: string;
  rationale: string;
}

export interface DemoStudioLaunchCopy {
  headlines: DemoStudioLaunchHeadline[];
  subheadline: string;
  cta_label: string;
  proof_bullets: string[];
  success_message?: string;
}

export interface DemoStudioAiKit {
  storyboard?: DemoStudioStoryboardStep[];
  vsl_scripts?: DemoStudioVslScript[];
  launch_copy?: DemoStudioLaunchCopy;
}

export interface DemoStudioBrief {
  id: string;
  project_id: string;
  owner_id: string;
  audience: string | null;
  problem: string | null;
  product_promise: string | null;
  aha_moment: string | null;
  primary_cta_label: string | null;
  primary_cta_url: string | null;
  tone: DemoStudioTone;
  product_stage: DemoStudioProductStage;
  demo_goal: DemoStudioGoal;
  ai_storyboard: DemoStudioStoryboardStep[] | null;
  ai_vsl_scripts: DemoStudioVslScript[] | null;
  ai_launch_copy: DemoStudioLaunchCopy | null;
  created_at: string;
  updated_at: string;
}

export interface DemoStudioVsl {
  id: string;
  project_id: string;
  owner_id: string;
  variation_label: string | null;
  title: string | null;
  hook: string | null;
  loom_video_id: string | null;
  loom_shared_url: string | null;
  loom_embed_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  script: string | null;
  script_outline: string[] | null;
  target_duration_seconds: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface LaunchPageTheme {
  primaryColor?: string;
  background?: 'dark' | 'light' | 'gradient';
  layoutStyle?: 'vsl_first' | 'demo_first' | 'split';
  successMessage?: string;
}

export interface DemoStudioLaunchPage {
  id: string;
  project_id: string;
  owner_id: string;
  headline: string | null;
  subheadline: string | null;
  cta_label: string;
  primary_vsl_id: string | null;
  primary_demo_id: string | null;
  theme: LaunchPageTheme;
  created_at: string;
  updated_at: string;
}

export interface DemoStudioSignup {
  id: string;
  project_id: string;
  email: string;
  referrer: string | null;
  vsl_variation_seen: string | null;
  created_at: string;
}

export interface DemoStudioReadiness {
  hasPublishedDemo: boolean;
  hasVsl: boolean;
  hasBrief?: boolean;
  hasHeadline?: boolean;
  hasSubheadline?: boolean;
  hasCta?: boolean;
  hasSlug?: boolean;
  publishedDemoCount: number;
  vslCount: number;
  canPublishLaunchPage: boolean;
  missing: string[];
}

export interface DemoStudioMetrics {
  demoViews: number;
  demoStepEvents: number;
  launchPageViews: number;
  demoStarts: number;
  demoCompletions: number;
  vslImpressions: number;
  ctaClicks: number;
  signupAttempts: number;
  signups: number;
  signupRate: number;
  byVslVariation: Array<{
    variation: string;
    impressions: number;
    signups: number;
    signupRate: number;
  }>;
}

export interface PublicLaunchPage {
  project: DemoStudioProject;
  launchPage: DemoStudioLaunchPage;
  demo: PublicDemo | null;
  vsl: DemoStudioVsl | null;
}

export type DemoEventType = DemoStudioEventType;
