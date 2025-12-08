import { RealtimeChannel } from '@supabase/supabase-js';

export {};

declare global {
  interface Window {
    // Collaboration channel set by CollaborationContext
    collaborationChannel?: RealtimeChannel;
  }
}
