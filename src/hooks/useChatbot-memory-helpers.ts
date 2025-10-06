// Memory extraction helper functions for useChatbot
import { supabase } from '@/integrations/supabase/client';
import { useConversationMemory, MemoryType } from './useConversationMemory';

interface MemoryPattern {
  type: MemoryType;
  regex: RegExp;
  importance: number;
  titlePrefix: string;
}

export const MEMORY_PATTERNS: MemoryPattern[] = [
  {
    type: 'decision',
    regex: /\b(decided|will|going to|planning to|want to|chose|committed to)\b/i,
    importance: 0.8,
    titlePrefix: 'Decision: '
  },
  {
    type: 'win',
    regex: /\b(launched|completed|achieved|finished|got my first|succeeded|accomplished)\b/i,
    importance: 0.9,
    titlePrefix: 'Win: '
  },
  {
    type: 'challenge',
    regex: /\b(struggling|stuck|confused|don't know|worried|scared|frustrated|problem)\b/i,
    importance: 0.7,
    titlePrefix: 'Challenge: '
  },
  {
    type: 'insight',
    regex: /\b(realized|learned|discovered|understand now|figured out|makes sense)\b/i,
    importance: 0.75,
    titlePrefix: 'Insight: '
  },
  {
    type: 'goal',
    regex: /\b(goal|target|aim|objective|plan to achieve)\b/i,
    importance: 0.85,
    titlePrefix: 'Goal: '
  }
];

export const detectMood = (message: string): string | undefined => {
  if (/\b(excited|amazing|great|awesome|love)\b/i.test(message)) return 'excited';
  if (/\b(worried|scared|anxious|nervous)\b/i.test(message)) return 'anxious';
  if (/\b(frustrated|annoyed|stuck)\b/i.test(message)) return 'frustrated';
  if (/\b(confident|ready|prepared)\b/i.test(message)) return 'confident';
  return 'neutral';
};

export const detectTone = (response: string): string | undefined => {
  if (/!/.test(response) && /\b(great|awesome|amazing)\b/i.test(response)) return 'enthusiastic';
  if (/\b(let's|step|plan|strategy)\b/i.test(response)) return 'strategic';
  if (/\b(understand|hear you|normal|okay to feel)\b/i.test(response)) return 'empathetic';
  return 'balanced';
};

export const extractTitle = (message: string, prefix: string): string => {
  const firstSentence = message.split(/[.!?]/)[0].trim();
  return prefix + (firstSentence.length > 50 
    ? firstSentence.substring(0, 50) + '...' 
    : firstSentence);
};
