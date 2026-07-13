import type { MarketplaceService, ServiceBookingProvider, ServicePitchDeckType } from "@/types/serviceMarketplace";

export const DARYA_GETMARKETING_EMAIL = "darya@getmarketing.team";
export const DARYA_GETMARKETING_USER_ID = "a4233961-2e68-463a-a6a9-e43d57a836ab";
export const ADAM_APICEFLOW_EMAIL = "adam@apiceflow.com";
export const ADAM_APICEFLOW_USER_ID = "b0866625-7934-46cf-a29d-87bb00d83e5b";

const SERVICE_MESSAGE_USER_IDS_BY_EMAIL: Record<string, string> = {
  [DARYA_GETMARKETING_EMAIL]: DARYA_GETMARKETING_USER_ID,
  [ADAM_APICEFLOW_EMAIL]: ADAM_APICEFLOW_USER_ID,
};

export function generateServiceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function inferServiceBookingProvider(
  bookingUrl?: string | null,
  fallback?: ServiceBookingProvider | null,
): ServiceBookingProvider {
  const normalizedUrl = (bookingUrl || "").toLowerCase().trim();

  if (fallback && fallback !== "manual") {
    return fallback;
  }

  if (!normalizedUrl) return fallback || "manual";
  if (normalizedUrl.includes("calendly.com")) return "calendly";
  if (normalizedUrl.includes("koalendar.com")) return "koalendar";
  return fallback || "other";
}

export function normalizeServiceUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getDeckTypeFromFile(file: File): ServicePitchDeckType | null {
  const fileName = file.name.toLowerCase();
  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileName.endsWith(".pptx")
  ) {
    return "pptx";
  }

  return null;
}

export function getServiceProfilePath(service: Pick<MarketplaceService, "slug" | "id">) {
  return `/marketplace/${service.slug || service.id}`;
}

export function resolveServiceMessageUserIdFromEmail(email?: string | null, fallback?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  const fallbackUserId = fallback?.trim();

  if (!normalizedEmail) return fallbackUserId || null;

  return SERVICE_MESSAGE_USER_IDS_BY_EMAIL[normalizedEmail] || fallbackUserId || null;
}

export function resolveServiceMessageUserId(
  service: Pick<MarketplaceService, "delivered_by_user_id" | "delivered_by_email">,
) {
  const savedUserId = service.delivered_by_user_id?.trim();
  if (savedUserId) return savedUserId;

  return resolveServiceMessageUserIdFromEmail(service.delivered_by_email);
}
