export type IcpHandoffIssue = { step: string; message: string };

export type FunctionFailureDetails = {
  step: string | null;
  message: string;
  errorCode: string | null;
  requiredCredits: number | null;
};

export const toErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
};

export const getIcpDashboardHandoffArea = (step?: string | null) => {
  if (!step) return "the dashboard setup";
  if (step.includes("task")) return "the first dashboard tasks";
  if (step.includes("recommend")) return "the dashboard recommendations";
  return "the dashboard setup";
};

export const buildIcpDashboardHandoffMessage = (step?: string | null) =>
  `Your ICP Draft was saved, but we couldn't finish ${getIcpDashboardHandoffArea(step)}. Open your draft now and retry the dashboard in a moment.`;

const isUserSafeFunctionMessage = (message: string) => {
  const normalized = message.trim();
  if (!normalized) return false;
  if (/edge function returned a non-2xx status code/i.test(normalized)) return false;
  if (/(column|schema cache|stack|trace|violates)/i.test(normalized)) return false;
  return true;
};

export const readFunctionErrorDetails = async (
  error: unknown,
  fallbackStep = "function_invoke",
): Promise<FunctionFailureDetails> => {
  let message = toErrorMessage(error);
  let step: string | null = null;
  let errorCode: string | null = null;
  let requiredCredits: number | null = null;

  const maybeContext = typeof error === "object" && error !== null && "context" in error
    ? (error as { context?: unknown }).context
    : null;

  if (typeof Response !== "undefined" && maybeContext instanceof Response) {
    try {
      const payload = await maybeContext.clone().json() as {
        error?: unknown;
        step?: unknown;
        errorCode?: unknown;
        requiredCredits?: unknown;
      };

      if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error;
      }
      if (typeof payload.step === "string" && payload.step.trim()) {
        step = payload.step;
      }
      if (typeof payload.errorCode === "string" && payload.errorCode.trim()) {
        errorCode = payload.errorCode;
      }
      if (typeof payload.requiredCredits === "number" && Number.isFinite(payload.requiredCredits)) {
        requiredCredits = payload.requiredCredits;
      }
    } catch {
      // Ignore malformed function error payloads and fall back to the client-visible message.
    }
  }

  return {
    step: step ?? fallbackStep,
    message,
    errorCode,
    requiredCredits,
  };
};

export const buildIcpDraftSaveFailureMessage = (
  details: Pick<FunctionFailureDetails, "message" | "errorCode" | "requiredCredits">,
) => {
  if (details.errorCode === "INSUFFICIENT_CREDITS" && typeof details.requiredCredits === "number" && details.requiredCredits > 0) {
    return `You need ${details.requiredCredits} credits to save this ICP Draft. Upgrade or wait for your credits to reset, then try again.`;
  }

  if (details.errorCode === "DEDUCTION_FAILED" && details.requiredCredits === 0) {
    return "We couldn't save your ICP Draft just now. Your answers are still on this page, so please try again in a moment.";
  }

  if (/authentication required/i.test(details.message)) {
    return "Your session expired. Sign in again, then retry saving your ICP Draft.";
  }

  if (/timed out/i.test(details.message)) {
    return "Saving your ICP Draft took too long. Please try again.";
  }

  if (/validation failed/i.test(details.message)) {
    return "Some answers are incomplete or invalid. Review the draft and try again.";
  }

  if (isUserSafeFunctionMessage(details.message)) {
    return details.message;
  }

  return "Your answers are still on this page, so please try again in a moment.";
};

export const readFunctionFailureDetails = async (error: unknown): Promise<IcpHandoffIssue> => {
  const details = await readFunctionErrorDetails(error, "bootstrap_dashboard");

  return {
    step: details.step ?? "bootstrap_dashboard",
    message: details.message,
  };
};
