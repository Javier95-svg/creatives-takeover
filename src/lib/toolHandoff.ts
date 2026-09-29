/**
 * What a visitor typed into a free tool before they had an account.
 *
 * The homepage box sends an idea to the ICP Builder or a product description
 * to Demo Studio. That text used to live only in sessionStorage or a URL
 * param, so it was gone by the time the visitor reached onboarding (email
 * confirmation and OAuth both open a new tab). Kept in localStorage for a week
 * so the quiz can pre-fill the brief instead of asking again.
 *
 * Import-free on purpose so node tests can load it.
 */

export type ToolHandoffMode = 'idea' | 'product';
export type ToolHandoffTool = 'icp_builder' | 'demo_studio';

export interface ToolHandoff {
  mode: ToolHandoffMode;
  tool: ToolHandoffTool;
  seed: string;
  projectName?: string;
  savedAt: number;
}

const STORAGE_KEY = 'ct_tool_handoff';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SEED_CHARS = 280;
const MAX_NAME_CHARS = 120;

function write(value: ToolHandoff) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable: onboarding simply starts empty.
  }
}

export function rememberToolHandoff(input: {
  mode: ToolHandoffMode;
  tool: ToolHandoffTool;
  seed: string;
  projectName?: string;
}) {
  const seed = input.seed.trim().slice(0, MAX_SEED_CHARS);
  if (!seed) return;
  const projectName = input.projectName?.trim().slice(0, MAX_NAME_CHARS);
  write({ mode: input.mode, tool: input.tool, seed, ...(projectName ? { projectName } : {}), savedAt: Date.now() });
}

export function readToolHandoff(): ToolHandoff | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ToolHandoff>;
    if (parsed.mode !== 'idea' && parsed.mode !== 'product') return null;
    if (parsed.tool !== 'icp_builder' && parsed.tool !== 'demo_studio') return null;
    if (typeof parsed.seed !== 'string' || !parsed.seed.trim()) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return {
      mode: parsed.mode,
      tool: parsed.tool,
      seed: parsed.seed.trim().slice(0, MAX_SEED_CHARS),
      ...(typeof parsed.projectName === 'string' && parsed.projectName.trim()
        ? { projectName: parsed.projectName.trim().slice(0, MAX_NAME_CHARS) }
        : {}),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

/** Adds details learned later, such as the name given to a saved demo. */
export function updateToolHandoff(patch: { projectName?: string }) {
  const current = readToolHandoff();
  if (!current) return;
  const projectName = patch.projectName?.trim().slice(0, MAX_NAME_CHARS);
  write({ ...current, ...(projectName ? { projectName } : {}) });
}

export function clearToolHandoff() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
