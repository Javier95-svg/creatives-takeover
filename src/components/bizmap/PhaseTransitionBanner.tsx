import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, X, Sparkles } from 'lucide-react';
import type { TransitionPrompt } from '@/store/leanStartupStore';

interface PhaseTransitionBannerProps {
  prompt: TransitionPrompt;
  onDismiss: () => void;
}

export default function PhaseTransitionBanner({ prompt, onDismiss }: PhaseTransitionBannerProps) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>

        <p className="flex-1 text-sm font-medium">{prompt.message}</p>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" className="gap-1.5" asChild>
            <Link to={prompt.ctaHref}>
              {prompt.ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
