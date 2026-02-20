import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Globe, Copy, ArrowLeft, Loader2, Users,
  Download, Eye, TrendingUp, Plus, ChevronRight, EyeOff, Check, X, ShieldCheck,
} from 'lucide-react';
import WaitlistPageTemplate, { WaitlistContent } from './WaitlistPageTemplate';
import { getDefaultWaitlistContent, normalizeWaitlistContent, WAITLIST_ACCENT_PRESETS } from '@/lib/waitlist';

type EditorPhase = 'input' | 'preview' | 'published';

const WAITLIST_TABLE = 'waitlist_pages' as any;
const SIGNUPS_TABLE = 'waitlist_signups' as any;
const EVENTS_TABLE = 'waitlist_events' as any;

interface WaitlistPageRow {
  id: string;
  slug: string | null;
  product_name: string;
  ai_content: WaitlistContent | null;
  status: string;
  title: string;
  view_count: number;
  mark_ready_at?: string | null;
  theme?: string | null;
  accent_color?: string | null;
  layout?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  social_links?: Record<string, unknown> | null;
  launch_date?: string | null;
  webhook_url?: string | null;
  integration_provider?: string | null;
  integration_list_id?: string | null;
  confirmation_email_enabled?: boolean | null;
  ab_test_enabled?: boolean | null;
  headline_variant_b?: string | null;
  referral_message?: string | null;
}

interface SignupRow {
  id: string;
  email: string;
  first_name: string | null;
  created_at: string;
  variant?: 'A' | 'B' | null;
  utm_source?: string | null;
  referrer?: string | null;
  consent?: boolean | null;
}

interface EventRow {
  event_type: 'VIEW' | 'SIGNUP';
  variant: 'A' | 'B' | null;
  occurred_at: string;
  utm_source?: string | null;
}

