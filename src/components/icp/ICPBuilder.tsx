import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, Users, AlertTriangle, Megaphone, BarChart3, FileText, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { supabase } from '@/integrations/supabase/client';
import ICPInputForm, { type ICPInputFormData } from './ICPInputForm';
import ICPNicheProfile from './ICPNicheProfile';
import ICPPainPoints from './ICPPainPoints';
import ICPPositioning from './ICPPositioning';
import ICPNicheScore from './ICPNicheScore';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';

interface ICPAnalysis {
  nicheScore: {
    overall: number;
    verdict: 'Highly Viable' | 'Promising' | 'Needs Refinement';
    subScores: {
      marketSize: number;
      painIntensity: number;
      accessibility: number;
      competitiveGap: number;
    };
    reasoning: string;
  };
  nicheProfile: {
    nicheName: string;
    nicheDescription: string;
    demographics: {
      age: string;
      gender: string;
      location: string;
      income: string;
      education: string;
      occupation: string;
    };
    psychographics: {
      values: string[];
      interests: string[];
      behaviors: string[];
      lifestyle: string;
      attitudes: string;
    };
    buyingBehavior: {
      decisionProcess: string;
      budgetRange: string;
      purchaseFrequency: string;
      triggers: string[];
    };
    whereToFindThem: {
      onlineChannels: string[];
      offlineChannels: string[];
      communities: string[];
      influencers: string[];
    };
    nicheSize: string;
    growthTrend: string;
  };
  painPoints: Array<{
    painPoint: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    frequency: string;
    currentSolution: string;
    gapInCurrentSolution: string;
    opportunityScore: number;
  }>;
  positioningStrategy: {
    positioningStatement: string;
    uniqueValueProposition: string;
    keyDifferentiators: string[];
    messagingFramework: {
      headline: string;
      subheadline: string;
      keyMessages: string[];
      toneOfVoice: string;
    };
    competitivePositioning: Array<{
      competitor: string;
      theirPositioning: string;
      yourAdvantage: string;
      differentiationAngle: string;
    }>;
    brandPersonality: string[];
  };
  actionPlan: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
    channel: string;
  }>;
}

const RESULT_TABS = [
  { value: 'profile', icon: Users, label: 'Niche Profile', short: 'Niche' },
  { value: 'painpoints', icon: AlertTriangle, label: 'Pain Points', short: 'Pains' },
  { value: 'positioning', icon: Megaphone, label: 'Positioning', short: 'Position' },
  { value: 'report', icon: BarChart3, label: 'Full Report', short: 'Report' },
];

