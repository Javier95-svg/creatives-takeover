import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoScenario } from "@/utils/demoDataSeeder";
import { 
  BarChart3, 
  Target, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2,
  ArrowRight,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BusinessPlanningDemoProps {
  scenario: DemoScenario;
}

const BusinessPlanningDemo = ({ scenario }: BusinessPlanningDemoProps) => {
  const navigate = useNavigate();

  const planSections = [
    { id: 'overview', label: 'Business Overview', icon: BarChart3 },
    { id: 'market', label: 'Target Market', icon: Users },
    { id: 'problem', label: 'Problem & Solution', icon: Target },
    { id: 'pricing', label: 'Pricing Strategy', icon: DollarSign },
    { id: 'goals', label: 'Goals & Milestones', icon: TrendingUp }
  ];

  const successMetrics = [
    { label: 'Market Clarity', score: 92, color: 'text-green-500' },
    { label: 'Problem Validation', score: 88, color: 'text-green-500' },
    { label: 'Solution Strength', score: 85, color: 'text-green-500' },
    { label: 'Financial Planning', score: 78, color: 'text-yellow-500' },
    { label: 'Execution Feasibility', score: 82, color: 'text-green-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Business Plan: {scenario.name}</h2>
            <p className="text-muted-foreground">
              Complete AI-generated business plan based on your conversation
            </p>
          </div>
          {scenario.successScore && (
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">
                {scenario.successScore}%
              </div>
              <p className="text-xs text-muted-foreground">Success Score</p>
            </div>
          )}
        </div>
      </div>

      {/* Business Plan Content */}
      <Card className="glass-card">
        <Tabs defaultValue="overview" className="p-6">
          <TabsList className="grid w-full grid-cols-5">
            {planSections.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={section.id} value={section.id} className="text-xs">
                  <Icon className="h-3 w-3 mr-1" />
                  {section.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Business Overview
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {scenario.businessData.overview}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Unique Value Proposition</h4>
              <p className="text-sm text-muted-foreground">
                {scenario.businessData.uniqueValue}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-4 mt-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Target Market
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {scenario.businessData.market}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Competitive Landscape</h4>
              <p className="text-sm text-muted-foreground">
                {scenario.businessData.competition}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="problem" className="space-y-4 mt-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Problem Statement
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {scenario.businessData.problem}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Solution</h4>
              <p className="text-sm text-muted-foreground">
                {scenario.businessData.solution}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Pricing Strategy
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {scenario.businessData.pricing}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 mt-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                90-Day Goals
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {scenario.businessData.goals}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Success Analysis */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">AI Success Analysis</h3>
        <div className="space-y-3">
          {successMetrics.map((metric, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{metric.label}</span>
                <span className={`font-semibold ${metric.color}`}>{metric.score}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary"
                  style={{ width: `${metric.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm font-semibold text-primary mb-2">
            ✨ Overall Assessment: High Potential
          </p>
          <p className="text-xs text-muted-foreground">
            Strong market understanding and clear value proposition. Focus on refining financial projections 
            to increase confidence in execution.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button size="lg" className="flex-1" onClick={() => navigate('/bizmap-ai')}>
          Create Your Business Plan
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Sample PDF
        </Button>
      </div>
    </div>
  );
};

export default BusinessPlanningDemo;
