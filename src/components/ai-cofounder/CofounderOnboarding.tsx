import { useState } from 'react';
import { AIPersonality, MemoryPreference, MEMORY_PREFERENCES } from '@/types/personality';
import { PersonalitySelector } from './PersonalitySelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CofounderOnboardingProps {
  open: boolean;
  onComplete: () => void;
}

type Step = 'welcome' | 'personality' | 'memory' | 'confirmation';

export const CofounderOnboarding = ({ open, onComplete }: CofounderOnboardingProps) => {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedPersonality, setSelectedPersonality] = useState<AIPersonality>('balanced');
  const [memoryPreference, setMemoryPreference] = useState<MemoryPreference>('important');
  const { toast } = useToast();

  const handlePersonalitySelect = (personality: AIPersonality) => {
    setSelectedPersonality(personality);
    setStep('memory');
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          ai_personality: selectedPersonality,
          memory_preference: memoryPreference,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Welcome aboard! 🎉',
        description: 'Your AI co-founder is ready to help you build your business.',
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 'welcome' && (
          <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-4xl">Meet Your AI Co-Founder</DialogTitle>
            </DialogHeader>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              I'm here to help you turn your business idea into reality. I'll remember our conversations,
              celebrate your wins, and guide you through challenges. Let's personalize your experience.
            </p>
            <Button size="lg" onClick={() => setStep('personality')} className="mt-6">
              Let's Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 'personality' && (
          <>
            <DialogHeader>
              <DialogTitle>Step 1: Choose Your Personality</DialogTitle>
            </DialogHeader>
            <PersonalitySelector
              onSelect={handlePersonalitySelect}
              currentPersonality={selectedPersonality}
            />
          </>
        )}

        {step === 'memory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep('personality')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <DialogHeader>
                <DialogTitle>Step 2: Memory Preferences</DialogTitle>
              </DialogHeader>
              <div className="w-20" /> {/* Spacer for alignment */}
            </div>

            <p className="text-center text-muted-foreground">
              How much of our conversations should I remember?
            </p>

            <RadioGroup value={memoryPreference} onValueChange={(v) => setMemoryPreference(v as MemoryPreference)}>
              <div className="grid gap-4">
                {Object.values(MEMORY_PREFERENCES).map((pref) => (
                  <Card
                    key={pref.id}
                    className={`p-4 cursor-pointer transition-all ${
                      memoryPreference === pref.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setMemoryPreference(pref.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value={pref.id} id={pref.id} />
                      <Label htmlFor={pref.id} className="flex-1 cursor-pointer">
                        <div className="font-semibold">{pref.name}</div>
                        <div className="text-sm text-muted-foreground">{pref.description}</div>
                      </Label>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>

            <div className="flex justify-center">
              <Button size="lg" onClick={() => setStep('confirmation')}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-6 text-center py-8">
            <div className="flex justify-center">
              <div className="text-6xl">
                {selectedPersonality === 'cheerleader' && '🎉'}
                {selectedPersonality === 'strategist' && '🎯'}
                {selectedPersonality === 'therapist' && '💙'}
                {selectedPersonality === 'balanced' && '⚖️'}
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-3xl">All Set!</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-w-md mx-auto">
              <p className="text-muted-foreground">
                I'm ready to be your{' '}
                <span className="font-semibold text-foreground">
                  {selectedPersonality === 'cheerleader' && 'Cheerleader'}
                  {selectedPersonality === 'strategist' && 'Strategist'}
                  {selectedPersonality === 'therapist' && 'Therapist'}
                  {selectedPersonality === 'balanced' && 'Balanced Guide'}
                </span>{' '}
                and help you build something amazing.
              </p>
              <p className="text-sm text-muted-foreground">
                I'll remember{' '}
                <span className="font-semibold">
                  {memoryPreference === 'everything' && 'everything'}
                  {memoryPreference === 'important' && 'important moments'}
                  {memoryPreference === 'minimal' && 'major milestones'}
                </span>{' '}
                from our conversations.
              </p>
            </div>
            <Button size="lg" onClick={handleComplete} className="mt-6">
              Start Building
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
