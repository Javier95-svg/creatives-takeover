import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  buildDashboardFilePreviewPayload,
  buildIcpRecommendationSeeds,
  buildIcpTaskSeeds,
  readIcpArtifact,
  summarizeIcpArtifact,
} from "../_shared/icp-dashboard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const { analysisId } = await req.json();
    if (typeof analysisId !== "string" || !analysisId.trim()) {
      throw new Error("analysisId is required");
    }

    const { data: analysisRow, error: analysisError } = await supabase
      .from("icp_analysis_results")
      .select("id, analysis_data, industry, target_audience")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (analysisError || !analysisRow) {
      throw analysisError || new Error("ICP analysis not found.");
    }

    const artifact = readIcpArtifact(analysisRow.analysis_data);
    if (!artifact) {
      throw new Error("Saved ICP Draft is missing the expected artifact structure.");
    }

    const now = new Date().toISOString();
    const today = now.split("T")[0];
    const summary = summarizeIcpArtifact(artifact, analysisRow.industry, analysisRow.target_audience);
    const tasks = buildIcpTaskSeeds(artifact, summary);
    const recommendations = buildIcpRecommendationSeeds(artifact, summary, tasks);
    const filePreview = buildDashboardFilePreviewPayload(summary, tasks);

    const { error: deleteTasksError } = await supabase
      .from("daily_tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("task_date", today)
      .eq("ai_generated", true);

    if (deleteTasksError) {
      throw deleteTasksError;
    }

    if (tasks.length > 0) {
      const { error: insertTasksError } = await supabase.from("daily_tasks").insert(
        tasks.map((task, index) => ({
          user_id: user.id,
          task_text: task.title,
          priority: task.priority,
          task_date: today,
          is_completed: false,
          ai_generated: true,
          contributes_to_weekly_mission: index < 2,
          business_impact_score: Math.max(55, 90 - index * 10),
          stage_alignment_score: Math.max(50, 88 - index * 7),
          effort_estimate: index === 0 ? 30 : index === 1 ? 45 : 60,
        })),
      );

      if (insertTasksError) {
        throw insertTasksError;
      }
    }

    const { error: deleteRecommendationsError } = await supabase
      .from("personalized_recommendations")
      .delete()
      .eq("user_id", user.id)
      .contains("metadata", { draft_driven: true });

    if (deleteRecommendationsError) {
      throw deleteRecommendationsError;
    }

    if (recommendations.length > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: insertRecommendationsError } = await supabase
        .from("personalized_recommendations")
        .insert(
          recommendations.map((recommendation, index) => ({
            user_id: user.id,
            recommendation_type: recommendation.type,
            title: recommendation.title,
            description: recommendation.description,
            reason: recommendation.reason,
            action_url: recommendation.actionUrl,
            priority: recommendation.priority ?? 100 - index,
            expires_at: expiresAt.toISOString(),
            metadata: {
              category: "icp_bootstrap",
              draft_driven: true,
              source: "icp_unlock",
              analysis_id: analysisId,
            },
          })),
        );

      if (insertRecommendationsError) {
        throw insertRecommendationsError;
      }
    }

    const { error: upsertFileError } = await supabase
      .from("dashboard_files")
      .upsert(
        {
          user_id: user.id,
          file_kind: "icp_draft",
          title: `${summary.personaName} ICP Draft`,
          summary: summary.valueProposition,
          source_table: "icp_analysis_results",
          source_id: analysisId,
          preview_payload: filePreview,
          updated_at: now,
        },
        {
          onConflict: "user_id,source_table,source_id",
        },
      );

    if (upsertFileError) {
      throw upsertFileError;
    }

    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        dashboard_initialized_at: now,
        dashboard_bootstrap_source: "icp_unlock",
        primary_icp_analysis_id: analysisId,
      })
      .eq("id", user.id);

    if (updateProfileError) {
      throw updateProfileError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysisId,
        tasksCreated: tasks.length,
        recommendationsCreated: recommendations.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error bootstrapping ICP dashboard:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
