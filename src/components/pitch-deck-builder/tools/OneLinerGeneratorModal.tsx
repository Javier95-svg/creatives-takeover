import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Copy, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface OneLinerGeneratorModalProps {
  onClose: () => void;
}

export const OneLinerGeneratorModal: React.FC<OneLinerGeneratorModalProps> = ({ onClose }) => {
  const [framework, setFramework] = useState('problem-solution');
  const [target, setTarget] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [benefit, setBenefit] = useState('');

  const generateOneLiner = () => {
    if (framework === 'problem-solution') {
      if (!target || !problem || !solution) return '';
      return `We help ${target} ${solution} so they can ${benefit || 'achieve their goals'}.`;
    } else if (framework === 'x-for-y') {
      if (!solution || !target) return '';
      return `${solution} for ${target}${benefit ? ` - ${benefit}` : ''}.`;
    } else if (framework === 'verb-the-noun') {
      if (!solution || !target) return '';
      return `${solution} the ${target}${benefit ? ` to ${benefit}` : ''}.`;
    }
    return '';
  };

  const oneLiner = generateOneLiner();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const examples = {
    'problem-solution': [
      'We help small businesses automate invoicing so they can get paid 2x faster.',
      'We help sales teams close deals faster so they can exceed their quotas.',
      'We help freelancers manage their finances so they can focus on their craft.'
    ],
    'x-for-y': [
      'Stripe for healthcare payments - compliant, secure, simple.',
      'Figma for data visualization - collaborative analytics for teams.',
      'Notion for customer success - all your CS workflows in one place.'
    ],
    'verb-the-noun': [
      'Automate the sales pipeline to close more deals.',
      'Democratize the stock market to empower everyday investors.',
      'Simplify the hiring process to find great talent faster.'
    ]
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            One-Liner Generator
          </DialogTitle>
          <DialogDescription>
            Craft the perfect elevator pitch using proven frameworks
          </DialogDescription>
        </DialogHeader>

        <Tabs value={framework} onValueChange={setFramework} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="problem-solution">We Help X</TabsTrigger>
            <TabsTrigger value="x-for-y">X for Y</TabsTrigger>
            <TabsTrigger value="verb-the-noun">Verb the Noun</TabsTrigger>
          </TabsList>

          {/* Problem-Solution Framework */}
          <TabsContent value="problem-solution" className="space-y-4 mt-4">
            <Card className="p-4 bg-primary/5">
              <p className="text-sm font-medium mb-1">Framework</p>
              <p className="text-sm text-muted-foreground">
                "We help <strong>[target audience]</strong> <strong>[solve problem / achieve goal]</strong> so they can <strong>[benefit]</strong>."
              </p>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="target">Target Audience</Label>
                <Input
                  id="target"
                  placeholder="e.g., small business owners, sales teams, freelancers"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="solution">What You Do (action/solution)</Label>
                <Input
                  id="solution"
                  placeholder="e.g., automate invoicing, close deals faster, manage finances"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="benefit">Ultimate Benefit</Label>
                <Input
                  id="benefit"
                  placeholder="e.g., get paid 2x faster, exceed quotas, focus on their craft"
                  value={benefit}
                  onChange={(e) => setBenefit(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {oneLiner && (
              <Card className="p-4 bg-success-subtle border-success">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-success mb-1">Your One-Liner</p>
                    <p className="text-lg font-semibold text-success">{oneLiner}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleCopy(oneLiner)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Examples</p>
              <div className="space-y-2">
                {examples['problem-solution'].map((example, idx) => (
                  <Card key={idx} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleCopy(example)}>
                    <p className="text-sm">{example}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* X for Y Framework */}
          <TabsContent value="x-for-y" className="space-y-4 mt-4">
            <Card className="p-4 bg-primary/5">
              <p className="text-sm font-medium mb-1">Framework</p>
              <p className="text-sm text-muted-foreground">
                "<strong>[Known product/company]</strong> for <strong>[new market/use case]</strong>."
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Best for: Leveraging familiar products to explain your value proposition quickly
              </p>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="solution-xy">Your Product / What You Do</Label>
                <Input
                  id="solution-xy"
                  placeholder="e.g., Stripe, Figma, Notion"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="target-xy">For Whom / What Market</Label>
                <Input
                  id="target-xy"
                  placeholder="e.g., healthcare payments, data visualization, customer success"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="benefit-xy">Key Differentiator (optional)</Label>
                <Input
                  id="benefit-xy"
                  placeholder="e.g., compliant and secure, collaborative for teams"
                  value={benefit}
                  onChange={(e) => setBenefit(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {oneLiner && (
              <Card className="p-4 bg-success-subtle border-success">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-success mb-1">Your One-Liner</p>
                    <p className="text-lg font-semibold text-success">{oneLiner}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleCopy(oneLiner)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Examples</p>
              <div className="space-y-2">
                {examples['x-for-y'].map((example, idx) => (
                  <Card key={idx} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleCopy(example)}>
                    <p className="text-sm">{example}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Verb the Noun Framework */}
          <TabsContent value="verb-the-noun" className="space-y-4 mt-4">
            <Card className="p-4 bg-primary/5">
              <p className="text-sm font-medium mb-1">Framework</p>
              <p className="text-sm text-muted-foreground">
                "<strong>[Action verb]</strong> the <strong>[category/noun]</strong> to <strong>[outcome]</strong>."
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Best for: Bold, category-defining positioning
              </p>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="solution-verb">Action (what you do)</Label>
                <Input
                  id="solution-verb"
                  placeholder="e.g., Automate, Democratize, Simplify, Transform"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="target-verb">The Category / Process</Label>
                <Input
                  id="target-verb"
                  placeholder="e.g., sales pipeline, stock market, hiring process"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="benefit-verb">Desired Outcome (optional)</Label>
                <Input
                  id="benefit-verb"
                  placeholder="e.g., close more deals, empower investors, find great talent"
                  value={benefit}
                  onChange={(e) => setBenefit(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {oneLiner && (
              <Card className="p-4 bg-success-subtle border-success">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-success mb-1">Your One-Liner</p>
                    <p className="text-lg font-semibold text-success">{oneLiner}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleCopy(oneLiner)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Examples</p>
              <div className="space-y-2">
                {examples['verb-the-noun'].map((example, idx) => (
                  <Card key={idx} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleCopy(example)}>
                    <p className="text-sm">{example}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="p-4 bg-muted/30 mt-4">
          <h4 className="font-semibold mb-2 text-sm">Tips for a Great One-Liner</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Keep it under 15 words - must be memorable</li>
            <li>Avoid jargon - your grandma should understand it</li>
            <li>Focus on the benefit, not features</li>
            <li>Test it with 10 people - if they can't repeat it, simplify</li>
            <li>Use concrete language over abstract concepts</li>
          </ul>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
