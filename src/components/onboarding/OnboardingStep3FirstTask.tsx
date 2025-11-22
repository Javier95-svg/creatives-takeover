import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Eye, Sparkles } from "lucide-react";
import { OnboardingGoal } from "./OnboardingStep1GoalSelection";

interface OnboardingStep3FirstTaskProps {
  selectedGoal: OnboardingGoal | null;
  onContinue: () => void;
}

const goalExamples: Record<OnboardingGoal, string> = {
  "Get Funded": "I'm looking to raise funding for my idea. Example: I'm building an AI tool to help founders validate their business ideas and get investor-ready in 30 days...",
  "Launch in 30 Days": "I want to launch in 30 days. Example: I'm building an AI tool to help founders validate their business ideas quickly...",
  "Validate My Idea": "I want to validate my idea. Example: I'm building an AI tool to help founders validate their business ideas before investing too much time...",
  "Build My Team": "I'm looking to build my team for my idea. Example: I'm building an AI tool to help founders, and I need to find a co-founder who can handle the technical side...",
};

const exampleOutput = `Based on your idea, here's what I've prepared:

✅ **Market Analysis**: Identified 5 direct competitors and 3 market gaps
✅ **Target Audience**: Defined your ideal customer profile with demographics
✅ **Revenue Model**: Suggested 3 monetization strategies
✅ **MVP Roadmap**: 30-day action plan to launch your first version
✅ **Pitch Deck Outline**: Structured template for your investor pitch

Ready to dive deeper? Let's start building!`;

export const OnboardingStep3FirstTask = ({ 
  selectedGoal, 
  onContinue 
}: OnboardingStep3FirstTaskProps) => {
  const [showExample, setShowExample] = useState(false);
  const exampleText = selectedGoal ? goalExamples[selectedGoal] : goalExamples["Validate My Idea"];

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader className="text-center space-y-4 pb-6">
        <DialogTitle className="text-3xl font-bold">
          Let's Validate Your Idea in 60 Seconds
        </DialogTitle>
        <DialogDescription className="text-lg text-muted-foreground">
          Tell us about your {selectedGoal?.toLowerCase() || "idea"} and we'll help you get started
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <label htmlFor="idea-input" className="text-sm font-medium">
            Describe your idea
          </label>
          <Textarea
            id="idea-input"
            placeholder={exampleText}
            className="min-h-[120px] resize-none"
            defaultValue={exampleText}
          />
          <p className="text-xs text-muted-foreground">
            Don't worry about making it perfect – just share what's on your mind!
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowExample(!showExample)}
        >
          <Eye className="mr-2 h-4 w-4" />
          {showExample ? "Hide" : "See"} Example Output
        </Button>

        {showExample && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Example Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {exampleOutput}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="pt-6 flex justify-center">
        <Button size="lg" onClick={onContinue} className="px-8">
          Start Building
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </DialogContent>
  );
};

