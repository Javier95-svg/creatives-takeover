// Pitch Deck Tools Data

export interface BuilderTool {
  id: string;
  name: string;
  description: string;
  category: 'generator' | 'validator' | 'helper' | 'resource';
  icon: string;
  actionType: 'modal' | 'link' | 'download';
  action: string; // Modal component name, external URL, or download path
}

export const PITCH_DECK_TOOLS: BuilderTool[] = [
  {
    id: 'market-size-calculator',
    name: 'Market Size Calculator',
    description: 'Calculate TAM, SAM, and SOM with guided inputs and industry benchmarks',
    category: 'generator',
    icon: 'Calculator',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/tools/market-calculator'
  },
  {
    id: 'competitive-matrix',
    name: 'Competitive Matrix Generator',
    description: 'Create professional competitive analysis grids comparing features and positioning',
    category: 'generator',
    icon: 'Grid3x3',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/tools/competitive-matrix'
  },
  {
    id: 'slide-checklist',
    name: 'Slide Content Checklist',
    description: 'Ensure each slide has all critical elements before presenting to investors',
    category: 'validator',
    icon: 'CheckSquare',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/tools/slide-checklist'
  },
  {
    id: 'one-liner-generator',
    name: 'One-Liner Generator',
    description: 'Craft the perfect elevator pitch and tagline using proven frameworks',
    category: 'helper',
    icon: 'MessageSquare',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/tools/one-liner'
  },
  {
    id: 'design-guidelines',
    name: 'Design Guidelines PDF',
    description: 'Best practices for visual design, layout, typography, and color in pitch decks',
    category: 'resource',
    icon: 'FileText',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/resources/pitch-deck-design-guide'
  },
  {
    id: 'pitch-deck-examples',
    name: 'Successful Pitch Decks',
    description: 'Gallery of real pitch decks from companies that raised funding (Airbnb, Uber, etc.)',
    category: 'resource',
    icon: 'ExternalLink',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/resources/pitch-deck-examples'
  },
  {
    id: 'storytelling-playbook',
    name: 'Storytelling Playbook',
    description: 'Complete guide to crafting compelling narratives that resonate with investors',
    category: 'resource',
    icon: 'BookOpen',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/resources/storytelling-playbook'
  },
  {
    id: 'investor-qa-prep',
    name: 'Investor Q&A Prep',
    description: 'Practice answering tough investor questions with example responses and tips',
    category: 'helper',
    icon: 'HelpCircle',
    actionType: 'link',
    action: 'https://www.creatives-takeover.com/tools/investor-qa'
  }
];
