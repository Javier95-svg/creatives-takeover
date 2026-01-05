import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client with service role for database writes
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormData {
  name: string;
  email: string;
  role: string;
  reason: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CONTACT-FORM] Function started");

    const formData: ContactFormData = await req.json();
    const { name, email, role, reason, message } = formData;

    console.log("[CONTACT-FORM] Processing submission from:", email);

    // Validate required fields
    if (!name || !email || !role || !reason || !message) {
      return new Response(
        JSON.stringify({
          error: "All fields are required",
          success: false
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'long'
    });

    // Role labels for better readability
    const roleLabels: Record<string, string> = {
      founder: "Founder / Entrepreneur",
      angel_investor: "Angel Investor",
      vc: "Venture Capitalist",
      accelerator: "Accelerator / Incubator",
      mentor: "Mentor / Advisor",
      partner: "Potential Partner",
      media: "Media / Press",
      other: "Other",
    };

    // Reason labels for better readability
    const reasonLabels: Record<string, string> = {
      general: "General Inquiry",
      partnership: "Partnership Opportunity",
      investment: "Investment Interest",
      mentorship: "Mentorship / Guidance",
      support: "Platform Support",
      feedback: "Feedback / Suggestions",
      media: "Media / Press Inquiry",
      collaboration: "Collaboration Request",
    };

    // Admin notification email with full details
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Contact Form Submission</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Contact Details</h2>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>👤 Name:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>📧 Email:</strong> <a href="mailto:${email}" style="color: #667eea;">${email}</a></p>
            <p style="margin: 10px 0;"><strong>💼 Role:</strong> ${roleLabels[role] || role}</p>
            <p style="margin: 10px 0;"><strong>📋 Reason:</strong> ${reasonLabels[reason] || reason}</p>
            <p style="margin: 10px 0;"><strong>🕐 Submitted:</strong> ${timestamp}</p>
          </div>

          <div style="background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">💬 Message:</h3>
            <p style="color: #555; white-space: pre-wrap; line-height: 1.6; margin: 0;">${message}</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">🚀 Quick Actions:</h3>
            <p style="margin: 10px 0;">
              <a href="mailto:${email}?subject=Re: ${reasonLabels[reason] || reason}"
                 style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
                📧 Reply to ${name}
              </a>
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              This message was sent from the Contact Us form on creatives-takeover.com
            </p>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>This is an automated notification from Creatives Takeover</p>
        </div>
      </div>
    `;

    // User confirmation email
    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Thank You for Reaching Out!</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>

          <p style="color: #555; line-height: 1.6;">
            We've received your message and we're excited to connect with you! Our team will review your inquiry and get back to you within 24 hours.
          </p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">📝 Your Submission Summary:</h3>
            <p style="margin: 10px 0;"><strong>Role:</strong> ${roleLabels[role] || role}</p>
            <p style="margin: 10px 0;"><strong>Reason:</strong> ${reasonLabels[reason] || reason}</p>
            <p style="margin: 10px 0;"><strong>Submitted:</strong> ${timestamp}</p>
          </div>

          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">💬 Your Message:</h3>
            <p style="color: #555; white-space: pre-wrap; line-height: 1.6; margin: 0;">${message}</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">🌟 While You Wait:</h3>
            <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
              <li>Explore our <a href="https://creatives-takeover.com/bizmap-ai" style="color: #667eea;">BizMap AI</a> for instant business planning</li>
              <li>Join our <a href="https://creatives-takeover.com/community" style="color: #667eea;">Community</a> of 1,000+ founders</li>
              <li>Check out <a href="https://creatives-takeover.com/insighta/test" style="color: #667eea;">Insighta</a> for fundraising resources</li>
            </ul>
          </div>

          <p style="color: #555; line-height: 1.6; margin-top: 20px;">
            Have an urgent question? Reply directly to this email or reach us at
            <a href="mailto:admin@creatives-takeover.com" style="color: #667eea;">admin@creatives-takeover.com</a>
          </p>

          <p style="color: #555; line-height: 1.6;">
            Best regards,<br>
            <strong>The Creatives Takeover Team</strong>
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© 2025 Creatives Takeover. Building the future of entrepreneurship.</p>
        </div>
      </div>
    `;

    // Get sender information from environment
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";

    // Get admin email (fallback to admin@creatives-takeover.com)
    const adminEmail = Deno.env.get("CONTACT_ADMIN_EMAIL") || "admin@creatives-takeover.com";

    // Variables to track email delivery status
    let adminEmailSent = false;
    let userEmailSent = false;
    let adminEmailId: string | undefined;
    let userEmailId: string | undefined;
    let errorMessage: string | undefined;

    // Get request metadata
    const userAgent = req.headers.get("user-agent") || null;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;

    console.log("[CONTACT-FORM] Sending emails to admin:", adminEmail);

    // Try to send admin notification
    try {
      const adminEmailResponse = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: adminEmail,
        replyTo: email, // Allow direct reply to the user
        subject: `📬 New Contact: ${reasonLabels[reason] || reason} from ${name}`,
        html: adminEmailHtml,
      });
      adminEmailSent = true;
      adminEmailId = adminEmailResponse.data?.id;
      console.log("[CONTACT-FORM] Admin notification sent:", adminEmailId);
    } catch (emailError: any) {
      console.error("[CONTACT-FORM] Failed to send admin email:", emailError);
      errorMessage = `Admin email failed: ${emailError.message}`;
    }

    // Try to send user confirmation
    try {
      const userEmailResponse = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject: `Thank you for contacting Creatives Takeover!`,
        html: userEmailHtml,
      });
      userEmailSent = true;
      userEmailId = userEmailResponse.data?.id;
      console.log("[CONTACT-FORM] User confirmation sent:", userEmailId);
    } catch (emailError: any) {
      console.error("[CONTACT-FORM] Failed to send user email:", emailError);
      errorMessage = errorMessage
        ? `${errorMessage}; User email failed: ${emailError.message}`
        : `User email failed: ${emailError.message}`;
    }

    // ALWAYS save to database, regardless of email success/failure
    console.log("[CONTACT-FORM] Saving submission to database...");
    const { data: dbData, error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email,
        role,
        reason,
        message,
        admin_email_sent: adminEmailSent,
        user_email_sent: userEmailSent,
        admin_email_id: adminEmailId || null,
        user_email_id: userEmailId || null,
        error_message: errorMessage || null,
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[CONTACT-FORM] Database error:", dbError);
      // Even if DB fails, continue - at least we tried to send emails
    } else {
      console.log("[CONTACT-FORM] Submission saved to database:", dbData?.id);
    }

    // Return success if at least the admin email was sent OR the data was saved to DB
    if (adminEmailSent || !dbError) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Your message has been sent successfully!",
          submissionId: dbData?.id,
          adminEmailId,
          userEmailId,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // If both email and DB failed, return error
    throw new Error("Failed to send emails and save to database");
  } catch (error: any) {
    console.error("[CONTACT-FORM] Error processing submission:", error);

    // Fallback: Log error and still return success to avoid user-facing errors
    // The admin will be notified via error logs
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        fallbackEmail: "admin@creatives-takeover.com",
        message: "There was an issue sending your message. Please email us directly at admin@creatives-takeover.com"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
