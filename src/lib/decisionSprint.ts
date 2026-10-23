/**
 * Decision Sprint: a builder compares one to three ideas with five plain
 * questions and picks the one to validate next. Pure logic only, so the
 * page stays thin and this file is testable with node:test.
 */

export const MAX_SPRINT_IDEAS = 3;
export const DECISION_SPRINT_STORAGE_PREFIX = 'validateDecisionSprint';

/** 0 = No, 1 = Partly, 2 = Yes. */
export type CheckAnswer = 0 | 1 | 2;

export const CHECK_ANSWER_LABELS: Record<CheckAnswer, string> = { 0: 'No', 1: 'Partly', 2: 'Yes' };

export const CHECK_QUESTIONS = [
  { key: 'pain', question: 'Does the problem hurt often?', strength: 'the problem hurts often', weakness: 'the problem may not hurt often enough' },
  { key: 'pay', question: 'Do people already pay to solve it?', strength: 'people already pay to solve it', weakness: 'nobody is paying to solve it yet' },
  { key: 'asked', question: 'Have you seen people ask for a fix?', strength: 'you have seen people ask for a fix', weakness: 'you have not seen people ask for a fix' },
  { key: 'reach', question: 'Can you reach 10 of these customers this week?', strength: 'you can reach customers this week', weakness: 'customers are hard for you to reach' },
  { key: 'edge', question: 'Do you have an edge (access, skill, data)?', strength: 'you have an edge', weakness: 'you have no clear edge yet' },
] as const;

export type CheckKey = (typeof CHECK_QUESTIONS)[number]['key'];

export interface SprintIdea {
  id: string;
  name: string;
  /** Who it's for. */
  customer: string;
  problem: string;
  answers: Partial<Record<CheckKey, CheckAnswer>>;
}

export interface SprintDraft {
  id: string;
  ideas: SprintIdea[];
  /** Kept for the stored draft shape; the first idea. */
  activeIdeaId: string;
  chosenIdeaId: string | null;
  updatedAt: string;
}

export type SprintStep = 1 | 2 | 3;

const randomSuffix = () => Math.random().toString(36).slice(2, 6);

export function createSprintIdea(now = Date.now()): SprintIdea {
  return { id: `idea-${now}-${randomSuffix()}`, name: '', customer: '', problem: '', answers: {} };
}

export function createSprintDraft(now = Date.now()): SprintDraft {
  const idea = createSprintIdea(now);
  return { id: `validation-draft-${now}`, ideas: [idea], activeIdeaId: idea.id, chosenIdeaId: null, updatedAt: new Date(0).toISOString() };
}

/** Name, who it's for and the problem are all filled in. */
export function isIdeaFilled(idea: SprintIdea): boolean {
  return Boolean(idea.name.trim() && idea.customer.trim() && idea.problem.trim());
}

export function answeredCount(idea: SprintIdea): number {
  return CHECK_QUESTIONS.filter((q) => idea.answers[q.key] !== undefined).length;
}

export function isIdeaChecked(idea: SprintIdea): boolean {
  return answeredCount(idea) === CHECK_QUESTIONS.length;
}

/** 0 to 100, or null until all five questions are answered. */
export function scoreIdea(idea: SprintIdea): number | null {
  if (!isIdeaChecked(idea)) return null;
  const total = CHECK_QUESTIONS.reduce((sum, q) => sum + (idea.answers[q.key] ?? 0), 0);
  return Math.round((total / (CHECK_QUESTIONS.length * 2)) * 100);
}

export function scoreVerdict(score: number): { label: string; tone: 'strong' | 'mixed' | 'weak' } {
  if (score >= 70) return { label: 'Strong signal', tone: 'strong' };
  if (score >= 40) return { label: 'Worth testing', tone: 'mixed' };
  return { label: 'Weak signal', tone: 'weak' };
}

/** Highest score first; ties keep the order the ideas were added; unscored ideas last. */
export function rankIdeas(ideas: SprintIdea[]): SprintIdea[] {
  return ideas
    .map((idea, index) => ({ idea, index, score: scoreIdea(idea) }))
    .sort((a, b) => {
      if (a.score === null && b.score === null) return a.index - b.index;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score || a.index - b.index;
    })
    .map((entry) => entry.idea);
}

