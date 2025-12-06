import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

interface Decision {
  id: string;
  title: string;
  description: string;
  options: {
    label: string;
    pros: string[];
    cons: string[];
  }[];
  guideLink?: string;
}

const decisions: Decision[] = [
  {
    id: 'saas-vs-software',
    title: 'SaaS vs Software',
    description: 'Should you build a subscription service or one-time purchase?',
    options: [
      {
        label: 'SaaS (Subscription)',
        pros: ['Recurring revenue', 'Predictable income', 'Higher lifetime value'],
        cons: ['Requires ongoing support', 'Higher churn risk', 'More complex pricing']
      },
      {
        label: 'Software (One-time)',
        pros: ['Simpler model', 'No churn', 'Clear value proposition'],
        cons: ['One-time revenue', 'Harder to scale', 'Lower lifetime value']
      }
    ],
    guideLink: '/dashboard'
  },
  {
    id: 'solo-vs-cofounder',
    title: 'Solo vs Co-founder',
    description: 'Should you go solo or find a co-founder?',
    options: [
      {
        label: 'Solo Founder',
        pros: ['Full control', 'No equity split', 'Faster decisions'],
        cons: ['More work', 'Limited skillset', 'Lonely journey']
      },
      {
        label: 'Co-founder',
        pros: ['Shared workload', 'Complementary skills', 'Better for investors'],
        cons: ['Equity split', 'Potential conflicts', 'Slower decisions']
      }
    ],
    guideLink: '/dashboard'
  },
  {
    id: 'bootstrap-vs-raise',
    title: 'Bootstrap vs Raise',
    description: 'Should you bootstrap or raise funding?',
    options: [
      {
        label: 'Bootstrap',
        pros: ['Keep full ownership', 'No investor pressure', 'Sustainable growth'],
        cons: ['Slower growth', 'Limited resources', 'Personal financial risk']
      },
      {
        label: 'Raise Capital',
        pros: ['Faster growth', 'More resources', 'Network access'],
        cons: ['Dilution', 'Investor expectations', 'Fundraising time']
      }
    ],
    guideLink: '/dashboard'
  }
];

export const DecisionHelp = () => {
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Decision Help</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Unsure about something? Ask here</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedDecision(expandedDecision === decision.id ? null : decision.id)}
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{decision.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{decision.description}</p>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expandedDecision === decision.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>
              
              {expandedDecision === decision.id && (
                <div className="p-4 border-t bg-muted/30 space-y-4">
                  {decision.options.map((option, index) => (
                    <div key={index} className="space-y-2">
                      <p className="font-semibold text-sm">{option.label}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-medium text-green-600 mb-1">Pros:</p>
                          <ul className="space-y-1">
                            {option.pros.map((pro, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-red-600 mb-1">Cons:</p>
                          <ul className="space-y-1">
                            {option.cons.map((con, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-red-600">×</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                  {decision.guideLink && (
                    <Link to={decision.guideLink}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Detailed Guide
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

