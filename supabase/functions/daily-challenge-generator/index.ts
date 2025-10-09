import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChallengeTemplate {
  type: string;
  title: string;
  description: string;
  reward_points: number;
}

// Challenge templates for each day of the week
const challengeTemplates: Record<string, ChallengeTemplate> = {
  Monday: {
    type: 'post',
    title: 'Share Your Weekend Win',
    description: 'Post about something you achieved or learned over the weekend. Inspire the community with your progress!',
    reward_points: 30
  },
  Tuesday: {
    type: 'share',
    title: 'Tech Tuesday',
    description: 'Share a tool, app, or technology that\'s helping your business. Help others discover what works!',
    reward_points: 25
  },
  Wednesday: {
    type: 'feedback',
    title: 'Wisdom Wednesday',
    description: 'Share a lesson learned from a failure or setback. Give detailed feedback on 3 community posts.',
    reward_points: 35
  },
  Thursday: {
    type: 'comment',
    title: 'Thoughtful Thursday',
    description: 'Leave meaningful comments on at least 5 posts. Quality over quantity - help others with genuine insights!',
    reward_points: 25
  },
  Friday: {
    type: 'post',
    title: 'Founder Friday',
    description: 'Introduce yourself or share your latest project update. Let the community know what you\'re building!',
    reward_points: 30
  },
  Saturday: {
    type: 'engagement',
    title: 'Success Story Saturday',
    description: 'Celebrate a milestone, big or small! Engage with 3 other success stories by upvoting and commenting.',
    reward_points: 30
  },
  Sunday: {
    type: 'post',
    title: 'Sunday Reflection',
    description: 'Share your goals for the upcoming week. What are you planning to achieve? Set your intentions!',
    reward_points: 25
  }
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

    // Get current day of week
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const todayDate = today.toISOString().split('T')[0];

    console.log(`Generating challenge for ${dayName} (${todayDate})`);

    // Check if today's challenge already exists
    const { data: existingChallenge, error: checkError } = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('challenge_date', todayDate)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingChallenge) {
      console.log('Challenge already exists for today');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Challenge already exists',
          challenge_id: existingChallenge.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get template for today
    const template = challengeTemplates[dayName];
    
    if (!template) {
      throw new Error(`No template found for ${dayName}`);
    }

    // Create today's challenge
    const { data: newChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        challenge_date: todayDate,
        challenge_type: template.type,
        challenge_title: template.title,
        challenge_description: template.description,
        reward_points: template.reward_points
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Created new challenge:', newChallenge.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Challenge created successfully',
        challenge: newChallenge
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating daily challenge:", error);
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
