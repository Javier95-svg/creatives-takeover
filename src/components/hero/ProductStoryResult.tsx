import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SoftGateModal from '@/components/auth/SoftGateModal';
import { useAuth } from '@/contexts/AuthContext';
import { captureEvent } from '@/lib/analytics';
import { trackFirstOutputGenerated, trackOutputGenerationFailed, trackSignupPromptShown } from '@/lib/heroFunnel';
import { persistOutputSignupContext } from '@/lib/outputSignupContext';
import { readStartingExperience, saveStartingExperience, STARTING_EXPERIENCE_VERSION } from '@/lib/startingExperience';
import { markFirstArtifactCreated } from '@/lib/retentionSystem';
import { buildDemoStoryResumePath, claimDemoStoryArtifact, createDemoStoryArtifact, demoStoryText, generateDemoStory,
  loadDemoStoryArtifact, persistDemoStory, readDemoStory, type DemoStoryDraftV1, type DemoStoryRef } from '@/lib/demoStudio/story';

interface Props {
  description?: string;
  runId: number;
  resumeToken?: string;
  restore?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onArtifactReady?: (ref: DemoStoryRef) => void;
  /** Auth returns save directly, without another visitor click. */
  claimOnAuth?: boolean;
}

export default function ProductStoryResult({ description = '', runId, resumeToken, restore = false,
  onBusyChange, onArtifactReady, claimOnAuth = false }: Props) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DemoStoryDraftV1 | null>(null);
  const [ref, setRef] = useState<DemoStoryRef | null>(null);
  const [generating, setGenerating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState(false);
  const callbacks = useRef({ onBusyChange, onArtifactReady });
  callbacks.current = { onBusyChange, onArtifactReady };
  const alive = useRef(true);
  const savingRef = useRef(false);
  const autoClaimed = useRef(false);
  const generatedAt = useRef(Date.now());
  const outputId = useRef(`story-${runId}`);
  const outputTracked = useRef(false);
  const latencyMs = useRef(0);
  const generation = useRef<{ key: string; promise: Promise<DemoStoryDraftV1> } | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    setGenerating(true);
    setError(null);
    callbacks.current.onBusyChange?.(true);
    async function run() {
      try {
        const cached = restore && !resumeToken ? readDemoStory(description) : null;
        const key = `${runId}:${retry}:${description}`;
        if (!resumeToken && !cached && generation.current?.key !== key) {
          // StrictMode replays effects; share the request rather than charging twice.
          generation.current = { key, promise: generateDemoStory(description) };
        }
        const result = resumeToken ? await loadDemoStoryArtifact(resumeToken)
          : cached ?? { draft: await generation.current!.promise };
        if (cancelled) return;
        setDraft(result.draft);
        setRef(result.ref ?? null);
        persistDemoStory(result.draft, result.ref);
        if (result.ref) callbacks.current.onArtifactReady?.(result.ref);
        generatedAt.current = Date.now();
        latencyMs.current = Date.now() - startedAt;
      } catch (failure) {
        if (cancelled) return;
        setError(failure instanceof Error ? failure.message : 'The story did not finish. Please retry.');
        trackOutputGenerationFailed({ route: 'demo', source: 'hero-product-story', generation_run_id: String(runId), failure_stage: 'demo', error_type: 'story_generation' });
      } finally {
        if (!cancelled) { setGenerating(false); callbacks.current.onBusyChange?.(false); }
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [description, runId, resumeToken, restore, retry]);

  useEffect(() => {
    if (!draft) return;
    if (!outputTracked.current) {
      outputTracked.current = true;
      captureEvent('starting_experience_result_viewed', { mode: 'product', source: 'hero-product-story',
        experience_version: STARTING_EXPERIENCE_VERSION, output_kind: 'demo_story', latency_ms: latencyMs.current });
    }
    // Canonical output fires after the result is committed to the screen.
    trackFirstOutputGenerated({ route: 'demo', tool: 'demo_studio', source: 'hero-product-story',
      generation_run_id: String(runId), anonymous_artifact_id: outputId.current,
      latency_ms: latencyMs.current, is_anonymous: !user, mode: 'product', output_kind: 'demo_story', experience_version: STARTING_EXPERIENCE_VERSION });
  }, [draft, runId, user]);

  async function save() {
    if (!draft || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const stored = ref ?? await createDemoStoryArtifact(draft);
      if (!alive.current) return;
      setRef(stored);
      persistDemoStory(draft, stored);
      callbacks.current.onArtifactReady?.(stored);
      if (user) {
        const result = await claimDemoStoryArtifact(stored.resumeToken);
        if (!alive.current) return;
        const resumeUrl = `/demo-studio/projects/${result.projectId}/brief`;
        // SQL already records first value atomically; retention bookkeeping is best effort.
        void markFirstArtifactCreated({ userId: user.id, artifactType: 'demo_studio_draft', artifactId: result.projectId,
          label: draft.productName, resumeUrl, source: 'hero-product-story' }).catch(() => {});
        captureEvent('starting_experience_artifact_saved', { mode: 'product', output_kind: 'demo_story',
          experience_version: STARTING_EXPERIENCE_VERSION, source: 'hero-product-story', artifact_id: result.projectId });
        navigate(`${resumeUrl}?source=starting-experience`, { replace: true });
      } else {
        persistOutputSignupContext({ source: 'hero-product-story', outputRoute: 'demo', anonymousArtifactId: stored.artifactId,
          outputGeneratedAt: generatedAt.current, mode: 'product', experienceVersion: STARTING_EXPERIENCE_VERSION, outputKind: 'demo_story' });
        trackSignupPromptShown({ trigger: 'post_output', has_output: true, route: 'demo', source: 'hero-product-story', anonymous_artifact_id: stored.artifactId });
        setSignupOpen(true);
      }
    } catch (failure) {
      if (alive.current) setError(failure instanceof Error ? failure.message : 'Could not save. Your story is still here; please retry.');
    } finally {
      savingRef.current = false;
      if (alive.current) setSaving(false);
    }
  }

  useEffect(() => {
    if (!claimOnAuth || authLoading || !user || !draft || autoClaimed.current) return;
    autoClaimed.current = true;
    void save();
  // One automatic attempt; an error leaves a manual save retry with the result visible.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimOnAuth, authLoading, user, draft]);

  function edit(next: DemoStoryDraftV1) {
    setDraft(next);
    setRef(null);
    persistDemoStory(next);
    const starting = readStartingExperience();
    if (starting?.mode === 'product' && starting.description === next.description) {
      saveStartingExperience({ ...starting, resumeToken: undefined });
    }
    // A corrected story gets a fresh token on save; never claim stale server copy.
  }

  async function copy() {
    if (!draft) return;
    try { await navigator.clipboard.writeText(demoStoryText(draft)); setCopied(true); }
    catch { setError('Could not copy automatically. You can select and copy the story below.'); }
  }

  return <article className="ct-story" aria-labelledby="demo-story-heading">
    {generating ? <p role="status" aria-live="polite">Writing your pitch and demo story…</p> : null}
    {draft ? <>
      <p className="ct-story__kicker">Your demo story</p>
      <h3 id="demo-story-heading">{draft.productName}</h3>
      <p className="ct-story__pitch">{draft.pitch}</p>
      <p className="ct-story__assumption">The customer and problem below are starting assumptions based on your description. Confirm them with real customers.</p>
      <dl className="ct-story__context"><div><dt>Likely customer</dt><dd>{draft.brief.audience}</dd></div>
        <div><dt>Problem to lead with</dt><dd>{draft.brief.problem}</dd></div></dl>
      <ol className="ct-story__steps">{draft.steps.map((step, index) => <li key={index}>
        <span className="ct-story__kicker">{['Problem', 'Product action', 'Outcome'][index]}</span>
        <h4>{step.title}</h4><p>{step.caption}</p><p className="ct-story__script">{step.speaker_notes}</p>
      </li>)}</ol>
      <p className="ct-story__assumption">This is a script for your demo. Add real product screens when you’re ready to make it interactive.</p>
      <details className="ct-story__edit"><summary>Edit your story (optional)</summary>
        <label>Customer<textarea aria-label="Customer" data-ph-no-capture maxLength={600} disabled={saving} value={draft.brief.audience}
          onChange={e => edit({ ...draft, brief: { ...draft.brief, audience: e.target.value } })} /></label>
        <label>Problem<textarea aria-label="Problem" data-ph-no-capture maxLength={600} disabled={saving} value={draft.brief.problem}
          onChange={e => edit({ ...draft, brief: { ...draft.brief, problem: e.target.value } })} /></label>
        <label>Pitch<textarea aria-label="Pitch" data-ph-no-capture maxLength={1000} disabled={saving} value={draft.pitch} onChange={e => edit({ ...draft, pitch: e.target.value })} /></label>
        {draft.steps.map((step, index) => <label key={index}>Step {index + 1} script
          <textarea aria-label={`Step ${index + 1} script`} data-ph-no-capture maxLength={700} disabled={saving} value={step.speaker_notes}
            onChange={e => edit({ ...draft, steps: draft.steps.map((item, position) => position === index ? { ...item, speaker_notes: e.target.value } : item) })} />
        </label>)}
      </details>
      <div className="ct-story__actions"><button className="ct-hero__cta" disabled={saving} onClick={() => void save()} type="button">
        {saving ? 'Saving…' : 'Save my demo story'}</button>
        <button type="button" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy story'}</button></div>
      {!user ? <p className="ct-story__assumption">Create a free account to save this story and continue in Demo Studio.</p> : null}
    </> : null}
    {error ? <div role="alert" className="ct-start__error"><p>{error}</p>
      {!draft && !generating ? <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button> : null}</div> : null}
    {ref ? <SoftGateModal open={signupOpen} onOpenChange={setSignupOpen} trigger="hero-product-story" title="Save your demo story"
      description="Create a free account to keep this story and add product screens when you’re ready."
      returnPathOverride={buildDemoStoryResumePath(ref.resumeToken)} signupSource="hero-product-story"
      entryId="hero_demo_try" activationTool="demo_studio" journeyTool="demo_studio" artifactType="demo_story" /> : null}
  </article>;
}
