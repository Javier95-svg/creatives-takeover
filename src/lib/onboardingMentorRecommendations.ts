import { supabase } from "@/integrations/supabase/client";

type MentorRow = {
  id: string;
  name: string;
  bio?: string | null;
  expertise?: string[] | null;
  universities?: string[] | null;
  rating?: number | null;
  review_count?: number | null;
  calendly_url?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
};

type RecommendationInput = {
  userId: string;
  sectors: string[];
  supportAreas: string[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(values: string[]) {
  return values
    .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/i))
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);
}

function scoreMentor(mentor: MentorRow, sectors: string[], supportAreas: string[]) {
  const expertise = mentor.expertise ?? [];
  const normalizedExpertise = new Set(expertise.map(normalize));
  const matchedSupportAreas = supportAreas.filter((area) => normalizedExpertise.has(normalize(area)));

  const searchableText = [
    mentor.name,
    mentor.bio,
    ...(mentor.expertise ?? []),
    ...(mentor.universities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const sectorTokens = tokenize(sectors);
  const matchedSectors = sectors.filter((sector) =>
    tokenize([sector]).some((token) => searchableText.includes(token)),
  );
  const sectorTokenHits = sectorTokens.filter((token) => searchableText.includes(token)).length;

  let score = 0;
  score += matchedSupportAreas.length * 40;
  score += matchedSectors.length * 14;
  score += sectorTokenHits * 4;
  score += mentor.is_featured ? 10 : 0;
  score += (mentor.rating ?? 0) * 3;
  score += Math.min(mentor.review_count ?? 0, 20) * 0.25;
  score += mentor.calendly_url ? 4 : 0;

  return {
    mentor,
    score,
    matchedSupportAreas,
    matchedSectors,
  };
}

export async function refreshOnboardingMentorRecommendations({
  userId,
  sectors,
  supportAreas,
}: RecommendationInput) {
  const cleanSectors = sectors.map((sector) => sector.trim()).filter(Boolean);
  const cleanSupportAreas = supportAreas.map((area) => area.trim()).filter(Boolean);

  if (!userId || cleanSupportAreas.length === 0) {
    return;
  }

  const { data: mentors, error: mentorError } = await supabase
    .from("mentors")
    .select("id, name, bio, expertise, universities, rating, review_count, calendly_url, is_featured, is_active")
    .eq("is_active", true);

  if (mentorError) {
    throw mentorError;
  }

  const ranked = ((mentors ?? []) as MentorRow[])
    .map((mentor) => scoreMentor(mentor, cleanSectors, cleanSupportAreas))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const rows = ranked.map(({ mentor, matchedSupportAreas, matchedSectors }) => ({
    user_id: userId,
    mentor_id: mentor.id,
    source: "onboarding_recommendation",
    recommended_at: now,
    recommendation_reason: matchedSupportAreas.length
      ? `Matched on ${matchedSupportAreas.slice(0, 2).join(", ")}`
      : `Matched on ${matchedSectors.slice(0, 2).join(", ") || "your startup context"}`,
    matched_support_areas: matchedSupportAreas,
    matched_sectors: matchedSectors,
  }));

  const mentorIds = rows.map((row) => row.mentor_id);
  const { data: existingRows, error: existingError } = await (supabase as any)
    .from("mentor_saves")
    .select("mentor_id, source")
    .eq("user_id", userId)
    .in("mentor_id", mentorIds);

  if (existingError) {
    throw existingError;
  }

  const existingByMentor = new Map<string, { source?: string | null }>(
    ((existingRows ?? []) as Array<{ mentor_id: string; source?: string | null }>).map((row) => [row.mentor_id, row]),
  );
  const inserts = rows.filter((row) => !existingByMentor.has(row.mentor_id));
  const updates = rows.filter((row) => existingByMentor.get(row.mentor_id)?.source === "onboarding_recommendation");

  if (inserts.length > 0) {
    const { error: insertError } = await (supabase as any).from("mentor_saves").insert(inserts);
    if (insertError) throw insertError;
  }

  await Promise.all(
    updates.map(async (row) => {
      const { error: updateError } = await (supabase as any)
        .from("mentor_saves")
        .update({
          recommended_at: row.recommended_at,
          recommendation_reason: row.recommendation_reason,
          matched_support_areas: row.matched_support_areas,
          matched_sectors: row.matched_sectors,
        })
        .eq("user_id", row.user_id)
        .eq("mentor_id", row.mentor_id)
        .eq("source", "onboarding_recommendation");

      if (updateError) throw updateError;
    }),
  );
}
