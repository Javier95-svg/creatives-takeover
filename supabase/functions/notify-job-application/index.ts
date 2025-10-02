import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobApplicationNotification {
  application_id: string;
  position_title: string;
  applicant_name: string;
  applicant_email: string;
  linkedin_url?: string;
  portfolio_url?: string;
  cover_message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      application_id,
      position_title,
      applicant_name,
      applicant_email,
      linkedin_url,
      portfolio_url,
      cover_message 
    }: JobApplicationNotification = await req.json();

    console.log("Processing job application notification:", { application_id, position_title, applicant_name });

    // Get admin emails from environment
    const adminEmails = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "").split(",").filter(Boolean);
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover Careers";

    if (adminEmails.length === 0) {
      console.warn("No admin emails configured for job application notifications");
      return new Response(
        JSON.stringify({ warning: "No admin emails configured" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin dashboard URL
    const dashboardUrl = `https://rcjlaybjnozqbsoxzboa.supabase.co/project/rcjlaybjnozqbsoxzboa/editor`;

    // Construct email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
            .value { color: #333; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 New Job Application Received</h1>
              <p>Position: <strong>${position_title}</strong></p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">👤 Applicant Name</div>
                <div class="value">${applicant_name}</div>
              </div>
              
              <div class="field">
                <div class="label">📧 Email</div>
                <div class="value">${applicant_email}</div>
              </div>
              
              ${linkedin_url ? `
                <div class="field">
                  <div class="label">💼 LinkedIn</div>
                  <div class="value"><a href="${linkedin_url}" target="_blank">${linkedin_url}</a></div>
                </div>
              ` : ''}
              
              ${portfolio_url ? `
                <div class="field">
                  <div class="label">🎨 Portfolio</div>
                  <div class="value"><a href="${portfolio_url}" target="_blank">${portfolio_url}</a></div>
                </div>
              ` : ''}
              
              <div class="field">
                <div class="label">✉️ Cover Message</div>
                <div class="value">${cover_message}</div>
              </div>
              
              <a href="${dashboardUrl}" class="button">View in Admin Dashboard</a>
            </div>
            <div class="footer">
              <p>Application ID: ${application_id}</p>
              <p>Received at: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to all admin emails
    const emailPromises = adminEmails.map(email => 
      resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [email.trim()],
        subject: `New Application: ${position_title} - ${applicant_name}`,
        html: emailHtml,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Email notification sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful,
        failed: failed,
        message: `Notification emails sent to ${successful} admin(s)` 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-job-application function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
