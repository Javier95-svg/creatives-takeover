const LEGACY_EXPERTISE_MAP: Record<string, string[]> = {
  "Marketing & Growth": ["Growth Marketing"],
  "Sales & Business Development": ["Sales", "Business Development"],
};

export const normalizeMentorExpertiseList = (
  expertise: string[] | null | undefined
): string[] => {
  if (!expertise || expertise.length === 0) return [];

  const normalized = new Set<string>();

  expertise.forEach((item) => {
    const mapped = LEGACY_EXPERTISE_MAP[item];
    if (mapped) {
      mapped.forEach((value) => normalized.add(value));
      return;
    }

    normalized.add(item);
  });

  return Array.from(normalized);
};