/** A plain sentence from the strongest and weakest answers. */
export function ideaReason(idea: SprintIdea): string {
  const strongest = CHECK_QUESTIONS.find((q) => idea.answers[q.key] === 2);
  const weakest = CHECK_QUESTIONS.find((q) => idea.answers[q.key] === 0)
    ?? CHECK_QUESTIONS.find((q) => idea.answers[q.key] === 1);
  const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

  if (strongest && weakest) return `${capitalise(strongest.strength)}, but ${weakest.weakness}.`;
  if (strongest) return `${capitalise(strongest.strength)}, and no answer was a No.`;
  if (weakest) return `${capitalise(weakest.weakness)}.`;
  return '';
}

/** Steps unlock in order: Check needs every idea filled in, Decide needs every idea answered. */
export function canOpenStep(ideas: SprintIdea[], step: SprintStep): boolean {
  if (step === 1) return true;
  const filled = ideas.length > 0 && ideas.every(isIdeaFilled);
  if (step === 2) return filled;
  return filled && ideas.every(isIdeaChecked);
}

/** Furthest step the draft allows, used when a saved draft reopens. */
export function furthestStep(ideas: SprintIdea[]): SprintStep {
  if (canOpenStep(ideas, 3)) return 3;
  if (canOpenStep(ideas, 2)) return 2;
  return 1;
}

export function hasSprintContent(ideas: SprintIdea[]): boolean {
  return ideas.some((idea) => idea.name.trim() || idea.customer.trim() || idea.problem.trim() || answeredCount(idea) > 0);
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

function readAnswers(value: unknown): SprintIdea['answers'] {
  if (!value || typeof value !== 'object') return {};
  const answers: SprintIdea['answers'] = {};
  for (const q of CHECK_QUESTIONS) {
    const answer = (value as Record<string, unknown>)[q.key];
    if (answer === 0 || answer === 1 || answer === 2) answers[q.key] = answer;
  }
  return answers;
}

/**
 * Reads an idea in the current shape or the old one (targetCustomer,
 * coreProblem, 1–5 sliders). Old slider values do not map onto the new
 * questions, so those are asked again.
 */
export function migrateSprintIdea(raw: unknown): SprintIdea | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== 'string' || !value.id) return null;
  return {
    id: value.id,
    name: text(value.name),
    customer: text(value.customer) || text(value.targetCustomer),
    problem: text(value.problem) || text(value.coreProblem),
    answers: readAnswers(value.answers),
  };
}

export function parseSprintDraft(raw: unknown): SprintDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.ideas)) return null;
  const ideas = value.ideas
    .map(migrateSprintIdea)
    .filter((idea): idea is SprintIdea => idea !== null)
    .slice(0, MAX_SPRINT_IDEAS);
  if (ideas.length === 0) return null;
  const chosen = typeof value.chosenIdeaId === 'string' && ideas.some((idea) => idea.id === value.chosenIdeaId)
    ? value.chosenIdeaId
    : null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `validation-draft-${Date.now()}`,
    ideas,
    activeIdeaId: ideas[0].id,
    chosenIdeaId: chosen,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString(),
  };
}

/** One local copy per account, so a shared browser never mixes two people's ideas. */
export function sprintStorageKey(userId: string | null | undefined): string {
  return `${DECISION_SPRINT_STORAGE_PREFIX}:${userId || 'guest'}`;
}

const time = (draft: SprintDraft) => {
  const parsed = Date.parse(draft.updatedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Which draft to open: the newest of this account's local and cloud copies.
 * A guest draft (made before signing up) is only adopted when the account
 * has nothing of its own.
 */
export function pickSprintDraft(options: {
  local: SprintDraft | null;
  remote: SprintDraft | null;
  guest?: SprintDraft | null;
}): { draft: SprintDraft | null; fromGuest: boolean } {
  const { local, remote, guest = null } = options;
  if (local && remote) return { draft: time(remote) > time(local) ? remote : local, fromGuest: false };
  if (local || remote) return { draft: local ?? remote, fromGuest: false };
  if (guest && hasSprintContent(guest.ideas)) return { draft: guest, fromGuest: true };
  return { draft: null, fromGuest: false };
}

/** Text handed to ICP Builder (?seed=) so it starts from the chosen idea. */
export function buildSprintSeed(idea: SprintIdea): string {
  const parts = [idea.name.trim()];
  if (idea.customer.trim()) parts.push(`for ${idea.customer.trim()}`);
  const head = parts.join(' ');
  return idea.problem.trim() ? `${head}. Problem: ${idea.problem.trim()}` : head;
}
