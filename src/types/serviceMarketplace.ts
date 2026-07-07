export const SERVICE_CATEGORIES = ["sales", "marketing", "ops", "tech_support"] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type ServicePitchDeckType = "pdf" | "pptx";
export type ServiceBookingProvider = "calendly" | "koalendar" | "other" | "manual";

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  sales: "Sales",
  marketing: "Marketing",
  ops: "Ops",
  tech_support: "Tech Support",
};

export interface MarketplaceService {
  id: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string;
  delivered_by_name: string | null;
  delivered_by_picture_url: string | null;
  delivered_by_picture_focal_x: number | null;
  delivered_by_picture_focal_y: number | null;
  delivered_by_user_id: string | null;
  delivered_by_email: string | null;
  banner_url: string | null;
  banner_focal_x: number | null;
  banner_focal_y: number | null;
  pitch_deck_url: string | null;
  pitch_deck_type: ServicePitchDeckType | null;
  booking_url: string | null;
  booking_provider: ServiceBookingProvider;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceInput {
  name: string;
  slug?: string | null;
  category: ServiceCategory;
  description: string;
  delivered_by_name?: string | null;
  delivered_by_picture_url?: string | null;
  delivered_by_picture_focal_x?: number | null;
  delivered_by_picture_focal_y?: number | null;
  delivered_by_user_id?: string | null;
  delivered_by_email?: string | null;
  banner_url?: string | null;
  banner_focal_x?: number | null;
  banner_focal_y?: number | null;
  pitch_deck_url?: string | null;
  pitch_deck_type?: ServicePitchDeckType | null;
  booking_url?: string | null;
  booking_provider?: ServiceBookingProvider;
  is_active?: boolean;
  is_featured?: boolean;
}
