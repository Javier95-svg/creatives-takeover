import { supabase } from '@/integrations/supabase/client';

export type EmailSequenceEvent =
  | 'signup_completed'
  | 'onboarding_complete'
  | 'credit_warning'
  | 'credit_exhausted';

export async function triggerEmailSequenceEvent(event: EmailSequenceEvent, userId: string) {
  try {
    await supabase.functions.invoke('email-sequences', {
      body: {
        mode: 'event',
        event,
        user_id: userId,
      },
    });
  } catch (error) {
    console.warn('triggerEmailSequenceEvent failed', { event, userId, error });
  }
}
