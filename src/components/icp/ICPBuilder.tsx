import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, AlertTriangle, Megaphone, BarChart3, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useActivationJourney } from '@/hooks/useActivationJourney';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent, trackICPBuilderCompleted, trackICPBuilderStarted } from '@/lib/analytics';
import { reportAppError } from '@/lib/errorReporting';
import ICPInputForm, { type ICPInputFormData } from './ICPInputForm';
import ICPNicheProfile from './ICPNicheProfile';
import ICPPainPoints from './ICPPainPoints';
import ICPPositioning from './ICPPositioning';
import ICPNicheScore from './ICPNicheScore';
import {
  buildIcpBusinessDescription,
  getIcpFieldLabel,
  icpInputFormSchema,
  type IcpInputSchema,
} from '@/lib/icpBuilderSchema';

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

const ICP_RESULTS_TABLE = 'icp_analysis_results';
const ICP_ANALYSIS_TIMEOUT_MS = 45000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutHandle: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(new Error(`ICP analysis timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle);
    }
  }
};

const getErrorCode = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('timed out')) return 'timeout';
  if (message.includes('failed to fetch') || message.includes('network')) return 'network_error';
  if (message.includes('save') && message.includes('failed')) return 'save_failed';
  if (message.includes('validation')) return 'validation_failed';

  return 'unknown_error';
};

const ICPBuilder: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshBalance } = useCredits();
  const { handleCreditError } = useCreditActions();
  const { refreshActivation } = useActivationJourney('stage_i');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ICPAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('input');

  const persistIcpFallback = async (
    validatedFormData: IcpInputSchema,
    nextAnalysis: ICPAnalysis,
    businessDescription: string,
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from(ICP_RESULTS_TABLE)
      .insert({
        user_id: user.id,
        business_description: businessDescription,
        target_audience: validatedFormData.targetAudience,
        industry: validatedFormData.industry || null,
        niche_score: nextAnalysis.nicheScore?.overall ?? null,
        verdict: nextAnalysis.nicheScore?.verdict ?? null,
        analysis_data: nextAnalysis,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Save failed after analysis: ${error.message}`);
    }

    return (data as { id?: string } | null)?.id ?? null;
  };

  const handleSaveClick = async (formData: ICPInputFormData) => {
    const attemptStartedAt = Date.now();

    if (!user) {
      captureEvent('icp_profile_save_failed', {
        reason: 'unauthenticated',
        page_path: '/icp-builder',
      });
      toast({
        title: "Authentication Required",
        description: "Please sign in to use ICP Builder",
        variant: "destructive",
      });
      return;
    }

    if (isAnalyzing) {
      return;
    }

    try {
      const validationResult = icpInputFormSchema.safeParse(formData);

      if (!validationResult.success) {
        const missingFields = validationResult.error.issues.map((issue) => {
          const field = issue.path[0];
          return typeof field === 'string' ? getIcpFieldLabel(field as keyof IcpInputSchema) : 'unknown field';
        });

        captureEvent('icp_profile_save_failed', {
          reason: 'validation_failed',
          missingFields,
          issueCount: validationResult.error.issues.length,
          page_path: '/icp-builder',
        });

        toast({
          title: 'Complete the required inputs',
          description: `Please fix: ${Array.from(new Set(missingFields)).join(', ')}.`,
          variant: 'destructive',
        });
        setActiveTab('input');
        return;
      }

      setIsAnalyzing(true);
      trackICPBuilderStarted({ page_path: '/icp-builder' });
      captureEvent('icp_profile_save_attempted', {
        page_path: '/icp-builder',
      });

      const validatedFormData = validationResult.data;
      const businessDescription = buildIcpBusinessDescription(validatedFormData);
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `icp_${user.id}_${Date.now()}`;

      const { data, error } = await withTimeout(
        supabase.functions.invoke('icp-analyzer', {
          body: {
            businessDescription,
            targetAudience: validatedFormData.targetAudience,
            industry: validatedFormData.industry || undefined,
            competitors: validatedFormData.mainCompetitors || undefined,
            unfairAdvantage: validatedFormData.founderEdge || undefined,
          },
          headers: {
            'idempotency-key': idempotencyKey,
          },
        }),
        ICP_ANALYSIS_TIMEOUT_MS,
      );

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
        let analysisId = data.analysisId ?? null;

        if (!analysisId) {
          analysisId = await persistIcpFallback(validatedFormData, data.analysis, businessDescription);
        }

        if (!analysisId) {
          throw new Error('Save failed after analysis: the ICP result did not return an analysis ID.');
        }

        setAnalysis(data.analysis);
        setActiveTab('profile');

        captureEvent('icp_profile_saved', {
          analysisId,
          timeToSaveMs: Date.now() - attemptStartedAt,
          nicheScore: data.analysis.nicheScore?.overall,
          verdict: data.analysis.nicheScore?.verdict,
          page_path: '/icp-builder',
        });
        trackICPBuilderCompleted({
          analysisId,
          timeToSaveMs: Date.now() - attemptStartedAt,
          nicheScore: data.analysis.nicheScore?.overall,
          verdict: data.analysis.nicheScore?.verdict,
          page_path: '/icp-builder',
        });

        toast({
          title: "ICP Analysis Complete!",
          description: `Your niche viability score is ${data.analysis.nicheScore?.overall || 'N/A'}/100 - ${data.analysis.nicheScore?.verdict || 'N/A'}. Review your detailed ICP below.`,
        });
        await refreshBalance();
        await refreshActivation();
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      const errorCode = getErrorCode(error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze ICP. Please try again.';

      reportAppError(
        error instanceof Error ? error : new Error(String(error)),
        'window_error',
        {
          feature: 'icp_builder',
          action: 'save_profile',
          errorCode,
          pagePath: '/icp-builder',
        },
      );
      captureEvent('icp_profile_save_failed', {
        reason: errorCode,
        message: errorMessage,
        timeToFailureMs: Date.now() - attemptStartedAt,
        page_path: '/icp-builder',
      });
      captureEvent('icp_builder_completed', {
        success: false,
        failureReason: errorCode,
        message: errorMessage,
        timeToFailureMs: Date.now() - attemptStartedAt,
        page_path: '/icp-builder',
      });
      console.error('Error analyzing ICP:', error);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
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
                onSubmit={handleSaveClick}
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
