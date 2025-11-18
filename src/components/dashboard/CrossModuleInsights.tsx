import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { useMarketValidation } from '@/hooks/useMarketValidation';
import { useOutreachCampaigns } from '@/hooks/useOutreachCampaigns';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Link2 } from 'lucide-react';
import { useMemo } from 'react';

export const CrossModuleInsights = () => {
  const { expenses, categorySpending, totalExpenses } = useBudgetManagement();
  const { latestValidation, averageScore } = useMarketValidation();
  const { campaigns } = useOutreachCampaigns();

  // Calculate outreach spend from expenses
  const outreachSpend = useMemo(() => {
    const marketingCategory = categorySpending.find(cat => 
      cat.category_name.toLowerCase().includes('marketing') || 
      cat.category_name.toLowerCase().includes('outreach')
    );
    return marketingCategory?.spent || 0;
  }, [categorySpending]);

  // Calculate total campaign budget
  const totalCampaignBudget = useMemo(() => {
    return campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  }, [campaigns]);

  // Calculate active campaigns
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  // Generate insights
  const insights = useMemo(() => {
    const insightsList = [];

    // Budget vs Outreach Spend
    if (outreachSpend > 0 && totalExpenses > 0) {
      const outreachPercentage = (outreachSpend / totalExpenses) * 100;
      if (outreachPercentage > 40) {
        insightsList.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'High Outreach Spend',
          message: `Your outreach spend (${outreachPercentage.toFixed(1)}% of total) is high. Consider optimizing campaigns.`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500/10',
        });
      } else if (outreachPercentage < 10 && activeCampaigns > 0) {
        insightsList.push({
          type: 'info',
          icon: Lightbulb,
          title: 'Low Outreach Investment',
          message: `Only ${outreachPercentage.toFixed(1)}% of budget goes to outreach. Consider increasing investment.`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
        });
      }
    }

    // Validation Score Impact
    if (latestValidation && activeCampaigns > 0) {
      const validationScore = latestValidation.overall_validation_score || 0;
      if (validationScore < 50) {
        insightsList.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'Low Market Validation',
          message: `Your validation score is ${Math.round(validationScore)}. Low validation may impact campaign conversion rates.`,
          color: 'text-red-600',
          bgColor: 'bg-red-500/10',
        });
      } else if (validationScore >= 70) {
        insightsList.push({
          type: 'success',
          icon: TrendingUp,
          title: 'Strong Market Validation',
          message: `Your validation score of ${Math.round(validationScore)} suggests good market fit. Optimize campaigns for higher conversion.`,
          color: 'text-green-600',
          bgColor: 'bg-green-500/10',
        });
      }
    }

    // Campaign Budget vs Actual Spend
    if (totalCampaignBudget > 0 && outreachSpend > 0) {
      const budgetUtilization = (outreachSpend / totalCampaignBudget) * 100;
      if (budgetUtilization > 90) {
        insightsList.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'Campaign Budget Nearly Exhausted',
          message: `You've used ${budgetUtilization.toFixed(1)}% of your campaign budget. Consider pausing low-performing campaigns.`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500/10',
        });
      }
    }

    // Validation Trend
    if (latestValidation && averageScore > 0) {
      const scoreDiff = (latestValidation.overall_validation_score || 0) - averageScore;
      if (Math.abs(scoreDiff) > 10) {
        insightsList.push({
          type: scoreDiff > 0 ? 'success' : 'warning',
          icon: scoreDiff > 0 ? TrendingUp : TrendingDown,
          title: scoreDiff > 0 ? 'Improving Validation' : 'Declining Validation',
          message: `Your latest validation is ${Math.abs(scoreDiff).toFixed(1)} points ${scoreDiff > 0 ? 'above' : 'below'} average. ${scoreDiff > 0 ? 'Great progress!' : 'Review market conditions.'}`,
          color: scoreDiff > 0 ? 'text-green-600' : 'text-red-600',
          bgColor: scoreDiff > 0 ? 'bg-green-500/10' : 'bg-red-500/10',
        });
      }
    }

    return insightsList;
  }, [outreachSpend, totalExpenses, activeCampaigns, latestValidation, averageScore, totalCampaignBudget]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5 text-primary" />
          Cross-Module Insights
        </CardTitle>
        <Badge variant="outline">{insights.length} insights</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className={`p-4 border rounded-lg ${insight.bgColor} border-l-4`}
                style={{ borderLeftColor: insight.color.replace('text-', '').replace('-600', '') }}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 ${insight.color} mt-0.5`} />
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${insight.color} mb-1`}>
                      {insight.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Outreach Spend</p>
            <p className="text-sm font-bold">${outreachSpend.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Campaigns</p>
            <p className="text-sm font-bold">{activeCampaigns}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Validation Score</p>
            <p className="text-sm font-bold">
              {latestValidation ? Math.round(latestValidation.overall_validation_score || 0) : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

