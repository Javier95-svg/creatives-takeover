import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";

interface SuccessScoreProps {
  score: any;
}

export default function SuccessScore({ score }: SuccessScoreProps) {
  if (!score) return null;

  const breakdown = score.scoring_breakdown || {};

  const gaugeColor = score.overall_score >= 80 ? 'text-green-600' : score.overall_score >= 65 ? 'text-amber-600' : score.overall_score >= 50 ? 'text-orange-600' : 'text-red-600';
  const riskBadgeVariant = score.risk_assessment === 'low' ? 'secondary' : score.risk_assessment === 'medium' ? 'outline' : 'default';

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Success Score
          <Badge variant={riskBadgeVariant} className="ml-2 capitalize">Risk: {score.risk_assessment}</Badge>
          <Badge variant="outline" className="ml-1 capitalize">Likelihood: {score.success_likelihood}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className={`text-4xl font-bold ${gaugeColor}`}>{score.overall_score}%</div>
            <div className="text-sm text-muted-foreground">Overall viability</div>
            <Separator className="my-4" />
            <div className="space-y-1">
              <div className="text-sm font-medium">Top strengths</div>
              <ul className="text-sm list-disc pl-5">
                {(score.key_strengths || []).slice(0, 3).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1 mt-4">
              <div className="text-sm font-medium">Improvement areas</div>
              <ul className="text-sm list-disc pl-5">
                {(score.improvement_areas || []).slice(0, 3).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries({
              'Market clarity': breakdown.market_clarity,
              'Problem validation': breakdown.problem_validation,
              'Solution strength': breakdown.solution_strength,
              'Marketing strategy': breakdown.marketing_strategy,
              'Financial planning': breakdown.financial_planning,
              'Execution feasibility': breakdown.execution_feasibility,
            }).map(([label, value]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{(value as number) ?? 0}%</span>
                </div>
                <Progress value={(value as number) ?? 0} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {(score.action_recommendations?.length || 0) > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              {score.risk_assessment === 'low' ? (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              Recommendations
            </div>
            <ul className="text-sm list-disc pl-5 space-y-1">
              {score.action_recommendations.slice(0, 4).map((rec: string, i: number) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
