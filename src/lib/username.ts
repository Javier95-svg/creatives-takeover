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

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    return true;
  }

  return !!currentUserId && data.id === currentUserId;
}
