import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, Users, CheckCircle2, FileText, FlaskConical, TrendingUp, ArrowRight, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { CreditGate } from '@/components/CreditGate';
import { CREDIT_COSTS } from '@/config/constants';
import { supabase } from '@/integrations/supabase/client';
import PMFScore from './PMFScore';
import PMFAnalysisResults from './PMFAnalysisResults';
import CustomerSegments from './CustomerSegments';
import ProblemSolutionFit from './ProblemSolutionFit';
import ValidationExperiments from './ValidationExperiments';

interface ProductMarketFitLabProps {
  businessPlanData?: {
    answers?: {
      overview?: string;
      market?: string;
      problem?: string;
      solution?: string;
      channels?: string;
      pricing?: string;
      goals?: string;
    };
    launchReport?: string;
    successScore?: any;
  };
  onDataExport?: (data: {
    selectedSegment?: string;
    refinedProblem?: string;
    pmfScore?: number;
    experiments?: any[];
  }) => void;
}

interface PMFAnalysis {
  pmfScore: {
    overall: number;
    verdict: 'Strong Fit' | 'Moderate Fit' | 'Weak Fit';
    subScores: {
      demand: number;
      differentiation: number;
      timing: number;
      executionRisk: number;
    };
    reasoning: string;
  };
  marketAnalysis: {
    demand: {
      assessment: string;
      marketSize: string;
      growthProjection: string;
      trends: string[];
    };
    competitiveLandscape: {
      directCompetitors: Array<{
        name: string;
        strengths: string[];
        weaknesses: string[];
      }>;
      indirectCompetitors: string[];
      marketPositioning: string;
      competitiveIntensity: 'High' | 'Medium' | 'Low';
    };
    differentiation: {
      uniqueValue: string;
      competitiveAdvantages: string[];
      moats: string[];
      differentiationGaps: string[];
    };
    scalability: {
      expansionPotential: string;
      unitEconomics: string;
      growthConstraints: string[];
      scalabilityScore: string;
    };
    risks: {
      marketRisks: Array<{
        risk: string;
        severity: 'High' | 'Medium' | 'Low';
        mitigation: string;
      }>;
      executionRisks: Array<{
        risk: string;
        severity: 'High' | 'Medium' | 'Low';
        mitigation: string;
      }>;
      timingRisks: Array<{
        risk: string;
        severity: 'High' | 'Medium' | 'Low';
        mitigation: string;
      }>;
    };
  };
  nextSteps: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
    estimatedTime?: string;
  }>;
  customerSegments?: Array<{
    name: string;
    demographics: string;
    psychographics: string;
    painPoints: string[];
    marketSize: string;
    accessibilityScore: number;
  }>;
  validationExperiments?: Array<{
    name: string;
    type: string;
    hypothesis: string;
    successMetrics: string[];
    estimatedTime: string;
    estimatedCost: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
  problemSolutionFit?: {
    alignmentScore: number;
    reasoning: string;
    gaps: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  surveys?: {
    primarySegment: string;
    questions: string[];
  };
  interviewScripts?: {
    opening: string[];
    problemExploration: string[];
    solutionValidation: string[];
    pricingSensitivity: string[];
    closing: string[];
  };
}

const ProductMarketFitLab: React.FC<ProductMarketFitLabProps> = ({ 
  businessPlanData,
  onDataExport 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasCredits } = useCredits();
  const [creditGateOpen, setCreditGateOpen] = useState(false);
  
  // Auto-prefill business description from business plan data
  const getInitialBusinessDescription = () => {
    if (businessPlanData?.answers) {
      const parts = [];
      if (businessPlanData.answers.overview) parts.push(businessPlanData.answers.overview);
      if (businessPlanData.answers.problem) parts.push(`Problem: ${businessPlanData.answers.problem}`);
      if (businessPlanData.answers.solution) parts.push(`Solution: ${businessPlanData.answers.solution}`);
      return parts.join('\n\n');
    }
    return '';
  };

  const [formData, setFormData] = useState({
    businessDescription: getInitialBusinessDescription(),
    targetMarket: businessPlanData?.answers?.market || '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PMFAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [selectedSegment, setSelectedSegment] = useState<string | undefined>();

  const handleExportSurvey = () => {
    console.log('Exporting survey:', analysis?.surveys);
    toast({
      title: "Survey Exported",
      description: "Survey has been prepared for download.",
    });
  };

  const handleExportInterviewScript = () => {
    console.log('Exporting interview script:', analysis?.interviewScripts);
    toast({
      title: "Interview Script Exported",
      description: "Interview script has been prepared for download.",
    });
  };

  const handleAnalyze = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use PMF Analysis",
        variant: "destructive",
      });
      return;
    }

    if (!hasCredits(CREDIT_COSTS.PMF_ANALYSIS)) {
      setCreditGateOpen(true);
      return;
    }

    if (!formData.businessDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a business description",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('pmf-analyzer', {
        body: {
          businessDescription: formData.businessDescription,
          targetMarket: formData.targetMarket || undefined,
          businessPlanData: businessPlanData ? {
            answers: businessPlanData.answers,
            launchReport: businessPlanData.launchReport
          } : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.creditError) {
        setCreditGateOpen(true);
        return;
      }

      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        
        // Export data back to business planner
        if (onDataExport && data.analysis) {
          onDataExport({
            selectedSegment: data.analysis.customerSegments?.[0]?.name,
            refinedProblem: formData.businessDescription,
            pmfScore: data.analysis.pmfScore?.overall,
            experiments: data.analysis.validationExperiments,
          });
        }

        toast({
          title: "Analysis Complete!",
          description: `Your PMF score is ${data.analysis.pmfScore?.overall || 'N/A'}/100 - ${data.analysis.pmfScore?.verdict || 'N/A'}. Review the insights below.`,
        });
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing PMF:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze PMF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  return (
    <div className="space-y-6">
      <CreditGate
        isOpen={creditGateOpen}
        onClose={() => setCreditGateOpen(false)}
        requiredCredits={CREDIT_COSTS.PMF_ANALYSIS}
        feature="PMF Analysis"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Product Market Fit Lab
          </CardTitle>
          <CardDescription>
            Validate your product in the market and discover if there's real demand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="input">
                <FileText className="w-4 h-4 mr-2" />
                Input
              </TabsTrigger>
              <TabsTrigger value="segments" disabled={!analysis}>
                <Users className="w-4 h-4 mr-2" />
                Segments
              </TabsTrigger>
              <TabsTrigger value="fit" disabled={!analysis}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Fit
              </TabsTrigger>
              <TabsTrigger value="score" disabled={!analysis}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Score
              </TabsTrigger>
              <TabsTrigger value="experiments" disabled={!analysis}>
                <FlaskConical className="w-4 h-4 mr-2" />
                Experiments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description *</Label>
                  <Textarea
                    id="businessDescription"
                    value={formData.businessDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                    placeholder="Describe your business idea, the problem you're solving, and your solution. Include key details about your target customers, value proposition, and any assumptions you're making..."
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Our AI will intelligently extract the problem, solution, market, and key assumptions from your description.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetMarket">Target Market (Optional)</Label>
                  <Input
                    id="targetMarket"
                    value={formData.targetMarket}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetMarket: e.target.value }))}
                    placeholder="Who is your target customer? (e.g., Small business owners, Students, etc.)"
                  />
                  <p className="text-xs text-muted-foreground">
                    If not specified, we'll infer from your business description.
                  </p>
                </div>

                {businessPlanData && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
                    <p className="font-medium text-primary mb-1">✓ Business Plan Data Loaded</p>
                    <p>Your business plan information has been pre-filled. You can edit or add more context.</p>
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !formData.businessDescription.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing PMF...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      Analyze Product-Market Fit
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="segments" className="mt-6">
              {analysis ? (
                <CustomerSegments
                  segments={analysis.customerSegments}
                  selectedSegment={selectedSegment}
                  onSelectSegment={setSelectedSegment}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see your customer segments. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fit" className="mt-6">
              {analysis && analysis.problemSolutionFit && analysis.surveys && analysis.interviewScripts ? (
                <ProblemSolutionFit
                  fit={analysis.problemSolutionFit}
                  surveys={analysis.surveys}
                  interviewScripts={analysis.interviewScripts}
                  onExportSurvey={handleExportSurvey}
                  onExportInterviewScript={handleExportInterviewScript}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see problem-solution fit insights. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="score" className="mt-6">
              {analysis ? (
                <PMFScore
                  score={analysis.pmfScore}
                  nextSteps={analysis.nextSteps}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see your PMF score. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="experiments" className="mt-6">
              {analysis ? (
                <ValidationExperiments
                  experiments={analysis.validationExperiments}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see validation experiments. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductMarketFitLab;