function generateSlug(productName: string): string {
  const base = productName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30);
  const random = Math.random().toString(36).slice(2, 7);
  return `${base}-${random}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const masked = local.slice(0, 2) + '*'.repeat(Math.max(local.length - 2, 2));
  return `${masked}@${domain}`;
}

const BASE_URL = 'https://creatives-takeover.com';

function normalizeContentFromRow(row: WaitlistPageRow): WaitlistContent {
  return normalizeWaitlistContent({
    ...(row.ai_content || {}),
    theme: row.theme,
    accentColor: row.accent_color,
    layout: row.layout,
    logoUrl: row.logo_url,
    imageUrl: row.image_url,
    socialLinks: row.social_links,
    launchDate: row.launch_date,
    webhookUrl: row.webhook_url,
    integrationProvider: row.integration_provider,
    integrationListId: row.integration_list_id,
    confirmationEmailEnabled: row.confirmation_email_enabled,
    abTestEnabled: row.ab_test_enabled,
    headlineVariantB: row.headline_variant_b,
    referralMessage: row.referral_message,
  }, row.product_name || 'Product');
}

function buildPagePayload(userId: string, productName: string, content: WaitlistContent) {
  return {
    user_id: userId,
    product_name: productName.trim(),
    title: content.headline,
    value_proposition: content.subheadline,
    cta_label: content.ctaText,
    ai_content: content,
    theme: content.theme,
    accent_color: content.accentColor,
    layout: content.layout,
    logo_url: content.logoUrl || null,
    image_url: content.imageUrl || null,
    social_links: content.socialLinks || {},
    launch_date: content.launchDate || null,
    webhook_url: content.webhookUrl || null,
    integration_provider: content.integrationProvider || 'none',
    integration_list_id: content.integrationListId || null,
    confirmation_email_enabled: !!content.confirmationEmailEnabled,
    ab_test_enabled: !!content.abTestEnabled,
    headline_variant_b: content.headlineVariantB || null,
    referral_message: content.referralMessage || null,
  };
}

// ── Right-panel wrapper shared across phases ──────────────────────────
function PreviewPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 lg:sticky lg:top-6">
      <p className="text-xs text-center text-muted-foreground mb-3 uppercase tracking-widest font-medium">
        {label}
      </p>
      <div className="rounded-xl overflow-hidden border border-border shadow-lg max-h-[82vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default function WaitlistEditor() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();

  const [phase, setPhase] = useState<EditorPhase>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);

  // All user pages (for My Waitlists panel)
  const [allPages, setAllPages] = useState<WaitlistPageRow[]>([]);

  // Active page state
  const [productName, setProductName] = useState('');
  const [pitch, setPitch] = useState('');
  const [audience, setAudience] = useState('');
  const [content, setContent] = useState<WaitlistContent | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [markReadyAt, setMarkReadyAt] = useState<string | null>(null);

  // Analytics
  const [signupCount, setSignupCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [recentSignups, setRecentSignups] = useState<SignupRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  // Slug editing
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompleted = useMemo(() => !!markReadyAt || signupCount > 0, [markReadyAt, signupCount]);
  const variantMetrics = useMemo(() => {
    const metrics = {
      A: { views: 0, signups: 0 },
      B: { views: 0, signups: 0 },
    };

    events.forEach((event) => {
      if (event.variant !== 'A' && event.variant !== 'B') return;
      if (event.event_type === 'VIEW') metrics[event.variant].views += 1;
      if (event.event_type === 'SIGNUP') metrics[event.variant].signups += 1;
    });

    return metrics;
  }, [events]);

  const loadAllPages = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .select('id, slug, product_name, ai_content, status, title, view_count, mark_ready_at, theme, accent_color, layout, logo_url, image_url, social_links, launch_date, webhook_url, integration_provider, integration_list_id, confirmation_email_enabled, ab_test_enabled, headline_variant_b, referral_message')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (data) setAllPages(data as WaitlistPageRow[]);
  }, [user]);

  // Load data on mount
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      await loadAllPages();

      // Auto-load latest page
      const { data } = await (supabase as any)
        .from(WAITLIST_TABLE)
        .select('id, slug, product_name, ai_content, status, title, view_count, mark_ready_at, theme, accent_color, layout, logo_url, image_url, social_links, launch_date, webhook_url, integration_provider, integration_list_id, confirmation_email_enabled, ab_test_enabled, headline_variant_b, referral_message')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;
      loadPageIntoEditor(data as WaitlistPageRow);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPageIntoEditor = (row: WaitlistPageRow) => {
    setDraftId(row.id);
    setCurrentSlug(row.slug);
    setViewCount(row.view_count ?? 0);
    setMarkReadyAt(row.mark_ready_at ?? null);
    if (row.product_name) setProductName(row.product_name);

    if (row.status === 'published' && row.slug && row.ai_content) {
      setContent(normalizeContentFromRow(row));
      setPhase('published');
      fetchAnalytics(row.id);
    } else if (row.ai_content) {
      setContent(normalizeContentFromRow(row));
      setPhase('preview');
    } else {
      setPhase('input');
    }
  };

  const fetchAnalytics = async (pageId: string) => {
    const { count } = await (supabase as any)
      .from(SIGNUPS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('waitlist_page_id', pageId);
    setSignupCount(count ?? 0);

    const { data: recent } = await (supabase as any)
      .from(SIGNUPS_TABLE)
      .select('id, email, first_name, created_at, variant, utm_source, referrer, consent')
      .eq('waitlist_page_id', pageId)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentSignups(recent ?? []);

    const { data: pageData } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .select('view_count, mark_ready_at')
      .eq('id', pageId)
      .single();
    setViewCount(pageData?.view_count ?? 0);
    setMarkReadyAt(pageData?.mark_ready_at ?? null);

    const { data: eventsData } = await (supabase as any)
      .from(EVENTS_TABLE)
      .select('event_type, variant, occurred_at, utm_source')
      .eq('waitlist_page_id', pageId)
      .order('occurred_at', { ascending: false })
      .limit(1000);
    setEvents(eventsData ?? []);
  };

  const handleGenerate = async () => {
    if (!user) { toast.error('Sign in to generate your page.'); return; }
    if (!productName.trim() || !pitch.trim()) {
      toast.error('Add a product name and pitch first.');
      return;
    }

    setIsGenerating(true);
    const { data, error } = await supabase.functions.invoke('waitlist-generator', {
      body: { productName: productName.trim(), pitch: pitch.trim(), audience: audience.trim() },
    });
    setIsGenerating(false);

    if (error || !data?.success) {
      toast.error(data?.creditError ? 'Not enough credits. This costs 3 credits.' : 'Generation failed. Please try again.');
      return;
    }

    const generated = normalizeWaitlistContent(data.content, productName);
    setContent(generated);

    const payload = {
      ...buildPagePayload(user.id, productName, generated),
      status: 'draft',
    };

    const query = draftId
      ? (supabase as any).from(WAITLIST_TABLE).update(payload).eq('id', draftId).select('id').single()
      : (supabase as any).from(WAITLIST_TABLE).insert(payload).select('id').single();

    const { data: saved } = await query;
    if (saved && !draftId) setDraftId((saved as { id: string }).id);

    await loadAllPages();
    setPhase('preview');
    toast.success('Page generated! Edit any text by clicking on it in the preview.');
  };

  const handleContentChange = useCallback((field: string, value: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      if (field.startsWith('benefit_')) {
        const idx = parseInt(field.split('_')[1], 10);
        const benefits = [...prev.benefits];
        benefits[idx] = value;
        return { ...prev, benefits };
      }
      if (field.startsWith('how_')) {
        const idx = parseInt(field.split('_')[1], 10);
        const howItWorks = [...prev.howItWorks];
        howItWorks[idx] = value;
        return { ...prev, howItWorks };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const handlePublish = async () => {
    if (!user || !content) return;
    setIsPublishing(true);

    const slug = currentSlug || generateSlug(productName);

    const payload = {
      ...buildPagePayload(user.id, productName, content),
      slug,
      status: 'published',
      published_at: new Date().toISOString(),
    };

    const query = draftId
      ? (supabase as any).from(WAITLIST_TABLE).update(payload).eq('id', draftId).select('id').single()
      : (supabase as any).from(WAITLIST_TABLE).insert(payload).select('id').single();

    const { data, error } = await query;
    setIsPublishing(false);

    if (error) {
      toast.error('Failed to publish. Please try again.');
      return;
    }

    const pageId = draftId || (data as { id: string })?.id;
    if (!draftId && data) setDraftId((data as { id: string }).id);
    setCurrentSlug(slug);
    setSignupCount(0);
    setViewCount(0);
    setRecentSignups([]);
    setPhase('published');
    if (pageId) fetchAnalytics(pageId);
    await loadAllPages();
    await refreshProgress();
    toast.success('Waitlist is live!');
  };

  const handleUnpublish = async () => {
    if (!draftId) return;
    const { error } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .update({ status: 'draft', published_at: null, mark_ready_at: null })
      .eq('id', draftId);

    if (error) { toast.error('Failed to unpublish.'); return; }
    setMarkReadyAt(null);
    setPhase('preview');
    await loadAllPages();
    await refreshProgress();
    toast.success("Page unpublished. It's now a draft.");
  };

  const handleSaveContentEdits = async () => {
    if (!draftId || !content || !user) return;
    setIsSaving(true);
    await (supabase as any)
      .from(WAITLIST_TABLE)
      .update(buildPagePayload(user.id, productName, content))
      .eq('id', draftId);
    setIsSaving(false);
    await loadAllPages();
    toast.success('Changes saved.');
  };

  const handleMarkAsReady = async () => {
    if (!draftId) return;
    setIsMarkingReady(true);
    const { data, error } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .update({ mark_ready_at: new Date().toISOString() })
      .eq('id', draftId)
      .select('mark_ready_at')
      .single();
    setIsMarkingReady(false);

    if (error) {
      toast.error('Could not mark this prototype as ready.');
      return;
    }

    setMarkReadyAt((data as { mark_ready_at: string }).mark_ready_at);
    await refreshProgress();
    await loadAllPages();
    toast.success('Prototype marked as ready.');
  };

  const startSlugEdit = () => {
    setSlugDraft(currentSlug ?? '');
    setSlugAvailable(null);
    setEditingSlug(true);
  };

  const checkSlugAvailability = (slug: string) => {
    if (!slug.trim() || slug === currentSlug) { setSlugAvailable(null); return; }
    setSlugChecking(true);
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from(WAITLIST_TABLE)
        .select('id')
        .eq('slug', slug)
        .neq('id', draftId ?? '')
        .maybeSingle();
      setSlugAvailable(!data);
      setSlugChecking(false);
    }, 500);
  };

  const saveSlug = async () => {
    const newSlug = slugDraft.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!newSlug || !draftId) { setEditingSlug(false); return; }
    const { error } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .update({ slug: newSlug })
      .eq('id', draftId);
    if (error) { toast.error('Could not update slug — it may already be taken.'); return; }
    setCurrentSlug(newSlug);
    setEditingSlug(false);
    await loadAllPages();
    toast.success('URL updated.');
  };

  const handleExportCSV = async () => {
    if (!draftId) return;
    const { data, error } = await (supabase as any)
      .from(SIGNUPS_TABLE)
      .select('email, first_name, created_at, variant, utm_source, referrer, consent')
      .eq('waitlist_page_id', draftId)
      .order('created_at', { ascending: true });

    if (error || !data?.length) { toast.info('No signups to export yet.'); return; }

    const header = 'email,first_name,signed_up_at,variant,utm_source,referrer,consent';
    const rows = (data as SignupRow[]).map((r) =>
      [
        `"${r.email}"`,
        `"${r.first_name ?? ''}"`,
        `"${r.created_at}"`,
        `"${r.variant ?? ''}"`,
        `"${r.utm_source ?? ''}"`,
        `"${(r.referrer ?? '').replace(/"/g, '""')}"`,
        `"${r.consent ? 'true' : 'false'}"`,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-signups-${currentSlug ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetToNew = () => {
    setContent(null);
    setDraftId(null);
    setCurrentSlug(null);
    setMarkReadyAt(null);
    setProductName('');
    setPitch('');
    setAudience('');
    setSignupCount(0);
    setViewCount(0);
    setRecentSignups([]);
    setEvents([]);
    setPhase('input');
  };

  const copyUrl = (url: string) => navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));

  // ─────────────────────── MY WAITLISTS PANEL ───────────────────────
  const MyWaitlistsPanel = () => {
    if (allPages.length === 0) return null;
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Waitlists</CardTitle>
            <Button variant="ghost" size="sm" onClick={resetToNew} className="h-7 text-xs gap-1">
              <Plus className="w-3 h-3" /> New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {allPages.map((p) => {
            const statusLabel = p.mark_ready_at ? 'Completed' : p.status === 'published' ? 'Live' : 'Draft';
            return (
              <button
                key={p.id}
                onClick={() => loadPageIntoEditor(p)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-muted ${p.id === draftId ? 'bg-primary/5 border border-primary/20' : ''}`}
              >
                <span className="truncate font-medium">{p.product_name || p.title || 'Untitled'}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <Badge variant={statusLabel === 'Completed' ? 'default' : statusLabel === 'Live' ? 'secondary' : 'outline'} className="text-xs py-0 px-1.5">
                    {statusLabel}
                  </Badge>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  // ─────────────────────── INPUT PHASE ───────────────────────
  if (phase === 'input') {
    const inputPreview = getDefaultWaitlistContent(productName || 'Your Product');
    inputPreview.subheadline = pitch || inputPreview.subheadline;

    return (
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT: form */}
        <div className="w-full lg:w-[420px] flex-shrink-0 space-y-4">
          <MyWaitlistsPanel />
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Generate Your Waitlist Page
              </CardTitle>
              <CardDescription>
                Fill in 3 quick fields — AI builds your landing page copy instantly. Costs 3 credits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="wl-name">Product name</Label>
                <Input id="wl-name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. LaunchDesk" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-pitch">One-line pitch</Label>
                <Input id="wl-pitch" value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="What it does for whom — e.g. 'Helps solo founders close enterprise deals without a sales team'" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-audience">Target audience <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="wl-audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. B2B SaaS founders pre-seed" />
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating || !productName.trim() || !pitch.trim()} className="w-full" size="lg">
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating your page…</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate My Page (3 credits)</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: live preview */}
        <PreviewPanel label="Live Preview">
          <WaitlistPageTemplate
            content={inputPreview}
            productName={productName || 'Your Product'}
            mode="public"
          />
        </PreviewPanel>
      </div>
    );
  }

  // ─────────────────────── PREVIEW PHASE ───────────────────────
  if (phase === 'preview' && content) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT: controls */}
        <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
          <MyWaitlistsPanel />

          {/* Actions card */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Edit &amp; Publish</CardTitle>
              <CardDescription>Click any text in the preview to edit it inline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Signup form options</p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!content.collectFirstName}
                    onChange={(e) => setContent((p) => p ? { ...p, collectFirstName: e.target.checked } : p)}
                    className="rounded"
                  />
                  Collect first name
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!content.collectConsent}
                    onChange={(e) => setContent((p) => p ? { ...p, collectConsent: e.target.checked } : p)}
                    className="rounded"
                  />
                  Show consent checkbox
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!content.consentRequired}
                    onChange={(e) => setContent((p) => p ? { ...p, consentRequired: e.target.checked } : p)}
                    className="rounded"
                  />
                  Require consent
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Style</p>
                <div className="flex gap-2">
                  <Button size="sm" variant={content.theme === 'dark' ? 'default' : 'outline'} onClick={() => handleContentChange('theme', 'dark')}>Dark</Button>
                  <Button size="sm" variant={content.theme === 'light' ? 'default' : 'outline'} onClick={() => handleContentChange('theme', 'light')}>Light</Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={content.layout === 'centered' ? 'default' : 'outline'} onClick={() => handleContentChange('layout', 'centered')}>Centered</Button>
                  <Button size="sm" variant={content.layout === 'split' ? 'default' : 'outline'} onClick={() => handleContentChange('layout', 'split')}>Split</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {WAITLIST_ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`px-2 py-1 rounded border text-xs ${content.accentColor === preset.value ? 'border-primary' : 'border-border'}`}
                      onClick={() => handleContentChange('accentColor', preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <Input value={content.logoUrl || ''} onChange={(e) => handleContentChange('logoUrl', e.target.value)} placeholder="Logo URL" />
                <Input value={content.imageUrl || ''} onChange={(e) => handleContentChange('imageUrl', e.target.value)} placeholder="Hero image URL" />
                <Input type="date" value={content.launchDate || ''} onChange={(e) => handleContentChange('launchDate', e.target.value)} />
                <Input value={content.socialLinks?.website || ''} onChange={(e) => setContent((p) => p ? { ...p, socialLinks: { ...p.socialLinks, website: e.target.value } } : p)} placeholder="Website URL" />
                <Input value={content.socialLinks?.x || ''} onChange={(e) => setContent((p) => p ? { ...p, socialLinks: { ...p.socialLinks, x: e.target.value } } : p)} placeholder="X profile URL" />
                <Input value={content.socialLinks?.linkedin || ''} onChange={(e) => setContent((p) => p ? { ...p, socialLinks: { ...p.socialLinks, linkedin: e.target.value } } : p)} placeholder="LinkedIn URL" />
                <Input value={content.problemStatement} onChange={(e) => handleContentChange('problemStatement', e.target.value)} placeholder="Problem statement" />
                <Input value={content.solutionSummary} onChange={(e) => handleContentChange('solutionSummary', e.target.value)} placeholder="Solution summary" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">A/B + integrations</p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!content.abTestEnabled}
                    onChange={(e) => setContent((p) => p ? { ...p, abTestEnabled: e.target.checked } : p)}
                    className="rounded"
                  />
                  Enable headline A/B
                </label>
                {content.abTestEnabled ? (
                  <Input value={content.headlineVariantB || ''} onChange={(e) => handleContentChange('headlineVariantB', e.target.value)} placeholder="Headline variant B" />
                ) : null}
                <Input value={content.referralMessage || ''} onChange={(e) => handleContentChange('referralMessage', e.target.value)} placeholder="Referral/share message" />
                <Input value={content.webhookUrl || ''} onChange={(e) => handleContentChange('webhookUrl', e.target.value)} placeholder="Webhook URL (Zapier/Make)" />
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={content.integrationProvider || 'none'}
                  onChange={(e) => handleContentChange('integrationProvider', e.target.value)}
                >
                  <option value="none">No provider</option>
                  <option value="mailchimp">Mailchimp</option>
                  <option value="convertkit">ConvertKit</option>
                </select>
                {content.integrationProvider !== 'none' ? (
                  <Input value={content.integrationListId || ''} onChange={(e) => handleContentChange('integrationListId', e.target.value)} placeholder="List/Form ID" />
                ) : null}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!content.confirmationEmailEnabled}
                    onChange={(e) => setContent((p) => p ? { ...p, confirmationEmailEnabled: e.target.checked } : p)}
                    className="rounded"
                  />
                  Auto confirmation email
                </label>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button onClick={handlePublish} disabled={isPublishing} size="sm" className="w-full">
                  {isPublishing
                    ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Publishing...</>
                    : <><Globe className="w-4 h-4 mr-1" />Publish Waitlist</>}
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={handleSaveContentEdits} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    Save edits
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setContent(null); setPhase('input'); }}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: editable preview */}
        <PreviewPanel label="Live Preview — click text to edit">
          <WaitlistPageTemplate
            content={content}
            productName={productName}
            mode="preview"
            onContentChange={handleContentChange}
          />
        </PreviewPanel>
      </div>
    );
  }

  // ─────────────────────── PUBLISHED PHASE ───────────────────────
  if (phase === 'published' && currentSlug) {
    const liveUrl = `${BASE_URL}/w/${currentSlug}`;
    const conversionRate = viewCount > 0 ? ((signupCount / viewCount) * 100).toFixed(1) : '--';

    return (
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT: analytics + controls */}
        <div className="w-full lg:w-[400px] flex-shrink-0 space-y-4">
          <MyWaitlistsPanel />

          {/* Live URL card */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-5 pb-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-green-900">Your waitlist is live</p>
                    <Badge variant="outline">{isCompleted ? 'Completed' : 'Published'}</Badge>
                  </div>
                  <p className="text-sm text-green-700 mt-0.5">Share this link to start collecting signups.</p>
                </div>
              </div>

              {/* Slug editor */}
              {editingSlug ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">/w/</span>
                  <Input
                    value={slugDraft}
                    onChange={(e) => { setSlugDraft(e.target.value); checkSlugAvailability(e.target.value); }}
                    className="h-8 text-sm flex-1"
                    autoFocus
                  />
                  {slugChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />}
                  {!slugChecking && slugAvailable === true && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                  {!slugChecking && slugAvailable === false && <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <Button size="sm" className="h-8" onClick={saveSlug} disabled={slugAvailable === false || slugChecking}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingSlug(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-600 truncate flex-1">{liveUrl}</span>
                  <button onClick={() => copyUrl(liveUrl)} className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 transition-colors" title="Copy link">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><a href={liveUrl} target="_blank" rel="noopener noreferrer"><Globe className="w-4 h-4 mr-1" />View page</a></Button>
                <Button variant="outline" size="sm" onClick={() => setPhase('preview')}>Edit page</Button>
                {!editingSlug && <Button variant="outline" size="sm" onClick={startSlugEdit}>Edit URL</Button>}
                <Button variant="outline" size="sm" onClick={handleUnpublish}><EyeOff className="w-4 h-4 mr-1" />Unpublish</Button>
                <Button variant="ghost" size="sm" onClick={resetToNew}><Plus className="w-3 h-3 mr-1" />New page</Button>
              </div>

              {!markReadyAt ? (
                <Button className="w-full" variant="secondary" onClick={handleMarkAsReady} disabled={isMarkingReady}>
                  {isMarkingReady ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Mark as Ready
                </Button>
              ) : (
                <Badge className="w-full justify-center border-green-500/30 bg-green-500/10 text-green-700">
                  Ready on {new Date(markReadyAt).toLocaleDateString()}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Analytics stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-2xl font-black text-foreground">{viewCount}</p>
                <p className="text-xs text-muted-foreground">views</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <Users className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                <p className="text-2xl font-black text-indigo-700">{signupCount}</p>
                <p className="text-xs text-muted-foreground">signups</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-black text-green-700">{conversionRate}{conversionRate !== '--' ? '%' : ''}</p>
                <p className="text-xs text-muted-foreground">conversion</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">A/B analytics</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border p-2">
                  <p className="font-semibold">Variant A</p>
                  <p>{variantMetrics.A.views} views / {variantMetrics.A.signups} signups</p>
                  <p className="text-muted-foreground">
                    CVR: {variantMetrics.A.views > 0 ? ((variantMetrics.A.signups / variantMetrics.A.views) * 100).toFixed(1) : '--'}%
                  </p>
                </div>
                <div className="rounded border p-2">
                  <p className="font-semibold">Variant B</p>
                  <p>{variantMetrics.B.views} views / {variantMetrics.B.signups} signups</p>
                  <p className="text-muted-foreground">
                    CVR: {variantMetrics.B.views > 0 ? ((variantMetrics.B.signups / variantMetrics.B.views) * 100).toFixed(1) : '--'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent signups */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent signups</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => draftId && fetchAnalytics(draftId)}>Refresh</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportCSV}>
                    <Download className="w-3 h-3" />Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentSignups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No signups yet. Share your link!</p>
              ) : (
                <div className="space-y-2">
                  {recentSignups.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <div>
                        <span className="font-mono text-xs text-foreground">{maskEmail(s.email)}</span>
                        {s.first_name && <span className="text-muted-foreground ml-2 text-xs">· {s.first_name}</span>}
                        {s.variant && <span className="text-muted-foreground ml-2 text-[10px]">Variant {s.variant}</span>}
                        {s.utm_source && <span className="text-muted-foreground ml-2 text-[10px]">{s.utm_source}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {signupCount > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      Showing 10 of {signupCount}. Export CSV for the full list.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: preview */}
        {content && (
          <PreviewPanel label="Page Preview">
            <WaitlistPageTemplate
              content={content}
              productName={productName}
              mode="preview"
              onContentChange={handleContentChange}
              signupCount={signupCount}
            />
          </PreviewPanel>
        )}
      </div>
    );
  }

  return null;
}
