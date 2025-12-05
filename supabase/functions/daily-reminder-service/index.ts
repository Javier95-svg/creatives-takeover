import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Sprint {
  id: string;
  title: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  profiles: {
    id: string;
    full_name: string;
  };
}

interface CheckInReminder {
  user_id: string;
  sprint_id: string;
  user_name: string;
  user_email: string;
  sprint_title: string;
  last_checkin_days_ago: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Simple email sending function using fetch
async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
  
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Creatives Takeover <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: String(error) };
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Daily reminder service started');

    // Get all active sprints that should receive reminders
    const { data: activeSprints, error: sprintsError } = await supabase
      .from('sprints')
      .select(`
        id,
        title,
        user_id,
        start_date,
        end_date,
        status,
        profiles!inner (
          id,
          full_name
        )
      `)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().split('T')[0])
      .lte('start_date', new Date().toISOString().split('T')[0]);

    if (sprintsError) {
      console.error('Error fetching active sprints:', sprintsError);
      throw sprintsError;
    }

    if (!activeSprints || activeSprints.length === 0) {
      console.log('No active sprints found');
      return new Response(
        JSON.stringify({ message: 'No active sprints found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${activeSprints.length} active sprints`);

    const remindersToSend: CheckInReminder[] = [];

    // Check each sprint for users who need reminders
    for (const sprint of activeSprints as Sprint[]) {
      // Get the user's email from auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(sprint.user_id);
      
      if (authError || !authUser.user?.email) {
        console.log(`Skipping sprint ${sprint.id} - no user email found`);
        continue;
      }

      // Check when they last checked in
      const { data: lastCheckIn, error: checkInError } = await supabase
        .from('daily_check_ins')
        .select('created_at')
        .eq('user_id', sprint.user_id)
        .eq('sprint_id', sprint.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkInError) {
        console.error(`Error checking last check-in for sprint ${sprint.id}:`, checkInError);
        continue;
      }

      // Calculate days since last check-in
      const today = new Date();
      let daysSinceLastCheckIn = 0;

      if (lastCheckIn) {
        const lastCheckInDate = new Date(lastCheckIn.created_at);
        daysSinceLastCheckIn = Math.floor((today.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        // No check-in yet, calculate days since sprint started
        const sprintStartDate = new Date(sprint.start_date);
        daysSinceLastCheckIn = Math.floor((today.getTime() - sprintStartDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Send reminder if they haven't checked in today (1+ days)
      if (daysSinceLastCheckIn >= 1) {
        remindersToSend.push({
          user_id: sprint.user_id,
          sprint_id: sprint.id,
          user_name: sprint.profiles.full_name || 'There',
          user_email: authUser.user.email,
          sprint_title: sprint.title,
          last_checkin_days_ago: daysSinceLastCheckIn,
        });
      }
    }

    console.log(`Sending ${remindersToSend.length} reminders`);

    // Send reminder emails
    let sentCount = 0;
    for (const reminder of remindersToSend) {
      try {
        const subject = reminder.last_checkin_days_ago === 1 
          ? `🚀 Daily Check-in: ${reminder.sprint_title}`
          : `⏰ Missing You: ${reminder.sprint_title} Check-in`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hey ${reminder.user_name}! 👋</h2>
            
            ${reminder.last_checkin_days_ago === 1 
              ? `<p>Time for your daily check-in on <strong>${reminder.sprint_title}</strong>!</p>
                 <p>Share your progress, wins, and keep your accountability streak going. 🔥</p>`
              : `<p>We haven't seen you check in for ${reminder.last_checkin_days_ago} days on <strong>${reminder.sprint_title}</strong>.</p>
                 <p>Don't break your momentum! The community is here to support you. 💪</p>`
            }
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://rcjlaybjnozqbsoxzboa.supabase.co" 
                 style="background-color: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Check In Now
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Keep shipping, keep growing! 🚀<br>
              - The Creatives Takeover Team
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              Don't want daily reminders? You can adjust your notification preferences in your sprint settings.
            </p>
          </div>
        `;

        const emailResult = await sendEmail(reminder.user_email, subject, html);

        if (!emailResult.success) {
          console.error(`Failed to send reminder to ${reminder.user_email}:`, emailResult.error);
        } else {
          console.log(`Sent reminder to ${reminder.user_email} for sprint ${reminder.sprint_title}`);
          sentCount++;

          // Log the reminder in the database
          await supabase
            .from('daily_reminders')
            .insert({
              user_id: reminder.user_id,
              sprint_id: reminder.sprint_id,
              reminder_type: reminder.last_checkin_days_ago === 1 ? 'daily_checkin' : 'overdue_nudge',
              scheduled_for: new Date().toISOString(),
              sent_at: new Date().toISOString(),
              is_sent: true,
              metadata: {
                days_since_last_checkin: reminder.last_checkin_days_ago,
                email_sent_to: reminder.user_email,
              },
            });
        }
      } catch (emailError) {
        console.error(`Error sending reminder to ${reminder.user_email}:`, emailError);
      }
    }

    console.log(`Daily reminder service completed. Sent ${sentCount} reminders.`);

    return new Response(
      JSON.stringify({
        message: 'Daily reminder service completed',
        active_sprints: activeSprints.length,
        reminders_sent: sentCount,
        processed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in daily reminder service:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
