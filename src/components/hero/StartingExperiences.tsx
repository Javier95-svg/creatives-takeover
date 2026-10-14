import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCTAAttribution } from '@/hooks/useCTAAttribution';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { classifyHeroInput, trackHeroInputFocused, trackHeroInputSubmitted } from '@/lib/heroFunnel';
import { captureEvent } from '@/lib/analytics';
import { DEFAULT_HERO_MODE, HERO_MODE_ACCOUNT_TYPE } from '@/lib/heroFunnelRules';
import HeroIdeaInput, { type HeroIdeaInputHandle } from './HeroIdeaInput';
import { rememberIntendedAccountType } from '@/lib/intendedAccountType';
import { rememberToolHandoff } from '@/lib/toolHandoff';
import { buildIcpSeedReturnPath, persistIcpSeed } from '@/lib/icpSeed';
import { createEmptyIcpBuilderSession, persistIcpBuilderSession } from '@/lib/icpBuilderSession';
import { readStartingExperience, saveStartingExperience, STARTING_EXPERIENCE_VERSION, type StartingExperience, type StartingMode } from '@/lib/startingExperience';

const IdeaResult = lazy(() => import('./HeroResultIsland'));
const ProductResult = lazy(() => import('./ProductStoryResult'));

export default function StartingExperiences() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { set: setAttribution } = useCTAAttribution();
  const [initial] = useState(() => {
    const token = new URLSearchParams(location.search).get('resume');
    return token ? { mode: 'idea' as const, description: '', resumeToken: token, runId: Date.now(), savedAt: Date.now() } : readStartingExperience();
  });
  // Old compact-result links remain resumable; new Idea starts use ICP Builder.
  const [run, setRun] = useState<StartingExperience | null>(() =>
    initial?.mode === 'product' || new URLSearchParams(location.search).has('resume') ? initial : null);
  const [restoring, setRestoring] = useState(Boolean(initial));
  const [mode, setMode] = useState<StartingMode>(initial?.mode ?? DEFAULT_HERO_MODE);
  const [value, setValue] = useState(initial?.description ?? '');
  const [busy, setBusy] = useState(false);
  const busyMode = useRef<StartingMode | null>(null);
  const inputRef = useRef<HeroIdeaInputHandle>(null);
  const entryTracked = useRef(false);

  useEffect(() => {
    const element = document.getElementById('get-started');
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || entryTracked.current) return;
      entryTracked.current = true;
      captureEvent('starting_experience_viewed', { experience_version: STARTING_EXPERIENCE_VERSION, source: 'homepage_hero', modes: 'idea,product' });
    }, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function submit(mode: StartingMode) {
    if (busyMode.current === mode) return;
    const description = value.trim();
    if (description.length < 3) {
      inputRef.current?.focus();
      return;
    }
    const next = { mode, description, runId: Math.max(Date.now(), (run?.runId ?? 0) + 1), savedAt: Date.now() };
    saveStartingExperience(next);
    rememberIntendedAccountType(HERO_MODE_ACCOUNT_TYPE[mode]);
    rememberToolHandoff({ mode, tool: mode === 'idea' ? 'icp_builder' : 'demo_studio', seed: description });
    setAttribution(mode === 'idea' ? 'hero_icp_builder' : 'hero_demo_try', location.pathname);
    const classification = classifyHeroInput(description, mode);
    trackHeroInputSubmitted({ char_count: description.length, has_url: classification.hasUrl, routed_to: classification.route, source: 'homepage_hero', mode });
    captureEvent('starting_experience_submitted', { mode, source: 'homepage_hero', experience_version: STARTING_EXPERIENCE_VERSION,
      output_kind: mode === 'idea' ? 'customer_decision_brief' : 'demo_story', char_count: description.length });
    if (mode === 'idea') {
      // Restore the established free analysis flow, including its score and
      // ICP draft UI. A new submission must not reopen another idea's draft.
      persistIcpBuilderSession({ ...createEmptyIcpBuilderSession(), ownerUserId: user?.id ?? null,
        mode: 'fast', currentScreen: 'fast_input' });
      persistIcpSeed(description);
      navigate(buildIcpSeedReturnPath(description));
      return;
    }
    busyMode.current = mode;
    setBusy(true);
    setRestoring(false);
    setRun(next);
    requestAnimationFrame(() => document.getElementById('starting-result')?.scrollIntoView({
      block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    }));
  }

  function artifactReady(resumeToken: string) {
    if (!run) return;
    // Keep props stable during a generation run; persistence must not remount it.
    saveStartingExperience({ ...run, resumeToken });
  }

  function busyChanged(value: boolean) {
    busyMode.current = value ? run?.mode ?? null : null;
    setBusy(value);
  }

  return (
    <div id="get-started" className="ct-start ct-start--chat" aria-label="Start with your idea or product">
      <HeroIdeaInput ref={inputRef} value={value} onChange={setValue} mode={mode} onModeChange={setMode}
        onSubmit={() => submit(mode)} onFirstFocus={trackHeroInputFocused} busy={busy} />
      {run ? <div id="starting-result" className="ct-start__result" key={run.runId} aria-label={run.mode === 'idea' ? 'Your idea brief' : 'Your demo story'}>
        <RouteErrorBoundary routeName="Starting experience">
          <Suspense fallback={<p role="status" className="ct-start__intro">Preparing your result…</p>}>
            {run.mode === 'idea'
              ? <IdeaResult description={run.description} runId={run.runId} resumeToken={run.resumeToken} isAuthenticated={isAuthenticated}
                  onRetry={() => { busyMode.current = null; submit('idea'); }} onBusyChange={busyChanged} onArtifactReady={ref => artifactReady(ref.resumeToken)} />
              : <ProductResult description={run.description} runId={run.runId} resumeToken={run.resumeToken} restore={restoring}
                  onBusyChange={busyChanged} onArtifactReady={ref => artifactReady(ref.resumeToken)} />}
          </Suspense>
        </RouteErrorBoundary>
      </div> : null}
    </div>
  );
}
