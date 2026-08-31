import { VALIDATION } from "@/config/constants";
import { supabase } from "@/integrations/supabase/client";

const USERNAME_ALLOWED_PATTERN = /^[a-z0-9_]+$/;
const LEADING_OR_TRAILING_UNDERSCORE_PATTERN = /^_|_$/;

export function normalizeUsernameInput(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, VALIDATION.MAX_USERNAME_LENGTH);
}

export function validateUsername(value: string): string {
  const normalized = normalizeUsernameInput(value);

  if (!normalized) {
    return "Username is required";
  }

  if (normalized.length < VALIDATION.MIN_USERNAME_LENGTH) {
    return `Username must be at least ${VALIDATION.MIN_USERNAME_LENGTH} characters`;
  }

  if (normalized.length > VALIDATION.MAX_USERNAME_LENGTH) {
    return `Username must be at most ${VALIDATION.MAX_USERNAME_LENGTH} characters`;
  }

  if (!USERNAME_ALLOWED_PATTERN.test(normalized)) {
    return "Username can only contain lowercase letters, numbers, and underscores";
  }

  if (LEADING_OR_TRAILING_UNDERSCORE_PATTERN.test(normalized)) {
    return "Username cannot start or end with an underscore";
  }

  return "";
}

export async function isUsernameAvailable(
  value: string,
  currentUserId?: string
): Promise<boolean> {
  const normalized = normalizeUsernameInput(value);
  if (!normalized) {
    return false;
  }

  const { data: availability, error: rpcError } = await supabase.rpc(
    "is_username_available",
    {
      candidate: normalized,
      current_user_id: currentUserId ?? null,
    }
  );

  if (!rpcError && typeof availability === "boolean") {
    return availability;
  }

  const { data: exactData, error: exactError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", normalized)
    .maybeSingle();

  if (exactError && exactError.code !== "PGRST116") {
    throw exactError;
  }

  if (!exactData) {
    return true;
  }

  return !!currentUserId && exactData.id === currentUserId;
}

/**
 * Handle-style suggestions for the signup form's "Create one for me" link.
 *
 * Deliberately underscore/concatenation based: the dot in a jordan.s style
 * handle is stripped by normalizeUsernameInput, so a dotted suggestion would
 * silently become "jordans" and look like a bug.
 */
const HANDLE_SUFFIXES = [
  "builds",
  "ships",
  "makes",
  "hq",
  "dev",
  "labs",
  "studio",
  "works",
];

const pick = <T,>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)];

const digits = (count: 2 | 3) => {
  const min = count === 2 ? 10 : 100;
  const max = count === 2 ? 99 : 999;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const buildCandidates = (first: string, last: string, emailLocal: string): string[] => {
  if (first && last) {
    return [
      `${first}_${last[0]}`,
      `${last}_${first[0]}`,
      `${first}${last}`,
      `${first[0]}${last}`,
      `${first}_${last}`,
      `${first}${last[0]}`,
      `${first}_${pick(HANDLE_SUFFIXES)}`,
      `${first}${last}${digits(2)}`,
    ];
  }

  const solo = first || last || emailLocal;
  if (solo) {
    return [
      `${solo}_${pick(HANDLE_SUFFIXES)}`,
      `${solo}${pick(HANDLE_SUFFIXES)}`,
      `${solo}${digits(2)}`,
      `${solo}_${digits(2)}`,
      `hey${solo}`,
      `${solo}_hq`,
    ];
  }

  return [
    `founder_${digits(3)}`,
    `${pick(HANDLE_SUFFIXES)}_${digits(3)}`,
    `founder${pick(HANDLE_SUFFIXES)}`,
  ];
};

export interface UsernameSeed {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Returns a fresh, already-normalized suggestion. `avoid` lets the caller ask
 * for something different from what is currently in the field, so repeated
 * clicks keep producing new handles.
 */
export function suggestUsername(seed: UsernameSeed, avoid?: string): string {
  const first = normalizeUsernameInput(seed.firstName ?? "");
  const last = normalizeUsernameInput(seed.lastName ?? "");
  const emailLocal = normalizeUsernameInput((seed.email ?? "").split("@")[0] ?? "");
  const skip = normalizeUsernameInput(avoid ?? "");

  // A handful of attempts is enough to dodge a repeat without ever looping
  // forever on a seed whose candidate set is tiny.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = finalize(pick(buildCandidates(first, last, emailLocal)));
    if (candidate && candidate !== skip) return candidate;
  }

  return finalize(`founder_${digits(3)}`);
}

const finalize = (raw: string): string => {
  let value = normalizeUsernameInput(raw).replace(/^_+/, "").replace(/_+$/, "");

  // Pad rather than return something the validator will reject.
  while (value.length > 0 && value.length < VALIDATION.MIN_USERNAME_LENGTH) {
    value += Math.floor(Math.random() * 10);
  }

  return value.slice(0, VALIDATION.MAX_USERNAME_LENGTH).replace(/_+$/, "");
};

/**
 * Placeholder examples for the signup field. One is picked per mount so the
 * form does not always show the same face, and they deliberately mirror the
 * name + HANDLE_SUFFIXES shape that suggestUsername produces, so the example
 * and the "Create one for me." button never look like different systems.
 */
export const USERNAME_PLACEHOLDER_EXAMPLES = [
  "alexbuilds",
  "maya_ships",
  "devonhq",
  "riverworks",
  "noa_labs",
] as const;

export function randomUsernameExample(): string {
  return pick(USERNAME_PLACEHOLDER_EXAMPLES);
}
