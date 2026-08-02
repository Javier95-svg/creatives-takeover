import { getSafeLocalStorage } from "@/lib/safeStorage";

const OUTPUT_SIGNUP_CONTEXT_KEY = "ct_output_signup_context_v1";
const MAX_AGE_MS = 30 * 60 * 1000;

export interface OutputSignupContext {
  version: 1;
  source: string;
  outputRoute: "icp" | "demo";
  anonymousArtifactId: string;
  outputGeneratedAt: number;
  signupStartedAt: number;
}

export function persistOutputSignupContext(
  context: Omit<OutputSignupContext, "version" | "signupStartedAt"> & { signupStartedAt?: number },
) {
  const value: OutputSignupContext = {
    ...context,
    version: 1,
    signupStartedAt: context.signupStartedAt ?? Date.now(),
  };
  getSafeLocalStorage().setItem(OUTPUT_SIGNUP_CONTEXT_KEY, JSON.stringify(value));
  return value;
}

export function readOutputSignupContext(): OutputSignupContext | null {
  try {
    const raw = getSafeLocalStorage().getItem(OUTPUT_SIGNUP_CONTEXT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<OutputSignupContext>;
    if (
      value.version !== 1 ||
      !value.source ||
      !value.outputRoute ||
      !value.anonymousArtifactId ||
      typeof value.outputGeneratedAt !== "number" ||
      typeof value.signupStartedAt !== "number" ||
      Date.now() - value.signupStartedAt > MAX_AGE_MS
    ) {
      getSafeLocalStorage().removeItem(OUTPUT_SIGNUP_CONTEXT_KEY);
      return null;
    }
    return value as OutputSignupContext;
  } catch {
    return null;
  }
}

export function consumeOutputSignupContext() {
  const value = readOutputSignupContext();
  getSafeLocalStorage().removeItem(OUTPUT_SIGNUP_CONTEXT_KEY);
  return value;
}
