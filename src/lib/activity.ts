import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';

export async function trackActivity(event: string, properties: Record<string, any> = {}, userId?: string) {
  try {
    await safe.insert(async () =>
      await (supabase as any).from('activity_events').insert({ event, properties, user_id: userId })
    );
  } catch (e) {
    // Non-blocking
     
    console.warn('trackActivity failed', e);
  }
}


