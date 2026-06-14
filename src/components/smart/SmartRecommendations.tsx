import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Lightbulb, TrendingUp, MessageCircle, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: string;
  type: 'feature' | 'action' | 'insight';
  title: string;
  description: string;
  action: {
    label: string;
    href: string;
  };
  priority: 'high' | 'medium' | 'low';
  context?: string; // e.g., 'bizmap-complete', 'dashboard-new', 'insighta-browse'
}

interface SmartRecommendationsProps {
  maxRecommendations?: number;
  className?: string;
}

/**
 * Smart recommendations component that provides contextual suggestions
 * based on user's current location and activity
 */
export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  maxRecommendations = 3,
  className,
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateRecommendations();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [location.pathname, user]);

  const generateRecommendations = () => {
    const recs: Recommendation[] = [];

    // Context-aware recommendations based on current page
    if (location.pathname.includes('/bizmap-ai')) {
      recs.push({
        id: 'bizmap-to-insighta',
        type: 'feature',
        title: 'Explore Funding Opportunities',
        description: 'After completing your business plan, check out Insighta for funding opportunities tailored to your industry.',
        action: {
          label: 'View Funding',
          href: '/insighta',
        },
        priority: 'high',
        context: 'bizmap-active',
      });

      recs.push({
        id: 'bizmap-to-dashboard',
        type: 'action',
        title: 'Track Your Progress',
        description: 'Monitor your business goals and track daily progress on your dashboard.',
        action: {
          label: 'Go to Dashboard',
          href: '/dashboard',
        },
        priority: 'medium',
        context: 'bizmap-active',
      });
    }

    if (location.pathname.includes('/dashboard')) {
      recs.push({
        id: 'dashboard-to-bizmap',
        type: 'action',
        title: 'Start a New Business Plan',
        description: 'Use BizMap AI to create a comprehensive business plan for your next idea.',
        action: {
          label: 'Create Plan',
          href: '/bizmap-ai',
        },
        priority: 'high',
        context: 'dashboard-view',
      });

      recs.push({
        id: 'dashboard-to-insighta',
        type: 'feature',
        title: 'Find Funding for Your Projects',
        description: 'Browse funding opportunities that match your active projects.',
        action: {
          label: 'Explore Funding',
          href: '/insighta',
        },
        priority: 'medium',
        context: 'dashboard-view',
      });
    }

    if (location.pathname.includes('/insighta') || location.pathname.includes('/blog')) {
      recs.push({
        id: 'insighta-to-bizmap',
        type: 'action',
        title: 'Create Your Business Plan',
        description: 'Before applying for funding, create a comprehensive business plan with BizMap AI.',
        action: {
          label: 'Start Planning',
          href: '/bizmap-ai',
        },
        priority: 'high',
        context: 'insighta-browse',
      });

      recs.push({
        id: 'insighta-to-dashboard',
        type: 'action',
        title: 'Track Your Funding Goals',
        description: 'Add funding goals to your dashboard and track your application progress.',
        action: {
          label: 'View Dashboard',
          href: '/dashboard',
        },
        priority: 'medium',
        context: 'insighta-browse',
      });
    }

    // Filter out dismissed recommendations
    const filtered = recs
      .filter(rec => !dismissedIds.has(rec.id))
      .slice(0, maxRecommendations);

    setRecommendations(filtered);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    setRecommendations(prev => prev.filter(rec => rec.id !== id));
  };

  const getTypeIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="h-4 w-4" />;
      case 'action':
        return <Lightbulb className="h-4 w-4" />;
      case 'insight':
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-primary/50 bg-primary/5';
      case 'medium':
        return 'border-secondary/50 bg-secondary/5';
      case 'low':
        return 'border-muted bg-muted/30';
    }
  };

  if (recommendations.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {recommendations.map((rec) => (
        <Card
          key={rec.id}
          className={cn(
            "transition-all duration-300 hover:shadow-md",
            getPriorityColor(rec.priority)
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">
                  {getTypeIcon(rec.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold mb-1">
                    {rec.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleDismiss(rec.id)}
                aria-label="Dismiss recommendation"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="w-full"
            >
              <Link to={rec.action.href}>
                {rec.action.label}
                <ArrowRight className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

