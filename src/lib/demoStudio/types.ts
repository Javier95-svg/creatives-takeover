// Demo Studio domain types. These mirror the demo_studio_* tables created in
// supabase/migrations/20260607120000_demo_studio_foundation.sql. The generated
// Supabase types do not yet include these tables, so the data layer casts table
// names with `as any` and relies on these interfaces for type safety.

export type DemoStatus = 'draft' | 'published';
export type HotspotType = 'hotspot' | 'tooltip' | 'callout';
export type HotspotAction = 'next' | 'goto' | 'url';
export type CaptureMethod = 'upload' | 'screen' | 'extension';

export interface DemoTheme {
  primaryColor?: string;
  buttonStyle?: 'solid' | 'outline';
  watermark?: boolean;
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

export type DemoEventType =
  | 'demo_view'
  | 'demo_step'
  | 'vsl_play'
  | 'vsl_complete'
  | 'waitlist_signup';
