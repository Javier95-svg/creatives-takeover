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
    actionType: 'modal',
    action: 'MarketSizeCalculatorModal'
  },
  {
    id: 'storytelling-playbook',
    name: 'Storytelling Playbook',
    description: 'Interactive guide to crafting compelling narratives that resonate with investors',
    category: 'resource',
    icon: 'BookOpen',
    actionType: 'modal',
    action: 'StorytellingPlaybookModal'
  },
  {
    id: 'investor-qa-prep',
    name: 'Investor Q&A Prep',
    description: 'Practice answering tough investor questions with example responses and tips',
    category: 'helper',
    icon: 'HelpCircle',
    actionType: 'modal',
    action: 'InvestorQAPrepModal'
  },
  {
    id: 'design-guidelines',
    name: 'Design Guidelines',
    description: 'Best practices for visual design, layout, typography, and color in pitch decks',
    category: 'resource',
    icon: 'FileText',
    actionType: 'download',
    action: '/resources/pitch-deck-design-guidelines.pptx'
  },
  {
    id: 'one-liner-generator',
    name: 'One-Liner Generator',
    description: 'Craft the perfect elevator pitch and tagline using proven frameworks',
    category: 'generator',
    icon: 'MessageSquare',
    actionType: 'modal',
    action: 'OneLinerGeneratorModal'
  }
];
