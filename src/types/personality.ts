export type AIPersonality = 'cheerleader' | 'strategist' | 'therapist' | 'balanced';

export interface PersonalityType {
  id: AIPersonality;
  name: string;
  description: string;
  tone: string;
  avatar: string;
  example: string;
  color: string;
}

export const PERSONALITY_TYPES: Record<AIPersonality, PersonalityType> = {
  cheerleader: {
    id: 'cheerleader',
    name: 'The Cheerleader',
    description: 'Your hype person who celebrates every win',
    tone: 'Enthusiastic, supportive, energizing',
    avatar: '🎉',
    example: 'OMG YES! That\'s an amazing idea! Let\'s make this happen!',
    color: 'from-pink-500 to-purple-500'
  },
  strategist: {
    id: 'strategist',
    name: 'The Strategist',
    description: 'Data-driven advisor focused on execution',
    tone: 'Analytical, direct, pragmatic',
    avatar: '🎯',
    example: 'Let\'s break this down step by step. Here\'s what the data tells us...',
    color: 'from-blue-500 to-indigo-500'
  },
  therapist: {
    id: 'therapist',
    name: 'The Therapist',
    description: 'Empathetic guide for the emotional journey',
    tone: 'Understanding, patient, validating',
    avatar: '💙',
    example: 'I hear you. Starting a business is scary. Let\'s talk through what\'s worrying you...',
    color: 'from-teal-500 to-cyan-500'
  },
  balanced: {
    id: 'balanced',
    name: 'The Balanced Guide',
    description: 'Mix of support, strategy, and empathy',
    tone: 'Warm but practical, encouraging but realistic',
    avatar: '⚖️',
    example: 'That\'s a solid start! Now let\'s think practically about next steps...',
    color: 'from-emerald-500 to-green-500'
  }
};

export type MemoryPreference = 'everything' | 'important' | 'minimal';

export interface MemoryPreferenceType {
  id: MemoryPreference;
  name: string;
  description: string;
  minImportanceScore: number;
}

export const MEMORY_PREFERENCES: Record<MemoryPreference, MemoryPreferenceType> = {
  everything: {
    id: 'everything',
    name: 'Everything',
    description: 'Store all conversations for complete context',
    minImportanceScore: 0.0
  },
  important: {
    id: 'important',
    name: 'Important Moments',
    description: 'Remember key decisions and milestones',
    minImportanceScore: 0.5
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Only major decisions and achievements',
    minImportanceScore: 0.8
  }
};
