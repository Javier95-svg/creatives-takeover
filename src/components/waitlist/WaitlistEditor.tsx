
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SortableList } from '@/components/ui/sortable-list';
import { AlertTriangle, Check, Copy, Download, Eye, Globe, Loader2, Lock, Plus, Save, ShieldCheck, Sparkles, Trash2, Unlock, Users } from 'lucide-react';
import WaitlistPageTemplate, { WaitlistContent } from './WaitlistPageTemplate';
import { WAITLIST_ACCENT_PRESETS, WAITLIST_FONT_PRESETS, createWaitlistFieldId, getDefaultWaitlistContent, normalizeWaitlistContent } from '@/lib/waitlist';

type BuilderTab = 'content' | 'style' | 'form' | 'publish' | 'domain' | 'analytics';

const WAITLIST_TABLE = 'waitlist_pages' as any;
const SIGNUPS_TABLE = 'waitlist_signups' as any;
const EVENTS_TABLE = 'waitlist_events' as any;
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com';

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
  custom_fields?: Array<{ id: string; label: string; value: string }> | null;
}

interface EventRow {
  event_type: 'VIEW' | 'SIGNUP';
  variant: 'A' | 'B' | null;
  occurred_at: string;
}

function generateSlug(productName: string): string {
  const base = productName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
  const random = Math.random().toString(36).slice(2, 7);
  return `${base || 'waitlist'}-${random}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local.slice(0, 2) + '*'.repeat(Math.max(local.length - 2, 2));
  return `${masked}@${domain}`;
}

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

function linesToText(items: string[]): string {
  return items.join('\n');
}

function textToLines(raw: string, min: number, max: number, fallback: string[]): string[] {
  const cleaned = raw.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, max);
  if (cleaned.length < min) return fallback;
  return cleaned;
}

export default function WaitlistEditor() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();

  const [activeTab, setActiveTab] = useState<BuilderTab>('content');
  const [allPages, setAllPages] = useState<WaitlistPageRow[]>([]);

  const [productName, setProductName] = useState('');
  const [content, setContent] = useState<WaitlistContent>(getDefaultWaitlistContent('Your Product'));

  const [draftId, setDraftId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [markReadyAt, setMarkReadyAt] = useState<string | null>(null);

  const [viewCount, setViewCount] = useState(0);
  const [signupCount, setSignupCount] = useState(0);
  const [recentSignups, setRecentSignups] = useState<SignupRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingDns, setIsCheckingDns] = useState(false);

  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGuest = !user;
  const isCompleted = useMemo(() => Boolean(markReadyAt) || signupCount > 0, [markReadyAt, signupCount]);
  const liveUrl = currentSlug ? `${BASE_URL}/w/${currentSlug}` : null;

  const variantMetrics = useMemo(() => {
    const metrics = { A: { views: 0, signups: 0 }, B: { views: 0, signups: 0 } };
    events.forEach((event) => {
      if (event.variant !== 'A' && event.variant !== 'B') return;
      if (event.event_type === 'VIEW') metrics[event.variant].views += 1;
      if (event.event_type === 'SIGNUP') metrics[event.variant].signups += 1;
    });
    return metrics;
  }, [events]);

  const promptSignIn = useCallback((actionLabel: string) => {
    toast.info(`Sign in or create an account to ${actionLabel}.`);
  }, []);

  const loadPageIntoEditor = useCallback((row: WaitlistPageRow) => {
    const normalized = normalizeContentFromRow(row);
    setDraftId(row.id);
    setCurrentSlug(row.slug);
    setSlugDraft(row.slug ?? '');
    setProductName(row.product_name || '');
    setContent(normalized);
    setStatus(row.status === 'published' ? 'published' : 'draft');
    setViewCount(row.view_count ?? 0);
    setMarkReadyAt(row.mark_ready_at ?? null);
  }, []);

  const loadAllPages = useCallback(async () => {
    if (!user) {
      setAllPages([]);
      return;
    }

    const { data } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .select('id, slug, product_name, ai_content, status, title, view_count, mark_ready_at, theme, accent_color, layout, logo_url, image_url, social_links, launch_date, webhook_url, integration_provider, integration_list_id, confirmation_email_enabled, ab_test_enabled, headline_variant_b, referral_message')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data) setAllPages(data as WaitlistPageRow[]);
  }, [user]);

  const fetchAnalytics = useCallback(async (pageId: string) => {
    const { count } = await (supabase as any)
      .from(SIGNUPS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('waitlist_page_id', pageId);
    setSignupCount(count ?? 0);

    const { data: recent } = await (supabase as any)
      .from(SIGNUPS_TABLE)
      .select('id, email, first_name, created_at, variant, utm_source, referrer, consent, custom_fields')
      .eq('waitlist_page_id', pageId)
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentSignups((recent as SignupRow[]) ?? []);

    const { data: pageData } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .select('view_count, mark_ready_at')
      .eq('id', pageId)
      .single();
    setViewCount(pageData?.view_count ?? 0);
    setMarkReadyAt(pageData?.mark_ready_at ?? null);

    const { data: eventsData } = await (supabase as any)
      .from(EVENTS_TABLE)
      .select('event_type, variant, occurred_at')
      .eq('waitlist_page_id', pageId)
      .order('occurred_at', { ascending: false })
      .limit(1200);
    setEvents((eventsData as EventRow[]) ?? []);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        const empty = getDefaultWaitlistContent('Your Product');
        setProductName('');
        setContent(empty);
        setDraftId(null);
        setCurrentSlug(null);
        setStatus('draft');
        setMarkReadyAt(null);
        setSignupCount(0);
        setViewCount(0);
        setRecentSignups([]);
        setEvents([]);
        setAllPages([]);
        return;
      }

      await loadAllPages();

      const { data } = await (supabase as any)
        .from(WAITLIST_TABLE)
        .select('id, slug, product_name, ai_content, status, title, view_count, mark_ready_at, theme, accent_color, layout, logo_url, image_url, social_links, launch_date, webhook_url, integration_provider, integration_list_id, confirmation_email_enabled, ab_test_enabled, headline_variant_b, referral_message')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        setProductName('');
        setContent(getDefaultWaitlistContent('Your Product'));
        return;
      }

      loadPageIntoEditor(data as WaitlistPageRow);
      await fetchAnalytics((data as WaitlistPageRow).id);
    };

    initialize();
  }, [fetchAnalytics, loadAllPages, loadPageIntoEditor, user]);
  const resetToNew = () => {
    const empty = getDefaultWaitlistContent('Your Product');
    setProductName('');
    setContent(empty);
    setDraftId(null);
    setCurrentSlug(null);
    setSlugDraft('');
    setStatus('draft');
    setMarkReadyAt(null);
    setSignupCount(0);
    setViewCount(0);
    setRecentSignups([]);
    setEvents([]);
    setActiveTab('content');
  };

  const updateContent = (patch: Partial<WaitlistContent>) => {
    setContent((prev) => ({ ...prev, ...patch }));
  };

  const updateTemplateField = useCallback((field: string, value: string) => {
    setContent((prev) => {
      if (field.startsWith('benefit_')) {
        const idx = Number(field.split('_')[1]);
        const benefits = [...prev.benefits];
        benefits[idx] = value;
        return { ...prev, benefits };
      }

      if (field.startsWith('how_')) {
        const idx = Number(field.split('_')[1]);
        const howItWorks = [...prev.howItWorks];
        howItWorks[idx] = value;
        return { ...prev, howItWorks };
      }

      return { ...prev, [field]: value };
    });
  }, []);

  const ensureSavedDraft = useCallback(async (): Promise<string | null> => {
    if (!user) {
      promptSignIn('save your waitlist');
      return null;
    }

    const trimmedName = productName.trim() || 'Untitled Startup';
    const normalized = normalizeWaitlistContent(content, trimmedName);

    setIsSaving(true);

    const payload = {
      ...buildPagePayload(user.id, trimmedName, normalized),
      status,
      slug: currentSlug || generateSlug(trimmedName),
    };

    const query = draftId
      ? (supabase as any).from(WAITLIST_TABLE).update(payload).eq('id', draftId).select('id, slug').single()
      : (supabase as any).from(WAITLIST_TABLE).insert(payload).select('id, slug').single();

    const { data, error } = await query;
    setIsSaving(false);

    if (error || !data) {
      toast.error('Could not save your page. Please try again.');
      return null;
    }

    const saved = data as { id: string; slug: string | null };
    setDraftId(saved.id);
    setCurrentSlug(saved.slug);
    setSlugDraft(saved.slug || '');
    setContent(normalized);
    await loadAllPages();
    return saved.id;
  }, [content, currentSlug, draftId, loadAllPages, productName, promptSignIn, status, user]);

  const handleSave = async () => {
    const id = await ensureSavedDraft();
    if (!id) return;
    toast.success('Changes saved.');
  };

  const handlePublish = async () => {
    if (!user) {
      promptSignIn('publish your waitlist');
      return;
    }

    setIsPublishing(true);

    const pageId = await ensureSavedDraft();
    if (!pageId) {
      setIsPublishing(false);
      return;
    }

    const slug = currentSlug || generateSlug(productName || 'waitlist');
    const normalized = normalizeWaitlistContent(content, productName || 'Your Product');

    const { error } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .update({
        ...buildPagePayload(user.id, productName || 'Untitled Startup', normalized),
        slug,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', pageId);

    setIsPublishing(false);

    if (error) {
      toast.error('Publish failed. Please try again.');
      return;
    }

    setStatus('published');
    setCurrentSlug(slug);
    setSlugDraft(slug);
    await fetchAnalytics(pageId);
    await loadAllPages();
    await refreshProgress();
    toast.success('Waitlist published. Share your public URL.');
  };

  const handleUnpublish = async () => {
    if (!user || !draftId) return;

    const { error } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .update({ status: 'draft', published_at: null, mark_ready_at: null })
      .eq('id', draftId);

    if (error) {
      toast.error('Failed to unpublish this page.');
      return;
    }

    setStatus('draft');
    setMarkReadyAt(null);
    await loadAllPages();
    await refreshProgress();
    toast.success('Page moved back to draft.');
  };

  const handleMarkAsReady = async () => {
    if (!draftId || !user) return;

    setIsMarkingReady(true);

    const { data, error } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .update({ mark_ready_at: new Date().toISOString() })
      .eq('id', draftId)
      .select('mark_ready_at')
      .single();

    setIsMarkingReady(false);

    if (error) {
      toast.error('Could not mark this page as ready.');
      return;
    }

    setMarkReadyAt((data as { mark_ready_at: string }).mark_ready_at);
    await loadAllPages();
    await refreshProgress();
    toast.success('Prototype marked as ready. Stage II can now progress.');
  };

  const copyUrl = () => {
    if (!liveUrl) {
      toast.info('Publish your page first to copy the public URL.');
      return;
    }
    navigator.clipboard.writeText(liveUrl).then(() => toast.success('Public link copied.'));
  };

  const checkSlugAvailability = (value: string) => {
    const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setSlugDraft(slug);

    if (!slug || slug === currentSlug || !user) {
      setSlugAvailable(null);
      return;
    }

    if (slugTimer.current) clearTimeout(slugTimer.current);

    setIsCheckingSlug(true);
    slugTimer.current = setTimeout(async () => {
      const { data } = await (supabase as any)
        .from(WAITLIST_TABLE)
        .select('id')
        .eq('slug', slug)
        .neq('id', draftId || '')
        .maybeSingle();

      setSlugAvailable(!data);
      setIsCheckingSlug(false);
    }, 450);
  };

  const saveSlug = async () => {
    if (!draftId || !slugDraft || !user) return;
    if (slugAvailable === false) {
      toast.error('This slug is already taken.');
      return;
    }

    const { error } = await (supabase as any)
      .from(WAITLIST_TABLE)
      .update({ slug: slugDraft })
      .eq('id', draftId);

    if (error) {
      toast.error('Unable to update slug.');
      return;
    }

    setCurrentSlug(slugDraft);
    await loadAllPages();
    toast.success('URL updated.');
  };

  const handleExportCSV = async () => {
    if (!draftId || !user) {
      if (!user) promptSignIn('export signups');
      return;
    }

    const { data, error } = await (supabase as any)
      .from(SIGNUPS_TABLE)
      .select('email, first_name, created_at, variant, utm_source, referrer, consent, custom_fields')
      .eq('waitlist_page_id', draftId)
      .order('created_at', { ascending: true });

    if (error || !data?.length) {
      toast.info('No signups to export yet.');
      return;
    }

    const header = 'email,first_name,signed_up_at,variant,utm_source,referrer,consent,custom_fields';
    const rows = (data as SignupRow[]).map((row) => [
      `"${row.email}"`,
      `"${row.first_name ?? ''}"`,
      `"${row.created_at}"`,
      `"${row.variant ?? ''}"`,
      `"${row.utm_source ?? ''}"`,
      `"${(row.referrer ?? '').replace(/"/g, '""')}"`,
      `"${row.consent ? 'true' : 'false'}"`,
      `"${JSON.stringify(row.custom_fields ?? []).replace(/"/g, '""')}"`,
    ].join(','));

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `waitlist-signups-${currentSlug ?? 'export'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleValidateDomain = async () => {
    if (!content.domainSetup?.domain.trim()) {
      toast.error('Add a custom domain first.');
      return;
    }

    setIsCheckingDns(true);

    const { data, error } = await supabase.functions.invoke('waitlist-domain-check', {
      body: {
        action: 'check_dns',
        domain: content.domainSetup.domain.trim(),
        token: content.domainSetup.verificationToken,
      },
    });

    setIsCheckingDns(false);

    if (error || !data) {
      updateContent({
        domainSetup: {
          ...content.domainSetup,
          status: 'failed',
          lastCheckedAt: new Date().toISOString(),
        },
      });
      toast.error('DNS validation failed. Please verify your records.');
      return;
    }

    const verified = Boolean(data?.checks?.verification && data?.checks?.spf && data?.checks?.dkim);

    updateContent({
      domainSetup: {
        ...content.domainSetup,
        status: verified ? 'verified' : 'pending',
        lastCheckedAt: new Date().toISOString(),
        verificationValid: Boolean(data?.checks?.verification),
        spfValid: Boolean(data?.checks?.spf),
        dkimValid: Boolean(data?.checks?.dkim),
      },
    });

    if (verified) toast.success('Domain records verified. You can send confirmation emails from your sender address.');
    else toast.info('DNS records are not fully verified yet. Keep records active and retry.');
  };

  const statusBadge = useMemo(() => {
    if (isCompleted) return <Badge className="bg-green-600 text-white">Completed</Badge>;
    if (status === 'published') return <Badge className="bg-emerald-600 text-white">Published</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
  }, [isCompleted, status]);

  const conversionRate = viewCount > 0 ? `${((signupCount / viewCount) * 100).toFixed(1)}%` : '--';

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20">Waitlist Builder</Badge>
                {statusBadge}
                {content.domainSetup?.status === 'verified' ? <Badge variant="outline" className="border-emerald-400/60 text-emerald-700">Domain Verified</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">Canva-style visual editor: customize everything live, then publish and capture signups.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={resetToNew} size="sm"><Plus className="w-4 h-4 mr-1" /> New</Button>
              <Button variant="outline" onClick={copyUrl} size="sm" disabled={!liveUrl}><Copy className="w-4 h-4 mr-1" /> Copy link</Button>
              <Button variant="outline" onClick={handleExportCSV} size="sm" disabled={isGuest || !draftId}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
              <Button variant="outline" onClick={handleSave} size="sm" disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Save</Button>
              {status === 'published'
                ? <Button variant="destructive" size="sm" onClick={handleUnpublish} disabled={isGuest || !draftId}>Unpublish</Button>
                : <Button size="sm" onClick={handlePublish} disabled={isPublishing}>{isPublishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Globe className="w-4 h-4 mr-1" />}Publish</Button>}
            </div>
          </div>

          {isGuest ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">You can design freely. Sign in when you are ready to save, publish, and collect real signups.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild><a href="/login?return=/waitlist">Log in</a></Button>
                <Button size="sm" asChild><a href="/signup?return=/waitlist">Create account</a></Button>
              </div>
            </div>
          ) : null}

          {user && allPages.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="waitlist-selector">My Waitlists</Label>
              <select
                id="waitlist-selector"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draftId || ''}
                onChange={async (event) => {
                  const nextId = event.target.value;
                  const selected = allPages.find((page) => page.id === nextId);
                  if (!selected) return;
                  loadPageIntoEditor(selected);
                  await fetchAnalytics(selected.id);
                }}
              >
                <option value="" disabled>Select a waitlist</option>
                {allPages.map((page) => (
                  <option key={page.id} value={page.id}>{(page.product_name || page.title || 'Untitled')} - {page.mark_ready_at ? 'Completed' : page.status === 'published' ? 'Published' : 'Draft'}</option>
                ))}
              </select>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="rounded-2xl border overflow-hidden bg-muted/10">
        <div className="grid min-h-[760px] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-r bg-background/90 backdrop-blur">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BuilderTab)} className="h-full flex flex-col">
              <div className="p-3 border-b">
                <TabsList className="w-full grid grid-cols-3 gap-1 h-auto bg-muted p-1">
                  <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
                  <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
                  <TabsTrigger value="form" className="text-xs">Form</TabsTrigger>
                  <TabsTrigger value="publish" className="text-xs">Publish</TabsTrigger>
                  <TabsTrigger value="domain" className="text-xs">Domain</TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="content" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label>Project name</Label>
                    <Input
                      value={productName}
                      onChange={(event) => setProductName(event.target.value)}
                      placeholder="Your startup name"
                    />
                  </div>

                  <div className="space-y-2"><Label>Headline</Label><Textarea value={content.headline} onChange={(event) => updateContent({ headline: event.target.value })} rows={2} /></div>
                  <div className="space-y-2"><Label>Subheadline</Label><Textarea value={content.subheadline} onChange={(event) => updateContent({ subheadline: event.target.value })} rows={2} /></div>
                  <div className="space-y-2"><Label>Problem statement</Label><Textarea value={content.problemStatement} onChange={(event) => updateContent({ problemStatement: event.target.value })} rows={3} /></div>
                  <div className="space-y-2"><Label>Solution summary</Label><Textarea value={content.solutionSummary} onChange={(event) => updateContent({ solutionSummary: event.target.value })} rows={3} /></div>

                  <div className="space-y-2">
                    <Label>Benefits (one per line)</Label>
                    <Textarea value={linesToText(content.benefits)} onChange={(event) => updateContent({ benefits: textToLines(event.target.value, 3, 5, content.benefits) })} rows={4} />
                  </div>

                  <div className="space-y-2">
                    <Label>How it works (one step per line)</Label>
                    <Textarea value={linesToText(content.howItWorks)} onChange={(event) => updateContent({ howItWorks: textToLines(event.target.value, 3, 4, content.howItWorks) })} rows={4} />
                  </div>

                  <div className="space-y-2"><Label>Logo URL</Label><Input value={content.logoUrl || ''} onChange={(event) => updateContent({ logoUrl: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Hero image URL</Label><Input value={content.imageUrl || ''} onChange={(event) => updateContent({ imageUrl: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Launch date (optional)</Label><Input type="date" value={content.launchDate || ''} onChange={(event) => updateContent({ launchDate: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Referral message</Label><Textarea value={content.referralMessage || ''} onChange={(event) => updateContent({ referralMessage: event.target.value })} rows={2} /></div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={content.theme === 'dark' ? 'default' : 'outline'} onClick={() => updateContent({ theme: 'dark' })} className="flex-1">Dark</Button>
                      <Button size="sm" variant={content.theme === 'light' ? 'default' : 'outline'} onClick={() => updateContent({ theme: 'light' })} className="flex-1">Light</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Layout</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={content.layout === 'centered' ? 'default' : 'outline'} onClick={() => updateContent({ layout: 'centered' })} className="flex-1">Centered</Button>
                      <Button size="sm" variant={content.layout === 'split' ? 'default' : 'outline'} onClick={() => updateContent({ layout: 'split' })} className="flex-1">Split</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Text alignment</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={content.textAlign === 'left' ? 'default' : 'outline'} onClick={() => updateContent({ textAlign: 'left' })} className="flex-1">Left</Button>
                      <Button size="sm" variant={content.textAlign === 'center' ? 'default' : 'outline'} onClick={() => updateContent({ textAlign: 'center' })} className="flex-1">Center</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Accent color</Label>
                    <div className="flex flex-wrap gap-2">
                      {WAITLIST_ACCENT_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => updateContent({ accentColor: preset.value })}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${content.accentColor === preset.value ? 'border-primary bg-primary/10' : 'border-border'}`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />{preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Typography</Label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={content.typography?.headingFamily} onChange={(event) => updateContent({ typography: { ...content.typography!, headingFamily: event.target.value } })}>
                      {WAITLIST_FONT_PRESETS.map((font) => <option key={font.value} value={font.value}>{font.label} (Headings)</option>)}
                    </select>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={content.typography?.bodyFamily} onChange={(event) => updateContent({ typography: { ...content.typography!, bodyFamily: event.target.value } })}>
                      {WAITLIST_FONT_PRESETS.map((font) => <option key={`${font.value}-body`} value={font.value}>{font.label} (Body)</option>)}
                    </select>
                    <div className="space-y-1"><Label className="text-xs">Heading size: {content.typography?.headingSize}px</Label><input type="range" min={28} max={74} value={content.typography?.headingSize} onChange={(event) => updateContent({ typography: { ...content.typography!, headingSize: Number(event.target.value) } })} className="w-full" /></div>
                    <div className="space-y-1"><Label className="text-xs">Body size: {content.typography?.bodySize}px</Label><input type="range" min={13} max={22} value={content.typography?.bodySize} onChange={(event) => updateContent({ typography: { ...content.typography!, bodySize: Number(event.target.value) } })} className="w-full" /></div>
                    <div className="space-y-1"><Label className="text-xs">Letter spacing: {content.typography?.letterSpacing}px</Label><input type="range" min={-1} max={4} step={0.5} value={content.typography?.letterSpacing} onChange={(event) => updateContent({ typography: { ...content.typography!, letterSpacing: Number(event.target.value) } })} className="w-full" /></div>
                  </div>

                  <div className="space-y-2">
                    <Label>Color palette</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'pageBackground', label: 'Page bg' },
                        { key: 'sectionBackground', label: 'Section bg' },
                        { key: 'textPrimary', label: 'Text' },
                        { key: 'textSecondary', label: 'Muted text' },
                        { key: 'buttonBackground', label: 'Button bg' },
                        { key: 'buttonText', label: 'Button text' },
                        { key: 'borderColor', label: 'Borders' },
                        { key: 'inputBackground', label: 'Input bg' },
                        { key: 'inputText', label: 'Input text' },
                      ].map((item) => (
                        <div key={item.key} className="space-y-1">
                          <Label className="text-xs">{item.label}</Label>
                          <input type="color" value={(content.colors as any)?.[item.key]} onChange={(event) => updateContent({ colors: { ...content.colors!, [item.key]: event.target.value } })} className="h-9 w-full rounded border border-input bg-background" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1"><Label className="text-xs">Section spacing: {content.spacing?.sectionPaddingY}px</Label><input type="range" min={36} max={120} value={content.spacing?.sectionPaddingY} onChange={(event) => updateContent({ spacing: { ...content.spacing!, sectionPaddingY: Number(event.target.value) } })} className="w-full" /></div>
                  <div className="space-y-1"><Label className="text-xs">Card radius: {content.spacing?.cardRadius}px</Label><input type="range" min={0} max={32} value={content.spacing?.cardRadius} onChange={(event) => updateContent({ spacing: { ...content.spacing!, cardRadius: Number(event.target.value) } })} className="w-full" /></div>

                  <div className="space-y-2">
                    <Label>Sections</Label>
                    {[
                      { key: 'problemSolution', label: 'Problem + Solution' },
                      { key: 'benefits', label: 'Benefits' },
                      { key: 'howItWorks', label: 'How it works' },
                      { key: 'testimonials', label: 'Testimonials' },
                      { key: 'faq', label: 'FAQ' },
                    ].map((section) => (
                      <label key={section.key} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span>{section.label}</span>
                        <input type="checkbox" checked={(content.sectionVisibility as any)?.[section.key]} onChange={(event) => updateContent({ sectionVisibility: { ...content.sectionVisibility!, [section.key]: event.target.checked } })} />
                      </label>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="form" className="space-y-4 mt-0">
                  <div className="space-y-2"><Label>CTA button label</Label><Input value={content.ctaText} onChange={(event) => updateContent({ ctaText: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Email placeholder</Label><Input value={content.emailPlaceholder} onChange={(event) => updateContent({ emailPlaceholder: event.target.value })} /></div>

                  <div className="space-y-2">
                    <Label>Form options</Label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Collect first name</span><input type="checkbox" checked={Boolean(content.collectFirstName)} onChange={(event) => updateContent({ collectFirstName: event.target.checked })} /></label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Show consent checkbox</span><input type="checkbox" checked={Boolean(content.collectConsent)} onChange={(event) => updateContent({ collectConsent: event.target.checked })} /></label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Require consent</span><input type="checkbox" checked={Boolean(content.consentRequired)} onChange={(event) => updateContent({ consentRequired: event.target.checked })} /></label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Custom fields</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateContent({ customFields: [...(content.customFields || []), { id: createWaitlistFieldId(), label: 'Custom question', placeholder: 'Type your answer', type: 'text', required: false, enabled: true }] })}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add field
                      </Button>
                    </div>

                    {(content.customFields?.length || 0) === 0 ? (
                      <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">Add optional fields to capture context like company size, current stack, or role.</p>
                    ) : (
                      <SortableList
                        items={content.customFields || []}
                        onReorder={(items) => updateContent({ customFields: items })}
                        className="space-y-2"
                        renderItem={(field) => (
                          <div className="rounded-md border p-2 space-y-2 bg-background">
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <Input value={field.label} onChange={(event) => updateContent({ customFields: (content.customFields || []).map((item) => item.id === field.id ? { ...item, label: event.target.value } : item) })} placeholder="Field label" />
                              <Button size="icon" variant="ghost" onClick={() => updateContent({ customFields: (content.customFields || []).filter((item) => item.id !== field.id) })}><Trash2 className="w-4 h-4" /></Button>
                            </div>

                            <Input value={field.placeholder} onChange={(event) => updateContent({ customFields: (content.customFields || []).map((item) => item.id === field.id ? { ...item, placeholder: event.target.value } : item) })} placeholder="Placeholder" />

                            <div className="grid grid-cols-2 gap-2">
                              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={field.type} onChange={(event) => updateContent({ customFields: (content.customFields || []).map((item) => item.id === field.id ? { ...item, type: event.target.value as any } : item) })}>
                                <option value="text">Text</option>
                                <option value="textarea">Textarea</option>
                                <option value="url">URL</option>
                              </select>
                              <label className="flex items-center justify-between rounded-md border px-2 text-xs">Required<input type="checkbox" checked={field.required} onChange={(event) => updateContent({ customFields: (content.customFields || []).map((item) => item.id === field.id ? { ...item, required: event.target.checked } : item) })} /></label>
                            </div>
                          </div>
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Success screen</Label>
                    <Input value={content.successTitle || ''} onChange={(event) => updateContent({ successTitle: event.target.value })} placeholder="Success title" />
                    <Textarea value={content.successMessage || ''} onChange={(event) => updateContent({ successMessage: event.target.value })} rows={2} placeholder="Success message" />
                    <Input value={content.successShareLabel || ''} onChange={(event) => updateContent({ successShareLabel: event.target.value })} placeholder="Share button label" />
                  </div>
                </TabsContent>
                <TabsContent value="publish" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label>Public slug</Label>
                    <div className="flex gap-2">
                      <Input value={slugDraft} onChange={(event) => checkSlugAvailability(event.target.value)} placeholder="my-waitlist-page" />
                      <Button variant="outline" onClick={saveSlug} disabled={!draftId || slugAvailable === false || isCheckingSlug}>Save</Button>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {isCheckingSlug ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {slugAvailable === true ? <Check className="w-3 h-3 text-green-600" /> : null}
                      {slugAvailable === false ? <AlertTriangle className="w-3 h-3 text-red-500" /> : null}
                      {slugAvailable === true ? 'Slug is available.' : slugAvailable === false ? 'Slug is already taken.' : 'Save draft first to reserve this slug.'}
                    </div>
                  </div>

                  {liveUrl ? (
                    <div className="rounded-md border p-3 text-sm space-y-2">
                      <p className="text-xs text-muted-foreground">Live URL</p>
                      <p className="font-mono text-xs break-all">{liveUrl}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={copyUrl}><Copy className="w-4 h-4 mr-1" />Copy</Button>
                        <Button size="sm" asChild><a href={liveUrl} target="_blank" rel="noreferrer"><Eye className="w-4 h-4 mr-1" />Open</a></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Publish your page to get a public URL.</div>
                  )}

                  <div className="space-y-2">
                    <Label>Integrations</Label>
                    <Input value={content.webhookUrl || ''} onChange={(event) => updateContent({ webhookUrl: event.target.value })} placeholder="Webhook URL (Zapier, Make, custom endpoint)" />
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={content.integrationProvider || 'none'} onChange={(event) => updateContent({ integrationProvider: event.target.value as any })}>
                      <option value="none">No email provider</option>
                      <option value="mailchimp">Mailchimp</option>
                      <option value="convertkit">ConvertKit</option>
                    </select>
                    {content.integrationProvider !== 'none' ? <Input value={content.integrationListId || ''} onChange={(event) => updateContent({ integrationListId: event.target.value })} placeholder="List or form ID" /> : null}
                  </div>

                  <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>Enable confirmation email</span>
                    <input type="checkbox" checked={Boolean(content.confirmationEmailEnabled)} onChange={(event) => updateContent({ confirmationEmailEnabled: event.target.checked })} />
                  </label>

                  {!markReadyAt ? (
                    <Button className="w-full" variant="secondary" onClick={handleMarkAsReady} disabled={!draftId || isMarkingReady || isGuest}>
                      {isMarkingReady ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}Mark as Ready
                    </Button>
                  ) : (
                    <Badge className="w-full justify-center border-green-500/30 bg-green-500/10 text-green-700">Ready on {new Date(markReadyAt).toLocaleDateString()}</Badge>
                  )}
                </TabsContent>

                <TabsContent value="domain" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label>Custom domain</Label>
                    <Input value={content.domainSetup?.domain || ''} onChange={(event) => updateContent({ domainSetup: { ...content.domainSetup!, domain: event.target.value.toLowerCase().trim(), status: event.target.value ? 'pending' : 'unconfigured' } })} placeholder="updates.yourstartup.com" />
                    <p className="text-xs text-muted-foreground">Use a subdomain dedicated to waitlist emails and verification.</p>
                  </div>

                  <div className="space-y-2"><Label>Sender email</Label><Input value={content.emailSetup?.senderEmail || ''} onChange={(event) => updateContent({ emailSetup: { ...content.emailSetup!, senderEmail: event.target.value } })} placeholder="hello@updates.yourstartup.com" /></div>
                  <div className="space-y-2"><Label>Sender name</Label><Input value={content.emailSetup?.senderName || ''} onChange={(event) => updateContent({ emailSetup: { ...content.emailSetup!, senderName: event.target.value } })} placeholder="Your startup name" /></div>
                  <div className="space-y-2"><Label>Reply-to email</Label><Input value={content.emailSetup?.replyToEmail || ''} onChange={(event) => updateContent({ emailSetup: { ...content.emailSetup!, replyToEmail: event.target.value } })} placeholder="founder@yourstartup.com" /></div>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3"><CardTitle className="text-sm">DNS setup guide</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <p>Add these DNS records in your domain provider:</p>
                      <div className="rounded border p-2 font-mono">TXT @ ct-waitlist-verification={content.domainSetup?.verificationToken}</div>
                      <div className="rounded border p-2 font-mono">TXT @ v=spf1 include:_spf.resend.com ~all</div>
                      <div className="rounded border p-2 font-mono">CNAME ct1._domainkey ct1._domainkey.resend.com</div>
                      <p className="text-muted-foreground">After adding DNS records, click Validate DNS. Propagation can take a few minutes.</p>
                    </CardContent>
                  </Card>

                  <div className="rounded-md border p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between"><span>Verification TXT</span>{content.domainSetup?.verificationValid ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-500" />}</div>
                    <div className="flex items-center justify-between"><span>SPF</span>{content.domainSetup?.spfValid ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-500" />}</div>
                    <div className="flex items-center justify-between"><span>DKIM</span>{content.domainSetup?.dkimValid ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-500" />}</div>
                    <p className="text-muted-foreground">Status: <strong>{content.domainSetup?.status || 'unconfigured'}</strong></p>
                    {content.domainSetup?.lastCheckedAt ? <p className="text-muted-foreground">Last checked: {new Date(content.domainSetup.lastCheckedAt).toLocaleString()}</p> : null}
                  </div>

                  <Button className="w-full" variant="outline" onClick={handleValidateDomain} disabled={isCheckingDns}>{isCheckingDns ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Validate DNS</Button>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4 mt-0">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded border p-2 text-center"><Eye className="w-4 h-4 mx-auto text-muted-foreground" /><p className="text-xl font-bold">{viewCount}</p><p className="text-[11px] text-muted-foreground">Views</p></div>
                    <div className="rounded border p-2 text-center"><Users className="w-4 h-4 mx-auto text-indigo-600" /><p className="text-xl font-bold text-indigo-700">{signupCount}</p><p className="text-[11px] text-muted-foreground">Signups</p></div>
                    <div className="rounded border p-2 text-center"><Sparkles className="w-4 h-4 mx-auto text-green-600" /><p className="text-xl font-bold text-green-700">{conversionRate}</p><p className="text-[11px] text-muted-foreground">CVR</p></div>
                  </div>

                  <div className="rounded border p-3 text-xs space-y-2">
                    <p className="font-medium">A/B performance</p>
                    <p>Variant A: {variantMetrics.A.views} views / {variantMetrics.A.signups} signups</p>
                    <p>Variant B: {variantMetrics.B.views} views / {variantMetrics.B.signups} signups</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Recent signups</Label>
                      <Button size="sm" variant="outline" onClick={async () => { if (draftId) await fetchAnalytics(draftId); }} disabled={!draftId}>Refresh</Button>
                    </div>

                    {recentSignups.length === 0 ? (
                      <p className="text-xs text-muted-foreground rounded border border-dashed p-3">No signups yet. Publish and share your link.</p>
                    ) : (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {recentSignups.map((signup) => (
                          <div key={signup.id} className="rounded border p-2 text-xs">
                            <p className="font-mono">{maskEmail(signup.email)}</p>
                            <p className="text-muted-foreground">{signup.first_name ? `${signup.first_name} - ` : ''}{new Date(signup.created_at).toLocaleDateString()}</p>
                            {signup.custom_fields && signup.custom_fields.length > 0 ? (
                              <div className="mt-1 text-muted-foreground space-y-0.5">
                                {signup.custom_fields.slice(0, 3).map((field) => <p key={`${signup.id}-${field.id}`}>{field.label}: {field.value || '-'}</p>)}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </aside>

          <section className="relative overflow-auto bg-[radial-gradient(circle_at_top,#eef2ff,transparent_45%),radial-gradient(circle_at_bottom,#cffafe,transparent_35%)] p-4 md:p-8">
            <div className="mx-auto max-w-[1100px] space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">Live preview</Badge>
                <span className="text-muted-foreground">Changes update instantly as you edit in the panel.</span>
                {content.customFields && content.customFields.length > 0 ? <Badge variant="secondary">Drag fields in Form tab to reorder</Badge> : null}
              </div>

              <WaitlistPageTemplate content={content} productName={productName || 'Your Product'} mode="preview" onContentChange={updateTemplateField} signupCount={signupCount} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
