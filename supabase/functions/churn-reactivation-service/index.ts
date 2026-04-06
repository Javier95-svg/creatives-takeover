import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { normalizePlan, type Plan } from '../_shared/plan-enforcement.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TIER_FEATURES: Record<Plan, { label: string; features: string[] }> = {
  rookie: {
    label: 'Rookie',
    features: [
      '25 monthly credits with free ICP Builder access',
      'Insighta Test, Newspaper, and preview access across the platform',
      'A simple way to restart your workflow before upgrading again',
    ],
  },
  starter: {
    label: 'Starter',
    features: [
      'Waitlist Maker and PMF Lab access',
      '2 free discovery calls and 2 co-founder posts per billing cycle',
      '50 AI credits per month',
    ],
  },
  rising: {
    label: 'Rising',
    features: [
      'Full BizMap AI access with most tools included',
      'Pitch Deck Analyzer, Prompt Library, and deeper research workflows',
      '100 AI credits per month',
    ],
  },
  pro: {
    label: 'Pro',
    features: [
      'Everything in Rising plus Angels and unlimited discovery calls',
      'Unlimited VC and accelerator profile views',
      '300 AI credits per month',
    ],
  },
};

async function sendWinBackEmail(
  to: string,
  firstName: string,
  previousTier: string,
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
  const fromName = Deno.env.get('FROM_NAME') || 'Creatives Takeover';
  const replyTo = Deno.env.get('REPLY_TO_EMAIL');

  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const tierInfo = TIER_FEATURES[normalizePlan(previousTier)] ?? TIER_FEATURES.rookie;
  const featureListHtml = tierInfo.features
    .map((f) => `<li style="margin-bottom: 8px;">${f}</li>`)
    .join('');

  const subject = `We miss you, ${firstName} — come back to Creatives Takeover`;

  const html = `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Hey ${firstName}, we miss you.</h2>

      <p style="margin: 0 0 16px;">
        You were on our <strong>${tierInfo.label} plan</strong>, and you had access to some powerful tools to grow your startup:
      </p>

      <ul style="margin: 0 0 24px; padding-left: 20px; color: #374151;">
        ${featureListHtml}
      </ul>

      <p style="margin: 0 0 24px;">
        We're always adding new features, and the community is growing every day. There's never been a better time to come back and keep building.
      </p>

      <div style="margin: 32px 0; text-align: center;">
        <a href="https://creatives-takeover.com/pricing"
           style="background-color: #6366f1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          Reactivate My Plan
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">
        Questions? Just reply to this email — we read every message.
      </p>

      <p style="color: #6b7280; font-size: 14px; margin: 0 0 32px;">
        — The Creatives Takeover Team
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        You're receiving this because you previously had an account on Creatives Takeover.
        If you no longer wish to receive these emails, reply with "unsubscribe" and we'll remove you.
      </p>
    </div>
  `;

  try {
    const payload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    };
    if (replyTo) payload.reply_to = replyTo;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Churn reactivation service started');

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch users who churned from a paid plan within the last 90 days
    const { data: churnedUsers, error: queryError } = await supabase
      .from('subscribers')
      .select(`
        email,
        user_id,
        subscription_tier,
        subscription_end,
        profiles!inner (
          full_name
        )
      `)
      .eq('subscribed', false)
      .not('subscription_end', 'is', null)
      .neq('subscription_tier', 'rookie')
      .gte('subscription_end', ninetyDaysAgo);

    if (queryError) {
      console.error('Error querying churned users:', queryError);
      throw queryError;
    }

    if (!churnedUsers || churnedUsers.length === 0) {
      console.log('No churned users found');
      return new Response(
        JSON.stringify({ message: 'No churned users found', processed: 0, emailed: 0, skipped: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${churnedUsers.length} churned users`);

    let emailed = 0;
    let skipped = 0;

    for (const user of churnedUsers as any[]) {
      const email: string = user.email;
      const previousTier = normalizePlan(user.subscription_tier);
      const fullName: string = user.profiles?.full_name ?? '';
      const firstName = fullName.split(' ')[0] || 'there';

      // Dedup: skip if we emailed this person within the last 30 days
      const { data: recentOutreach } = await supabase
        .from('reactivation_outreach')
        .select('id')
        .eq('email', email)
        .gte('sent_at', thirtyDaysAgo)
        .limit(1)
        .maybeSingle();

      if (recentOutreach) {
        console.log(`Skipping ${email} — contacted within last 30 days`);
        skipped++;
        continue;
      }

      const result = await sendWinBackEmail(email, firstName, previousTier);

      if (!result.success) {
        console.error(`Failed to send win-back email to ${email}:`, result.error);
        continue;
      }

      console.log(`Sent win-back email to ${email} (previous tier: ${previousTier})`);
      emailed++;

      // Log the outreach
      await supabase.from('reactivation_outreach').insert({
        user_id: user.user_id,
        email,
        previous_tier: previousTier,
        campaign_type: 'win_back',
        sent_at: new Date().toISOString(),
      });
    }

    console.log(`Churn reactivation completed. Processed: ${churnedUsers.length}, Emailed: ${emailed}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        message: 'Churn reactivation service completed',
        processed: churnedUsers.length,
        emailed,
        skipped,
        processed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in churn reactivation service:', error);
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
