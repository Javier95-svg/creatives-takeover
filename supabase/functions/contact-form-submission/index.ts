import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Validate required environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const contactAdminEmail = Deno.env.get("CONTACT_ADMIN_EMAIL");
    const fromEmail = Deno.env.get("FROM_EMAIL");
    
    // Diagnostic logging (without exposing sensitive values)
    console.log("[CONTACT-FORM] Environment check:", {
      hasResendApiKey: !!resendApiKey,
      hasContactAdminEmail: !!contactAdminEmail,
      hasFromEmail: !!fromEmail,
      adminEmail: contactAdminEmail || "javier@admin-creatives-takeover.com (fallback)",
      fromEmailValue: fromEmail || "onboarding@resend.dev (fallback)"
    });

    if (!resendApiKey) {
      console.error("[CONTACT-FORM] RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "Email service is not configured. Please contact support.",
          success: false,
          details: "RESEND_API_KEY environment variable is missing. Please configure it in Supabase Dashboard → Settings → Edge Functions → Environment Variables."
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Resend client with validated API key
    const resend = new Resend(resendApiKey);
    
    // Verify Resend client is properly initialized
    if (!resend) {
      console.error("[CONTACT-FORM] Failed to initialize Resend client");
      return new Response(
        JSON.stringify({
          error: "Failed to initialize email service",
          success: false,
          details: "Resend client initialization failed"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("[CONTACT-FORM] Resend client initialized successfully");

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
              <li>Join our <a href="https://creatives-takeover.com/mentorship" style="color: #667eea;">Community</a> of 1,000+ founders</li>
              <li>Check out <a href="https://creatives-takeover.com/insighta-test" style="color: #667eea;">Insighta</a> for fundraising resources</li>
            </ul>
          </div>

          <p style="color: #555; line-height: 1.6; margin-top: 20px;">
            Have an urgent question? Reply directly to this email or reach us at
            <a href="mailto:javier@admin-creatives-takeover.com" style="color: #667eea;">javier@admin-creatives-takeover.com</a>
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

    // Get sender information from environment (already validated above)
    const fromEmailValue = fromEmail || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";

    // Get admin email (use validated value or fallback)
    const adminEmail = contactAdminEmail || "javier@admin-creatives-takeover.com";
    
    if (!contactAdminEmail) {
      console.warn("[CONTACT-FORM] CONTACT_ADMIN_EMAIL not set, using fallback:", adminEmail);
    }

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
      console.log("[CONTACT-FORM] Attempting to send admin email to:", adminEmail);
      console.log("[CONTACT-FORM] Email configuration:", {
        from: `${fromName} <${fromEmailValue}>`,
        to: [adminEmail],
        replyTo: email,
        subject: `📬 New Contact: ${reasonLabels[reason] || reason} from ${name}`
      });
      
      // Build email payload - match the working notify-job-application pattern exactly
      // Note: Resend v2.0.0 TypeScript SDK uses camelCase (replyTo), not snake_case (reply_to)
      const emailPayload: {
        from: string;
        to: string[];
        subject: string;
        html: string;
        replyTo?: string;
      } = {
        from: `${fromName} <${fromEmailValue}>`,
        to: [adminEmail],
        subject: `📬 New Contact: ${reasonLabels[reason] || reason} from ${name}`,
        html: adminEmailHtml,
      };
      
      // Add replyTo only if email is valid
      if (email && email.includes('@') && email.includes('.')) {
        emailPayload.replyTo = email;
      }
      
      const adminEmailResponse = await resend.emails.send(emailPayload);
      
      console.log("[CONTACT-FORM] Resend API response:", JSON.stringify(adminEmailResponse, null, 2));
      
      if (adminEmailResponse.error) {
        throw new Error(`Resend API error: ${JSON.stringify(adminEmailResponse.error)}`);
      }
      
      if (!adminEmailResponse.data || !adminEmailResponse.data.id) {
        throw new Error("Resend API returned success but no email ID");
      }
      
      adminEmailSent = true;
      adminEmailId = adminEmailResponse.data.id;
      console.log("[CONTACT-FORM] Admin notification sent successfully. Email ID:", adminEmailId);
    } catch (emailError: any) {
      const errorDetails = {
        message: emailError.message,
        name: emailError.name,
        stack: emailError.stack,
        response: emailError.response ? {
          status: emailError.response.status,
          statusText: emailError.response.statusText,
          data: emailError.response.data
        } : undefined,
        // Resend SDK specific error structure
        error: emailError.error || undefined
      };
      console.error("[CONTACT-FORM] Failed to send admin email. Full error:", JSON.stringify(errorDetails, null, 2));
      errorMessage = `Admin email failed: ${emailError.message || "Unknown error"}`;
      if (emailError.response?.data) {
        errorMessage += ` - ${JSON.stringify(emailError.response.data)}`;
      }
      if (emailError.error) {
        errorMessage += ` - Resend error: ${JSON.stringify(emailError.error)}`;
      }
    }

    // Try to send user confirmation
    try {
      console.log("[CONTACT-FORM] Attempting to send user confirmation to:", email);
      const userEmailResponse = await resend.emails.send({
        from: `${fromName} <${fromEmailValue}>`,
        to: [email],
        subject: `Thank you for contacting Creatives Takeover!`,
        html: userEmailHtml,
      });
      
      console.log("[CONTACT-FORM] Resend API response (user):", JSON.stringify(userEmailResponse, null, 2));
      
      if (userEmailResponse.error) {
        throw new Error(`Resend API error: ${JSON.stringify(userEmailResponse.error)}`);
      }
      
      if (!userEmailResponse.data || !userEmailResponse.data.id) {
        throw new Error("Resend API returned success but no email ID");
      }
      
      userEmailSent = true;
      userEmailId = userEmailResponse.data.id;
      console.log("[CONTACT-FORM] User confirmation sent successfully. Email ID:", userEmailId);
    } catch (emailError: any) {
      const errorDetails = {
        message: emailError.message,
        name: emailError.name,
        response: emailError.response ? {
          status: emailError.response.status,
          statusText: emailError.response.statusText,
          data: emailError.response.data
        } : undefined,
        error: emailError.error || undefined
      };
      console.error("[CONTACT-FORM] Failed to send user email. Full error:", JSON.stringify(errorDetails, null, 2));
      const userErrorMsg = `User email failed: ${emailError.message || "Unknown error"}`;
      if (emailError.response?.data) {
        errorMessage = errorMessage
          ? `${errorMessage}; ${userErrorMsg} - ${JSON.stringify(emailError.response.data)}`
          : `${userErrorMsg} - ${JSON.stringify(emailError.response.data)}`;
      } else if (emailError.error) {
        errorMessage = errorMessage
          ? `${errorMessage}; ${userErrorMsg} - Resend error: ${JSON.stringify(emailError.error)}`
          : `${userErrorMsg} - Resend error: ${JSON.stringify(emailError.error)}`;
      } else {
        errorMessage = errorMessage
          ? `${errorMessage}; ${userErrorMsg}`
          : userErrorMsg;
      }
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

    // Return success ONLY if admin email was actually sent
    if (adminEmailSent) {
      console.log("[CONTACT-FORM] Success: Admin email sent. Submission ID:", dbData?.id);
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

    // If admin email failed, return error even if DB save succeeded
    console.error("[CONTACT-FORM] Failure: Admin email was not sent. Error:", errorMessage);
    return new Response(
      JSON.stringify({
        error: "Failed to send email notification",
        success: false,
        details: errorMessage || "Unknown error occurred while sending email",
        submissionId: dbData?.id || null,
        fallbackEmail: "javier@admin-creatives-takeover.com",
        message: "There was an issue sending your message. Please email us directly at javier@admin-creatives-takeover.com"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      cause: error.cause
    };
    console.error("[CONTACT-FORM] Unexpected error processing submission:", JSON.stringify(errorDetails, null, 2));

    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
        success: false,
        details: "Please check the function logs for more information",
        fallbackEmail: "javier@admin-creatives-takeover.com",
        message: "There was an issue sending your message. Please email us directly at javier@admin-creatives-takeover.com"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
