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
import CustomerSegments from './CustomerSegments';
import ProblemSolutionFit from './ProblemSolutionFit';
import PMFScore from './PMFScore';
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
  customerSegments: Array<{
    name: string;
    demographics: string;
    psychographics: string;
    painPoints: string[];
    marketSize: string;
    accessibilityScore: number;
  }>;
  problemSolutionFit: {
    alignmentScore: number;
    reasoning: string;
    gaps: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  surveys: {
    primarySegment: string;
    questions: string[];
  };
  interviewScripts: {
    opening: string[];
    problemExploration: string[];
    solutionValidation: string[];
    pricingSensitivity: string[];
    closing: string[];
  };
  validationExperiments: Array<{
    name: string;
    type: string;
    hypothesis: string;
    successMetrics: string[];
    estimatedTime: string;
    estimatedCost: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
  pmfScore: {
    overall: number;
    breakdown: {
      problemClarity: number;
      solutionFit: number;
      marketSize: number;
      competitionAnalysis: number;
      validationReadiness: number;
      founderMarketFit: number;
    };
    reasoning: string;
  };
  nextSteps: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
  }>;
}

const ProductMarketFitLab: React.FC<ProductMarketFitLabProps> = ({ 
  businessPlanData,
  onDataExport 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasCredits } = useCredits();
  const [creditGateOpen, setCreditGateOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    businessConcept: businessPlanData?.answers?.overview || '',
    targetMarket: businessPlanData?.answers?.market || '',
    problemStatement: businessPlanData?.answers?.problem || '',
    solutionDescription: businessPlanData?.answers?.solution || '',
    currentAssumptions: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PMFAnalysis | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('input');

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

    if (!formData.businessConcept.trim() || !formData.problemStatement.trim() || !formData.solutionDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in Business Concept, Problem Statement, and Solution Description",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('pmf-analyzer', {
        body: {
          businessConcept: formData.businessConcept,
          targetMarket: formData.targetMarket,
          problemStatement: formData.problemStatement,
          solutionDescription: formData.solutionDescription,
          currentAssumptions: formData.currentAssumptions,
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
        setSelectedSegment(data.analysis.customerSegments[0]?.name || null);
        setActiveTab('segments');
        
        // Export data back to business planner
        if (onDataExport) {
          onDataExport({
            selectedSegment: data.analysis.customerSegments[0]?.name,
            refinedProblem: formData.problemStatement,
            pmfScore: data.analysis.pmfScore.overall,
            experiments: data.analysis.validationExperiments,
          });
        }

        toast({
          title: "Analysis Complete!",
          description: `Your PMF score is ${data.analysis.pmfScore.overall}/100. Review the insights below.`,
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

  const handleExportSurvey = () => {
    if (!analysis?.surveys) return;
    
    const surveyText = `Product-Market Fit Survey
Primary Segment: ${analysis.surveys.primarySegment}

Questions:
${analysis.surveys.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`;
    
    const blob = new Blob([surveyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pmf-survey.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Survey Downloaded",
      description: "Your PMF survey has been downloaded.",
    });
  };

  const handleExportInterviewScript = () => {
    if (!analysis?.interviewScripts) return;
    
    const scriptText = `Product-Market Fit Interview Script

OPENING QUESTIONS:
${analysis.interviewScripts.opening.map((q, i) => `${i + 1}. ${q}`).join('\n')}

PROBLEM EXPLORATION:
${analysis.interviewScripts.problemExploration.map((q, i) => `${i + 1}. ${q}`).join('\n')}

SOLUTION VALIDATION:
${analysis.interviewScripts.solutionValidation.map((q, i) => `${i + 1}. ${q}`).join('\n')}

PRICING SENSITIVITY:
${analysis.interviewScripts.pricingSensitivity.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CLOSING QUESTIONS:
${analysis.interviewScripts.closing.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`;
    
    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pmf-interview-script.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Interview Script Downloaded",
      description: "Your interview script has been downloaded.",
    });
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
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
              <TabsTrigger value="fit">Fit Analysis</TabsTrigger>
              <TabsTrigger value="score">PMF Score</TabsTrigger>
              <TabsTrigger value="experiments">Experiments</TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessConcept">Business Concept / Overview *</Label>
                  <Textarea
                    id="businessConcept"
                    value={formData.businessConcept}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessConcept: e.target.value }))}
                    placeholder="Describe your business idea in a few sentences..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetMarket">Target Market</Label>
                  <Input
                    id="targetMarket"
                    value={formData.targetMarket}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetMarket: e.target.value }))}
                    placeholder="Who is your target customer? (e.g., Small business owners, Students, etc.)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="problemStatement">Problem Statement *</Label>
                  <Textarea
                    id="problemStatement"
                    value={formData.problemStatement}
                    onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
                    placeholder="What problem are you solving? Be specific about the pain points..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solutionDescription">Solution Description *</Label>
                  <Textarea
                    id="solutionDescription"
                    value={formData.solutionDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, solutionDescription: e.target.value }))}
                    placeholder="How does your solution address the problem? Describe your product/service..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentAssumptions">Current Assumptions (Optional)</Label>
                  <Textarea
                    id="currentAssumptions"
                    value={formData.currentAssumptions}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentAssumptions: e.target.value }))}
                    placeholder="What assumptions are you making about your customers, market, or solution?"
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {businessPlanData && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
                    <p className="font-medium text-primary mb-1">✓ Business Plan Data Loaded</p>
                    <p>Your business plan information has been pre-filled. You can edit or add more context.</p>
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !formData.businessConcept.trim() || !formData.problemStatement.trim() || !formData.solutionDescription.trim()}
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
              {analysis ? (
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

