import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, Users, AlertTriangle, Megaphone, BarChart3, FileText } from 'lucide-react';
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

const ICPBuilder: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshBalance } = useCredits();
  const { ensureCredits, handleCreditError } = useCreditActions();
  const { checkFeatureAccess } = useFeatureGating();
  const { openUpgradePrompt } = useUpgradePrompt();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ICPAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('input');

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

      const descriptionParts: string[] = [];
      descriptionParts.push(`Problem: ${formData.problemStatement}`);
      descriptionParts.push(`Product/Service: ${formData.productDescription}`);
      descriptionParts.push(`Target Audience: ${formData.targetAudience}`);
      if (formData.industry) {
        descriptionParts.push(`Industry: ${formData.industry}`);
      }
      if (formData.revenueModel) {
        descriptionParts.push(`Revenue Model: ${formData.revenueModel}`);
      }
      if (formData.mainCompetitors) {
        descriptionParts.push(`Main Competitors: ${formData.mainCompetitors}`);
      }
      if (formData.unfairAdvantage) {
        descriptionParts.push(`Unfair Advantage: ${formData.unfairAdvantage}`);
      }
      if (formData.currentTraction) {
        descriptionParts.push(`Current Traction: ${formData.currentTraction}`);
      }

      const businessDescription = descriptionParts.join('\n\n');

      const { data, error } = await supabase.functions.invoke('icp-analyzer', {
        body: {
          businessDescription,
          targetAudience: formData.targetAudience,
          industry: formData.industry || undefined,
          competitors: formData.mainCompetitors || undefined,
          unfairAdvantage: formData.unfairAdvantage || undefined,
        },
      });

      if (error) {
        if (handleCreditError(error, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) {
          return;
        }
        throw error;
      }

      if (data?.creditError) {
        if (handleCreditError(null, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) {
          return;
        }
      }

      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        setActiveTab('profile');

        toast({
          title: "ICP Analysis Complete!",
          description: `Your niche viability score is ${data.analysis.nicheScore?.overall || 'N/A'}/100 - ${data.analysis.nicheScore?.verdict || 'N/A'}. Review your detailed ICP below.`,
        });
        await refreshBalance();
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing ICP:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze ICP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
        <Button onClick={() => setActiveTab('input')}>
          Go to Product Brief
        </Button>
      </CardContent>
    </Card>
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
              <TabsTrigger value="input">
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Product Brief</span>
                <span className="sm:hidden">Brief</span>
              </TabsTrigger>
              <TabsTrigger value="profile">
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Niche Profile</span>
                <span className="sm:hidden">Niche</span>
              </TabsTrigger>
              <TabsTrigger value="painpoints">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Pain Points</span>
                <span className="sm:hidden">Pains</span>
              </TabsTrigger>
              <TabsTrigger value="positioning">
                <Megaphone className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Positioning</span>
                <span className="sm:hidden">Position</span>
              </TabsTrigger>
              <TabsTrigger value="report">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Full Report</span>
                <span className="sm:hidden">Report</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="mt-6">
              <ICPInputForm
                onSubmit={handleFormSubmit}
                isSubmitting={isAnalyzing}
              />
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              {analysis?.nicheProfile ? (
                <ICPNicheProfile profile={analysis.nicheProfile} />
              ) : (
                <EmptyState message="Run an ICP analysis first to see your detailed niche profile. Go to the Product Brief tab and click 'Identify My ICP'." />
              )}
            </TabsContent>

            <TabsContent value="painpoints" className="mt-6">
              {analysis?.painPoints ? (
                <ICPPainPoints painPoints={analysis.painPoints} />
              ) : (
                <EmptyState message="Run an ICP analysis first to see the niche pain points. Go to the Product Brief tab and click 'Identify My ICP'." />
              )}
            </TabsContent>

            <TabsContent value="positioning" className="mt-6">
              {analysis?.positioningStrategy ? (
                <ICPPositioning positioning={analysis.positioningStrategy} />
              ) : (
                <EmptyState message="Run an ICP analysis first to see your positioning strategy. Go to the Product Brief tab and click 'Identify My ICP'." />
              )}
            </TabsContent>

            <TabsContent value="report" className="mt-6">
              {analysis?.nicheScore ? (
                <ICPNicheScore
                  score={analysis.nicheScore}
                  actionPlan={analysis.actionPlan}
                />
              ) : (
                <EmptyState message="Run an ICP analysis first to see the full report with niche viability score. Go to the Product Brief tab and click 'Identify My ICP'." />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ICPBuilder;
