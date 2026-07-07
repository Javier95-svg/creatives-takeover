import type { MarketplaceService, ServiceBookingProvider, ServicePitchDeckType } from "@/types/serviceMarketplace";

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
