import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Lightbulb, Sparkles, Users, Rocket, ChevronLeft, ChevronRight, X } from "lucide-react";

interface OnboardingStep4PlatformTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const features = [
  {
    id: 1,
    title: "Dashboard",
    icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
    description: "Your command center for tracking progress",
    details: "Track daily check-ins, maintain momentum streaks, and manage priorities. Monitor your business health, view your roadmap, and stay organized with task management—all in one place.",
    gradient: "from-green-500/20 to-green-500/5"
  },
  {
    id: 2,
    title: "BizMap AI",
    icon: <Lightbulb className="h-8 w-8 text-primary" />,
    description: "Transform ideas into strategic roadmaps",
    details: "Get AI-powered market research, competitor analysis, and actionable steps. Transform scattered ideas into a strategic roadmap and launch your creative business in 30 days with guided planning.",
    gradient: "from-primary/20 to-primary/5"
  },
  {
    id: 3,
    title: "Prompt Library",
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    description: "Discover tested prompt-chains",
    details: "Jumpstart your business planning with proven frameworks across AI, e-commerce, SaaS, and more. Explore tested prompt-chains from uprising industries, ready to use in BizMap AI.",
    gradient: "from-purple-500/20 to-purple-500/5"
  },
  {
    id: 4,
    title: "Insighta",
    icon: <Rocket className="h-8 w-8 text-primary" />,
    description: "Your fundraising hub",
    details: "Access funding opportunities, investor resources, and fundraising tools. Get insights on how to prepare your pitch, find the right investors, and navigate the fundraising process.",
    gradient: "from-blue-500/20 to-blue-500/5"
  },
  {
    id: 5,
    title: "Community",
    icon: <Users className="h-8 w-8 text-primary" />,
    description: "Join creative entrepreneurs",
    details: "Share your journey, celebrate wins, get honest feedback, and find accountability partners. Connect with founders who understand your journey and will keep you moving forward.",
    gradient: "from-secondary/20 to-secondary/5"
  },
];

export const OnboardingStep4PlatformTour = ({ 
  onComplete, 
  onSkip 
}: OnboardingStep4PlatformTourProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentFeature = features[currentIndex];

  const handleNext = () => {
    if (currentIndex < features.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader className="text-center space-y-4 pb-6">
        <DialogTitle className="text-3xl font-bold">
          Welcome to Your Platform
        </DialogTitle>
        <DialogDescription className="text-lg text-muted-foreground">
          Let's take a quick tour of the main features (Step {currentIndex + 1} of {features.length})
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Feature Card */}
        <Card className={`border-2 border-border overflow-hidden bg-gradient-to-br ${currentFeature.gradient}`}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {currentFeature.icon}
                <CardTitle className="text-2xl">{currentFeature.title}</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                {currentIndex + 1} / {features.length}
              </div>
            </div>
            <p className="text-muted-foreground font-medium">{currentFeature.description}</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{currentFeature.details}</p>
          </CardContent>
        </Card>

        {/* Navigation Dots */}
        <div className="flex justify-center space-x-2">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to feature ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip Tour
          </Button>

          <Button
            onClick={handleNext}
            disabled={false}
          >
            {currentIndex === features.length - 1 ? "Finish" : "Next"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DialogContent>
  );
};

