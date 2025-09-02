import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  fullName: string;
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[NOTIFY-ADMIN] Function started");
    
    const { email, fullName, timestamp }: NotificationRequest = await req.json();
    
    console.log("[NOTIFY-ADMIN] Processing notification for:", email);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New User Signup - BizMap AI</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">User Details</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin: 10px 0;"><strong>👤 Full Name:</strong> ${fullName || 'Not provided'}</p>
            <p style="margin: 10px 0;"><strong>🕐 Signup Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9;">
            <p style="color: #666; margin: 0;">
              <a href="https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/auth/users" 
                 style="color: #667eea; text-decoration: none;">
                👉 View in Supabase Dashboard
              </a>
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>This is an automated notification from BizMap AI</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "BizMap AI <onboarding@resend.dev>",
      to: ["javier_apv13@hotmail.com"],
      subject: `🚀 New User Signup: ${email}`,
      html: emailHtml,
    });

    console.log("[NOTIFY-ADMIN] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[NOTIFY-ADMIN] Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);