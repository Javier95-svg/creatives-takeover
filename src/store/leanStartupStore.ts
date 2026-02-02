import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useJourneyStore } from './journeyStore';
import { journeyDefinitions } from '@/data/journeys';
import type { JourneySlug } from '@/types/journey';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Phase = 'learn' | 'build' | 'measure';

interface PhaseState {
  toolsUsed: string[];
}

interface LeanStartupStoreState {
  phases: Record<Phase, PhaseState>;
  skippedPhases: Phase[];
  dismissedTransitions: string[]; // e.g. ['learn->build']
}

interface LeanStartupStore extends LeanStartupStoreState {
  markToolUsed: (toolId: string) => void;
  skipPhase: (phase: Phase) => void;
  dismissTransition: (key: string) => void;
}

// ---------------------------------------------------------------------------
// Phase <-> tool / journey mapping
// ---------------------------------------------------------------------------

const PHASE_JOURNEYS: Record<Phase, JourneySlug> = {
  learn: 'validate',
  build: 'mvp',
  measure: 'first-customers',
};

const PHASE_TOOLS: Record<Phase, string[]> = {
  learn: ['decision-sprint', 'pmf-lab'],
  build: ['tech-stack', 'focus-funnel', 'tasks'],
  measure: ['core-metrics', 'weekly-mission'],
};

// ---------------------------------------------------------------------------
// Helper: get journey completion from journeyStore
// ---------------------------------------------------------------------------

function getJourneyPercent(slug: JourneySlug): number {
  const jStore = useJourneyStore.getState();
  const def = journeyDefinitions[slug];
  if (!def) return 0;

  const tasksPerDay: Record<number, number> = {};
  def.days.forEach((d) => {
    tasksPerDay[d.dayNumber] = d.tasks.length;
  });

  return jStore.getJourneyCompletionPercent(slug, def.totalDays, tasksPerDay);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLeanStartupStore = create<LeanStartupStore>()(
  persist(
    (set, get) => ({
      phases: {
        learn: { toolsUsed: [] },
        build: { toolsUsed: [] },
        measure: { toolsUsed: [] },
      },
      skippedPhases: [],
      dismissedTransitions: [],

      markToolUsed: (toolId: string) => {
        set((state) => {
          // Find which phase this tool belongs to
          let targetPhase: Phase | null = null;
          for (const [phase, tools] of Object.entries(PHASE_TOOLS)) {
            if (tools.includes(toolId)) {
              targetPhase = phase as Phase;
              break;
            }
          }
          if (!targetPhase) return state;

          const phaseState = state.phases[targetPhase];
          if (phaseState.toolsUsed.includes(toolId)) return state;

          return {
            phases: {
              ...state.phases,
              [targetPhase]: {
                ...phaseState,
                toolsUsed: [...phaseState.toolsUsed, toolId],
              },
            },
          };
        });
      },

      skipPhase: (phase: Phase) => {
        set((state) => {
          if (state.skippedPhases.includes(phase)) return state;
          return { skippedPhases: [...state.skippedPhases, phase] };
        });
      },

      dismissTransition: (key: string) => {
        set((state) => {
          if (state.dismissedTransitions.includes(key)) return state;
          return { dismissedTransitions: [...state.dismissedTransitions, key] };
        });
      },
    }),
    {
      name: 'lean-startup-progress',
      partialize: (state) => ({
        phases: state.phases,
        skippedPhases: state.skippedPhases,
        dismissedTransitions: state.dismissedTransitions,
      }),
    }
  )
);

// ---------------------------------------------------------------------------
// Derived helpers (read from both stores)
// ---------------------------------------------------------------------------

export function getPhaseCompletion(phase: Phase): number {
  const state = useLeanStartupStore.getState();
  const journeySlug = PHASE_JOURNEYS[phase];
  const phaseTools = PHASE_TOOLS[phase];
  const phaseState = state.phases[phase];

  const journeyPercent = getJourneyPercent(journeySlug);

  // Tool bonus: each tool contributes equally to the remaining 30%
  const toolWeight = phaseTools.length > 0 ? 30 / phaseTools.length : 0;
  const toolPercent = phaseState.toolsUsed.filter((t) => phaseTools.includes(t)).length * toolWeight;

  return Math.min(100, Math.round(journeyPercent * 0.7 + toolPercent));
}

export function isPhaseUnlocked(phase: Phase): boolean {
  const state = useLeanStartupStore.getState();
  if (phase === 'learn') return true;
  if (state.skippedPhases.includes(phase)) return true;

  const previousPhase: Phase = phase === 'build' ? 'learn' : 'build';
  return getPhaseCompletion(previousPhase) >= 30;
}

export function getCurrentPhase(): Phase {
  // Current phase = first phase that isn't 100% complete
  for (const phase of ['learn', 'build', 'measure'] as Phase[]) {
    if (getPhaseCompletion(phase) < 100) return phase;
  }
  return 'measure'; // all complete, show last
}

export interface TransitionPrompt {
  from: Phase;
  to: Phase;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

export function getTransitionPrompt(): TransitionPrompt | null {
  const state = useLeanStartupStore.getState();
  const phases: Phase[] = ['learn', 'build', 'measure'];

  for (let i = 0; i < phases.length - 1; i++) {
    const from = phases[i];
    const to = phases[i + 1];
    const key = `${from}->${to}`;

    if (state.dismissedTransitions.includes(key)) continue;
    if (getPhaseCompletion(from) < 80) continue;

    const messages: Record<string, TransitionPrompt> = {
      'learn->build': {
        from: 'learn',
        to: 'build',
        message: "You've validated your idea. Ready to build your MVP?",
        ctaLabel: 'Start MVP Sprint',
        ctaHref: '/mvp-builder',
      },
      'build->measure': {
        from: 'build',
        to: 'measure',
        message: 'MVP shipped! Time to find your first paying customers.',
        ctaLabel: 'Start Client Acquisition',
        ctaHref: '/client-acquisition',
      },
    };

    return messages[key] || null;
  }

  // Check if measure is complete → loop back
  if (getPhaseCompletion('measure') >= 80) {
    const key = 'measure->learn';
    if (!state.dismissedTransitions.includes(key)) {
      return {
        from: 'measure',
        to: 'learn',
        message: 'First cycle complete! Review your metrics and iterate.',
        ctaLabel: 'Start Next Iteration',
        ctaHref: '/validate',
      };
    }
  }

  return null;
}

/** Which tools belong to which phase (for external use) */
export { PHASE_TOOLS, PHASE_JOURNEYS };
