import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CreateServiceInput, MarketplaceService } from "@/types/serviceMarketplace";
import { generateServiceSlug, inferServiceBookingProvider } from "@/utils/serviceMarketplace";

function formatServiceError(error: any, fallback: string) {
  const message = error?.message || error?.toString?.() || "";

  if (message.includes("schema cache") || message.includes("relation") || message.includes("does not exist")) {
    return "Service marketplace tables are not available yet. Please apply the latest migration.";
  }

  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "Permission denied. Only admins can manage services.";
  }

  if (message.includes("duplicate key") || error?.code === "23505") {
    return "A service with this slug already exists. Use a different slug.";
  }

  return message || fallback;
}

function toService(row: any): MarketplaceService {
  const numberOrDefault = (value: unknown, fallback = 50) => Number(value ?? fallback);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description,
    delivered_by_name: row.delivered_by_name ?? null,
    delivered_by_picture_url: row.delivered_by_picture_url ?? null,
    delivered_by_picture_focal_x: numberOrDefault(row.delivered_by_picture_focal_x),
    delivered_by_picture_focal_y: numberOrDefault(row.delivered_by_picture_focal_y),
    delivered_by_user_id: row.delivered_by_user_id ?? null,
    delivered_by_email: row.delivered_by_email ?? null,
    banner_url: row.banner_url ?? null,
    banner_focal_x: numberOrDefault(row.banner_focal_x),
    banner_focal_y: numberOrDefault(row.banner_focal_y),
    pitch_deck_url: row.pitch_deck_url ?? null,
    pitch_deck_type: row.pitch_deck_type ?? null,
    booking_url: row.booking_url ?? null,
    booking_provider: row.booking_provider || inferServiceBookingProvider(row.booking_url),
    is_active: row.is_active !== false,
    is_featured: row.is_featured === true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildServicePayload(input: Partial<CreateServiceInput>) {
  const payload: Record<string, any> = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.slug !== undefined || input.name !== undefined) {
    const sourceSlug = input.slug?.trim() || (input.name ? generateServiceSlug(input.name) : "");
    if (sourceSlug) payload.slug = generateServiceSlug(sourceSlug);
  }
  if (input.category !== undefined) payload.category = input.category;
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.delivered_by_name !== undefined) payload.delivered_by_name = input.delivered_by_name?.trim() || null;
  if (input.delivered_by_picture_url !== undefined) payload.delivered_by_picture_url = input.delivered_by_picture_url || null;
  if (input.delivered_by_picture_focal_x !== undefined) {
    payload.delivered_by_picture_focal_x = input.delivered_by_picture_focal_x ?? 50;
  }
  if (input.delivered_by_picture_focal_y !== undefined) {
    payload.delivered_by_picture_focal_y = input.delivered_by_picture_focal_y ?? 50;
  }
  if (input.delivered_by_user_id !== undefined) payload.delivered_by_user_id = input.delivered_by_user_id?.trim() || null;
  if (input.delivered_by_email !== undefined) payload.delivered_by_email = input.delivered_by_email?.trim() || null;
  if (input.banner_url !== undefined) payload.banner_url = input.banner_url || null;
  if (input.banner_focal_x !== undefined) payload.banner_focal_x = input.banner_focal_x ?? 50;
  if (input.banner_focal_y !== undefined) payload.banner_focal_y = input.banner_focal_y ?? 50;
  if (input.pitch_deck_url !== undefined) payload.pitch_deck_url = input.pitch_deck_url || null;
  if (input.pitch_deck_type !== undefined) payload.pitch_deck_type = input.pitch_deck_type || null;
  if (input.booking_url !== undefined) payload.booking_url = input.booking_url || null;
  if (input.booking_provider !== undefined || input.booking_url !== undefined) {
    payload.booking_provider = inferServiceBookingProvider(input.booking_url, input.booking_provider);
  }
  if (input.is_active !== undefined) payload.is_active = input.is_active;
  if (input.is_featured !== undefined) payload.is_featured = input.is_featured;

  return payload;
}

export function useServices() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.email?.toLowerCase() === "admin@creatives-takeover.com";

  const fetchServices = useCallback(async (): Promise<MarketplaceService[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []).map(toService);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      toast.error(formatServiceError(error, "Failed to load services"));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiceBySlug = useCallback(async (slug: string): Promise<MarketplaceService | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data ? toService(data) : null;
    } catch (error: any) {
      console.error("Error fetching service by slug:", error);
      toast.error(formatServiceError(error, "Failed to load service"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiceById = useCallback(async (id: string): Promise<MarketplaceService | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data ? toService(data) : null;
    } catch (error: any) {
      console.error("Error fetching service by id:", error);
      toast.error(formatServiceError(error, "Failed to load service"));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createService = useCallback(async (input: CreateServiceInput): Promise<MarketplaceService | null> => {
    if (!isAdmin) {
      toast.error("Only admins can create services");
      return null;
    }

    try {
      setLoading(true);
      const payload = buildServicePayload(input);
      const { data, error } = await supabase
        .from("services")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      toast.success("Service created");
      return toService(data);
    } catch (error: any) {
      console.error("Error creating service:", error);
      toast.error(formatServiceError(error, "Failed to create service"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const updateService = useCallback(async (
    id: string,
    input: Partial<CreateServiceInput>,
  ): Promise<MarketplaceService | null> => {
    if (!isAdmin) {
      toast.error("Only admins can update services");
      return null;
    }

    try {
      setLoading(true);
      const payload = buildServicePayload(input);
      const { data, error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Service updated");
      return toService(data);
    } catch (error: any) {
      console.error("Error updating service:", error);
      toast.error(formatServiceError(error, "Failed to update service"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const deleteService = useCallback(async (id: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error("Only admins can delete services");
      return false;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Service deleted");
      return true;
    } catch (error: any) {
      console.error("Error deleting service:", error);
      toast.error(formatServiceError(error, "Failed to delete service"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  return {
    fetchServices,
    fetchServiceBySlug,
    fetchServiceById,
    createService,
    updateService,
    deleteService,
    loading,
    isAdmin,
  };
}
