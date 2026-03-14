
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useCreditActions } from '@/hooks/useCreditActions';
import { CREDIT_COSTS } from '@/config/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SortableList } from '@/components/ui/sortable-list';
import { AlertTriangle, Check, Copy, Download, Eye, Globe, Loader2, Lock, Monitor, MonitorSmartphone, Plus, Save, ShieldCheck, Sparkles, Trash2, Unlock, Users } from 'lucide-react';
import WaitlistPageTemplate, { WaitlistContent } from './WaitlistPageTemplate';
import { WAITLIST_ACCENT_PRESETS, WAITLIST_FONT_PRESETS, createWaitlistFieldId, getDefaultWaitlistContent, getWaitlistThemePalette, normalizeWaitlistContent } from '@/lib/waitlist';

type BuilderTab = 'content' | 'style' | 'form' | 'launch' | 'analytics';
type PreviewDevice = 'desktop' | 'mobile';

const WAITLIST_TABLE = 'waitlist_pages' as any;
const SIGNUPS_TABLE = 'waitlist_signups' as any;
const EVENTS_TABLE = 'waitlist_events' as any;
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com';
const GUEST_DRAFT_STORAGE_KEY = 'waitlist_builder_guest_draft_v1';

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

function sanitizeSlug(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
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

function buildEditorSnapshot(
  productName: string,
  content: WaitlistContent,
  slugDraft: string,
  status: 'draft' | 'published'
): string {
  return JSON.stringify({
    productName: productName.trim(),
    slugDraft: sanitizeSlug(slugDraft),
    status,
    content: normalizeWaitlistContent(content, productName.trim() || 'Your Product'),
  });
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
  const { ensureCredits } = useCreditActions();

  const [activeTab, setActiveTab] = useState<BuilderTab>('content');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [allPages, setAllPages] = useState<WaitlistPageRow[]>([]);

  const [productName, setProductName] = useState('');
  const [content, setContent] = useState<WaitlistContent>(getDefaultWaitlistContent('Your Product'));
  const [benefitsDraft, setBenefitsDraft] = useState(linesToText(getDefaultWaitlistContent('Your Product').benefits));
  const [howItWorksDraft, setHowItWorksDraft] = useState(linesToText(getDefaultWaitlistContent('Your Product').howItWorks));

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
  const [isInitializing, setIsInitializing] = useState(true);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingDns, setIsCheckingDns] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [restorableGuestDraft, setRestorableGuestDraft] = useState<{
    productName: string;
    slugDraft: string;
    content: WaitlistContent;
    savedAt: string;
  } | null>(null);

  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGuest = !user;
  const isCompleted = useMemo(() => Boolean(markReadyAt) || signupCount > 0, [markReadyAt, signupCount]);
  const reservedUrl = currentSlug ? `${BASE_URL}/w/${currentSlug}` : null;
  const liveUrl = status === 'published' && currentSlug ? `${BASE_URL}/w/${currentSlug}` : null;
  const currentSnapshot = useMemo(
    () => buildEditorSnapshot(productName, content, slugDraft || currentSlug || '', status),
    [content, currentSlug, productName, slugDraft, status]
  );
  const hasUnsavedChanges = Boolean(lastSavedSnapshot) && currentSnapshot !== lastSavedSnapshot;
  const publishBlockingReason = useMemo(() => {
    if (!productName.trim()) return 'Add a project name before publishing.';
    if (!content.headline.trim()) return 'Add a headline before publishing.';
    if (!content.subheadline.trim()) return 'Add a subheadline before publishing.';
    if (slugAvailable === false) return 'Choose an available public slug before publishing.';
    if (content.consentRequired && !content.collectConsent) return 'Show the consent checkbox if consent is required.';
    return null;
  }, [content.collectConsent, content.consentRequired, content.headline, content.subheadline, productName, slugAvailable]);

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

  const applyDraftState = useCallback((next: {
    productName: string;
    content: WaitlistContent;
    draftId: string | null;
    currentSlug: string | null;
    status: 'draft' | 'published';
    markReadyAt?: string | null;
    viewCount?: number;
    savedAt?: string | null;
  }) => {
    const normalized = normalizeWaitlistContent(next.content, next.productName || 'Your Product');
    const nextSlugDraft = next.currentSlug || '';
    const snapshot = buildEditorSnapshot(next.productName, normalized, nextSlugDraft, next.status);

    setProductName(next.productName);
    setContent(normalized);
    setBenefitsDraft(linesToText(normalized.benefits));
    setHowItWorksDraft(linesToText(normalized.howItWorks));
    setDraftId(next.draftId);
    setCurrentSlug(next.currentSlug);
    setSlugDraft(nextSlugDraft);
    setStatus(next.status);
    setMarkReadyAt(next.markReadyAt ?? null);
    setViewCount(next.viewCount ?? 0);
    setLastSavedSnapshot(snapshot);
    setLastSavedAt(next.savedAt ?? new Date().toISOString());
    setSlugAvailable(null);
  }, []);

  const loadPageIntoEditor = useCallback((row: WaitlistPageRow) => {
    applyDraftState({
      productName: row.product_name || '',
      content: normalizeContentFromRow(row),
      draftId: row.id,
      currentSlug: row.slug,
      status: row.status === 'published' ? 'published' : 'draft',
      markReadyAt: row.mark_ready_at ?? null,
      viewCount: row.view_count ?? 0,
    });
  }, [applyDraftState]);

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
      setIsInitializing(true);

      const browserDraft = (() => {
        if (typeof window === 'undefined') return null;
        const raw = window.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY);
        if (!raw) return null;

        try {
          const parsed = JSON.parse(raw) as {
            productName?: string;
            slugDraft?: string;
            content?: WaitlistContent;
            savedAt?: string;
          };

          if (!parsed?.content) return null;

          return {
            productName: parsed.productName || '',
            slugDraft: sanitizeSlug(parsed.slugDraft || ''),
            content: normalizeWaitlistContent(parsed.content, parsed.productName || 'Your Product'),
            savedAt: parsed.savedAt || null,
          };
        } catch {
          return null;
        }
      })();

      if (!user) {
        if (browserDraft) {
          applyDraftState({
            productName: browserDraft.productName,
            content: browserDraft.content,
            draftId: null,
            currentSlug: browserDraft.slugDraft || null,
            status: 'draft',
            savedAt: browserDraft.savedAt,
          });
        } else {
          applyDraftState({
            productName: '',
            content: getDefaultWaitlistContent('Your Product'),
            draftId: null,
            currentSlug: null,
            status: 'draft',
          });
        }
        setSignupCount(0);
        setViewCount(0);
        setRecentSignups([]);
        setEvents([]);
        setAllPages([]);
        setRestorableGuestDraft(browserDraft);
        setIsInitializing(false);
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
        if (browserDraft) {
          applyDraftState({
            productName: browserDraft.productName,
            content: browserDraft.content,
            draftId: null,
            currentSlug: browserDraft.slugDraft || null,
            status: 'draft',
            savedAt: browserDraft.savedAt,
          });
        } else {
          applyDraftState({
            productName: '',
            content: getDefaultWaitlistContent('Your Product'),
            draftId: null,
            currentSlug: null,
            status: 'draft',
          });
        }
        setRestorableGuestDraft(browserDraft);
        setIsInitializing(false);
        return;
      }

      loadPageIntoEditor(data as WaitlistPageRow);
      await fetchAnalytics((data as WaitlistPageRow).id);
      setRestorableGuestDraft(browserDraft);
      setIsInitializing(false);
    };

    initialize();
  }, [applyDraftState, fetchAnalytics, loadAllPages, loadPageIntoEditor, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isGuest) {
      window.localStorage.setItem(GUEST_DRAFT_STORAGE_KEY, JSON.stringify({
        productName,
        slugDraft,
        content,
        savedAt: new Date().toISOString(),
      }));
      return;
    }

    if (!restorableGuestDraft) {
      window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
    }
  }, [content, isGuest, productName, restorableGuestDraft, slugDraft]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setBenefitsDraft(linesToText(content.benefits));
  }, [content.benefits]);

  useEffect(() => {
    setHowItWorksDraft(linesToText(content.howItWorks));
  }, [content.howItWorks]);

  const resetToNew = () => {
    if (hasUnsavedChanges && !window.confirm('Discard your unsaved waitlist changes and start a new draft?')) {
      return;
    }

    applyDraftState({
      productName: '',
      content: getDefaultWaitlistContent('Your Product'),
      draftId: null,
      currentSlug: null,
      status: 'draft',
    });
    setSignupCount(0);
    setViewCount(0);
    setRecentSignups([]);
    setEvents([]);
    setActiveTab('content');
    setPreviewDevice('desktop');
  };

  const updateContent = (patch: Partial<WaitlistContent>) => {
    setContent((prev) => {
      const merged = { ...prev, ...patch };
      if (patch.collectConsent === false) {
        merged.consentRequired = false;
      }
      if (patch.consentRequired) {
        merged.collectConsent = true;
      }
      return merged;
    });
  };

  const applyThemePreset = (theme: 'dark' | 'light') => {
    updateContent({
      theme,
      colors: getWaitlistThemePalette(theme),
    });
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

  const persistWaitlist = useCallback(async (nextStatus: 'draft' | 'published', mode: 'manual' | 'autosave' | 'publish' | 'live-update' = 'manual'): Promise<string | null> => {
    if (!user) {
      promptSignIn(nextStatus === 'published' ? 'publish your waitlist' : 'save your waitlist');
      return null;
    }

    if (nextStatus === 'published' && publishBlockingReason) {
      toast.error(publishBlockingReason);
      return null;
    }

    const trimmedName = productName.trim() || 'Untitled Startup';
    const normalized = normalizeWaitlistContent(content, trimmedName);
    const resolvedSlug = sanitizeSlug(slugDraft || currentSlug || '') || generateSlug(trimmedName);

    if (mode === 'publish') setIsPublishing(true);
    else setIsSaving(true);

    const payload = {
      ...buildPagePayload(user.id, trimmedName, normalized),
      status: nextStatus,
      slug: resolvedSlug,
      published_at: nextStatus === 'published' ? new Date().toISOString() : null,
    };

    const query = draftId
      ? (supabase as any)
          .from(WAITLIST_TABLE)
          .update(payload)
          .eq('id', draftId)
          .select('id, slug, status')
          .single()
      : (supabase as any)
          .from(WAITLIST_TABLE)
          .insert(payload)
          .select('id, slug, status')
          .single();

    const { data, error } = await query;
    setIsSaving(false);
    setIsPublishing(false);

    if (error || !data) {
      toast.error(error?.message || 'Could not save your page. Please try again.');
      return null;
    }

    const saved = data as { id: string; slug: string | null; status: string };
    setDraftId(saved.id);
    setCurrentSlug(saved.slug);
    setSlugDraft(saved.slug || '');
    setContent(normalized);
    setStatus(saved.status === 'published' ? 'published' : 'draft');
    setLastSavedSnapshot(buildEditorSnapshot(trimmedName, normalized, saved.slug || '', saved.status === 'published' ? 'published' : 'draft'));
    setLastSavedAt(new Date().toISOString());
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
    }
    setRestorableGuestDraft(null);
    await loadAllPages();

    if (mode !== 'autosave' && mode !== 'publish') {
      const actionLabel =
        mode === 'live-update'
            ? 'Live waitlist updated.'
            : 'Draft saved.';
      toast.success(actionLabel);
    }

    return saved.id;
  }, [content, currentSlug, draftId, loadAllPages, productName, promptSignIn, publishBlockingReason, slugDraft, user]);

  const handleSave = async () => {
    if (status === 'published') {
      const shouldUpdateLive = window.confirm('This waitlist is live. Updating now will change the public page immediately. Continue?');
      if (!shouldUpdateLive) return;
      await persistWaitlist('published', 'live-update');
      return;
    }

    await persistWaitlist('draft', 'manual');
  };

  const handlePublish = async () => {
    if (!user) {
      promptSignIn('publish your waitlist');
      return;
    }

    const requiredCredits = ensureCredits('WAITLIST_GENERATION', {
      featureName: 'Waitlist Page Generation',
      description: 'Publish your waitlist page and make it live for signups.',
    });
    if (requiredCredits === null) {
      return;
    }

    const pageId = await persistWaitlist('published', 'publish');
    if (!pageId) {
      return;
    }
    await fetchAnalytics(pageId);
    await refreshProgress();
    toast.success(`Waitlist published. Share your public URL. (Used ${requiredCredits} credits)`);
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
    setLastSavedSnapshot(buildEditorSnapshot(productName, content, currentSlug || '', 'draft'));
    setLastSavedAt(new Date().toISOString());
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
    if (status !== 'published' || !liveUrl) {
      toast.info('Publish your page first to copy the public URL.');
      return;
    }
    navigator.clipboard.writeText(liveUrl).then(() => toast.success('Public link copied.'));
  };

  const checkSlugAvailability = (value: string) => {
    const slug = sanitizeSlug(value);
    setSlugDraft(slug);

    if (slugTimer.current) clearTimeout(slugTimer.current);

    if (!slug || !user) {
      setSlugAvailable(null);
      setIsCheckingSlug(false);
      return;
    }

    if (slug === currentSlug) {
      setSlugAvailable(true);
      setIsCheckingSlug(false);
      return;
    }

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

  useEffect(() => {
    if (isGuest || isInitializing || status !== 'draft' || !hasUnsavedChanges) return;

    const timer = window.setTimeout(() => {
      void persistWaitlist('draft', 'autosave');
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [hasUnsavedChanges, isGuest, isInitializing, persistWaitlist, status]);

  const statusBadge = useMemo(() => {
    if (isCompleted) return <Badge className="bg-green-600 text-white">Completed</Badge>;
    if (status === 'published') return <Badge className="bg-emerald-600 text-white">Published</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
  }, [isCompleted, status]);

  const conversionRate = viewCount > 0 ? `${((signupCount / viewCount) * 100).toFixed(1)}%` : '--';

  if (isInitializing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading your waitlist builder...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.95)_45%,rgba(14,165,233,0.26)_100%)] text-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <CardContent className="relative space-y-6 p-6 md:p-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.32),transparent_55%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_40%)] lg:block" />

          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/15 bg-white/10 text-white">Waitlist Builder</Badge>
                {statusBadge}
                {content.domainSetup?.status === 'verified' ? <Badge variant="outline" className="border-emerald-300/40 bg-emerald-400/10 text-emerald-100">Domain Verified</Badge> : null}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200/80">Creator Studio</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                    {productName.trim() || 'Untitled waitlist'}
                  </h2>
                </div>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-200">
                  Build the page like a landing page designer: edit the story on the left, review the staged artboard on the right, and publish only when the experience feels ready.
                </p>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-2 xl:max-w-[420px] xl:justify-end">
              <Button variant="outline" onClick={resetToNew} size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Plus className="w-4 h-4 mr-1" /> New</Button>
              <Button variant="outline" onClick={copyUrl} size="sm" disabled={!liveUrl} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:text-white/40"><Copy className="w-4 h-4 mr-1" /> Copy live link</Button>
              <Button variant="outline" onClick={handleExportCSV} size="sm" disabled={isGuest || !draftId} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:text-white/40"><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
              <Button variant="outline" onClick={handleSave} size="sm" disabled={isSaving || isPublishing} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:text-white/40">
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                {status === 'published' ? 'Update live page' : 'Save draft'}
              </Button>
              {status === 'published'
                ? <Button variant="destructive" size="sm" onClick={handleUnpublish} disabled={isGuest || !draftId}>Unpublish</Button>
                : <Button size="sm" onClick={handlePublish} disabled={isPublishing || Boolean(publishBlockingReason)} className="bg-white text-slate-950 hover:bg-slate-100">
                    {isPublishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Globe className="w-4 h-4 mr-1" />}
                    Publish
                  </Button>}
            </div>
          </div>

          <div className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Mode', value: status === 'published' ? 'Live page' : 'Draft only', detail: status === 'published' ? 'Edits stay staged until you update' : 'Autosave keeps this draft safe' },
              { label: 'Preview', value: previewDevice === 'mobile' ? 'Mobile frame' : 'Desktop canvas', detail: 'Switch views to QA before sharing' },
              { label: 'Audience', value: `${signupCount}`, detail: signupCount === 1 ? 'person joined so far' : 'people joined so far' },
              { label: 'Conversion', value: conversionRate, detail: `${viewCount} recorded views` },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[24px] border border-white/12 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-100/70">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-200/80">{metric.detail}</p>
              </div>
            ))}
          </div>

          {status === 'published' ? (
            <div className="relative rounded-[24px] border border-emerald-300/25 bg-emerald-400/10 px-5 py-4 text-sm backdrop-blur">
              <p className="font-medium text-emerald-50">This waitlist is live.</p>
              <p className="text-emerald-50/80">Edits in the builder stay local until you click <strong>Update live page</strong>.</p>
            </div>
          ) : (
            <div className="relative rounded-[24px] border border-white/12 bg-white/6 px-5 py-4 text-sm backdrop-blur">
              <p className="font-medium text-white">Draft mode</p>
              <p className="text-slate-200/80">The builder autosaves your draft. Your public page only exists after publishing.</p>
            </div>
          )}

          {hasUnsavedChanges ? (
            <div className="rounded-[24px] border border-amber-300/25 bg-amber-300/10 px-5 py-4 text-sm text-amber-50 backdrop-blur">
              Unsaved changes in progress.
              <span className="ml-1 text-amber-50/85">
                {status === 'published' ? 'Review them, then update the live page when ready.' : 'Autosave is active for this draft.'}
              </span>
            </div>
          ) : lastSavedAt ? (
            <p className="text-xs text-slate-200/75">Last saved {new Date(lastSavedAt).toLocaleString()}.</p>
          ) : null}

          {isGuest ? (
            <div className="rounded-[24px] border border-white/12 bg-white/6 p-4 text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between backdrop-blur">
              <p className="text-slate-200/85">Your browser draft is being preserved locally. Sign in when you are ready to save, publish, and collect real signups.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    if (!hasUnsavedChanges || window.confirm('Your draft is saved in this browser. Continue to log in?')) {
                      window.location.href = '/login?return=/waitlist';
                    }
                  }}
                >
                  Log in
                </Button>
                <Button
                  size="sm"
                  className="bg-white text-slate-950 hover:bg-slate-100"
                  onClick={() => {
                    if (!hasUnsavedChanges || window.confirm('Your draft is saved in this browser. Continue to create an account?')) {
                      window.location.href = '/signup?return=/waitlist';
                    }
                  }}
                >
                  Create account
                </Button>
              </div>
            </div>
          ) : null}

          {!isGuest && restorableGuestDraft ? (
            <div className="rounded-[24px] border border-white/12 bg-white/6 px-4 py-4 text-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between backdrop-blur">
              <div>
                <p className="font-medium text-white">Browser draft available</p>
                <p className="text-slate-200/80">You have an unsaved local waitlist draft from {restorableGuestDraft.savedAt ? new Date(restorableGuestDraft.savedAt).toLocaleString() : 'this browser'}.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    if (hasUnsavedChanges && !window.confirm('Replace the current editor contents with your browser draft?')) {
                      return;
                    }
                    applyDraftState({
                      productName: restorableGuestDraft.productName,
                      content: restorableGuestDraft.content,
                      draftId: null,
                      currentSlug: restorableGuestDraft.slugDraft || null,
                      status: 'draft',
                      savedAt: restorableGuestDraft.savedAt,
                    });
                    setActiveTab('content');
                  }}
                >
                  Restore browser draft
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
                    setRestorableGuestDraft(null);
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}

          {user && allPages.length > 0 ? (
            <div className="grid gap-2 rounded-[24px] border border-white/12 bg-white/6 p-4 backdrop-blur">
              <Label htmlFor="waitlist-selector" className="text-slate-100">My Waitlists</Label>
              <select
                id="waitlist-selector"
                className="h-11 rounded-2xl border border-white/12 bg-white/10 px-4 text-sm text-white"
                value={draftId || ''}
                onChange={async (event) => {
                  const nextId = event.target.value;
                  const selected = allPages.find((page) => page.id === nextId);
                  if (!selected) return;
                  if (hasUnsavedChanges && !window.confirm('Switch waitlists and discard your unsaved changes?')) {
                    return;
                  }
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
      <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white/75 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="grid min-h-[820px] lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] backdrop-blur">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BuilderTab)} className="h-full flex flex-col">
              <div className="border-b border-slate-200/80 bg-white/90 p-4 backdrop-blur">
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Design controls</p>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Edit like a landing page studio</h3>
                    <p className="text-sm text-slate-500">Move tab by tab through content, visual styling, forms, launch settings, and performance.</p>
                  </div>
                </div>
                <TabsList className="grid h-auto w-full grid-cols-5 gap-1 rounded-[20px] bg-slate-100 p-1.5 shadow-inner">
                  <TabsTrigger value="content" className="rounded-2xl px-2 py-2 text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Content</TabsTrigger>
                  <TabsTrigger value="style" className="rounded-2xl px-2 py-2 text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Style</TabsTrigger>
                  <TabsTrigger value="form" className="rounded-2xl px-2 py-2 text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Form</TabsTrigger>
                  <TabsTrigger value="launch" className="rounded-2xl px-2 py-2 text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Launch</TabsTrigger>
                  <TabsTrigger value="analytics" className="rounded-2xl px-2 py-2 text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Analytics</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="content" className="mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-slate-200/80 [&>div]:bg-white/95 [&>div]:p-4 [&>div]:shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Content</p>
                    <h4 className="text-lg font-semibold text-slate-950">Shape the landing page story</h4>
                    <p className="text-sm text-slate-500">Write the messaging, proof, and narrative the visitor experiences from hero to CTA.</p>
                  </div>
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
                    <Textarea
                      value={benefitsDraft}
                      onChange={(event) => setBenefitsDraft(event.target.value)}
                      onBlur={(event) => updateContent({ benefits: textToLines(event.target.value, 3, 5, content.benefits) })}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">Use 3 to 5 lines. Validation applies when you leave the field.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>How it works (one step per line)</Label>
                    <Textarea
                      value={howItWorksDraft}
                      onChange={(event) => setHowItWorksDraft(event.target.value)}
                      onBlur={(event) => updateContent({ howItWorks: textToLines(event.target.value, 3, 4, content.howItWorks) })}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">Use 3 to 4 steps. Validation applies when you leave the field.</p>
                  </div>

                  <div className="space-y-2"><Label>Logo URL</Label><Input value={content.logoUrl || ''} onChange={(event) => updateContent({ logoUrl: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Hero image URL</Label><Input value={content.imageUrl || ''} onChange={(event) => updateContent({ imageUrl: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Launch date (optional)</Label><Input type="date" value={content.launchDate || ''} onChange={(event) => updateContent({ launchDate: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Referral message</Label><Textarea value={content.referralMessage || ''} onChange={(event) => updateContent({ referralMessage: event.target.value })} rows={2} /></div>
                </TabsContent>

                <TabsContent value="style" className="mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-slate-200/80 [&>div]:bg-white/95 [&>div]:p-4 [&>div]:shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Style</p>
                    <h4 className="text-lg font-semibold text-slate-950">Tune the visual system</h4>
                    <p className="text-sm text-slate-500">Switch themes, adjust layout, and fine-tune the palette so the page feels intentional before launch.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={content.theme === 'dark' ? 'default' : 'outline'} onClick={() => applyThemePreset('dark')} className="flex-1">Dark</Button>
                      <Button size="sm" variant={content.theme === 'light' ? 'default' : 'outline'} onClick={() => applyThemePreset('light')} className="flex-1">Light</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Switching theme applies a matching default palette. You can still fine-tune colors below.</p>
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

                <TabsContent value="form" className="mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-slate-200/80 [&>div]:bg-white/95 [&>div]:p-4 [&>div]:shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Form</p>
                    <h4 className="text-lg font-semibold text-slate-950">Craft the signup experience</h4>
                    <p className="text-sm text-slate-500">Decide what to collect, how the CTA reads, and what the visitor sees after signing up.</p>
                  </div>
                  <div className="space-y-2"><Label>CTA button label</Label><Input value={content.ctaText} onChange={(event) => updateContent({ ctaText: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Email placeholder</Label><Input value={content.emailPlaceholder} onChange={(event) => updateContent({ emailPlaceholder: event.target.value })} /></div>

                  <div className="space-y-2">
                    <Label>Form options</Label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Collect first name</span><input type="checkbox" checked={Boolean(content.collectFirstName)} onChange={(event) => updateContent({ collectFirstName: event.target.checked })} /></label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Show consent checkbox</span><input type="checkbox" checked={Boolean(content.collectConsent)} onChange={(event) => updateContent({ collectConsent: event.target.checked })} /></label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Require consent</span><input type="checkbox" checked={Boolean(content.consentRequired)} onChange={(event) => updateContent({ consentRequired: event.target.checked })} /></label>
                    {content.consentRequired ? <p className="text-xs text-muted-foreground">Required consent automatically keeps the checkbox visible on the public form.</p> : null}
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
                <TabsContent value="launch" className="mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-slate-200/80 [&>div]:bg-white/95 [&>div]:p-4 [&>div]:shadow-[0_12px_30px_rgba(15,23,42,0.05)] [&>label]:rounded-[24px] [&>label]:border [&>label]:border-slate-200/80 [&>label]:bg-white/95 [&>label]:px-4 [&>label]:py-3 [&>label]:shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Launch</p>
                    <h4 className="text-lg font-semibold text-slate-950">Publish with confidence</h4>
                    <p className="text-sm text-slate-500">Handle the share URL, delivery settings, DNS checks, and go-live readiness from one panel.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Launch checklist</Label>
                    <div className="grid gap-2">
                      {[
                        { title: 'Draft', description: draftId ? 'Draft exists and can be recovered.' : 'Create your first draft to reserve a page record.', complete: Boolean(draftId) },
                        { title: 'Slug', description: slugAvailable === false ? 'Choose another slug before publishing.' : slugDraft || currentSlug ? 'Your page slug is ready.' : 'A slug will be generated automatically if left empty.', complete: slugAvailable !== false },
                        { title: 'Publish', description: status === 'published' ? 'This waitlist is live and shareable.' : `Publishing costs ${CREDIT_COSTS.WAITLIST_GENERATION} credits and exposes your public URL.`, complete: status === 'published' },
                      ].map((step) => (
                        <div key={step.title} className="rounded-md border px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {step.complete ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            <span className="font-medium">{step.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Public slug</Label>
                    <Input value={slugDraft} onChange={(event) => checkSlugAvailability(event.target.value)} placeholder="my-waitlist-page" />
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {isCheckingSlug ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {slugAvailable === true ? <Check className="w-3 h-3 text-green-600" /> : null}
                      {slugAvailable === false ? <AlertTriangle className="w-3 h-3 text-red-500" /> : null}
                      {slugAvailable === true ? 'This slug is available and will save with your draft.' : slugAvailable === false ? 'This slug is already taken.' : 'Draft saves and publishing will persist this slug automatically.'}
                    </div>
                  </div>

                  {status === 'published' && liveUrl ? (
                    <div className="rounded-md border p-3 text-sm space-y-2">
                      <p className="text-xs text-muted-foreground">Live public URL</p>
                      <p className="font-mono text-xs break-all">{liveUrl}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={copyUrl}><Copy className="w-4 h-4 mr-1" />Copy</Button>
                        <Button size="sm" asChild><a href={liveUrl} target="_blank" rel="noreferrer"><Eye className="w-4 h-4 mr-1" />Open</a></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
                      <p>Your waitlist is still in draft.</p>
                      <p>{reservedUrl ? `Reserved URL after publish: ${reservedUrl}` : 'A public URL will be created once you publish.'}</p>
                    </div>
                  )}

                  {publishBlockingReason ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950">
                      {publishBlockingReason}
                    </div>
                  ) : null}

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

                  <div className="space-y-2">
                    <Label>Email sending domain (optional)</Label>
                    <Input value={content.domainSetup?.domain || ''} onChange={(event) => updateContent({ domainSetup: { ...content.domainSetup!, domain: event.target.value.toLowerCase().trim(), status: event.target.value ? 'pending' : 'unconfigured' } })} placeholder="updates.yourstartup.com" />
                    <p className="text-xs text-muted-foreground">This only verifies a sender domain for confirmation emails. Public waitlist pages still use the `/w/slug` URL.</p>
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

                  {!markReadyAt ? (
                    <Button className="w-full" variant="secondary" onClick={handleMarkAsReady} disabled={!draftId || isMarkingReady || isGuest}>
                      {isMarkingReady ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}Mark as Ready
                    </Button>
                  ) : (
                    <Badge className="w-full justify-center border-green-500/30 bg-green-500/10 text-green-700">Ready on {new Date(markReadyAt).toLocaleDateString()}</Badge>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-slate-200/80 [&>div]:bg-white/95 [&>div]:p-4 [&>div]:shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Analytics</p>
                    <h4 className="text-lg font-semibold text-slate-950">Read the signal</h4>
                    <p className="text-sm text-slate-500">Watch views, signups, and recent leads without leaving the builder.</p>
                  </div>
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

          <section
            className="relative overflow-auto p-4 md:p-8"
            style={{
              backgroundColor: '#f5efe3',
              backgroundImage: 'radial-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.55), rgba(248,250,252,0.88))',
              backgroundSize: '22px 22px, 100% 100%',
            }}
          >
            <div className="mx-auto max-w-[1180px] space-y-4">
              <div className="flex flex-col gap-3 rounded-[28px] border border-white/80 bg-white/75 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Preview canvas</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">Review the public page before publishing.</p>
                  <p className="text-xs text-slate-500">This stage mirrors the public waitlist. Switch frames to test how the landing page reads on desktop and mobile.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={previewDevice === 'desktop' ? 'default' : 'outline'} onClick={() => setPreviewDevice('desktop')} className={previewDevice === 'desktop' ? '' : 'border-slate-300 bg-white'}>
                    <Monitor className="mr-1 h-4 w-4" />
                    Desktop
                  </Button>
                  <Button size="sm" variant={previewDevice === 'mobile' ? 'default' : 'outline'} onClick={() => setPreviewDevice('mobile')} className={previewDevice === 'mobile' ? '' : 'border-slate-300 bg-white'}>
                    <MonitorSmartphone className="mr-1 h-4 w-4" />
                    Mobile
                  </Button>
                </div>
              </div>

              <div className={previewDevice === 'mobile' ? 'mx-auto max-w-[420px]' : ''}>
                <div className="rounded-[34px] border border-white/80 bg-white p-3 shadow-[0_28px_100px_rgba(15,23,42,0.16)]">
                  <div className="mb-3 flex items-center justify-between rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-950">{productName.trim() || 'Untitled waitlist'}</p>
                        <p className="text-xs text-slate-500">{previewDevice === 'mobile' ? 'Mobile artboard' : 'Desktop artboard'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-slate-300 bg-white text-slate-600">
                      {status === 'published' ? 'Live-ready' : 'Draft preview'}
                    </Badge>
                  </div>
                  <WaitlistPageTemplate content={content} productName={productName || 'Your Product'} mode="preview" onContentChange={updateTemplateField} signupCount={signupCount} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
