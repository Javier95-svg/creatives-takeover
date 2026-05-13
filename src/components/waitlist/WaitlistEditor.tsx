
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useActivationJourney } from '@/hooks/useActivationJourney';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useSubscription } from '@/hooks/useSubscription';
import { CREDIT_COSTS } from '@/config/constants';
import { normalizePlan } from '@/config/planPermissions';
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
import { WAITLIST_ACCENT_PRESETS, WAITLIST_FONT_PRESETS, WAITLIST_SECTION_ORDER, createWaitlistFieldId, getDefaultWaitlistContent, getWaitlistThemePalette, normalizeWaitlistContent, type WaitlistSectionId } from '@/lib/waitlist';
import { getWaitlistTemplate } from '@/lib/waitlistTemplates';
import { getToolJourneyGuide } from '@/lib/activationJourney';
import { ActivationJourneyStrip } from '@/components/activation/ActivationJourneyStrip';
import { captureEvent } from '@/lib/analytics';

type BuilderTab = 'content' | 'style' | 'form' | 'launch' | 'analytics';
type PreviewDevice = 'desktop' | 'mobile';

const WAITLIST_TABLE = 'waitlist_pages' as any;
const SIGNUPS_TABLE = 'waitlist_signups' as any;
const EVENTS_TABLE = 'waitlist_events' as any;
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com';
const GUEST_DRAFT_STORAGE_KEY = 'waitlist_builder_guest_draft_v1';
const LAST_EDITOR_STORAGE_KEY = 'waitlist_builder_last_editor_v1';
const WAITLIST_IMAGE_BUCKET = 'public-assets';
const WAITLIST_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const WAITLIST_IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const WAITLIST_SECTION_LABELS: Record<WaitlistSectionId, string> = {
  problemSolution: 'Problem + Solution',
  benefits: 'Benefits',
  howItWorks: 'How it works',
  testimonials: 'Testimonials',
  faq: 'FAQ',
};

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

interface StoredWaitlistEditorState {
  productName?: string;
  slugDraft?: string;
  content?: WaitlistContent;
  savedAt?: string | null;
  status?: 'draft' | 'published';
  draftId?: string | null;
  currentSlug?: string | null;
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

function readStoredWaitlistEditorState(): StoredWaitlistEditorState | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(LAST_EDITOR_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredWaitlistEditorState;
    if (!parsed?.content) return null;

    return {
      productName: parsed.productName || '',
      slugDraft: sanitizeSlug(parsed.slugDraft || ''),
      content: normalizeWaitlistContent(parsed.content, parsed.productName || 'Your Product'),
      savedAt: parsed.savedAt || null,
      status: parsed.status === 'published' ? 'published' : 'draft',
      draftId: parsed.draftId || null,
      currentSlug: parsed.currentSlug || sanitizeSlug(parsed.slugDraft || '') || null,
    };
  } catch {
    return null;
  }
}

function readGuestBrowserDraft(): {
  productName: string;
  slugDraft: string;
  content: WaitlistContent;
  savedAt: string | null;
} | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredWaitlistEditorState;
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
}

export interface WaitlistEditorInitialSeed {
  productName?: string;
  content: Partial<WaitlistContent>;
  source?: 'icp' | 'manual';
  icpDraftId?: string | null;
}

export interface WaitlistEditorProps {
  initialSeed?: WaitlistEditorInitialSeed | null;
  onBackToTemplates?: () => void;
}

