import { BIZMAP_STAGE_ORDER } from '../lib/bizmapStageOrder.ts';

export const MENTOR_COACHING_FORMATS = ['8 Week Coaching Program', 'Hourly Rate Basis'] as const;
export type MentorCoachingFormat = typeof MENTOR_COACHING_FORMATS[number];

export const MENTOR_STARTUP_STAGES = [...BIZMAP_STAGE_ORDER] as const;
export type MentorStartupStage = typeof MENTOR_STARTUP_STAGES[number];

// ISO 639-1 values commonly used by the current international mentor pool.
// Admins store the code; Pulse and the directory show the stable label.
export const MENTOR_LANGUAGE_OPTIONS = [
  ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'],
  ['pt', 'Portuguese'], ['ar', 'Arabic'], ['hi', 'Hindi'], ['ru', 'Russian'], ['uk', 'Ukrainian'],
  ['hy', 'Armenian'], ['kk', 'Kazakh'], ['lt', 'Lithuanian'], ['tr', 'Turkish'], ['zh', 'Chinese'],
] as const;

export const MENTOR_LANGUAGE_LABELS: Readonly<Record<string, string>> = Object.fromEntries(MENTOR_LANGUAGE_OPTIONS);
