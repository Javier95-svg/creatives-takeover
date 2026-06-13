import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InvestorQAPrepModalProps {
  onClose: () => void;
}

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: 'common' | 'tough' | 'killer';
  why: string;
  goodAnswer: string;
  badAnswer: string;
  tips: string[];
}

export const InvestorQAPrepModal: React.FC<InvestorQAPrepModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('market');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const questions: Question[] = [
    // Market Questions
    {
      id: 'm1',
      question: 'How big is your market?',
      category: 'market',
      difficulty: 'common',
      why: 'Investors want to know if the opportunity is worth their time. A small market caps your upside.',
      goodAnswer: 'Our TAM is $50B globally (source: Gartner 2024). We\'re targeting the $5B SAM of cloud accounting for SMBs in North America. Our realistic SOM is $100M in 5 years - about 2% market share. We know 2% sounds small, but that\'s intentional. Slack had 2% of the collaboration market when they IPO\'d.',
      badAnswer: 'The market is huge - everyone needs accounting software!',
      tips: [
        'Always cite credible sources (Gartner, IDC, industry reports)',
        'Break down TAM → SAM → SOM clearly',
        'Conservative targets build trust',
        'Compare to successful companies at similar stages'
      ]
    },
    {
      id: 'm2',
      question: 'Why now? What\'s changed?',
      category: 'market',
      difficulty: 'tough',
      why: 'Timing is everything. If this idea could have worked 5 years ago, why didn\'t it?',
      goodAnswer: 'Three things converged in the last 18 months: (1) GPT-4 reached production quality for financial workflows, (2) SMB cloud adoption hit 70% post-COVID, and (3) new regulations made manual invoicing riskier. We tried building this in 2020 - the AI wasn\'t ready. Now it is.',
      badAnswer: 'The market is ready for innovation.',
      tips: [
        'Identify 2-3 specific changes (tech, regulation, behavior)',
        'Show why it couldn\'t work before',
        'Prove the timing with recent data or trends',
        'Personal insight ("We tried this before...") builds credibility'
      ]
    },
    {
      id: 'm3',
      question: 'Who else is solving this? Why will you win?',
      category: 'market',
      difficulty: 'killer',
      why: 'There\'s always competition. Saying "no competitors" signals you don\'t understand your market.',
      goodAnswer: 'QuickBooks dominates enterprise ($5K+ annual contracts), but they\'re too complex for our SMB customers. Wave is free but basic - no AI, no integrations. We\'re the only solution built specifically for $50-$500/month SMBs who need power without complexity. Our NPS is 72 vs 31 for QuickBooks among SMBs.',
      badAnswer: 'We have no competitors - we\'re totally unique!',
      tips: [
        'Acknowledge real competitors - shows market awareness',
        'Position yourself in the "white space" they ignore',
        'Use data to prove you\'re better (NPS, growth rate, pricing)',
        'Never trash competitors - focus on your strengths'
      ]
    },

    // Traction Questions
    {
      id: 't1',
      question: 'What\'s your MRR/ARR and growth rate?',
      category: 'traction',
      difficulty: 'common',
      why: 'Revenue is the ultimate validation. Growth rate shows momentum.',
      goodAnswer: 'We\'re at $100K MRR ($1.2M ARR) with 40% month-over-month growth. Started at $10K MRR 6 months ago. At this rate, we\'ll hit $500K MRR in Q4. Here\'s the chart. [Shows exponential growth graph]',
      badAnswer: 'We\'re pre-revenue but have 500 beta users.',
      tips: [
        'Lead with revenue if you have it',
        'Show growth trajectory with a chart',
        'If pre-revenue, highlight paying LOIs or pilot conversions',
        'Be ready to explain any growth slowdowns'
      ]
    },
    {
      id: 't2',
      question: 'What are your unit economics?',
      category: 'traction',
      difficulty: 'tough',
      why: 'Can you profitably acquire customers? Bad unit economics kill businesses.',
      goodAnswer: 'CAC is $250 (organic + paid), LTV is $1,800 (3-year retention average). LTV:CAC is 7:1, payback period is 5 months. Industry benchmark is 3:1, so we\'re twice as efficient. Our retention is improving - cohort from Q1 2024 is at 95% after 9 months.',
      badAnswer: 'We haven\'t calculated that yet.',
      tips: [
        'Know your CAC, LTV, LTV:CAC ratio, and payback period',
        'Compare to industry benchmarks',
        'Show improving cohort retention',
        'If early-stage, estimate based on early data'
      ]
    },
    {
      id: 't3',
      question: 'What\'s your churn rate?',
      category: 'traction',
      difficulty: 'killer',
      why: 'High churn means customers don\'t love your product. It caps your growth.',
      goodAnswer: 'Gross churn is 3% monthly, net churn is -2% (negative churn due to expansion revenue). Industry average is 5-7% for SMB SaaS. We reduced churn from 8% to 3% by adding onboarding support and in-app education. Customers who complete onboarding have <1% churn.',
      badAnswer: 'Churn isn\'t a problem for us.',
      tips: [
        'Distinguish gross churn vs net churn',
        'Compare to industry benchmarks',
        'Show trajectory - is churn improving?',
        'Explain what you\'ve done to reduce churn'
      ]
    },

    // Team Questions
    {
      id: 'te1',
      question: 'Why are you the right person to build this?',
      category: 'team',
      difficulty: 'common',
      why: 'Investors bet on people. Domain expertise reduces risk.',
      goodAnswer: 'I spent 8 years at Intuit building SMB accounting tools. I personally talked to 500+ small business owners and saw this problem daily. My co-founder was lead engineer at Stripe - he built payment infrastructure for 2M merchants. We\'ve lived this problem from both sides.',
      badAnswer: 'We\'re smart and hardworking.',
      tips: [
        'Show relevant domain expertise',
        'Highlight previous startup experience',
        'Prove you understand the customer deeply',
        'If you lack experience, acknowledge it and show fast learning'
      ]
    },
    {
      id: 'te2',
      question: 'What\'s missing from your team?',
      category: 'team',
      difficulty: 'tough',
      why: 'Self-awareness is key. Every team has gaps.',
      goodAnswer: 'We need a VP of Sales with enterprise SaaS experience. Right now, I (CEO) am selling, but we need someone who can build a repeatable sales process and hire a team. We\'re using this $2M round to hire that person - ideally someone who scaled sales at a company like HubSpot or Salesforce.',
      badAnswer: 'Our team is complete.',
      tips: [
        'Identify the most critical gap',
        'Show you have a plan to fill it',
        'Use this round\'s capital to justify hires',
        'Mention advisors who fill short-term gaps'
      ]
    },

    // Business Model Questions
    {
      id: 'b1',
      question: 'How do you make money?',
      category: 'business',
      difficulty: 'common',
      why: 'If you can\'t explain this clearly, it\'s a red flag.',
      goodAnswer: 'SaaS subscription model. $49/month per user. Average customer has 3 users = $147/month. We also charge 1% of payment volume processed through our platform - that\'s pure margin expansion. 70% of revenue is subscriptions (predictable), 30% is payment fees (scales with customer success).',
      badAnswer: 'We\'ll figure out monetization after we get traction.',
      tips: [
        'Be crystal clear on pricing',
        'Explain multiple revenue streams if applicable',
        'Show why customers will pay',
        'Highlight recurring vs one-time revenue'
      ]
    },
    {
      id: 'b2',
      question: 'What\'s your path to $100M ARR?',
      category: 'business',
      difficulty: 'killer',
      why: 'VCs need 100x returns. Can you grow big enough?',
      goodAnswer: 'Phase 1 (Years 1-2): Land 2,000 SMB customers at $50K ACV = $10M ARR. Phase 2 (Years 3-4): Launch enterprise tier, land 200 enterprise customers at $200K ACV = $40M ARR. Phase 3 (Years 5-7): International expansion + platform expansion = $100M ARR. Comparable company (Bill.com) reached $100M ARR in 7 years following similar playbook.',
      badAnswer: 'We\'ll just keep growing at 40% MoM.',
      tips: [
        'Show a multi-phase plan',
        'Break down revenue by customer segment',
        'Use comparable companies as benchmarks',
        'Be realistic - investors prefer honesty over hype'
      ]
    },

    // Fundraising Questions
    {
      id: 'f1',
      question: 'Why are you raising this amount?',
      category: 'fundraising',
      difficulty: 'common',
      why: 'Arbitrary numbers suggest poor planning.',
      goodAnswer: 'We\'re raising $2M for 18 months of runway. $800K for engineering (hire 3 engineers), $600K for sales/marketing (hire 2 AEs, scale paid ads), $400K for ops, $200K buffer. This gets us to $500K ARR and sets us up for a strong Series A at $3M ARR.',
      badAnswer: 'We could use anywhere from $1M to $5M.',
      tips: [
        'Break down use of funds by category',
        'Explain what milestones this enables',
        'Show 18-24 month runway',
        'Connect this round to next round positioning'
      ]
    },
    {
      id: 'f2',
      question: 'Who else is in this round?',
      category: 'fundraising',
      difficulty: 'tough',
      why: 'Social proof matters. Are other smart investors backing you?',
      goodAnswer: 'We have a $1M commitment from [Tier 1 VC]. We\'re raising the remaining $1M from strategic angels in fintech. [Name] (former CFO of Square) is leading with $250K. We\'re oversubscribed - closing in 2 weeks.',
      badAnswer: 'You\'re the first investor we\'re talking to.',
      tips: [
        'Lead with your strongest investor/commitment',
        'Name-drop credible angels or advisors',
        'Create urgency ("closing soon", "oversubscribed")',
        'If you have no commits yet, be honest but confident'
      ]
    }
  ];

  const toggleQuestion = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id);
  };

  const difficultyColors = {
    common: 'bg-success-subtle text-success border-success',
    tough: 'bg-warning-subtle text-warning border-warning',
    killer: 'bg-destructive-subtle text-destructive border-destructive'
  };

  const categories = [
    { id: 'market', label: 'Market & Competition' },
    { id: 'traction', label: 'Traction & Metrics' },
    { id: 'team', label: 'Team & Execution' },
    { id: 'business', label: 'Business Model' },
    { id: 'fundraising', label: 'Fundraising' }
  ];

  const filteredQuestions = questions.filter(q => q.category === activeTab);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Investor Q&A Prep
          </DialogTitle>
          <DialogDescription>
            Practice answering tough investor questions with proven frameworks and example responses
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="adaptive-tabs grid w-full grid-cols-5">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category.id} value={category.id} className="space-y-3 mt-4">
              {filteredQuestions.map(q => (
                <Card key={q.id} className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleQuestion(q.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                          <h4 className="font-semibold">{q.question}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${difficultyColors[q.difficulty]}`}>
                          {q.difficulty}
                        </Badge>
                        {expandedQuestion === q.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedQuestion === q.id && (
                    <div className="px-4 pb-4 space-y-4 border-t">
                      <div className="pt-4">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-info">Why They Ask This</p>
                            <p className="text-sm text-info mt-1">{q.why}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-success-subtle border border-success rounded-lg p-3">
                        <p className="text-xs font-semibold text-success mb-1">✓ Good Answer</p>
                        <p className="text-sm text-success">{q.goodAnswer}</p>
                      </div>

                      <div className="bg-destructive-subtle border border-destructive rounded-lg p-3">
                        <p className="text-xs font-semibold text-destructive mb-1">✗ Bad Answer</p>
                        <p className="text-sm text-destructive">{q.badAnswer}</p>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-semibold mb-2">Tips for Your Answer</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {q.tips.map((tip, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <Card className="p-4 bg-primary/5 mt-4">
          <h4 className="font-semibold mb-2 text-sm">Universal Q&A Tips</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Pause before answering - thinking shows thoughtfulness, not weakness</li>
            <li>Use the "STAR" method: Situation → Task → Action → Result</li>
            <li>Bring data whenever possible - numbers beat adjectives</li>
            <li>If you don't know, say "Great question - I don't have that data yet, but here's how I'd approach it..."</li>
            <li>Practice out loud 20+ times - muscle memory reduces nerves</li>
            <li>Record yourself - you'll catch filler words and weak spots</li>
          </ul>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
