import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from './analytics';

export function trackPulseMentorClicked(mentorId: string, turnId: string, surface: 'home' | 'widget', rank: number) {
  captureEvent('pulse_mentor_profile_clicked', { mentor_id: mentorId, turn_id: turnId, surface, rank });
  void (supabase as any).from('pulse_mentor_recommendation_impressions')
    .update({ clicked_at: new Date().toISOString() })
    .eq('turn_id', turnId).eq('mentor_id', mentorId).is('clicked_at', null);
}

export function trackPulseSourceOpened(kind: string, id: string, surface: 'home' | 'widget') {
  captureEvent('pulse_retrieval_source_opened', { kind, source_id: id, surface });
}
