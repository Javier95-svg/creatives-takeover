import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  id: string;
  user_id: string;
  task_text: string;
  deadline_time: string;
  last_reminder_sent: string | null;
  profiles?: {
    email?: string;
    full_name?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting task reminder service check...');

    // Get all incomplete tasks with deadlines
    const { data: tasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select(`
        id,
        user_id,
        task_text,
        deadline_time,
        last_reminder_sent,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq('is_completed', false)
      .not('deadline_time', 'is', null)
      .gt('deadline_time', new Date().toISOString()) // Only tasks with future deadlines
      .order('deadline_time', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} incomplete tasks with deadlines`);

    let remindersProcessed = 0;
    let remindersSent = 0;

    // Process each task
    for (const task of (tasks as Task[]) || []) {
      remindersProcessed++;

      // Check if we should send a reminder (every 3 hours)
      const lastReminder = task.last_reminder_sent ? new Date(task.last_reminder_sent) : null;
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      // Send reminder if:
      // 1. Never sent before, OR
      // 2. Last reminder was more than 3 hours ago
      const shouldSendReminder = !lastReminder || lastReminder < threeHoursAgo;

      if (shouldSendReminder) {
        console.log(`Sending reminder for task ${task.id}: "${task.task_text}"`);

        // Create a notification in the system (you can expand this)
        const deadlineDate = new Date(task.deadline_time);
        const hoursUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Insert notification into database
        const { error: notificationError } = await supabase
          .from('community_notifications')
          .insert({
            user_id: task.user_id,
            type: 'task_reminder',
            title: 'Task Reminder',
            message: `Don't forget: "${task.task_text}" is due in ${hoursUntilDeadline} hours!`,
            related_id: task.id,
            link: '/dashboard'
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }

        // Update last reminder sent timestamp
        const { error: updateError } = await supabase
          .from('daily_tasks')
          .update({ last_reminder_sent: now.toISOString() })
          .eq('id', task.id);

        if (updateError) {
          console.error('Error updating task reminder timestamp:', updateError);
        } else {
          remindersSent++;
        }
      }
    }

    console.log(`Task reminder service completed. Processed: ${remindersProcessed}, Sent: ${remindersSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: remindersProcessed,
        remindersSent: remindersSent,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in task reminder service:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});