/**
 * The first actions onboarding can recommend.
 *
 * Kept in a file with no imports so server code (edge functions and database
 * tests) can use it without pulling in the browser Supabase client.
 */
export const ACTIVATION_INTENTS = [
  /**
   * The only intent whose output leaves the platform and can be answered by
   * someone other than the founder. Every other entry terminates in a saved
   * document that nobody but its author ever sees.
   */
  'publish_proof',
  'first_customer_sprint',
  'build_demo',
  'find_mentor',
  'run_icp',
  'start_validation',
  'build_mvp',
  'plan_gtm',
  'log_traction',
  'analyze_pitch_deck',
  'unlock_pitch_deck',
  'unlock_tech_stack',
  'unlock_insighta',
  'save_mentor',
  'send_message',
  'book_call',
] as const;

export type ActivationIntent = (typeof ACTIVATION_INTENTS)[number];

export function isActivationIntent(value: unknown): value is ActivationIntent {
  return typeof value === 'string' && (ACTIVATION_INTENTS as readonly string[]).includes(value);
}
