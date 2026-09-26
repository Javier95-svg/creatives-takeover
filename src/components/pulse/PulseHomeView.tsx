import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, ChevronDown, Plus, Sparkles, Target, GraduationCap, Users, LayoutDashboard, Layers, FlaskConical, Rocket, Megaphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { enterWorkspaceRoute, WORKSPACE_ROUTES } from '@/lib/workspaceNavigation';
import { BIZMAP_STAGE_ORDER } from '@/lib/bizmapStageOrder';
import type { PulseHomeConcept, PulseHomeMessage, PulseHomePriority } from '@/lib/pulseHome';
import type { PersonaChip, PersonaHome } from '@/lib/personaHome';
import './pulse-home.css';

export interface PulseHomeViewProps {
  concept: PulseHomeConcept;
  name?: string;
  stage?: string;
  /** The founder's own name for what they are building. */
  projectName?: string | null;
  /** 1 to 7, the Startup Development Cycle stage the onboarding quiz assigned. */
  assignedStage?: number | null;
  priorities?: PulseHomePriority[];
  messages?: PulseHomeMessage[];
  loading?: boolean;
  streaming?: boolean;
  unavailable?: string;
  contextNotice?: string;
  error?: string;
  onSend?: (text: string) => void;
  onNew?: () => void;
  onRetry?: () => void;
  /** Set for mentors, marketplace members and investors. Absent means the
      founder home, rendered exactly as it always has been. */
  persona?: PersonaHome | null;
  /** Counts already resolved, shown beside the type chip. */
  personaChips?: readonly PersonaChip[];
  personaInterest?: string | null;
  /** Where priority links, action cards and shortcut chips lead. Defaults to a
      real navigation; the anonymous tour at /demo swaps panels instead. */
  navigate?: (path: string) => void;
}

