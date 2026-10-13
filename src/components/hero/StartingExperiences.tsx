import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCTAAttribution } from '@/hooks/useCTAAttribution';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { classifyHeroInput, trackHeroInputFocused, trackHeroInputSubmitted } from '@/lib/heroFunnel';
import { captureEvent } from '@/lib/analytics';
import { HERO_MODE_ACCOUNT_TYPE } from '@/lib/heroFunnelRules';
import { rememberIntendedAccountType } from '@/lib/intendedAccountType';
import { rememberToolHandoff } from '@/lib/toolHandoff';
import { readStartingExperience, saveStartingExperience, STARTING_CARDS, STARTING_EXPERIENCE_VERSION, type StartingExperience, type StartingMode } from '@/lib/startingExperience';

const IdeaResult = lazy(() => import('./HeroResultIsland'));
const ProductResult = lazy(() => import('./ProductStoryResult'));

export default function StartingExperiences() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { set: setAttribution } = useCTAAttribution();
  const [initial] = useState(() => {
    const token = new URLSearchParams(location.search).get('resume');
    return token ? { mode: 'idea' as const, description: '', resumeToken: token, runId: Date.now(), savedAt: Date.now() } : readStartingExperience();
  });
  const [run, setRun] = useState<StartingExperience | null>(initial);
  const [restoring, setRestoring] = useState(Boolean(initial));
  const [values, setValues] = useState({ idea: initial?.mode === 'idea' ? initial.description : '', product: initial?.mode === 'product' ? initial.description : '' });
  const [errors, setErrors] = useState<Partial<Record<StartingMode, string>>>({});
  const [busy, setBusy] = useState(false);
  const busyMode = useRef<StartingMode | null>(null);
  const inputRefs = useRef<Partial<Record<StartingMode, HTMLTextAreaElement | null>>>({});
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
    const description = values[mode].trim();
    if (description.length < 3) {
      setErrors(previous => ({ ...previous, [mode]: 'A rough sentence is enough. Describe what you have in mind.' }));
      inputRefs.current[mode]?.focus();
      return;
    }
    const next = { mode, description, runId: Math.max(Date.now(), (run?.runId ?? 0) + 1), savedAt: Date.now() };
    busyMode.current = mode;
    setBusy(true);
    setRestoring(false);
    setRun(next);
    saveStartingExperience(next);
    rememberIntendedAccountType(HERO_MODE_ACCOUNT_TYPE[mode]);
    rememberToolHandoff({ mode, tool: mode === 'idea' ? 'icp_builder' : 'demo_studio', seed: description });
    setAttribution(mode === 'idea' ? 'hero_icp_builder' : 'hero_demo_try', location.pathname);
    const classification = classifyHeroInput(description, mode);
    trackHeroInputSubmitted({ char_count: description.length, has_url: classification.hasUrl, routed_to: classification.route, source: 'homepage_hero', mode });
    captureEvent('starting_experience_submitted', { mode, source: 'homepage_hero', experience_version: STARTING_EXPERIENCE_VERSION,
      output_kind: mode === 'idea' ? 'customer_decision_brief' : 'demo_story', char_count: description.length });
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
    <section id="get-started" className="ct-start" aria-labelledby="starting-heading">
      <h2 id="starting-heading">What are you working on?</h2>
      <p className="ct-start__intro">One sentence to start. See your result before creating an account.</p>
      <div className="ct-start__cards">
        {(['idea', 'product'] as const).map(mode => {
          const config = STARTING_CARDS[mode];
          return <form key={mode} className={`ct-start__card${run?.mode === mode ? ' is-selected' : ''}`} onSubmit={event => { event.preventDefault(); submit(mode); }}>
            <h3>{config.title}</h3>
            <p className="ct-start__challenge">{config.challenge}</p>
            <label htmlFor={`start-${mode}`}>{config.label}</label>
            <textarea id={`start-${mode}`} ref={el => { inputRefs.current[mode] = el; }} rows={2} maxLength={5000}
              data-ph-no-capture value={values[mode]} placeholder={config.example}
              aria-describedby={`start-${mode}-help${errors[mode] ? ` start-${mode}-error` : ''}`}
              aria-invalid={Boolean(errors[mode])} onFocus={trackHeroInputFocused}
              onChange={event => { setValues(previous => ({ ...previous, [mode]: event.target.value })); setErrors(previous => ({ ...previous, [mode]: undefined })); }}
              onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(mode); } }} />
            <p id={`start-${mode}-help`} className="ct-start__output">{config.output}</p>
            {errors[mode] ? <p id={`start-${mode}-error`} role="alert" className="ct-start__error">{errors[mode]}</p> : null}
            <button type="submit" className="ct-hero__cta" disabled={busy && run?.mode === mode}>
              {busy && run?.mode === mode ? 'Working…' : config.cta}<span aria-hidden="true"> →</span>
            </button>
          </form>;
        })}
      </div>
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
      <Link className="ct-start__direct" to="/signup">Create an account directly</Link>
    </section>
  );
}
