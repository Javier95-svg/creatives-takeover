import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, handleOptionsRequest, corsResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleOptionsRequest();
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error("User not authenticated");

    // Check if user already has dashboard data initialized
    const { data: existingGoal } = await supabaseClient
      .from('kpi_goals')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (existingGoal) {
      return corsResponse({ message: "Dashboard already initialized" });
    }

    // Initialize sample data for all dashboard components
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 1. Create primary KPI goal
    await supabaseClient.from('kpi_goals').insert({
      user_id: user.id,
      goal_type: 'revenue',
      goal_name: 'Monthly Revenue Target',
      current_value: 2500,
      target_value: 10000,
      unit: '$',
      trend_percentage: 15.3,
      period: 'monthly',
      is_active: true,
    });

    // 2. Create sample alerts
    const alerts = [
      {
        user_id: user.id,
        alert_type: 'milestone',
        title: 'Welcome to Your Dashboard! 🎉',
        message: 'Track your progress, manage revenue, and achieve your goals all in one place.',
        severity: 'info',
        is_read: false,
      },
      {
        user_id: user.id,
        alert_type: 'opportunity',
        title: 'Explore Funding Opportunities',
        message: 'Check out Insighta to discover grants and funding programs for your business.',
        severity: 'success',
        is_read: false,
      },
    ];
    await supabaseClient.from('dashboard_alerts').insert(alerts);

    // 3. Create sample revenue metrics (last 30 days)
    const revenueMetrics = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const baseRevenue = 80 + Math.random() * 40;
      const baseMRR = 2000 + (i * 15) + (Math.random() * 200);
      
      revenueMetrics.push({
        user_id: user.id,
        metric_date: dateStr,
        mrr: Math.round(baseMRR),
        churn_rate: 2.5 + (Math.random() * 1.5),
        conversion_rate: 3.2 + (Math.random() * 2),
        total_revenue: Math.round(baseRevenue),
        active_customers: Math.round(15 + (i * 0.3)),
        new_customers: Math.round(1 + Math.random() * 2),
        churned_customers: Math.random() > 0.7 ? 1 : 0,
      });
    }
    await supabaseClient.from('revenue_metrics').insert(revenueMetrics);

    // 4. Create sample daily check-ins
    const checkIns = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      checkIns.push({
        user_id: user.id,
        check_in_date: dateStr,
        progress_summary: i === 0 
          ? 'Launched dashboard tracking system'
          : `Made solid progress on day ${5 - i} of business development`,
        mood_rating: 4 + Math.round(Math.random()),
        energy_level: 3 + Math.round(Math.random() * 2),
        goal_achieved: i < 3 ? true : null,
        what_went_well: i < 2 ? 'Successfully connected all tracking systems' : null,
      });
    }
    await supabaseClient.from('daily_check_ins').insert(checkIns);

    // 5. Create sample tasks
    const tasks = [
      {
        user_id: user.id,
        task_text: 'Review revenue metrics and identify growth opportunities',
        priority: 'high',
        task_date: today,
        is_completed: false,
      },
      {
        user_id: user.id,
        task_text: 'Explore funding options on Insighta',
        priority: 'medium',
        task_date: today,
        is_completed: false,
      },
      {
        user_id: user.id,
        task_text: 'Connect with community members',
        priority: 'low',
        task_date: today,
        is_completed: true,
        completed_at: now,
      },
    ];
    await supabaseClient.from('daily_tasks').insert(tasks);

    return corsResponse({ 
      message: "Dashboard initialized successfully",
      initialized_at: now
    });

  } catch (error: any) {
    console.error('Error initializing dashboard:', error);
    return corsResponse({ error: error.message }, 400);
  }
});