const ICPBuilder: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshBalance } = useCredits();
  const { ensureCredits, handleCreditError } = useCreditActions();
  const { checkFeatureAccess } = useFeatureGating();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { refreshProgress } = useBizMapProgress();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ICPAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [lastGoals, setLastGoals] = useState<string>('');
  const [analysisKey, setAnalysisKey] = useState(0);

  const hasAnalysis = analysis !== null;

  const handleFormSubmit = async (formData: ICPInputFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use ICP Builder",
        variant: "destructive",
      });
      return;
    }

    const featureAccess = checkFeatureAccess('icp_analysis');
    if (!featureAccess.hasAccess) {
      openUpgradePrompt({
        reason: 'feature',
        featureName: 'ICP Builder',
        requiredTier: featureAccess.requiredTier as 'creator' | 'professional' | undefined,
        description: featureAccess.message || "Upgrade to Creator tier to run full ICP analysis.",
      });
      return;
    }

    const requiredCredits = ensureCredits('ICP_ANALYSIS', { featureName: 'ICP Builder' });
    if (requiredCredits === null) return;

    try {
      setIsAnalyzing(true);
      setLastGoals(formData.nextGoals);

      const descriptionParts: string[] = [];
      descriptionParts.push(`Problem: ${formData.problemStatement}`);
      descriptionParts.push(`Target Customer: ${formData.targetAudience}`);
      descriptionParts.push(`Solution Differentiator: ${formData.solutionDifferentiator}`);
      descriptionParts.push(`Founder Edge: ${formData.founderEdge}`);
      descriptionParts.push(`Next Goals: ${formData.nextGoals}`);
      if (formData.industry) descriptionParts.push(`Industry: ${formData.industry}`);
      if (formData.revenueModel) descriptionParts.push(`Revenue Model: ${formData.revenueModel}`);
      if (formData.mainCompetitors) descriptionParts.push(`Main Competitors: ${formData.mainCompetitors}`);
      if (formData.currentTraction) descriptionParts.push(`Current Traction: ${formData.currentTraction}`);

      const businessDescription = descriptionParts.join('\n\n');

      const { data, error } = await supabase.functions.invoke('icp-analyzer', {
        body: {
          businessDescription,
          targetAudience: formData.targetAudience,
          industry: formData.industry || undefined,
          competitors: formData.mainCompetitors || undefined,
          unfairAdvantage: formData.founderEdge || undefined,
        },
      });

      if (error) {
        if (handleCreditError(error, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) return;
        throw error;
      }

      if (data?.creditError) {
        if (handleCreditError(null, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) return;
      }

      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        setAnalysisKey(k => k + 1);
        setActiveTab('profile');
        await refreshProgress();
        toast({
          title: "ICP Analysis Complete!",
          description: `Niche viability score: ${data.analysis.nicheScore?.overall || 'N/A'}/100 — ${data.analysis.nicheScore?.verdict || 'N/A'}.`,
        });
        await refreshBalance();
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Error analyzing ICP:', err);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : "Failed to analyze ICP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-2">Run your analysis first</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">{message}</p>
      <Button size="sm" onClick={() => setActiveTab('input')}>
        Go to Foundation
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            ICP Builder
          </CardTitle>
          <CardDescription>
            Identify your ideal customer profile and specific niche market. Get actionable positioning strategy and pain point analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="adaptive-tabs grid w-full grid-cols-5">
              {/* Foundation tab */}
              <TabsTrigger value="input" className="gap-1.5">
                {hasAnalysis ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 shrink-0" />
                )}
                <span className="hidden sm:inline">Foundation</span>
                <span className="sm:hidden">Brief</span>
              </TabsTrigger>

              {/* Result tabs — dimmed until analysis runs */}
              {RESULT_TABS.map(({ value, icon: Icon, label, short }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  disabled={!hasAnalysis}
                  className={cn('gap-1.5 transition-opacity duration-300', !hasAnalysis && 'opacity-40')}
                >
                  {!hasAnalysis ? (
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 shrink-0" />
                  )}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Loading overlay */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in-up">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping bg-primary/10" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium">Analyzing your niche market…</p>
                  <p className="text-sm text-muted-foreground">This takes about 20–30 seconds</p>
                </div>
              </div>
            )}

            {!isAnalyzing && (
              <>
                <TabsContent value="input" className="mt-6">
                  <ICPInputForm onSubmit={handleFormSubmit} isSubmitting={isAnalyzing} />
                </TabsContent>

                <TabsContent value="profile" className="mt-6">
                  {analysis?.nicheProfile ? (
                    <div key={analysisKey} className="animate-fade-in-up">
                      <ICPNicheProfile profile={analysis.nicheProfile} />
                    </div>
                  ) : (
                    <EmptyState message="Answer the 5 foundation questions and run your analysis to see the niche profile." />
                  )}
                </TabsContent>

                <TabsContent value="painpoints" className="mt-6">
                  {analysis?.painPoints ? (
                    <div key={analysisKey} className="animate-fade-in-up">
                      <ICPPainPoints painPoints={analysis.painPoints} />
                    </div>
                  ) : (
                    <EmptyState message="Run your ICP analysis to uncover the most critical pain points in your niche." />
                  )}
                </TabsContent>

                <TabsContent value="positioning" className="mt-6">
                  {analysis?.positioningStrategy ? (
                    <div key={analysisKey} className="animate-fade-in-up">
                      <ICPPositioning positioning={analysis.positioningStrategy} />
                    </div>
                  ) : (
                    <EmptyState message="Run your ICP analysis to get your positioning strategy and competitive angles." />
                  )}
                </TabsContent>

                <TabsContent value="report" className="mt-6">
                  {analysis?.nicheScore ? (
                    <div key={analysisKey} className="animate-fade-in-up">
                      <ICPNicheScore
                        score={analysis.nicheScore}
                        actionPlan={analysis.actionPlan}
                        nextGoals={lastGoals}
                      />
                    </div>
                  ) : (
                    <EmptyState message="Run your ICP analysis to see the full viability report and action plan." />
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ICPBuilder;
