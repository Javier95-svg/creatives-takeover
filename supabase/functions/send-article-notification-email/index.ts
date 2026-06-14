/**
 * send-article-notification-email
 *
 * Sends an email notification to all registered users when a new article
 * is published in the Newspaper (/newspaper).
 *
 * Trigger: called from the DB trigger via pg_net when a stories_articles
 * row transitions to status = 'published'.
 *
 * Frequency control: max 1 article notification email per user per 24h
 * (uses retention_email_log with sequence = 'new_article').
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ArticlePayload {
  articleId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  bannerImageUrl?: string | null;
  hashtags?: string[];
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildArticleEmailHtml(args: {
  recipientName: string;
  title: string;
  excerpt: string;
  articleUrl: string;
  hashtags: string[];
}) {
  const safeName = escapeHtml(args.recipientName);
  const safeTitle = escapeHtml(args.title);
  const safeExcerpt = escapeHtml(truncateText(args.excerpt, 280));
  const safeArticleUrl = escapeHtml(args.articleUrl);
  const tagBadges = args.hashtags
    .slice(0, 4)
    .map(
      (tag) =>
        `<span style="display: inline-block; background: #f1f5f9; color: #475569; padding: 2px 10px; border-radius: 999px; font-size: 12px; margin-right: 6px; margin-bottom: 4px;">${escapeHtml(tag)}</span>`,
    )
    .join("");

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">New article in the Newspaper</h1>
      <p style="margin: 0 0 12px; color: #334155;">Hey ${safeName}, we just published a new piece you might find useful:</p>
      <div style="border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc; padding: 20px; margin: 0 0 20px;">
        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #0f172a;">${safeTitle}</p>
        <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">${safeExcerpt}</p>
        ${tagBadges ? `<div style="margin: 0;">${tagBadges}</div>` : ""}
      </div>
      <div style="margin: 24px 0;">
        <a href="${safeArticleUrl}" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Read Article →
        </a>
      </div>
      <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">— The Creatives Takeover team</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #94a3b8;">You are receiving this because you created an account at creatives-takeover.com. Manage preferences from your account.</p>
    </div>
  `;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload: ArticlePayload = await req.json();
    const { articleId, title, slug, excerpt, hashtags } = payload;

    if (!articleId || !title || !slug) {
      return jsonResponse(
        { error: "Missing required fields: articleId, title, slug" },
        400,
      );
    }

    const appUrl = (
      Deno.env.get("APP_URL") || "https://creatives-takeover.com"
    ).replace(/\/$/, "");
    const articleUrl = `${appUrl}/newspaper/${slug}`;
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
    const articleExcerpt =
      excerpt?.trim() || "A new article is live on the Creatives Takeover Newspaper. Check it out.";
    const articleHashtags = hashtags ?? [];

    // Fetch all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name");

    if (profilesError) {
      throw profilesError;
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failures: [] as Array<{ user_id: string; reason: string }>,
    };

    const oneDayAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    for (const profile of profiles ?? []) {
      results.processed++;

      try {
        // Get the user email from auth
        const authResult = await supabase.auth.admin.getUserById(profile.id);
        const email = authResult.data.user?.email?.trim() ?? "";

        if (
          !email ||
          email.toLowerCase() === "admin@creatives-takeover.com"
        ) {
          results.skipped++;
          continue;
        }

        // Dedup: skip if we already sent a new_article email within 24h
        const { data: existingSend } = await supabase
          .from("retention_email_log")
          .select("id")
          .eq("user_id", profile.id)
          .eq("sequence", "new_article")
          .gte("sent_at", oneDayAgo)
          .maybeSingle();

        if (existingSend) {
          results.skipped++;
          continue;
        }

        const recipientName =
          profile.full_name?.trim() || "Founder";

        const html = buildArticleEmailHtml({
          recipientName,
          title,
          excerpt: articleExcerpt,
          articleUrl,
          hashtags: articleHashtags,
        });

        const sendResult = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject: `New in the Newspaper: ${truncateText(title, 60)}`,
          html,
        } as never);

        // Log the send
        await supabase.from("retention_email_log").insert({
          user_id: profile.id,
          email,
          sequence: "new_article",
          sent_at: new Date().toISOString(),
          resend_id: sendResult?.data?.id ?? null,
        });

        results.sent++;
      } catch (error) {
        results.failures.push({
          user_id: profile.id,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log("send-article-notification-email: complete", results);

    return jsonResponse({ success: true, articleId, ...results });
  } catch (error) {
    console.error("send-article-notification-email: error", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
