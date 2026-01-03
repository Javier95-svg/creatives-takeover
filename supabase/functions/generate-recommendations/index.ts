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

    // Delete old/expired recommendations first
    await supabase
      .from("personalized_recommendations")
      .delete()
      .eq("user_id", user_id)
      .or("is_dismissed.eq.true,expires_at.lt." + new Date().toISOString());

    // Fetch user context including quiz answers
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        creative_niche,
        business_stage,
        onboarding_completed,
        quiz_completed,
        quiz_is_first_startup,
        quiz_current_stage,
        quiz_biggest_challenge,
        quiz_launch_timeline,
        quiz_looking_for_cofounder
      `)
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
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch check-ins
    const { data: checkIns } = await supabase
      .from("daily_check_ins")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(7);

    // Fetch activity
    const { data: activity } = await supabase
      .from("user_activity_log")
      .select("*")
      .eq("user_id", user_id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    // Fetch commitments
    const { data: commitments } = await supabase
      .from("sprint_commitments")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Generate recommendations based on context
    const recommendations = generateRecommendations({
      profile,
      scores: scores?.[0],
      sessions,
      sprints,
      checkIns,
      activity,
      commitments
    });

    // Store only unique recommendations (limit to top 5)
    const insertResults = [];
    const uniqueRecs = recommendations.slice(0, 5);
    
    for (const rec of uniqueRecs) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days
      
      const { data, error } = await supabase
        .from("personalized_recommendations")
        .insert({
          user_id,
          expires_at: expiresAt.toISOString(),
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
  const now = new Date();
  
  // Get user context
  const niche = context.profile?.creative_niche || "creative";
  const stage = context.profile?.business_stage || "idea";
  const hasActiveSprint = context.sprints?.some((s: any) => s.is_active);
  const hasSessions = context.sessions && context.sessions.length > 0;
  const hasCompletedSession = context.sessions?.some((s: any) => s.is_completed);
  const recentCheckIns = context.checkIns?.filter((c: any) => {
    const checkInDate = new Date(c.created_at);
    const daysDiff = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }) || [];
  const hasRecentActivity = context.activity && context.activity.length > 0;
  const lastActivity = hasRecentActivity ? new Date(context.activity[0].created_at) : null;
  const daysSinceActivity = lastActivity
    ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Get quiz answers for personalized recommendations
  const quizCompleted = context.profile?.quiz_completed;
  const isFirstStartup = context.profile?.quiz_is_first_startup;
  const currentStage = context.profile?.quiz_current_stage;
  const biggestChallenge = context.profile?.quiz_biggest_challenge;
  const launchTimeline = context.profile?.quiz_launch_timeline;
  const lookingForCofounder = context.profile?.quiz_looking_for_cofounder;

  // Priority 0: Quiz-based personalized recommendations (highest priority)
  if (quizCompleted) {
    // Recommendations based on biggest challenge
    if (biggestChallenge === 'finding_customers') {
      recs.push({
        recommendation_type: "action",
        title: "🎯 Master Customer Acquisition",
        description: "You identified finding customers as your biggest challenge. Start with market research and customer interviews to understand your ideal buyer.",
        priority: 11,
        reason: "Solving your biggest challenge unlocks growth",
        action_url: "/blog",
        metadata: { category: "customer_acquisition", quiz_driven: true }
      });
    } else if (biggestChallenge === 'building_product') {
      recs.push({
        recommendation_type: "action",
        title: "🛠️ Build Your MVP Faster",
        description: "Focus on building the minimum viable version of your product. Start with core features that solve the main problem.",
        priority: 11,
        reason: "Ship fast, iterate faster",
        action_url: "/laboratory",
        metadata: { category: "product_development", quiz_driven: true }
      });
    } else if (biggestChallenge === 'raising_money') {
      recs.push({
        recommendation_type: "action",
        title: "💰 Prepare Your Fundraising Strategy",
        description: "Build a solid pitch deck and financial model. Focus on traction and market validation before approaching investors.",
        priority: 11,
        reason: "Investors bet on traction, not just ideas",
        action_url: "/blog",
        metadata: { category: "fundraising", quiz_driven: true }
      });
    } else if (biggestChallenge === 'time_management') {
      recs.push({
        recommendation_type: "action",
        title: "⏰ Optimize Your Time with Sprints",
        description: "Create a 30-day sprint to focus on your most critical tasks. Break down big goals into daily actions.",
        priority: 11,
        reason: "Structure beats motivation every time",
        action_url: "/laboratory",
        metadata: { category: "productivity", quiz_driven: true }
      });
    } else if (biggestChallenge === 'staying_motivated') {
      recs.push({
        recommendation_type: "action",
        title: "🔥 Build Momentum with Daily Check-ins",
        description: "Join daily accountability check-ins to stay motivated. Share your wins and get support from the community.",
        priority: 11,
        reason: "Consistency compounds into success",
        action_url: "/laboratory",
        metadata: { category: "motivation", quiz_driven: true }
      });
    }

    // Recommendations based on launch timeline
    if (launchTimeline === 'asap') {
      recs.push({
        recommendation_type: "action",
        title: "⚡ Fast-Track Your Launch",
        description: "You want to launch ASAP. Focus ruthlessly on your MVP - cut everything that's not essential to solve the core problem.",
        priority: 10,
        reason: "Speed to market = faster learning",
        action_url: "/laboratory",
        metadata: { category: "rapid_launch", quiz_driven: true }
      });
    } else if (launchTimeline === '3_6_months') {
      recs.push({
        recommendation_type: "action",
        title: "📅 Plan Your 90-Day Roadmap",
        description: "With a 3-6 month timeline, create a structured roadmap. Break it into monthly milestones and weekly sprints.",
        priority: 10,
        reason: "Clear milestones prevent analysis paralysis",
        action_url: "/laboratory",
        metadata: { category: "roadmap_planning", quiz_driven: true }
      });
    } else if (launchTimeline === '6_12_months') {
      recs.push({
        recommendation_type: "action",
        title: "🎯 Build Strong Foundations",
        description: "You have 6-12 months to launch. Use this time to validate your market, refine your product, and build early traction.",
        priority: 10,
        reason: "Solid foundations = sustainable growth",
        action_url: "/dream2plan",
        metadata: { category: "foundation_building", quiz_driven: true }
      });
    }

    // First-time founder specific recommendations
    if (isFirstStartup === 'yes') {
      recs.push({
        recommendation_type: "resource",
        title: "🎓 First-Time Founder Essentials",
        description: "Learn the key lessons that took successful founders years to discover. Avoid common beginner mistakes and accelerate your journey.",
        priority: 9,
        reason: "Learn from others' mistakes, not just your own",
        action_url: "/blog",
        metadata: { category: "education", quiz_driven: true, audience: "first_time" }
      });
    } else if (isFirstStartup === 'no') {
      recs.push({
        recommendation_type: "resource",
        title: "🚀 Scale Faster as a Serial Founder",
        description: "Apply your experience to move faster. Focus on what's different this time - new market, new challenges, new opportunities.",
        priority: 9,
        reason: "Experience + focus = competitive advantage",
        action_url: "/blog",
        metadata: { category: "advanced_strategy", quiz_driven: true, audience: "experienced" }
      });
    }

    // Co-founder search recommendation
    if (lookingForCofounder === 'yes' && !context.profile?.cofounder_post_created) {
      recs.push({
        recommendation_type: "action",
        title: "🤝 Find Your Co-Founder",
        description: "You're looking for a co-founder! Create your post now to connect with talented entrepreneurs who complement your skills.",
        priority: 10,
        reason: "The right co-founder doubles your chances of success",
        action_url: "/community/co-founders/create",
        metadata: { category: "cofounder_matching", quiz_driven: true }
      });
    }

    // Stage-specific recommendations
    if (currentStage === 'idea') {
      recs.push({
        recommendation_type: "action",
        title: "💡 Validate Your Idea",
        description: "You're at the idea stage. Talk to 10 potential customers this week to validate there's real demand for your solution.",
        priority: 9,
        reason: "Customer validation prevents building the wrong thing",
        action_url: "/dream2plan",
        metadata: { category: "validation", quiz_driven: true }
      });
    } else if (currentStage === 'building_mvp') {
      recs.push({
        recommendation_type: "action",
        title: "🛠️ Ship Your MVP This Month",
        description: "You're building your MVP. Set a firm launch date and cut scope ruthlessly to ship something real to customers.",
        priority: 9,
        reason: "Real feedback beats perfect planning",
        action_url: "/laboratory",
        metadata: { category: "mvp_shipping", quiz_driven: true }
      });
    } else if (currentStage === 'launched_testing') {
      recs.push({
        recommendation_type: "action",
        title: "📊 Analyze Your Early Data",
        description: "You've launched and are testing! Double down on what's working and quickly pivot away from what's not.",
        priority: 9,
        reason: "Data-driven iteration = product-market fit",
        action_url: "/dream2plan",
        metadata: { category: "iteration", quiz_driven: true }
      });
    } else if (currentStage === 'growing') {
      recs.push({
        recommendation_type: "action",
        title: "📈 Scale What's Working",
        description: "You're in growth mode! Focus on your strongest acquisition channels and optimize your conversion funnel.",
        priority: 9,
        reason: "Optimization beats experimentation at scale",
        action_url: "/blog",
        metadata: { category: "growth_optimization", quiz_driven: true }
      });
    }
  }

  // Priority 1: Critical next steps based on user stage
  if (!hasSessions) {
    recs.push({
      recommendation_type: "action",
      title: "🎯 Create Your Business Blueprint",
      description: `Get AI-powered guidance tailored to ${niche} businesses. Answer strategic questions to uncover your path forward.`,
      priority: 10,
      reason: "Starting with a clear plan increases success rate by 3x",
      action_url: "/dream2plan",
      metadata: { category: "dream2plan", stage: "start" }
    });
  } else if (!hasCompletedSession && context.sessions?.length > 0) {
    const lastSession = context.sessions[0];
    const progress = Math.round((lastSession.current_step / 7) * 100);
    recs.push({
      recommendation_type: "action",
      title: "⚡ Finish Your Blueprint",
      description: `You're ${progress}% complete! Finish to unlock your personalized success score and action plan.`,
      priority: 10,
      reason: "Users who complete their blueprint are 5x more likely to launch",
      action_url: "/dream2plan",
      metadata: { category: "dream2plan", progress }
    });
  }

  // Priority 2: Daily momentum & consistency
  if (hasActiveSprint && recentCheckIns.length === 0) {
    recs.push({
      recommendation_type: "action",
      title: "📅 Log Today's Progress",
      description: "Daily check-ins keep you on track. Share what you accomplished today and maintain your momentum.",
      priority: 9,
      reason: "Consistent check-ins lead to 4x higher completion rates",
      action_url: "/laboratory",
      metadata: { category: "check_in", streak_risk: true }
    });
  } else if (!hasActiveSprint && hasCompletedSession) {
    recs.push({
      recommendation_type: "action",
      title: "🚀 Start Your 30-Day Launch Sprint",
      description: `Turn your ${stage} into reality. Break down your goals into daily actions with AI-powered task generation.`,
      priority: 9,
      reason: "Sprints help you ship 10x faster than planning alone",
      action_url: "/laboratory",
      metadata: { category: "sprint", action: "create" }
    });
  }

  // Priority 3: Skill-building based on scores
  if (context.scores) {
    const weakAreas = [];
    
    if (context.scores.market_clarity_score < 65) {
      weakAreas.push({
        area: "market_clarity",
        score: context.scores.market_clarity_score,
        title: "🎯 Sharpen Your Target Market",
        description: `Your market clarity score is ${context.scores.market_clarity_score}/100. Learn to identify and reach your ideal customers in the ${niche} space.`,
        action_url: "/blog",
        reason: "Clear market definition = higher conversion rates"
      });
    }
    
    if (context.scores.solution_strength_score < 65) {
      weakAreas.push({
        area: "solution",
        score: context.scores.solution_strength_score,
        title: "💡 Differentiate Your Offering",
        description: `Score: ${context.scores.solution_strength_score}/100. Discover what makes your ${niche} solution uniquely valuable.`,
        action_url: "/blog",
        reason: "Strong differentiation = premium pricing power"
      });
    }
    
    if (context.scores.financial_planning_score < 65) {
      weakAreas.push({
        area: "financial",
        score: context.scores.financial_planning_score,
        title: "💰 Build Your Revenue Model",
        description: `Financial planning: ${context.scores.financial_planning_score}/100. Create a realistic pricing strategy that reflects your value.`,
        action_url: "/blog",
        reason: "Solid financials = investor & customer confidence"
      });
    }

    if (context.scores.execution_feasibility_score < 65) {
      weakAreas.push({
        area: "execution",
        score: context.scores.execution_feasibility_score,
        title: "⚙️ Plan Your Execution Path",
        description: `Execution score: ${context.scores.execution_feasibility_score}/100. Break down your vision into achievable milestones.`,
        action_url: "/laboratory",
        reason: "Clear execution plan = momentum & progress"
      });
    }

    // Sort by lowest score and add the top 2
    weakAreas.sort((a, b) => a.score - b.score);
    weakAreas.slice(0, 2).forEach(area => {
      recs.push({
        recommendation_type: "resource",
        title: area.title,
        description: area.description,
        priority: 8,
        reason: area.reason,
        action_url: area.action_url,
        metadata: { category: area.area, score: area.score }
      });
    });
  }

  // Priority 4: Community & accountability
  if (hasActiveSprint && recentCheckIns.length >= 3 && !context.commitments?.length) {
    recs.push({
      recommendation_type: "feature",
      title: "📢 Make a Public Commitment",
      description: "You're building momentum! Share your sprint goal with the community for extra accountability and support.",
      priority: 7,
      reason: "Public commitments increase follow-through by 65%",
      action_url: "/laboratory",
      metadata: { category: "commitment" }
    });
  } else if (!hasActiveSprint && daysSinceActivity > 5) {
    recs.push({
      recommendation_type: "action",
      title: "🔄 Get Back on Track",
      description: `It's been ${daysSinceActivity} days since your last activity. Small steps today lead to big wins tomorrow.`,
      priority: 8,
      reason: "Consistency matters more than intensity",
      action_url: "/dashboard",
      metadata: { category: "re_engagement", days_inactive: daysSinceActivity }
    });
  }

  // Priority 5: Stay informed
  if (recs.length < 5) {
    const insightTopics = [
      {
        title: "📰 Latest Industry Insights",
        description: `Stay ahead with trends, strategies, and success stories from the ${niche} community.`,
        reason: "Knowledge is competitive advantage"
      },
      {
        title: "🎓 Learn from Successful Creators",
        description: `Discover how other ${niche} entrepreneurs turned ideas into thriving businesses.`,
        reason: "Model what works, skip what doesn't"
      },
      {
        title: "🧰 Explore Growth Strategies",
        description: "Get practical tactics for marketing, monetization, and scaling your creative business.",
        reason: "Strategy + execution = sustainable growth"
      }
    ];
    
    const randomInsight = insightTopics[Math.floor(Math.random() * insightTopics.length)];
    recs.push({
      recommendation_type: "resource",
      title: randomInsight.title,
      description: randomInsight.description,
      priority: 5,
      reason: randomInsight.reason,
      action_url: "/blog",
      metadata: { category: "education" }
    });
  }

  // Sort by priority (highest first) and return top 5 unique
  return recs.sort((a, b) => b.priority - a.priority).slice(0, 5);
}
