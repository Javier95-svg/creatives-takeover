// Demo Studio domain types. These mirror the demo_studio_* tables created in
// supabase/migrations/20260607120000_demo_studio_foundation.sql. The generated
// Supabase types do not yet include these tables, so the data layer casts table
// names with `as any` and relies on these interfaces for type safety.

export type DemoStatus = 'draft' | 'published';
export type HotspotType = 'hotspot' | 'tooltip' | 'callout';
export type HotspotAction = 'next' | 'goto' | 'url';
export type CaptureMethod = 'upload' | 'screen' | 'extension';
export type DemoStudioEventType =
  | 'demo_view'
  | 'demo_step'
  | 'launch_page_view'
  | 'vsl_impression'
  | 'vsl_play'
  | 'vsl_complete'
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
  is_primary: boolean;
  created_at: string;
}

export interface LaunchPageTheme {
  primaryColor?: string;
  background?: string;
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
  publishedDemoCount: number;
  vslCount: number;
  canPublishLaunchPage: boolean;
  missing: string[];
}

export interface DemoStudioMetrics {
  demoViews: number;
  demoStepEvents: number;
  launchPageViews: number;
  vslImpressions: number;
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
