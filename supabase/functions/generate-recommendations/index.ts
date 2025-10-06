import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Fetch user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("creative_niche, business_stage, onboarding_completed")
      .eq("id", user_id)
      .single();

    // Fetch business scores
    const { data: scores } = await supabase
      .from("business_success_scores")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1);

    // Fetch chat sessions
    const { data: sessions } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user_id)
      .order("updated_at", { ascending: false });

    // Fetch sprints
    const { data: sprints } = await supabase
      .from("sprints")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    // Fetch activity
    const { data: activity } = await supabase
      .from("user_activity_log")
      .select("*")
      .eq("user_id", user_id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    // Generate recommendations based on context
    const recommendations = generateRecommendations({
      profile,
      scores: scores?.[0],
      sessions,
      sprints,
      activity
    });

    // Store recommendations
    const insertResults = [];
    for (const rec of recommendations) {
      const { data, error } = await supabase
        .from("personalized_recommendations")
        .insert({
          user_id,
          ...rec
        })
        .select()
        .single();
      
      if (!error && data) {
        insertResults.push(data);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations: insertResults,
        count: insertResults.length
      }), 
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

function generateRecommendations(context: any): any[] {
  const recs = [];
  
  // Onboarding not completed
  if (!context.profile?.onboarding_completed) {
    recs.push({
      recommendation_type: "action",
      title: "Complete Your Profile",
      description: "Tell us about your creative journey to get personalized recommendations",
      priority: 10,
      reason: "New user onboarding",
      action_url: "/account",
      metadata: { category: "onboarding" }
    });
  }

  // No active sprint
  const hasActiveSprint = context.sprints?.some((s: any) => s.is_active);
  if (!hasActiveSprint) {
    recs.push({
      recommendation_type: "action",
      title: "Start Your 30-Day Launch Challenge",
      description: "Turn your idea into reality with our guided sprint system",
      priority: 9,
      reason: "No active sprint detected",
      action_url: "/laboratory",
      metadata: { category: "sprint" }
    });
  }

  // Low score areas
  if (context.scores) {
    if (context.scores.market_clarity_score < 60) {
      recs.push({
        recommendation_type: "resource",
        title: "Define Your Target Market",
        description: "Learn how to identify and validate your ideal customer",
        priority: 8,
        reason: `Low market clarity score: ${context.scores.market_clarity_score}/100`,
        action_url: "/resources",
        metadata: { category: "market_research", score: context.scores.market_clarity_score }
      });
    }

    if (context.scores.solution_strength_score < 60) {
      recs.push({
        recommendation_type: "resource",
        title: "Strengthen Your Solution",
        description: "Clarify what makes your offering unique and valuable",
        priority: 7,
        reason: `Low solution strength: ${context.scores.solution_strength_score}/100`,
        action_url: "/resources",
        metadata: { category: "product", score: context.scores.solution_strength_score }
      });
    }

    if (context.scores.financial_planning_score < 60) {
      recs.push({
        recommendation_type: "resource",
        title: "Build Your Financial Model",
        description: "Create a realistic pricing and revenue strategy",
        priority: 6,
        reason: `Low financial planning: ${context.scores.financial_planning_score}/100`,
        action_url: "/resources",
        metadata: { category: "finance", score: context.scores.financial_planning_score }
      });
    }
  }

  // Incomplete chat session
  const hasIncompleteSessions = context.sessions?.some((s: any) => !s.is_completed);
  if (hasIncompleteSessions) {
    recs.push({
      recommendation_type: "action",
      title: "Complete Your Business Blueprint",
      description: "Finish your Dream2Plan session to get your full analysis",
      priority: 8,
      reason: "Incomplete Dream2Plan session found",
      action_url: "/dream2plan",
      metadata: { category: "dream2plan" }
    });
  }

  // Inactive user
  const daysSinceActivity = context.activity?.length > 0 
    ? Math.floor((Date.now() - new Date(context.activity[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  if (daysSinceActivity > 3 && context.sprints?.length > 0) {
    recs.push({
      recommendation_type: "action",
      title: "Check In With Your Progress",
      description: "Daily check-ins keep you accountable and on track",
      priority: 7,
      reason: `No activity in ${daysSinceActivity} days`,
      action_url: "/laboratory",
      metadata: { category: "check_in", days_inactive: daysSinceActivity }
    });
  }

  // No sessions at all - encourage starting
  if (!context.sessions || context.sessions.length === 0) {
    recs.push({
      recommendation_type: "action",
      title: "Start Your Business Blueprint",
      description: "Answer a few questions to get personalized guidance",
      priority: 10,
      reason: "No Dream2Plan sessions yet",
      action_url: "/dream2plan",
      metadata: { category: "dream2plan" }
    });
  }

  // Community engagement
  if (context.sprints?.length > 0) {
    recs.push({
      recommendation_type: "feature",
      title: "Find Your Accountability Partner",
      description: "Connect with fellow creators for mutual support and motivation",
      priority: 5,
      reason: "Boost success with accountability",
      action_url: "/accountability",
      metadata: { category: "community" }
    });
  }

  return recs;
}
