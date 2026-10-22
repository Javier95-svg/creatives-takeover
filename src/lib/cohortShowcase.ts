/**
 * Cohort showcase (2026-10-22): a public page per cohort listing the Founder
 * IDs of the startups that chose to appear. Staff switch it on, each founder
 * opts in. Functions in supabase/migrations/20261022032451_cohort_showcase.sql.
 */
import { supabase } from '@/integrations/supabase/client';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { formatFounderNumber, type IdCardPerson } from '@/components/founder-id/IdCard';

export const cohortShowcasePath = (slug: string) => `/cohort/${encodeURIComponent(slug)}`;

export interface CohortShowcaseSettings {
  public: boolean;
  slug: string | null;
  optedIn: number;
  members: number;
}

export interface CohortShowcaseMembership {
  optIn: boolean;
  showcasePublic: boolean;
  slug: string | null;
}

export interface CohortShowcaseMember {
  username: string;
  name: string;
  avatarUrl: string | null;
  startupName: string | null;
  tagline: string | null;
  founderNumber: number | null;
  assignedStage: number | null;
}

export interface CohortShowcase {
  programName: string | null;
  cohortName: string;
  cohortNumber: number | null;
  startDate: string | null;
  endDate: string | null;
  demoDayDate: string | null;
  members: CohortShowcaseMember[];
}

const rpc = (name: string, args: Record<string, unknown>) => supabase.rpc(name as never, args as never);

export async function fetchShowcaseSettings(cohortId: string): Promise<CohortShowcaseSettings> {
  const { data, error } = await rpc('cohort_showcase_settings_v1', { p_cohort_id: cohortId });
  if (error) throw error;
  return data as unknown as CohortShowcaseSettings;
}

export async function setShowcasePublic(cohortId: string, isPublic: boolean): Promise<{ public: boolean; slug: string | null }> {
  const { data, error } = await rpc('set_cohort_showcase_v1', { p_cohort_id: cohortId, p_public: isPublic });
  if (error) throw error;
  return data as unknown as { public: boolean; slug: string | null };
}

export async function fetchShowcaseMembership(cohortId: string): Promise<CohortShowcaseMembership> {
  const { data, error } = await rpc('cohort_showcase_membership_v1', { p_cohort_id: cohortId });
  if (error) throw error;
  return data as unknown as CohortShowcaseMembership;
}

export async function setShowcaseOptIn(cohortId: string, optIn: boolean): Promise<boolean> {
  const { data, error } = await rpc('set_cohort_showcase_opt_in_v1', { p_cohort_id: cohortId, p_opt_in: optIn });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchPublicShowcase(slug: string): Promise<CohortShowcase | null> {
  const { data, error } = await rpc('public_cohort_showcase_v1', { p_slug: slug });
  if (error) throw error;
  return (data as unknown as CohortShowcase | null) ?? null;
}

/** A showcase member as a Founder ID card. */
export function showcaseCardPerson(member: CohortShowcaseMember): IdCardPerson {
  return {
    name: member.name,
    handle: member.username,
    number: formatFounderNumber(member.founderNumber) ?? '',
    stage: founderStageLabel(member.assignedStage) ?? null,
    tagline: member.startupName && member.tagline
      ? `${member.startupName}: ${member.tagline}`
      : member.startupName || member.tagline,
    avatarUrl: member.avatarUrl,
  };
}