export default function WaitlistEditor({ initialSeed = null, onBackToTemplates }: WaitlistEditorProps = {}) {
  const { user, loading: authLoading } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const { refreshActivation } = useActivationJourney();
  const { ensureCredits } = useCreditActions();
  const { subscriptionData } = useSubscription();
  const initialStoredStateRef = useRef<StoredWaitlistEditorState | null>(readStoredWaitlistEditorState());
  const initialGuestDraftRef = useRef(readGuestBrowserDraft());
  const initialState = initialStoredStateRef.current ?? (initialGuestDraftRef.current ? {
    productName: initialGuestDraftRef.current.productName,
    slugDraft: initialGuestDraftRef.current.slugDraft,
    content: initialGuestDraftRef.current.content,
    savedAt: initialGuestDraftRef.current.savedAt,
    status: 'draft' as const,
    draftId: null,
    currentSlug: initialGuestDraftRef.current.slugDraft || null,
  } : null);
  const initialContent = initialState?.content ?? getDefaultWaitlistContent('Your Product');

  const [activeTab, setActiveTab] = useState<BuilderTab>('content');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [allPages, setAllPages] = useState<WaitlistPageRow[]>([]);

  const [productName, setProductName] = useState(initialState?.productName || '');
  const [content, setContent] = useState<WaitlistContent>(initialContent);
  const [benefitsDraft, setBenefitsDraft] = useState(linesToText(initialContent.benefits));
  const [howItWorksDraft, setHowItWorksDraft] = useState(linesToText(initialContent.howItWorks));

  const [draftId, setDraftId] = useState<string | null>(initialState?.draftId || null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(initialState?.currentSlug || null);
  const [status, setStatus] = useState<'draft' | 'published'>(initialState?.status === 'published' ? 'published' : 'draft');
  const [markReadyAt, setMarkReadyAt] = useState<string | null>(null);

  const [viewCount, setViewCount] = useState(0);
  const [signupCount, setSignupCount] = useState(0);
  const [recentSignups, setRecentSignups] = useState<SignupRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [slugDraft, setSlugDraft] = useState(initialState?.slugDraft || '');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingDns, setIsCheckingDns] = useState(false);
  const [isRefiningWithAi, setIsRefiningWithAi] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(
    initialState
      ? buildEditorSnapshot(
          initialState.productName || '',
          initialContent,
          initialState.slugDraft || initialState.currentSlug || '',
          initialState.status === 'published' ? 'published' : 'draft'
        )
      : ''
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialState?.savedAt || null);
  const [restorableGuestDraft, setRestorableGuestDraft] = useState<{
    productName: string;
    slugDraft: string;
    content: WaitlistContent;
    savedAt: string;
  } | null>(null);

  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGuest = !user;
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const isCompleted = useMemo(() => Boolean(markReadyAt) || signupCount > 0, [markReadyAt, signupCount]);
  const reservedUrl = currentSlug ? `${BASE_URL}/w/${currentSlug}` : null;
  const liveUrl = status === 'published' && currentSlug ? `${BASE_URL}/w/${currentSlug}` : null;
  const waitlistPublishDescription = currentPlan === 'rookie'
    ? `Publishing costs ${CREDIT_COSTS.WAITLIST_GENERATION} credits and exposes your public URL.`
    : 'Publishing is included on your plan and exposes your public URL.';
  const currentSnapshot = useMemo(
    () => buildEditorSnapshot(productName, content, slugDraft || currentSlug || '', status),
    [content, currentSlug, productName, slugDraft, status]
  );
  const activeTemplate = useMemo(() => getWaitlistTemplate(content.templateId), [content.templateId]);
  const hasUnsavedChanges = Boolean(lastSavedSnapshot) && currentSnapshot !== lastSavedSnapshot;
  const publishBlockingReason = useMemo(() => {
    if (!productName.trim()) return 'Add a project name before publishing.';
    if (!content.headline.trim()) return 'Add a headline before publishing.';
    if (!content.subheadline.trim()) return 'Add a subheadline before publishing.';
    if (slugAvailable === false) return 'Choose an available public slug before publishing.';
    if (content.consentRequired && !content.collectConsent) return 'Show the consent checkbox if consent is required.';
    return null;
  }, [content.collectConsent, content.consentRequired, content.headline, content.subheadline, productName, slugAvailable]);
  const hasSavedWaitlistBeforeCurrentAction = Boolean(draftId || allPages.length > 0);

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
      if (authLoading) return;

      setIsHydrating(true);
      const browserDraft = readGuestBrowserDraft();

      const seededName = initialSeed?.productName?.trim() || '';
      const seededContent = initialSeed
        ? normalizeWaitlistContent(
            { ...getDefaultWaitlistContent(seededName || 'Your Product'), ...initialSeed.content },
            seededName || 'Your Product',
          )
        : null;

      if (!user) {
        if (seededContent) {
          applyDraftState({
            productName: seededName,
            content: seededContent,
            draftId: null,
            currentSlug: null,
            status: 'draft',
          });
          setSignupCount(0);
          setViewCount(0);
          setRecentSignups([]);
          setEvents([]);
          setAllPages([]);
          setRestorableGuestDraft(browserDraft);
          setIsHydrating(false);
          return;
        }
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
        setIsHydrating(false);
        return;
      }

      const [_, latestPageResult] = await Promise.all([
        loadAllPages(),
        (supabase as any)
          .from(WAITLIST_TABLE)
          .select('id, slug, product_name, ai_content, status, title, view_count, mark_ready_at, theme, accent_color, layout, logo_url, image_url, social_links, launch_date, webhook_url, integration_provider, integration_list_id, confirmation_email_enabled, ab_test_enabled, headline_variant_b, referral_message')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const { data } = latestPageResult as { data: WaitlistPageRow | null };

      if (seededContent) {
        applyDraftState({
          productName: seededName,
          content: seededContent,
          draftId: null,
          currentSlug: null,
          status: 'draft',
        });
        setSignupCount(0);
        setViewCount(0);
        setRecentSignups([]);
        setEvents([]);
        setRestorableGuestDraft(browserDraft);
        setIsHydrating(false);
        return;
      }

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
        setIsHydrating(false);
        return;
      }

      loadPageIntoEditor(data as WaitlistPageRow);
      await fetchAnalytics((data as WaitlistPageRow).id);
      setRestorableGuestDraft(browserDraft);
      setIsHydrating(false);
    };

    void initialize();
  }, [applyDraftState, authLoading, fetchAnalytics, initialSeed, loadAllPages, loadPageIntoEditor, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(LAST_EDITOR_STORAGE_KEY, JSON.stringify({
      productName,
      slugDraft,
      currentSlug,
      draftId,
      status,
      content,
      savedAt: lastSavedAt || new Date().toISOString(),
    }));

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
  }, [content, currentSlug, draftId, isGuest, lastSavedAt, productName, restorableGuestDraft, slugDraft, status]);

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

    const trimmedName = productName.trim() || 'Untitled Waitlist';
    const normalized = normalizeWaitlistContent(content, trimmedName);
    const resolvedSlug = sanitizeSlug(slugDraft || currentSlug || '') || generateSlug(trimmedName);
    const isFirstOutput = !hasSavedWaitlistBeforeCurrentAction;

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
    await refreshActivation();

    if (mode === 'manual') {
      captureEvent('waitlist_draft_saved', {
        source: 'activation',
        waitlistId: saved.id,
        isFirstOutput,
        ...(saved.slug ? { slug: saved.slug } : {}),
      });
    }

    if (mode === 'publish') {
      captureEvent('waitlist_published', {
        source: 'activation',
        waitlistId: saved.id,
        isFirstOutput,
        ...(saved.slug ? { slug: saved.slug } : {}),
      });
    }

    if (mode !== 'autosave' && mode !== 'publish') {
      const actionLabel =
        mode === 'live-update'
            ? 'Live waitlist updated.'
            : 'Draft saved.';
      toast.success(actionLabel);
    }

    return saved.id;
  }, [content, currentSlug, draftId, hasSavedWaitlistBeforeCurrentAction, loadAllPages, productName, promptSignIn, publishBlockingReason, refreshActivation, slugDraft, user]);

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
    const isFirstOutput = !hasSavedWaitlistBeforeCurrentAction;

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
    await refreshActivation();
    captureEvent('waitlist_marked_ready', {
      source: 'activation',
      waitlistId: draftId,
      isFirstOutput,
      ...(currentSlug ? { slug: currentSlug } : {}),
    });
    toast.success('Prototype marked as ready. Stage II can now progress.');
  };

  const copyUrl = () => {
    if (status !== 'published' || !liveUrl) {
      toast.info('Publish your page first to copy the public URL.');
      return;
    }
    navigator.clipboard.writeText(liveUrl).then(() => toast.success('Public link copied.'));
  };

  const handleRefineWithAi = async () => {
    if (!user) {
      promptSignIn('refine with AI');
      return;
    }
    const requiredCredits = ensureCredits('WAITLIST_GENERATION', {
      featureName: 'AI Refine',
      description: 'Rewrite your waitlist copy using AI based on your product description.',
    });
    if (requiredCredits === null) return;

    setIsRefiningWithAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('waitlist-generator', {
        body: {
          productName: productName.trim() || 'Product',
          pitch: content.problemStatement || content.solutionSummary || '',
          audience: content.subheadline || '',
          ...(initialSeed?.icpDraftId ? { icpDraftId: initialSeed.icpDraftId } : {}),
        },
      });

      if (error || !data) {
        toast.error('AI refine failed. Your credits were not charged.');
        return;
      }

      const result = data as {
        headline?: string;
        headlineVariantB?: string;
        subheadline?: string;
        problemStatement?: string;
        solutionSummary?: string;
        benefits?: string[];
        howItWorks?: string[];
        trustItems?: string[];
        ctaText?: string;
        emailPlaceholder?: string;
      };

      updateContent({
        ...(result.headline ? { headline: result.headline } : {}),
        ...(result.headlineVariantB ? { headlineVariantB: result.headlineVariantB } : {}),
        ...(result.subheadline ? { subheadline: result.subheadline } : {}),
        ...(result.problemStatement ? { problemStatement: result.problemStatement } : {}),
        ...(result.solutionSummary ? { solutionSummary: result.solutionSummary } : {}),
        ...(result.benefits?.length ? { benefits: result.benefits } : {}),
        ...(result.howItWorks?.length ? { howItWorks: result.howItWorks } : {}),
        ...(result.ctaText ? { ctaText: result.ctaText } : {}),
        ...(result.emailPlaceholder ? { emailPlaceholder: result.emailPlaceholder } : {}),
      });
      if (result.benefits?.length) setBenefitsDraft(linesToText(result.benefits));
      if (result.howItWorks?.length) setHowItWorksDraft(linesToText(result.howItWorks));

      toast.success(`Copy refined with AI. (Used ${requiredCredits} credits)`);
    } catch {
      toast.error('AI refine failed. Please try again.');
    } finally {
      setIsRefiningWithAi(false);
    }
  };

  const handleCanvasImageUpload = async (file: File) => {
    if (!user) {
      promptSignIn('upload images');
      return;
    }

    if (!WAITLIST_IMAGE_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Upload a JPG, PNG, WebP, GIF, or SVG image.');
      return;
    }

    if (file.size > WAITLIST_IMAGE_MAX_SIZE_BYTES) {
      toast.error('Image must be 5MB or smaller.');
      return;
    }

    const optimisticUrl = URL.createObjectURL(file);
    updateContent({ imageUrl: optimisticUrl });
    setIsUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const safeName = `${user.id}/waitlists/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const { data, error } = await supabase.storage.from(WAITLIST_IMAGE_BUCKET).upload(safeName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

      if (error || !data) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(WAITLIST_IMAGE_BUCKET).getPublicUrl(data.path);

      updateContent({ imageUrl: publicUrl });
      toast.success('Image added to your waitlist.');
    } catch (error) {
      updateContent({ imageUrl: '' });
      toast.error(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      URL.revokeObjectURL(optimisticUrl);
      setIsUploadingImage(false);
    }
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
    if (isGuest || authLoading || status !== 'draft' || !hasUnsavedChanges) return;

    const timer = window.setTimeout(() => {
      void persistWaitlist('draft', 'autosave');
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [authLoading, hasUnsavedChanges, isGuest, persistWaitlist, status]);

  const conversionRate = viewCount > 0 ? `${((signupCount / viewCount) * 100).toFixed(1)}%` : '--';
  const toolbarCardClass = 'border border-border/60 bg-white/80 shadow-sm backdrop-blur dark:border-0 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.95)_45%,rgba(14,165,233,0.26)_100%)] dark:shadow-[0_30px_90px_rgba(15,23,42,0.28)]';
  const builderCardClass = 'border border-border/60 bg-white/80 shadow-sm backdrop-blur dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.94))] dark:shadow-[0_20px_50px_rgba(15,23,42,0.18)]';
  const softInsetBoxClass = 'rounded-2xl border border-border/60 bg-slate-50/80 px-4 py-3 text-sm dark:border-white/12 dark:bg-white/6';
  const actionButtonClass = 'border-border/60 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white';
  const primaryButtonClass = 'border border-sky-300/30 bg-sky-500 text-white hover:bg-sky-400';
  const inputSurfaceClass = 'border-border/60 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-300';
  const selectSurfaceClass = 'h-11 w-full rounded-2xl border border-border/60 bg-white px-4 text-sm text-slate-950 dark:border-white/15 dark:bg-white/10 dark:text-white';
  const ghostButtonClass = 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-white dark:hover:bg-white/10 dark:hover:text-white';
  const studioShellClass = 'overflow-hidden rounded-[32px] border border-border/60 bg-white/75 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.96)_40%,rgba(30,41,59,0.94))] dark:shadow-[0_30px_90px_rgba(2,6,23,0.42)]';
  const studioAsideClass = 'border-r border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96)_50%,rgba(30,41,59,0.94))]';
  const studioHeaderClass = 'border-b border-border/60 bg-white/90 p-4 text-slate-950 backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96))] dark:text-white';
  const studioTabsListClass = 'grid h-auto w-full grid-cols-5 gap-1 rounded-[20px] bg-slate-100 p-1.5 shadow-inner dark:bg-white/8 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]';
  const studioTabsTriggerClass = 'rounded-2xl px-2 py-2 text-[11px] font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm dark:text-white/75 dark:data-[state=active]:bg-sky-300 dark:data-[state=active]:text-slate-950';
  const contentTabClass = 'mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-border/60 [&>div]:bg-white/80 [&>div]:p-4 [&>div]:shadow-sm [&_input]:border-border/60 [&_input]:bg-white [&_input]:text-slate-950 [&_input]:placeholder:text-slate-400 [&_label]:text-slate-950 [&_textarea]:border-border/60 [&_textarea]:bg-white [&_textarea]:text-slate-950 [&_textarea]:placeholder:text-slate-400 dark:text-white dark:[&>div]:border-white/10 dark:[&>div]:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.9))] dark:[&>div]:shadow-[0_18px_40px_rgba(2,6,23,0.35)] dark:[&_input]:border-white/15 dark:[&_input]:bg-white/5 dark:[&_input]:text-white dark:[&_input]:placeholder:text-slate-400 dark:[&_label]:text-white dark:[&_textarea]:border-white/15 dark:[&_textarea]:bg-white/5 dark:[&_textarea]:text-white dark:[&_textarea]:placeholder:text-slate-400';
  const styleTabClass = 'mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-border/60 [&>div]:bg-white/80 [&>div]:p-4 [&>div]:shadow-sm [&_button]:text-slate-700 [&_input]:border-border/60 [&_input]:bg-white [&_input]:text-slate-950 [&_label]:text-slate-950 [&_select]:border-border/60 [&_select]:bg-white [&_select]:text-slate-950 dark:text-white dark:[&>div]:border-white/10 dark:[&>div]:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.9))] dark:[&>div]:shadow-[0_18px_40px_rgba(2,6,23,0.35)] dark:[&_button]:text-white dark:[&_input]:border-white/15 dark:[&_input]:bg-white/5 dark:[&_input]:text-white dark:[&_label]:text-white dark:[&_select]:border-white/15 dark:[&_select]:bg-slate-950 dark:[&_select]:text-white';
  const formTabClass = 'mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-border/60 [&>div]:bg-white/80 [&>div]:p-4 [&>div]:shadow-sm [&_input]:border-border/60 [&_input]:bg-white [&_input]:text-slate-950 [&_input]:placeholder:text-slate-400 [&_label]:text-slate-950 [&_textarea]:border-border/60 [&_textarea]:bg-white [&_textarea]:text-slate-950 [&_textarea]:placeholder:text-slate-400 [&_select]:border-border/60 [&_select]:bg-white [&_select]:text-slate-950 dark:text-white dark:[&>div]:border-white/10 dark:[&>div]:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.9))] dark:[&>div]:shadow-[0_18px_40px_rgba(2,6,23,0.35)] dark:[&_input]:border-white/15 dark:[&_input]:bg-white/5 dark:[&_input]:text-white dark:[&_input]:placeholder:text-slate-400 dark:[&_label]:text-white dark:[&_textarea]:border-white/15 dark:[&_textarea]:bg-white/5 dark:[&_textarea]:text-white dark:[&_textarea]:placeholder:text-slate-400 dark:[&_select]:border-white/15 dark:[&_select]:bg-slate-950 dark:[&_select]:text-white';
  const launchTabClass = 'mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-border/60 [&>div]:bg-white/80 [&>div]:p-4 [&>div]:shadow-sm [&>label]:rounded-[24px] [&>label]:border [&>label]:border-border/60 [&>label]:bg-white/80 [&>label]:px-4 [&>label]:py-3 [&>label]:shadow-sm [&_input]:border-border/60 [&_input]:bg-white [&_input]:text-slate-950 [&_input]:placeholder:text-slate-400 [&_label]:text-slate-950 [&_select]:border-border/60 [&_select]:bg-white [&_select]:text-slate-950 dark:text-white dark:[&>div]:border-white/10 dark:[&>div]:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.9))] dark:[&>div]:shadow-[0_18px_40px_rgba(2,6,23,0.35)] dark:[&>label]:border-white/10 dark:[&>label]:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.9))] dark:[&>label]:shadow-[0_18px_40px_rgba(2,6,23,0.35)] dark:[&_input]:border-white/15 dark:[&_input]:bg-white/5 dark:[&_input]:text-white dark:[&_input]:placeholder:text-slate-400 dark:[&_label]:text-white dark:[&_select]:border-white/15 dark:[&_select]:bg-slate-950 dark:[&_select]:text-white';
  const analyticsTabClass = 'mt-0 space-y-4 [&>div]:rounded-[24px] [&>div]:border [&>div]:border-border/60 [&>div]:bg-white/80 [&>div]:p-4 [&>div]:shadow-sm [&_label]:text-slate-950 dark:text-white dark:[&>div]:border-white/10 dark:[&>div]:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.9))] dark:[&>div]:shadow-[0_18px_40px_rgba(2,6,23,0.35)] dark:[&_label]:text-white';
  const activationGuide = getToolJourneyGuide('/waitlist');
  const hasTangibleOutput = Boolean(draftId || lastSavedAt);

  return (
    <div className="space-y-6">
      {isHydrating ? (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700 dark:border-sky-300/15 dark:bg-sky-500/10 dark:text-sky-100">
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing your latest waitlist data...
        </div>
      ) : null}
      {activationGuide ? (
        <ActivationJourneyStrip
          stageLabel={activationGuide.stageLabel}
          title={activationGuide.title}
          description={activationGuide.description}
          doneLabel={activationGuide.doneLabel}
          completedLabel={activationGuide.completedLabel}
          nextRoute={activationGuide.nextRoute}
          nextLabel={activationGuide.nextLabel}
          isComplete={hasTangibleOutput}
        />
      ) : null}
      <Card className={toolbarCardClass}>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {onBackToTemplates ? (
              <Button variant="outline" onClick={onBackToTemplates} size="sm" className={actionButtonClass}>
                ← Templates
              </Button>
            ) : null}
            <Button variant="outline" onClick={resetToNew} size="sm" className={actionButtonClass}><Plus className="w-4 h-4 mr-1" /> New</Button>
            <Button variant="outline" onClick={copyUrl} size="sm" disabled={!liveUrl} className={`${actionButtonClass} disabled:text-slate-400 dark:disabled:text-white/40`}><Copy className="w-4 h-4 mr-1" /> Copy live link</Button>
            <Button variant="outline" onClick={handleExportCSV} size="sm" disabled={isGuest || !draftId} className={`${actionButtonClass} disabled:text-slate-400 dark:disabled:text-white/40`}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
            <Button variant="outline" onClick={handleSave} size="sm" disabled={isSaving || isPublishing} className={`${actionButtonClass} disabled:text-slate-400 dark:disabled:text-white/40`}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save draft
            </Button>
            <Button size="sm" onClick={status === 'published' ? handleSave : handlePublish} disabled={isPublishing || (status !== 'published' && Boolean(publishBlockingReason))} className={primaryButtonClass}>
              {isPublishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Globe className="w-4 h-4 mr-1" />}
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className={builderCardClass}>
          <CardContent className="space-y-3 p-4 text-slate-950 dark:text-white">
            <div className="space-y-1">
              <Label htmlFor="waitlist-name" className="text-slate-950 dark:text-white">Waitlist name</Label>
              <Input
                id="waitlist-name"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Name this waitlist"
                className={inputSurfaceClass}
              />
              <p className="text-xs text-slate-500 dark:text-slate-200/80">This name appears in My Waitlists and becomes the default title for the page.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-200/80">
              <Badge variant="outline" className="border-border/60 bg-white/80 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white">
                {activeTemplate.productType}
              </Badge>
              <span>{activeTemplate.name} template</span>
              {isUploadingImage ? (
                <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-200">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading image
                </span>
              ) : null}
            </div>

            {hasUnsavedChanges ? (
              <p className="text-xs text-amber-200">Unsaved changes in progress.</p>
            ) : lastSavedAt ? (
              <p className="text-xs text-slate-500 dark:text-slate-200/80">Last saved {new Date(lastSavedAt).toLocaleString()}.</p>
            ) : null}

            {isGuest ? (
              <div className={`${softInsetBoxClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <p className="text-slate-600 dark:text-slate-200/85">Your browser draft is being preserved locally. Sign in when you are ready to save, publish, and collect real signups.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={actionButtonClass}
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
                    className={primaryButtonClass}
                    onClick={() => {
                      if (!hasUnsavedChanges || window.confirm('Your draft is saved in this browser. Continue to create an account?')) {
                        window.location.href = '/signup?source=waitlist_guest_draft&return=' + encodeURIComponent('/waitlist?skipModeSelect=1');
                      }
                    }}
                  >
                    Create account
                  </Button>
                </div>
              </div>
            ) : null}

            {!isGuest && restorableGuestDraft ? (
              <div className={`${softInsetBoxClass} flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
                <div>
                  <p className="font-medium text-slate-950 dark:text-white">Browser draft available</p>
                  <p className="text-slate-500 dark:text-slate-200/80">You have an unsaved local waitlist draft from {restorableGuestDraft.savedAt ? new Date(restorableGuestDraft.savedAt).toLocaleString() : 'this browser'}.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={actionButtonClass}
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
                    className={ghostButtonClass}
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
          </CardContent>
        </Card>

        {user && allPages.length > 0 ? (
          <Card className={builderCardClass}>
            <CardContent className="space-y-2 p-4 text-slate-950 dark:text-white">
              <Label htmlFor="waitlist-selector" className="text-slate-950 dark:text-white">My Waitlists</Label>
              <select
                id="waitlist-selector"
                className={selectSurfaceClass}
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
                {allPages.map((page, index) => {
                  const pageName = page.product_name?.trim() || page.title?.trim() || `Waitlist ${index + 1}`;
                  const pageState = page.mark_ready_at ? 'Completed' : page.status === 'published' ? 'Published' : 'Draft';
                  return (
                    <option key={page.id} value={page.id}>{pageName} - {pageState}</option>
                  );
                })}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-200/80">Use the Waitlist name field to rename the current waitlist.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className={studioShellClass}>
        <div className="grid min-h-[820px] lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className={studioAsideClass}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BuilderTab)} className="h-full flex flex-col">
              <div className={studioHeaderClass}>
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200">Design controls</p>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Edit like a landing page studio</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-200/80">Move tab by tab through content, visual styling, forms, launch settings, and performance.</p>
                  </div>
                </div>
                <TabsList className={studioTabsListClass}>
                  <TabsTrigger value="content" className={studioTabsTriggerClass}>Content</TabsTrigger>
                  <TabsTrigger value="style" className={studioTabsTriggerClass}>Style</TabsTrigger>
                  <TabsTrigger value="form" className={studioTabsTriggerClass}>Form</TabsTrigger>
                  <TabsTrigger value="launch" className={studioTabsTriggerClass}>Launch</TabsTrigger>
                  <TabsTrigger value="analytics" className={studioTabsTriggerClass}>Analytics</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="content" className={contentTabClass}>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200">Content</p>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Shape the landing page story</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Write the messaging, proof, and narrative the visitor experiences from hero to CTA.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Waitlist name</Label>
                    <Input
                      value={productName}
                      onChange={(event) => setProductName(event.target.value)}
                      placeholder="Name this waitlist"
                    />
                  </div>

                  <div className="space-y-2"><Label>Headline</Label><Textarea value={content.headline} onChange={(event) => updateContent({ headline: event.target.value })} rows={2} /></div>
                  <div className="space-y-2"><Label>Subheadline</Label><Textarea value={content.subheadline} onChange={(event) => updateContent({ subheadline: event.target.value })} rows={2} /></div>
                  <div className="space-y-2"><Label>Problem statement</Label><Textarea value={content.problemStatement} onChange={(event) => updateContent({ problemStatement: event.target.value })} rows={3} /></div>
                  <div className="space-y-2"><Label>Solution summary</Label><Textarea value={content.solutionSummary} onChange={(event) => updateContent({ solutionSummary: event.target.value })} rows={3} /></div>

                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full justify-center gap-2 ${actionButtonClass}`}
                    onClick={handleRefineWithAi}
                    disabled={isRefiningWithAi || !user}
                    title={!user ? 'Sign in to refine with AI' : undefined}
                  >
                    {isRefiningWithAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isRefiningWithAi ? 'Refining…' : 'Refine with AI'}
                  </Button>

                  <div className="space-y-2">
                    <Label>Benefits (one per line)</Label>
                    <Textarea
                      value={benefitsDraft}
                      onChange={(event) => setBenefitsDraft(event.target.value)}
                      onBlur={(event) => updateContent({ benefits: textToLines(event.target.value, 3, 5, content.benefits) })}
                      rows={4}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-300">Use 3 to 5 lines. Validation applies when you leave the field.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>How it works (one step per line)</Label>
                    <Textarea
                      value={howItWorksDraft}
                      onChange={(event) => setHowItWorksDraft(event.target.value)}
                      onBlur={(event) => updateContent({ howItWorks: textToLines(event.target.value, 3, 4, content.howItWorks) })}
                      rows={4}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-300">Use 3 to 4 steps. Validation applies when you leave the field.</p>
                  </div>

                  <div className="space-y-2"><Label>Logo URL</Label><Input value={content.logoUrl || ''} onChange={(event) => updateContent({ logoUrl: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Hero image URL</Label><Input value={content.imageUrl || ''} onChange={(event) => updateContent({ imageUrl: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Launch date (optional)</Label><Input type="date" value={content.launchDate || ''} onChange={(event) => updateContent({ launchDate: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Referral message</Label><Textarea value={content.referralMessage || ''} onChange={(event) => updateContent({ referralMessage: event.target.value })} rows={2} /></div>
                </TabsContent>

                <TabsContent value="style" className={styleTabClass}>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200">Style</p>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Tune the visual system</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Switch themes, adjust layout, and fine-tune the palette so the page feels intentional before launch.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={content.theme === 'dark' ? 'default' : 'outline'} onClick={() => applyThemePreset('dark')} className={content.theme === 'dark' ? primaryButtonClass : actionButtonClass}>Dark</Button>
                      <Button size="sm" variant={content.theme === 'light' ? 'default' : 'outline'} onClick={() => applyThemePreset('light')} className={content.theme === 'light' ? primaryButtonClass : actionButtonClass}>Light</Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-300">Switching theme applies a matching default palette. You can still fine-tune colors below.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Layout</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={content.layout === 'centered' ? 'default' : 'outline'} onClick={() => updateContent({ layout: 'centered' })} className={content.layout === 'centered' ? primaryButtonClass : actionButtonClass}>Centered</Button>
                      <Button size="sm" variant={content.layout === 'split' ? 'default' : 'outline'} onClick={() => updateContent({ layout: 'split' })} className={content.layout === 'split' ? primaryButtonClass : actionButtonClass}>Split</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Text alignment</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={content.textAlign === 'left' ? 'default' : 'outline'} onClick={() => updateContent({ textAlign: 'left' })} className={content.textAlign === 'left' ? primaryButtonClass : actionButtonClass}>Left</Button>
                      <Button size="sm" variant={content.textAlign === 'center' ? 'default' : 'outline'} onClick={() => updateContent({ textAlign: 'center' })} className={content.textAlign === 'center' ? primaryButtonClass : actionButtonClass}>Center</Button>
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
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${content.accentColor === preset.value ? 'border-sky-300 bg-sky-100 text-sky-800 dark:bg-sky-300/15 dark:text-white' : 'border-border/60 bg-white text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-white/85'}`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: preset.hex }} />{preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Typography</Label>
                    <select className="w-full rounded-md border border-border/60 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white" value={content.typography?.headingFamily} onChange={(event) => updateContent({ typography: { ...content.typography!, headingFamily: event.target.value } })}>
                      {WAITLIST_FONT_PRESETS.map((font) => <option key={font.value} value={font.value}>{font.label} (Headings)</option>)}
                    </select>
                    <select className="w-full rounded-md border border-border/60 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white" value={content.typography?.bodyFamily} onChange={(event) => updateContent({ typography: { ...content.typography!, bodyFamily: event.target.value } })}>
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
                          <input type="color" value={(content.colors as any)?.[item.key]} onChange={(event) => updateContent({ colors: { ...content.colors!, [item.key]: event.target.value } })} className="h-9 w-full rounded border border-border/60 bg-white dark:border-white/15 dark:bg-slate-950" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1"><Label className="text-xs">Section spacing: {content.spacing?.sectionPaddingY}px</Label><input type="range" min={36} max={120} value={content.spacing?.sectionPaddingY} onChange={(event) => updateContent({ spacing: { ...content.spacing!, sectionPaddingY: Number(event.target.value) } })} className="w-full" /></div>
                  <div className="space-y-1"><Label className="text-xs">Card radius: {content.spacing?.cardRadius}px</Label><input type="range" min={0} max={32} value={content.spacing?.cardRadius} onChange={(event) => updateContent({ spacing: { ...content.spacing!, cardRadius: Number(event.target.value) } })} className="w-full" /></div>

	                  <div className="space-y-2">
	                    <Label>Sections</Label>
	                    <SortableList
	                      items={(content.sectionOrder?.length ? content.sectionOrder : WAITLIST_SECTION_ORDER).map((id) => ({ id }))}
	                      onReorder={(items) => updateContent({ sectionOrder: items.map((item) => item.id) })}
	                      className="space-y-2"
	                      renderItem={(item) => (
	                        <div className="rounded-md border px-3 py-2 text-sm">
	                          {WAITLIST_SECTION_LABELS[item.id]}
	                        </div>
	                      )}
	                    />
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

                <TabsContent value="form" className={formTabClass}>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200">Form</p>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Craft the signup experience</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Decide what to collect, how the CTA reads, and what the visitor sees after signing up.</p>
                  </div>
                  <div className="space-y-2"><Label>CTA button label</Label><Input value={content.ctaText} onChange={(event) => updateContent({ ctaText: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Email placeholder</Label><Input value={content.emailPlaceholder} onChange={(event) => updateContent({ emailPlaceholder: event.target.value })} /></div>

                  <div className="space-y-2">
                    <Label>Form options</Label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Collect first name</span><input type="checkbox" checked={Boolean(content.collectFirstName)} onChange={(event) => updateContent({ collectFirstName: event.target.checked })} /></label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Show consent checkbox</span><input type="checkbox" checked={Boolean(content.collectConsent)} onChange={(event) => updateContent({ collectConsent: event.target.checked })} /></label>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>Require consent</span><input type="checkbox" checked={Boolean(content.consentRequired)} onChange={(event) => updateContent({ consentRequired: event.target.checked })} /></label>
                    {content.consentRequired ? <p className="text-xs text-slate-500 dark:text-slate-300">Required consent automatically keeps the checkbox visible on the public form.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Custom fields</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        className={actionButtonClass}
                        onClick={() => updateContent({ customFields: [...(content.customFields || []), { id: createWaitlistFieldId(), label: 'Custom question', placeholder: 'Type your answer', type: 'text', required: false, enabled: true }] })}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add field
                      </Button>
                    </div>

                    {(content.customFields?.length || 0) === 0 ? (
                      <p className="text-xs text-slate-500 rounded-md border border-dashed border-border/60 bg-slate-50/80 p-3 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">Add optional fields to capture context like company size, current stack, or role.</p>
                    ) : (
                      <SortableList
                        items={content.customFields || []}
                        onReorder={(items) => updateContent({ customFields: items })}
                        className="space-y-2"
                        renderItem={(field) => (
                          <div className="rounded-md border border-border/60 bg-slate-50/80 p-2 space-y-2 dark:border-white/10 dark:bg-slate-950/60">
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <Input value={field.label} onChange={(event) => updateContent({ customFields: (content.customFields || []).map((item) => item.id === field.id ? { ...item, label: event.target.value } : item) })} placeholder="Field label" />
                              <Button size="icon" variant="ghost" onClick={() => updateContent({ customFields: (content.customFields || []).filter((item) => item.id !== field.id) })}><Trash2 className="w-4 h-4" /></Button>
                            </div>

                            <Input value={field.placeholder} onChange={(event) => updateContent({ customFields: (content.customFields || []).map((item) => item.id === field.id ? { ...item, placeholder: event.target.value } : item) })} placeholder="Placeholder" />

                            <div className="grid grid-cols-2 gap-2">
                              <select className="h-9 rounded-md border border-border/60 bg-white px-2 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white" value={field.type} onChange={(event) => updateContent({ customFields: (content.customFields || []).map((item) => item.id === field.id ? { ...item, type: event.target.value as any } : item) })}>
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
                <TabsContent value="launch" className={launchTabClass}>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200">Launch</p>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Publish with confidence</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Handle the share URL, delivery settings, DNS checks, and go-live readiness from one panel.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Launch checklist</Label>
                    <div className="grid gap-2">
                      {[
                        { title: 'Draft', description: draftId ? 'Draft exists and can be recovered.' : 'Create your first draft to reserve a page record.', complete: Boolean(draftId) },
                        { title: 'Slug', description: slugAvailable === false ? 'Choose another slug before publishing.' : slugDraft || currentSlug ? 'Your page slug is ready.' : 'A slug will be generated automatically if left empty.', complete: slugAvailable !== false },
                        { title: 'Publish', description: status === 'published' ? 'This waitlist is live and shareable.' : waitlistPublishDescription, complete: status === 'published' },
                      ].map((step) => (
                        <div key={step.title} className="rounded-md border border-border/60 bg-slate-50/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-center gap-2">
                            {step.complete ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            <span className="font-medium">{step.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Public slug</Label>
                    <Input value={slugDraft} onChange={(event) => checkSlugAvailability(event.target.value)} placeholder="my-waitlist-page" />
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                      {isCheckingSlug ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {slugAvailable === true ? <Check className="w-3 h-3 text-green-600" /> : null}
                      {slugAvailable === false ? <AlertTriangle className="w-3 h-3 text-red-500" /> : null}
                      {slugAvailable === true ? 'This slug is available and will save with your draft.' : slugAvailable === false ? 'This slug is already taken.' : 'Draft saves and publishing will persist this slug automatically.'}
                    </div>
                  </div>

                  {status === 'published' && liveUrl ? (
                    <div className="rounded-md border p-3 text-sm space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-300">Live public URL</p>
                      <p className="font-mono text-xs break-all">{liveUrl}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className={actionButtonClass} onClick={copyUrl}><Copy className="w-4 h-4 mr-1" />Copy</Button>
                        <Button size="sm" className={primaryButtonClass} asChild><a href={liveUrl} target="_blank" rel="noreferrer"><Eye className="w-4 h-4 mr-1" />Open</a></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border/60 bg-slate-50/80 p-3 text-xs text-slate-500 space-y-1 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
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
                    <select className="w-full rounded-md border border-border/60 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/15 dark:bg-slate-950 dark:text-white" value={content.integrationProvider || 'none'} onChange={(event) => updateContent({ integrationProvider: event.target.value as any })}>
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
                    <p className="text-xs text-slate-500 dark:text-slate-300">This only verifies a sender domain for confirmation emails. Public waitlist pages still use the `/w/slug` URL.</p>
                  </div>

                  <div className="space-y-2"><Label>Sender email</Label><Input value={content.emailSetup?.senderEmail || ''} onChange={(event) => updateContent({ emailSetup: { ...content.emailSetup!, senderEmail: event.target.value } })} placeholder="hello@updates.yourstartup.com" /></div>
                  <div className="space-y-2"><Label>Sender name</Label><Input value={content.emailSetup?.senderName || ''} onChange={(event) => updateContent({ emailSetup: { ...content.emailSetup!, senderName: event.target.value } })} placeholder="Your startup name" /></div>
                  <div className="space-y-2"><Label>Reply-to email</Label><Input value={content.emailSetup?.replyToEmail || ''} onChange={(event) => updateContent({ emailSetup: { ...content.emailSetup!, replyToEmail: event.target.value } })} placeholder="founder@yourstartup.com" /></div>

                  {content.domainSetup?.verificationToken ? (
                    <Card className="border border-dashed border-border/60 bg-slate-50/80 text-slate-950 shadow-none dark:border-white/15 dark:bg-white/5 dark:text-white">
                      <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-950 dark:text-white">DNS setup guide</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-200">
                        <p>Add these DNS records in your domain provider:</p>
                        <div className="rounded border border-border/60 bg-white p-2 font-mono text-slate-900 dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-100">TXT @ ct-waitlist-verification={content.domainSetup.verificationToken}</div>
                        <div className="rounded border border-border/60 bg-white p-2 font-mono text-slate-900 dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-100">TXT @ v=spf1 include:_spf.resend.com ~all</div>
                        <div className="rounded border border-border/60 bg-white p-2 font-mono text-slate-900 dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-100">CNAME ct1._domainkey ct1._domainkey.resend.com</div>
                        <p className="text-slate-500 dark:text-slate-300">After adding DNS records, click Validate DNS. Propagation can take a few minutes.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="rounded-md border border-dashed border-border/60 bg-slate-50/80 p-3 text-xs text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
                      Save your draft first to generate a verification token for DNS setup.
                    </p>
                  )}

                  <div className="rounded-md border border-border/60 p-3 text-xs space-y-2 dark:border-white/10">
                    <div className="flex items-center justify-between"><span>Verification TXT</span>{content.domainSetup?.verificationValid ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-500" />}</div>
                    <div className="flex items-center justify-between"><span>SPF</span>{content.domainSetup?.spfValid ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-500" />}</div>
                    <div className="flex items-center justify-between"><span>DKIM</span>{content.domainSetup?.dkimValid ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-500" />}</div>
                    <p className="text-slate-500 dark:text-slate-300">Status: <strong className="text-slate-950 dark:text-white">{content.domainSetup?.status || 'unconfigured'}</strong></p>
                    {content.domainSetup?.lastCheckedAt ? <p className="text-slate-500 dark:text-slate-300">Last checked: {new Date(content.domainSetup.lastCheckedAt).toLocaleString()}</p> : null}
                  </div>

                  <Button className={`w-full ${actionButtonClass}`} variant="outline" onClick={handleValidateDomain} disabled={isCheckingDns}>{isCheckingDns ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Validate DNS</Button>

                  {!markReadyAt ? (
                    <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700" variant="secondary" onClick={handleMarkAsReady} disabled={!draftId || isMarkingReady || isGuest}>
                      {isMarkingReady ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}Mark as Ready
                    </Button>
                  ) : (
                    <Badge className="w-full justify-center border-green-500/30 bg-green-500/10 text-green-700">Ready on {new Date(markReadyAt).toLocaleDateString()}</Badge>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className={analyticsTabClass}>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200">Analytics</p>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Read the signal</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Watch views, signups, and recent leads without leaving the builder.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded border border-border/60 bg-slate-50/80 p-2 text-center dark:border-white/10 dark:bg-white/5"><Eye className="w-4 h-4 mx-auto text-slate-500 dark:text-slate-300" /><p className="text-xl font-bold text-slate-950 dark:text-white">{viewCount}</p><p className="text-[11px] text-slate-500 dark:text-slate-300">Views</p></div>
                    <div className="rounded border border-border/60 bg-slate-50/80 p-2 text-center dark:border-white/10 dark:bg-white/5"><Users className="w-4 h-4 mx-auto text-indigo-500 dark:text-indigo-300" /><p className="text-xl font-bold text-indigo-700 dark:text-indigo-200">{signupCount}</p><p className="text-[11px] text-slate-500 dark:text-slate-300">Signups</p></div>
                    <div className="rounded border border-border/60 bg-slate-50/80 p-2 text-center dark:border-white/10 dark:bg-white/5"><Sparkles className="w-4 h-4 mx-auto text-green-500 dark:text-green-300" /><p className="text-xl font-bold text-green-700 dark:text-green-200">{conversionRate}</p><p className="text-[11px] text-slate-500 dark:text-slate-300">CVR</p></div>
                  </div>

                  <div className="rounded border border-border/60 bg-slate-50/80 p-3 text-xs space-y-2 dark:border-white/10 dark:bg-white/5">
                    <p className="font-medium">A/B performance</p>
                    <p>Variant A: {variantMetrics.A.views} views / {variantMetrics.A.signups} signups</p>
                    <p>Variant B: {variantMetrics.B.views} views / {variantMetrics.B.signups} signups</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Recent signups</Label>
                      <Button size="sm" variant="outline" className={actionButtonClass} onClick={async () => { if (draftId) await fetchAnalytics(draftId); }} disabled={!draftId}>Refresh</Button>
                    </div>

                    {recentSignups.length === 0 ? (
                      <p className="text-xs text-slate-500 rounded border border-dashed border-border/60 bg-slate-50/80 p-3 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">No signups yet. Publish and share your link.</p>
                    ) : (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {recentSignups.map((signup) => (
                          <div key={signup.id} className="rounded border border-border/60 bg-slate-50/80 p-2 text-xs dark:border-white/10 dark:bg-white/5">
                            <p className="font-mono">{maskEmail(signup.email)}</p>
                            <p className="text-slate-500 dark:text-slate-300">{signup.first_name ? `${signup.first_name} - ` : ''}{new Date(signup.created_at).toLocaleDateString()}</p>
                            {signup.custom_fields && signup.custom_fields.length > 0 ? (
                              <div className="mt-1 text-slate-500 space-y-0.5 dark:text-slate-300">
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

          <section className="relative overflow-auto bg-[radial-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(248,250,252,0.88))] bg-[length:22px_22px,100%_100%] p-4 md:p-8 dark:bg-[radial-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))]">
            <div className="mx-auto max-w-[1180px] space-y-4">
              <div className="flex flex-col gap-3 rounded-[28px] border border-border/60 bg-white/80 px-5 py-4 text-slate-950 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.88))] dark:text-white dark:shadow-[0_18px_60px_rgba(2,6,23,0.28)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200">Preview canvas</p>
                  <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">Review the public page before publishing.</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">This stage mirrors the public waitlist. Switch frames to test how the landing page reads on desktop and mobile.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={previewDevice === 'desktop' ? 'default' : 'outline'} onClick={() => setPreviewDevice('desktop')} className={previewDevice === 'desktop' ? primaryButtonClass : actionButtonClass}>
                    <Monitor className="mr-1 h-4 w-4" />
                    Desktop
                  </Button>
                  <Button size="sm" variant={previewDevice === 'mobile' ? 'default' : 'outline'} onClick={() => setPreviewDevice('mobile')} className={previewDevice === 'mobile' ? primaryButtonClass : actionButtonClass}>
                    <MonitorSmartphone className="mr-1 h-4 w-4" />
                    Mobile
                  </Button>
                </div>
              </div>

              <div className={previewDevice === 'mobile' ? 'mx-auto max-w-[420px]' : ''}>
                <div className="rounded-[34px] border border-border/60 bg-white p-3 shadow-[0_28px_100px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] dark:shadow-[0_28px_100px_rgba(2,6,23,0.4)]">
                  <div className="mb-3 flex items-center justify-between rounded-[24px] border border-border/60 bg-slate-50/90 px-4 py-3 text-slate-950 dark:border-white/10 dark:bg-slate-950/70 dark:text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-950 dark:text-white">{productName.trim() || 'Untitled waitlist'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-300">{previewDevice === 'mobile' ? 'Mobile artboard' : 'Desktop artboard'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-border/60 bg-white text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                      {status === 'published' ? 'Live-ready' : 'Draft preview'}
                    </Badge>
                  </div>
	                  <WaitlistPageTemplate
	                    content={content}
	                    productName={productName || 'Your Product'}
	                    mode="preview"
	                    onContentChange={updateTemplateField}
	                    onImageUpload={handleCanvasImageUpload}
	                    onSectionOrderChange={(sectionOrder) => updateContent({ sectionOrder })}
	                    signupCount={signupCount}
	                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
