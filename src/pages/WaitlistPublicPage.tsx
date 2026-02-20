import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import WaitlistPageTemplate, { type SignupData } from '@/components/waitlist/WaitlistPageTemplate';
import {
  normalizeWaitlistContent,
  type WaitlistContent,
  type WaitlistVariant,
} from '@/lib/waitlist';

interface WaitlistPage {
  id: string;
  slug: string;
  product_name: string;
  content: WaitlistContent;
  activeVariant: WaitlistVariant;
}

function getOrCreateSessionId(): string {
  const key = 'waitlist_public_session_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  localStorage.setItem(key, generated);
  return generated;
}

function getVariantForSession(pageId: string): WaitlistVariant {
  const sessionId = getOrCreateSessionId();
  const key = `waitlist_variant_${pageId}_${sessionId}`;
  const existing = localStorage.getItem(key);
  if (existing === 'A' || existing === 'B') {
    return existing;
  }

  const nextVariant: WaitlistVariant = Math.random() < 0.5 ? 'A' : 'B';
  localStorage.setItem(key, nextVariant);
  return nextVariant;
}

export default function WaitlistPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  const [page, setPage] = useState<WaitlistPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const referralSource = searchParams.get('ref') || undefined;

  const utm = useMemo(() => ({
    source: searchParams.get('utm_source') || undefined,
    medium: searchParams.get('utm_medium') || undefined,
    campaign: searchParams.get('utm_campaign') || undefined,
    term: searchParams.get('utm_term') || undefined,
    content: searchParams.get('utm_content') || undefined,
  }), [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('waitlist_pages')
        .select('id, slug, product_name, ai_content, theme, accent_color, layout, logo_url, image_url, social_links, launch_date, ab_test_enabled, headline_variant_b, referral_message')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      setLoading(false);

      if (error || !data) {
        setNotFound(true);
        return;
      }

      const mergedContent = normalizeWaitlistContent({
        ...(data.ai_content || {}),
        theme: data.theme,
        accentColor: data.accent_color,
        layout: data.layout,
        logoUrl: data.logo_url,
        imageUrl: data.image_url,
        socialLinks: data.social_links,
        launchDate: data.launch_date,
        abTestEnabled: data.ab_test_enabled,
        headlineVariantB: data.headline_variant_b || (data.ai_content as any)?.headlineVariantB,
        referralMessage: data.referral_message || (data.ai_content as any)?.referralMessage,
      }, data.product_name || 'Product');

      const activeVariant: WaitlistVariant = mergedContent.abTestEnabled && mergedContent.headlineVariantB
        ? getVariantForSession(data.id)
        : 'A';

      if (activeVariant === 'B' && mergedContent.headlineVariantB) {
        mergedContent.headline = mergedContent.headlineVariantB;
      }

      setPage({
        id: data.id,
        slug: data.slug,
        product_name: data.product_name ?? 'Product',
        content: mergedContent,
        activeVariant,
      });

      const sessionId = getOrCreateSessionId();
      const dedupeKey = `waitlist_view_sent_${data.id}_${sessionId}`;
      const lastTrackedAt = Number(localStorage.getItem(dedupeKey) || '0');
      const now = Date.now();

      if (now - lastTrackedAt > 30 * 60 * 1000) {
        localStorage.setItem(dedupeKey, String(now));

        (supabase as any).functions.invoke('waitlist-public-api', {
          body: {
            action: 'track_view',
            slug,
            sessionId,
            variant: activeVariant,
            referrer: document.referrer || undefined,
            userAgent: navigator.userAgent,
            utm,
          },
        });
      }
    };

    load();
  }, [slug, utm]);

  const handleEmailSubmit = async (form: SignupData): Promise<{ ok: boolean; duplicate?: boolean; referralMessage?: string }> => {
    if (!page) return { ok: false };

    const sessionId = getOrCreateSessionId();

    const { data, error } = await supabase.functions.invoke('waitlist-public-api', {
      body: {
        action: 'signup',
        slug: page.slug,
        sessionId,
        variant: page.activeVariant,
        email: form.email,
        firstName: form.firstName,
        consent: form.consent,
        honeypot: form.honeypot,
        customFields: form.customFields ?? [],
        referralSource,
        referrer: document.referrer || undefined,
        userAgent: navigator.userAgent,
        utm,
      },
    });

    if (error || !data?.ok) {
      const message = data?.error || 'Something went wrong. Please try again.';
      toast.error(message);
      return { ok: false };
    }

    if (data.duplicate) {
      toast.info("You're already on this waitlist.");
    }

    return {
      ok: true,
      duplicate: Boolean(data.duplicate),
      referralMessage: typeof data.referralMessage === 'string' ? data.referralMessage : undefined,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="mb-2 text-3xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">This waitlist page does not exist or has been unpublished.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WaitlistPageTemplate
        content={page.content}
        productName={page.product_name}
        mode="public"
        onEmailSubmit={handleEmailSubmit}
        publicUrl={`${window.location.origin}/w/${page.slug}`}
        activeVariant={page.activeVariant}
      />
    </div>
  );
}
