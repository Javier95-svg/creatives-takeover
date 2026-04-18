import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { captureEvent } from '@/lib/analytics';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import {
  BIZMAP_STAGES,
  BIZMAP_TOOLS,
  DEFAULT_CURRENT_STAGE,
  getStageIndex,
  getNextStage,
  type BizMapStage,
} from '@/lib/bizmapStages';
import { cn } from '@/lib/utils';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FIRST_LOGIN_THRESHOLD_MS = 5 * 60 * 1000;
const AUTO_DISMISS_MS = 12000;
const DISMISS_STORAGE_KEY = 'ct_welcome_back_dismissed_at';

function getPrimaryToolRoute(stage: BizMapStage): { route: string; name: string } {
  const stageDef = BIZMAP_STAGES.find((s) => s.id === stage);
  const tool = stageDef?.tools[0] ?? BIZMAP_TOOLS.find((t) => t.stage === stage);
  return { route: tool?.route ?? '/dashboard', name: tool?.name ?? 'your current tool' };
}

function getStageName(stage: BizMapStage): string {
  const names: Record<BizMapStage, string> = {
    IDENTITY: 'Identity',
    PROTOTYPE: 'Prototype',
    VALIDATING: 'Validating',
    BUILDING: 'Building',
    LAUNCH: 'Launch',
  };
  return names[stage] ?? stage;
}

interface BannerContent {
  subText: string;
  ctaRoute: string;
}

function buildBannerContent(
  currentStage: BizMapStage,
  lastActiveMs: number,
  completionTimestamps: Record<string, string | null>
): BannerContent {
  const primary = getPrimaryToolRoute(currentStage);
  const stageName = getStageName(currentStage);

  // Check if any stage was completed since last visit
  const completedSinceLastVisit = Object.entries(completionTimestamps).find(([, ts]) => {
    if (!ts) return false;
    return new Date(ts).getTime() > lastActiveMs;
  });

  if (completedSinceLastVisit) {
    // Derive the completed stage name from the key (e.g. "identityCompletedAt" → IDENTITY)
    const keyToStage: Record<string, BizMapStage> = {
      identityCompletedAt: 'IDENTITY',
      prototypeCompletedAt: 'PROTOTYPE',
      validatingCompletedAt: 'VALIDATING',
      buildingCompletedAt: 'BUILDING',
      launchCompletedAt: 'LAUNCH',
    };
    const completedStage = keyToStage[completedSinceLastVisit[0]];
    const completedName = completedStage ? getStageName(completedStage) : stageName;
    const nextStage = completedStage ? getNextStage(completedStage) : null;
    const nextName = nextStage ? getStageName(nextStage) : null;
    const nextRoute = nextStage ? getPrimaryToolRoute(nextStage).route : primary.route;

    return {
      subText: nextName
        ? `You finished ${completedName} since your last visit. Next up: ${nextName}.`
        : `You finished ${completedName} since your last visit. Keep the momentum going.`,
      ctaRoute: nextRoute,
    };
  }

  // Default: in-progress or no activity
  return {
    subText: `You're at ${stageName}. Your next step is ${primary.name}.`,
    ctaRoute: primary.route,
  };
}

export function WelcomeBackBanner() {
  const { user } = useAuth();
  const { currentStage, progress } = useBizMapProgress();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [content, setContent] = useState<BannerContent | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback((manual: boolean) => {
    if (manual) {
      localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
      captureEvent('journey_welcome_back_dismissed', { user_id: user?.id });
    }
    setFading(true);
    setTimeout(() => setVisible(false), 700);
  }, [user?.id]);

  const startAutoTimer = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => dismiss(false), AUTO_DISMISS_MS);
  }, [dismiss]);

  const pauseAutoTimer = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }, []);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, last_active_at, last_activity_at, last_seen_at, created_at')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Resolve last active timestamp
      const rawLastActive =
        profile.last_active_at ??
        profile.last_activity_at ??
        profile.last_seen_at;

      // Detect first-ever login: no prior activity recorded, and account is fresh
      const accountAgeMs = Date.now() - new Date(profile.created_at).getTime();
      if (!rawLastActive && accountAgeMs < FIRST_LOGIN_THRESHOLD_MS) return;

      // If no timestamp at all, nothing to compare
      if (!rawLastActive) return;

      const lastActiveMs = new Date(rawLastActive).getTime();
      const gapMs = Date.now() - lastActiveMs;

      // Only show if away for 24+ hours
      if (gapMs < TWENTY_FOUR_HOURS_MS) return;

      // Check dismiss suppression
      const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < TWENTY_FOUR_HOURS_MS) return;

      const name = profile.full_name?.split(' ')[0]?.trim() || null;
      const stage = currentStage ?? DEFAULT_CURRENT_STAGE;

      const completionTimestamps: Record<string, string | null> = {
        identityCompletedAt: progress?.identity_completed_at ?? null,
        prototypeCompletedAt: progress?.prototype_completed_at ?? null,
        validatingCompletedAt: progress?.validating_completed_at ?? null,
        buildingCompletedAt: progress?.building_completed_at ?? null,
        launchCompletedAt: progress?.launch_completed_at ?? null,
      };

      setFirstName(name);
      setContent(buildBannerContent(stage, lastActiveMs, completionTimestamps));
      setVisible(true);

      captureEvent('journey_welcome_back_shown', {
        user_id: user.id,
        days_away: Math.floor(gapMs / TWENTY_FOUR_HOURS_MS),
        current_stage: stage,
      });
    };

    void init();
  }, [
    user,
    currentStage,
    progress?.identity_completed_at,
    progress?.prototype_completed_at,
    progress?.validating_completed_at,
    progress?.building_completed_at,
    progress?.launch_completed_at,
  ]);

  // Start auto-dismiss timer when banner becomes visible
  useEffect(() => {
    if (visible && !fading) {
      startAutoTimer();
    }
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [visible, fading, startAutoTimer]);

  if (!visible || !content) return null;

  const stage = currentStage ?? DEFAULT_CURRENT_STAGE;
  const stageNumber = getStageIndex(stage) + 1;
  const totalStages = 5;
  const heading = firstName ? `Welcome back, ${firstName}.` : 'Welcome back.';

  const handleCtaClick = () => {
    captureEvent('journey_welcome_back_cta_clicked', {
      user_id: user?.id,
      cta_route: content.ctaRoute,
      current_stage: stage,
    });
  };

  return (
    <div
      className={cn(
        'relative rounded-[1.75rem] border border-primary/25 bg-primary/[0.07] px-5 py-5 shadow-sm backdrop-blur-sm transition-opacity duration-700',
        fading ? 'opacity-0' : 'opacity-100'
      )}
      onMouseEnter={pauseAutoTimer}
      onMouseLeave={startAutoTimer}
    >
      <button
        onClick={() => dismiss(true)}
        className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss welcome back banner"
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 pr-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
              Welcome back
            </p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Stage {stageNumber} of {totalStages}
            </span>
          </div>
          <p className="text-lg font-semibold">{heading}</p>
          <p className="text-sm text-muted-foreground max-w-md">{content.subText}</p>
        </div>

        <Link
          to={content.ctaRoute}
          onClick={handleCtaClick}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors self-start sm:self-auto"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
