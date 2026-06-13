import { useState, useMemo } from 'react';
import { Lock, Sparkles, Crown, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import promptData from '@/data/prompt_library_tiers.csv?raw';

type RawPromptTier = 'Free' | 'Creator' | 'Professional';

interface Prompt {
  name: string;
  tier: 'Free' | 'Rising' | 'Pro';
}

type FilterTier = 'All' | 'Free' | 'Rising' | 'Pro';

const PROMPT_TIER_MAP: Record<RawPromptTier, Prompt['tier']> = {
  Free: 'Free',
  Creator: 'Rising',
  Professional: 'Pro',
};

const parseCSV = (csvText: string): Prompt[] => {
  const lines = csvText.trim().split('\n');
  const prompts: Prompt[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const lastCommaIndex = line.lastIndexOf(',');
    if (lastCommaIndex === -1) continue;

    const name = line.substring(0, lastCommaIndex).trim();
    const rawTier = line.substring(lastCommaIndex + 1).trim() as RawPromptTier;
    const tier = PROMPT_TIER_MAP[rawTier];

    if (name && tier) {
      prompts.push({ name, tier });
    }
  }

  return prompts;
};

const tierConfig = {
  Free: {
    icon: Gift,
    color: 'bg-success-subtle text-success border-success',
    bgColor: 'bg-white',
    textColor: 'text-foreground',
    borderColor: 'border-border',
  },
  Rising: {
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
  },
  Pro: {
    icon: Crown,
    color: 'bg-warning-subtle text-warning border-warning',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
  },
};

export default function PromptLibraryCatalogue() {
  const [selectedFilter, setSelectedFilter] = useState<FilterTier>('All');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const prompts = useMemo(() => parseCSV(promptData), []);

  const filteredPrompts = useMemo(() => {
    if (selectedFilter === 'All') return prompts;
    return prompts.filter(prompt => prompt.tier === selectedFilter);
  }, [prompts, selectedFilter]);

  const tierCounts = useMemo(() => {
    return prompts.reduce((acc, prompt) => {
      acc[prompt.tier] = (acc[prompt.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [prompts]);

  const handleCardClick = (prompt: Prompt) => {
    if (prompt.tier !== 'Free') {
      setSelectedPrompt(prompt);
      setShowUpgradeModal(true);
    }
  };

  const filterButtons: { tier: FilterTier; label: string }[] = [
    { tier: 'All', label: `All (${prompts.length})` },
    { tier: 'Free', label: `Free (${tierCounts.Free || 0})` },
    { tier: 'Rising', label: `Rising (${tierCounts.Rising || 0})` },
    { tier: 'Pro', label: `Pro (${tierCounts.Pro || 0})` },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Prompt Library</h1>
        <p className="text-muted-foreground">Browse our collection of business prompts tailored to your needs</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {filterButtons.map(({ tier, label }) => (
          <Button
            key={tier}
            onClick={() => setSelectedFilter(tier)}
            variant={selectedFilter === tier ? 'default' : 'outline'}
            className="transition-all"
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPrompts.map((prompt, index) => {
          const isLocked = prompt.tier !== 'Free';
          const config = tierConfig[prompt.tier];
          const IconComponent = config.icon;

          return (
            <Card
              key={`${prompt.name}-${index}`}
              className={`
                relative overflow-hidden transition-all duration-200
                ${isLocked
                  ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] opacity-75'
                  : 'hover:shadow-lg hover:scale-[1.02]'
                }
                ${config.bgColor} ${config.borderColor}
              `}
              onClick={() => handleCardClick(prompt)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    className={`${config.color} font-medium flex items-center gap-1`}
                    variant="outline"
                  >
                    <IconComponent className="w-3 h-3" />
                    {prompt.tier}
                  </Badge>
                  {isLocked && (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                <h3
                  className={`
                    text-sm font-semibold leading-tight
                    ${isLocked ? 'text-muted-foreground blur-[0.5px]' : 'text-foreground'}
                  `}
                >
                  {prompt.name}
                </h3>

                {isLocked && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">Click to unlock</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPrompts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No prompts found for this filter</p>
        </div>
      )}

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPrompt && (
                <>
                  {selectedPrompt.tier === 'Rising' ? (
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Crown className="w-5 h-5 text-warning" />
                  )}
                  Upgrade to {selectedPrompt.tier}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              This prompt is exclusive to <span className="font-semibold">{selectedPrompt?.tier}</span> members.
              <br />
              <br />
              Upgrade your plan to unlock access to premium prompts and advanced features.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                window.location.href = '/pricing';
              }}
            >
              Upgrade Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
