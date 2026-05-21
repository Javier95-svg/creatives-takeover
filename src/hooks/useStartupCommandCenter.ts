import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStartupCommandCenterModel,
  buildStartupProfilePreferences,
  type StartupCommandCenterModel,
} from "@/lib/startupCommandCenter";
import { refreshOnboardingMentorRecommendations } from "@/lib/onboardingMentorRecommendations";
import {
  getPmfResultsTableName,
  handlePmfResultsTableError,
  isPmfResultsTableAvailable,
} from "@/lib/pmfResultsTable";

const ICP_TABLE = "icp_analysis_results" as any;
const PMF_TABLE = getPmfResultsTableName();
const TECH_STACK_TABLE = "tech_stack_reports" as any;
const WAITLIST_TABLE = "waitlist_pages" as any;
const MVP_TABLE = "mvp_builder_artifacts" as any;
const GTM_TABLE = "gtm_plans" as any;

export interface StartupProfileFormValues {
  startupName: string;
  industries: string[];
  country: string;
  supportAreasNeeded: string[];
  description: string;
  tagline: string;
  stage: string;
  websiteUrl: string;
  positioningLine: string;
  targetMarket: string;
  revenueModel: string;
  links: Record<string, string>;
}

const emptyModel = buildStartupCommandCenterModel({ profile: null });

async function fetchLatestByUser(table: any, userId: string, select: string, orderColumn = "updated_at") {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("user_id", userId)
    .order(orderColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Record<string, any> | null;
}

export function useStartupCommandCenter() {
  const { user } = useAuth();
  const [model, setModel] = useState<StartupCommandCenterModel>(emptyModel);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setModel(emptyModel);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          [
            "id",
            "startup_name",
            "startup_industry",
            "country",
            "startup_description",
            "startup_tagline",
            "startup_stage",
            "business_stage",
            "website_url",
            "positioning_line",
            "startup_links",
            "user_preferences",
            "primary_icp_analysis_id",
            "updated_at",
          ].join(", "),
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      let icpRow: Record<string, any> | null = null;
      if ((profile as any)?.primary_icp_analysis_id) {
        const { data, error: icpError } = await supabase
          .from(ICP_TABLE)
          .select("id, analysis_data, target_audience, business_description, verdict, industry, niche_score, created_at, updated_at")
          .eq("id", (profile as any).primary_icp_analysis_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (icpError) throw icpError;
        icpRow = data as Record<string, any> | null;
      }

      const [
        latestIcp,
        pmfRowResult,
        techStackRow,
        waitlistRow,
        mvpRow,
        gtmRow,
      ] = await Promise.all([
        icpRow
          ? Promise.resolve(null)
          : fetchLatestByUser(
              ICP_TABLE,
              user.id,
              "id, analysis_data, target_audience, business_description, verdict, industry, niche_score, created_at, updated_at",
              "updated_at",
            ),
        isPmfResultsTableAvailable()
          ? fetchLatestByUser(
              PMF_TABLE,
              user.id,
              "id, analysis_data, pmf_score, verdict, target_market, industry, created_at, updated_at, saved_at",
              "created_at",
            ).catch((pmfError) => {
              if (handlePmfResultsTableError(pmfError)) return null;
              throw pmfError;
            })
          : Promise.resolve(null),
        fetchLatestByUser(
          TECH_STACK_TABLE,
          user.id,
          "id, name, selected_products, budget_total, budget_breakdown, has_variable, created_at, updated_at",
          "updated_at",
        ),
        fetchLatestByUser(
          WAITLIST_TABLE,
          user.id,
          "id, title, value_proposition, target_audience, status, published_at, exported_at, created_at, updated_at",
          "updated_at",
        ),
        fetchLatestByUser(
          MVP_TABLE,
          user.id,
          "id, scope_title, scope_summary, status, saved_at, created_at, updated_at",
          "updated_at",
        ),
        fetchLatestByUser(
          GTM_TABLE,
          user.id,
          "id, plan_title, plan_content, status, saved_at, exported_at, created_at, updated_at",
          "updated_at",
        ),
      ]);

      setModel(
        buildStartupCommandCenterModel({
          profile: profile as Record<string, any> | null,
          icpRow: icpRow ?? latestIcp,
          pmfRow: pmfRowResult,
          techStackRow,
          waitlistRow,
          mvpRow,
          gtmRow,
        }),
      );
    } catch (err) {
      console.error("Failed to load startup command center:", err);
      setError("Unable to load the startup command centre right now.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      void load();
    }, 250);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`startup-command-center:${user.id}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "icp_analysis_results", filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pmf_analysis_results", filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pmf_validation_evidence", filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "tech_stack_reports", filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist_pages", filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "mvp_builder_artifacts", filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "gtm_plans", filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [scheduleRefresh, user?.id]);

  const updateManualProfile = useCallback(
    async (values: StartupProfileFormValues) => {
      if (!user?.id) return false;

      setSaving(true);
      try {
        const nextLinks = {
          pitchDeck: values.links.pitchDeck?.trim() || null,
          waitlist: values.links.waitlist?.trim() || null,
          demo: values.links.demo?.trim() || null,
          loom: values.links.loom?.trim() || null,
          website: values.links.website?.trim() || values.websiteUrl.trim() || null,
        };
        const nextPreferences = buildStartupProfilePreferences(model.manual.userPreferences, {
          targetMarket: values.targetMarket.trim(),
          revenueModel: values.revenueModel.trim(),
          supportAreasNeeded: values.supportAreasNeeded,
        });

        const { data, error: updateError } = await supabase
          .from("profiles")
          .update({
            startup_name: values.startupName.trim() || null,
            startup_industry: values.industries.map((item) => item.trim()).filter(Boolean),
            country: values.country.trim() || null,
            startup_description: values.description.trim() || null,
            startup_tagline: values.tagline.trim() || null,
            startup_stage: values.stage || null,
            website_url: values.websiteUrl.trim() || null,
            positioning_line: values.positioningLine.trim() || null,
            startup_links: nextLinks,
            user_preferences: nextPreferences,
          })
          .eq("id", user.id)
          .select("*")
          .single();

        if (updateError) throw updateError;

        setModel((current) => ({
          ...current,
          manual: buildStartupCommandCenterModel({ profile: data as Record<string, any> }).manual,
        }));
        await load();
        await refreshOnboardingMentorRecommendations({
          userId: user.id,
          sectors: values.industries,
          supportAreas: values.supportAreasNeeded,
        }).catch((recommendationError) => {
          console.warn("Startup profile saved, but mentor recommendations did not refresh.", recommendationError);
        });
        toast.success("Startup Profile updated.");
        return true;
      } catch (err) {
        console.error("Failed to update startup profile:", err);
        toast.error("Unable to update Startup Profile right now.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load, model.manual.userPreferences, user?.id],
  );

  return {
    model,
    loading,
    saving,
    error,
    refresh: load,
    updateManualProfile,
  };
}