export function PulseHomeView({ concept, name, stage, projectName, assignedStage, priorities = [], messages = [], loading, streaming, unavailable, contextNotice, error, onSend, onNew, onRetry, navigate = enterWorkspaceRoute, persona = null, personaChips = [], personaInterest = null }: PulseHomeViewProps) {
  const [input, setInput] = useState('');
  const [headline, setHeadline] = useState(0);
  const [showPriorities, setShowPriorities] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const end = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const active = messages.length > 0;
  const responding = streaming && messages[messages.length - 1]?.role === 'assistant' && Boolean(messages[messages.length - 1]?.content);
  const composerStatus = unavailable ? 'Preview · not connected' : loading ? 'Loading workspace…' : streaming ? responding ? 'Responding…' : 'Thinking…' : error ? 'Response interrupted · retry above' : contextNotice ? 'Ready · limited saved context' : 'Ready · using your workspace context';
  useEffect(() => {
    const field = textarea.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 180)}px`;
  }, [input]);
  const stageHeadlines: Record<string, string> = {
    IDENTITY: 'Let’s find your customer', PROTOTYPE: 'Bring your idea into focus',
    VALIDATING: 'Turn assumptions into evidence', BUILDING: 'Build what matters next',
    LAUNCH: 'Find your first customers', TRACTION: 'Build on what is working',
    FUNDRAISING: 'Prepare your next funding step',
  };
  const stageHeadline = stage && stageHeadlines[stage.toUpperCase()];
  const trimmedProjectName = projectName?.trim() || '';
  // The quiz assigns 1 to 7 against the Startup Development Cycle. Fall back to
  // the journey stage when the quiz has not run, and show neither rather than a
  // wrong one if the number is outside the cycle.
  const stageFromQuiz = typeof assignedStage === 'number' && assignedStage >= 1 && assignedStage <= BIZMAP_STAGE_ORDER.length
    ? { number: assignedStage, key: BIZMAP_STAGE_ORDER[assignedStage - 1] }
    : null;
  const stageFromJourney = !stageFromQuiz && stage
    ? (() => {
        const index = BIZMAP_STAGE_ORDER.indexOf(stage.toUpperCase() as (typeof BIZMAP_STAGE_ORDER)[number]);
        return index >= 0 ? { number: index + 1, key: BIZMAP_STAGE_ORDER[index] } : null;
      })()
    : null;
  const resolvedStage = stageFromQuiz ?? stageFromJourney;
  const stageBadge = resolvedStage
    ? `Stage ${resolvedStage.number} · ${resolvedStage.key.charAt(0)}${resolvedStage.key.slice(1).toLowerCase()}`
    : '';
  const headings = persona
    ? [persona.headline, persona.headline, persona.headline]
    : concept === 'guided-journey'
    ? [[name ? `Back at it, ${name}.` : 'Your idea has potential.', 'Let’s find its path.'], ['One clear direction.', 'Your next chapter.'], ['Think clearly.', 'Move confidently.']]
    : concept === 'command-center'
      ? [['Your next move.', 'Starts here.'], ['Less busywork.', 'More breakthroughs.'], [name ? `Make it happen, ${name}.` : 'Make it happen.', 'One step at a time.']]
      : [['Less guesswork.', 'More momentum.'], ['Big ambitions.', 'Clear next steps.'], ['Think it through.', 'Make it real.']];
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (active || input || focused || reducedMotion) return;
    const timer = window.setInterval(() => setHeadline(value => (value + 1) % 3), 7000);
    return () => window.clearInterval(timer);
  }, [active, input, focused, reducedMotion]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [messages]);
  const send = (text: string) => {
    if (!text.trim() || streaming || loading || unavailable || !onSend) return;
    onSend(text.trim()); setInput(''); setShowPriorities(false);
  };
  const shortcuts = persona
    ? persona.shortcuts.map(shortcut => ({ label: shortcut.label, route: shortcut.route, icon: ArrowRight }))
    : [
    { label: 'What should I focus next?', route: '/dashboard', icon: LayoutDashboard },
    { label: 'Find me a mentor', route: '/mentorship', icon: GraduationCap },
    { label: 'Find me a co-founder', route: '/co-founder/create', icon: Users },
    { label: 'Help me define my customer', route: WORKSPACE_ROUTES['ICP Builder'], icon: Target },
    { label: 'Help me create a demo', route: WORKSPACE_ROUTES['Demo Studio'], icon: Layers },
    { label: 'Help me validate my idea', route: WORKSPACE_ROUTES['PMF Lab'], icon: FlaskConical },
    { label: 'Help me build my MVP', route: WORKSPACE_ROUTES['MVP Builder'], icon: Rocket },
    { label: 'Help me plan my launch', route: WORKSPACE_ROUTES['GTM Strategist'], icon: Megaphone },
  ];

  return <section aria-label="Pulse home" data-telemetry-private className={cn('ph-no-capture ph-mask pulse-home relative isolate flex min-h-0 flex-1 flex-col overflow-hidden', `pulse-home--${concept}`, active && 'pulse-home--chat')}>
    <div className="pulse-home-wallpaper pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true"><div className="pulse-home-glow pulse-home-glow--blue" /><div className="pulse-home-glow pulse-home-glow--teal" /><div className="pulse-home-glow pulse-home-glow--accent" /><div className="pulse-home-grid" /></div>
    <div className="pulse-home-content">
    <div className="pulse-home-scroll min-h-0 flex-1 overflow-y-auto px-6 lg:px-12">
      <div className={cn('pulse-home-column mx-auto w-full max-w-3xl', active ? 'pt-6' : 'pt-16 lg:pt-20')}>
        {active && <div className="mb-6 flex justify-end">
          <button type="button" onClick={onNew} disabled={streaming || loading} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><Plus className="h-3.5 w-3.5" />New conversation</button>
        </div>}
        <header className={cn('pulse-home-hero', !active && concept !== 'command-center' && 'text-center')}>
          {persona && !active && <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground">{persona.label}</span>
            {personaInterest && <a href="/account" onClick={event => { event.preventDefault(); navigate('/account'); }} className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-foreground hover:border-primary/50" title="Edit your profile focus">Focus: {personaInterest}</a>}
            {personaChips.map(chip => <span key={chip.key} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{chip.count} {chip.label}</span>)}
          </div>}
          {!persona && concept === 'guided-journey' && !active && (trimmedProjectName || stageBadge) && <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {trimmedProjectName && <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground">{trimmedProjectName}</span>}
            {stageBadge && <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{stageBadge}</span>}
          </div>}
          <h1 key={active ? 'active' : headline} className={cn('font-space-grotesk font-semibold tracking-tight text-foreground', active ? 'text-xl' : 'pulse-home-headline')}>{active ? 'Let’s work through it.' : <><span className="block">{headings[headline][0]}</span><span className="pulse-home-headline-gradient block">{headings[headline][1]}</span></>}</h1>
        </header>

        <div className={cn('pulse-home-priorities', active ? 'my-4' : 'mx-auto my-8 max-w-xl')}>
          {active ? <button type="button" aria-expanded={showPriorities} onClick={() => setShowPriorities(value => !value)} className="inline-flex items-center gap-2 rounded-lg py-1 text-xs text-muted-foreground hover:text-foreground">Today’s priorities <ChevronDown className={cn('h-3 w-3 transition-transform', showPriorities && 'rotate-180')} /></button> : priorities.length > 0 && <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today’s focus</h2>}
          {(!active || showPriorities) && (loading ? <p role="status" className="text-sm text-muted-foreground">Loading your workspace…</p> : priorities.length ? <ul className="space-y-2">{priorities.map(item => <li key={item.id} className="flex items-start gap-3 text-sm"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" /><a href={item.route} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); navigate(item.route); } }} className="group flex flex-1 items-center justify-between gap-2 rounded-md text-foreground hover:text-primary"><span>{item.title}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" /></a></li>)}</ul> : <div className="text-sm text-muted-foreground"><p>{unavailable ? 'Your dashboard priorities will appear here after sign-in.' : contextNotice ? 'Your priorities are temporarily unavailable.' : persona ? persona.emptyFocus : 'Nothing on your list yet. Let’s find a useful first step.'}</p><button type="button" disabled={Boolean(unavailable) || loading} onClick={() => send('Help me plan my next step')} className="mt-2 text-primary hover:underline disabled:opacity-50">Plan my next step <span aria-hidden="true">↗</span></button></div>)}
        </div>

        {active && <div role="log" aria-label="Conversation with Pulse" aria-live="polite" aria-busy={streaming} className="space-y-6 pb-6">{messages.map(message => <article key={message.id} className={cn('text-sm leading-7', message.role === 'user' ? 'ml-auto max-w-xl rounded-2xl bg-muted/70 px-5 py-3' : 'pr-2')}>
          {message.role === 'assistant' && <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" />Pulse</p>}
          <ReactMarkdown components={{ a: ({ children }) => <span>{children}</span>, img: () => null, p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p> }}>{message.content || (streaming ? 'Thinking through your next step…' : '')}</ReactMarkdown>
          {message.actions?.length ? <div className="mt-4 space-y-2">{message.actions.map(action => <a key={action.id} href={action.route} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); navigate(action.route); } }} className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-3 transition-colors hover:border-primary/60 hover:bg-primary/5">
            {action.image && <img src={action.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />}
            <span className="min-w-0 flex-1"><span className="block font-medium text-foreground">{action.title}</span><span className="block text-xs leading-5 text-muted-foreground">{action.reason}</span><span className="text-xs font-medium text-primary">{action.kind === 'mentor' ? 'View mentor' : action.kind === 'browse' ? 'Browse mentors' : `Open ${action.title}`}</span></span><ArrowRight className="h-4 w-4 text-primary" />
          </a>)}</div> : null}
        </article>)}<div ref={end} /></div>}
      </div>
    </div>

    <div className={cn('pulse-home-compose shrink-0 px-6 pb-6 lg:px-12', active && 'border-t border-border/40 bg-background/80 pt-4 backdrop-blur')}>
      <div className="mx-auto w-full max-w-3xl">
        {error && <div role="alert" className="mb-3 flex items-center justify-between gap-3 text-xs text-destructive"><span>{error}</span><button type="button" onClick={onRetry} disabled={streaming || loading} className="shrink-0 underline disabled:opacity-50">Retry</button></div>}
        <form onSubmit={event => { event.preventDefault(); send(input); }} className="pulse-home-composer">
          <div className="pulse-home-input-row">
            <span aria-hidden="true" className={cn('pulse-home-wave', streaming && !unavailable && 'pulse-home-wave--active')}>{[0, 1, 2, 3, 4].map(bar => <span key={bar} />)}</span>
            <div className="min-w-0 flex-1">
              <textarea ref={textarea} aria-label="Message Pulse" aria-describedby="pulse-composer-hint" placeholder="What's in Your Mind Today?" rows={1} maxLength={4000} value={input} onChange={event => setInput(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(input); } }} className="block w-full resize-none bg-transparent text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground" />
              <p id="pulse-composer-hint" className="pulse-home-input-hint">Ask a question, explore an idea, or find your next step.</p>
            </div>
          </div>
          <div className="pulse-home-composer-footer"><span role="status" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', unavailable || contextNotice || error ? 'bg-muted-foreground' : 'bg-primary')} />{composerStatus}</span><button type="submit" aria-label="Send message" disabled={!input.trim() || streaming || loading || Boolean(unavailable)}><span>Ask Pulse</span><ArrowUp aria-hidden="true" className="h-4 w-4" /></button></div>
        </form>
        {!active && <nav aria-label="Quick starts" className="pulse-home-shortcuts">{shortcuts.map(({ label, route, icon: Icon }) => <a key={route} href={route} onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); navigate(route); } }} className="pulse-home-shortcut">
          <span className="pulse-home-shortcut-icon"><Icon aria-hidden="true" className="h-4 w-4" /></span><span className="flex-1">{label}</span><ArrowRight aria-hidden="true" className="pulse-home-shortcut-arrow h-3.5 w-3.5 shrink-0" />
        </a>)}</nav>}
        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">{unavailable || contextNotice || 'Pulse guides. You decide. Review suggestions before taking action.'}</p>
      </div>
    </div>
    </div>
  </section>;
}
