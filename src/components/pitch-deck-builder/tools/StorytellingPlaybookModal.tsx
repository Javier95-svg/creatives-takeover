import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, CheckCircle2, Lightbulb, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StorytellingPlaybookModalProps {
  onClose: () => void;
}

export const StorytellingPlaybookModal: React.FC<StorytellingPlaybookModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('hero-journey');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Storytelling Playbook
          </DialogTitle>
          <DialogDescription>
            Master the art of compelling narratives that resonate with investors
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hero-journey">Hero's Journey</TabsTrigger>
            <TabsTrigger value="problem-agitate">Problem-Agitate</TabsTrigger>
            <TabsTrigger value="before-after">Before/After</TabsTrigger>
            <TabsTrigger value="data-story">Data-Driven</TabsTrigger>
          </TabsList>

          {/* Hero's Journey */}
          <TabsContent value="hero-journey" className="space-y-4 mt-4">
            <Card className="p-4 bg-primary/5">
              <h3 className="font-semibold mb-2">The Hero's Journey Framework</h3>
              <p className="text-sm text-muted-foreground">
                Position your customer as the hero, your product as the guide, and the market problem as the villain to defeat.
              </p>
            </Card>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold">The Ordinary World</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show the status quo before your solution. What does your customer's daily life look like?
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "Sarah runs a bakery. Every weekend, she spends 10 hours manually chasing late payments instead of baking."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold">The Call to Adventure (The Problem)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Introduce the disruption or pain point that demands action.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "Last month, $5,000 in late payments forced Sarah to delay hiring her first employee. She's stuck."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Meeting the Guide (Your Solution)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter as the trusted advisor with a clear plan to solve the problem.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "Sarah discovered our automated invoicing platform. Setup took 5 minutes. Smart reminders started working immediately."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">4</div>
                <div className="flex-1">
                  <h4 className="font-semibold">The Transformation (Success)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show the hero achieving their goal with your help.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "Within 30 days, Sarah's payment collection time dropped from 45 days to 12 days. She hired two employees this quarter."
                    </p>
                  </Card>
                </div>
              </div>
            </div>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">When to Use This Framework</p>
                  <p className="text-sm text-green-700 mt-1">
                    Best for B2C products, consumer-facing services, or when you have compelling customer stories.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Problem-Agitate-Solve */}
          <TabsContent value="problem-agitate" className="space-y-4 mt-4">
            <Card className="p-4 bg-primary/5">
              <h3 className="font-semibold mb-2">Problem-Agitate-Solve Framework</h3>
              <p className="text-sm text-muted-foreground">
                Build tension around the problem before revealing your solution. Make investors feel the pain.
              </p>
            </Card>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Problem: State It Clearly</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define the problem in one clear sentence. Make it relatable.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "Small businesses wait an average of 42 days to get paid for invoices."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Agitate: Make It Painful</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Amplify the consequences. Show the cascading impact. Build urgency.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "This isn't just annoying - it's existential. 30% of small businesses fail due to cash flow problems.
                      Late payments force owners to choose between paying rent or paying employees. Every day matters."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Solve: Introduce Your Solution</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Now that the pain is clear, reveal how you solve it. Contrast is key.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "Our AI-powered platform automates payment reminders and predicts when customers will pay.
                      Our users get paid in 12 days on average - 72% faster than the industry standard."
                    </p>
                  </Card>
                </div>
              </div>
            </div>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">When to Use This Framework</p>
                  <p className="text-sm text-green-700 mt-1">
                    Best for B2B solutions, technical products, or when addressing urgent, high-stakes problems.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Before/After Bridge */}
          <TabsContent value="before-after" className="space-y-4 mt-4">
            <Card className="p-4 bg-primary/5">
              <h3 className="font-semibold mb-2">Before/After Bridge Framework</h3>
              <p className="text-sm text-muted-foreground">
                Paint a vivid contrast between the old way and your new way. Show transformation.
              </p>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 border-2 border-red-200 bg-red-50">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="destructive">Before</Badge>
                  <h4 className="font-semibold text-red-900">The Old Way</h4>
                </div>
                <ul className="space-y-2 text-sm text-red-700">
                  <li className="flex gap-2">
                    <span className="text-red-500">×</span>
                    <span>Manual invoicing takes 15 minutes per invoice</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500">×</span>
                    <span>Customers forget to pay, requiring awkward follow-ups</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500">×</span>
                    <span>Cash flow is unpredictable - can't plan ahead</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500">×</span>
                    <span>Lost track of $10K in unpaid invoices</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-4 border-2 border-green-200 bg-green-50">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-green-600">After</Badge>
                  <h4 className="font-semibold text-green-900">With Your Solution</h4>
                </div>
                <ul className="space-y-2 text-sm text-green-700">
                  <li className="flex gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Generate invoices in 30 seconds with AI</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Automated reminders sent at optimal times</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Predict cash flow 90 days out with 95% accuracy</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Real-time dashboard shows every dollar owed</span>
                  </li>
                </ul>
              </Card>
            </div>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">The Bridge: How You Get There</h4>
              <p className="text-sm text-blue-700">
                "Our platform connects to your existing accounting software in 60 seconds.
                AI learns from your invoicing patterns and starts automating within 24 hours.
                Most customers see results in their first week."
              </p>
            </Card>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">When to Use This Framework</p>
                  <p className="text-sm text-green-700 mt-1">
                    Best for demonstrating transformation, workflow improvements, or when you have clear before/after metrics.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Data-Driven Story */}
          <TabsContent value="data-story" className="space-y-4 mt-4">
            <Card className="p-4 bg-primary/5">
              <h3 className="font-semibold mb-2">Data-Driven Story Framework</h3>
              <p className="text-sm text-muted-foreground">
                Lead with compelling metrics, then explain why they matter. Numbers + narrative = powerful pitch.
              </p>
            </Card>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Hook with a Shocking Stat</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Open with a number that makes investors lean forward.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "Small businesses are owed $825 billion in unpaid invoices right now. That's larger than Sweden's GDP."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Humanize the Data</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Translate the number into real-world impact.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "For the average bakery, that's $15,000 locked up in late payments - enough to hire another baker or open a second location."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Show Your Traction Data</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Prove you're solving this problem at scale.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "We've helped 2,000 businesses recover $50M in late payments. Our users get paid 72% faster than industry average."
                    </p>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">4</div>
                <div className="flex-1">
                  <h4 className="font-semibold">Project Future Impact</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    End with the vision - where the data is headed.
                  </p>
                  <Card className="mt-2 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Example</p>
                    <p className="text-sm text-muted-foreground">
                      "If we reach just 2% of small businesses, we'll unlock $16 billion in cash flow. That's 100,000 new jobs created."
                    </p>
                  </Card>
                </div>
              </div>
            </div>

            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">When to Use This Framework</p>
                  <p className="text-sm text-green-700 mt-1">
                    Best for growth-stage companies with strong traction, data-heavy industries, or quantitative investors.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="p-4 bg-muted/30 mt-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-2 text-sm">Universal Storytelling Principles</h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Always start with the problem, not your solution</li>
                <li>Use specific examples and names (Sarah the baker &gt; &quot;a customer&quot;)</li>
                <li>Show transformation - before/after is powerful</li>
                <li>End with a vision of the future you&apos;re building</li>
                <li>Practice your pitch 50 times - storytelling improves with repetition</li>
              </ul>
            </div>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
