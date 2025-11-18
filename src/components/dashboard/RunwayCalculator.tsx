import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { useKPIGoals } from '@/hooks/useKPIGoals';
import { TrendingDown, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { useMemo } from 'react';

export const RunwayCalculator = () => {
  const { totalExpenses, expenses, isLoading: budgetLoading } = useBudgetManagement();
  const { goals, isLoading: goalsLoading } = useKPIGoals();
  const isLoading = budgetLoading || goalsLoading;

  // Get revenue goal
  const revenueGoal = goals.find(g => g.goal_type === 'revenue');
  const monthlyRevenue = revenueGoal?.current_value || 0;

  // Calculate average monthly expenses
  const monthlyExpenses = useMemo(() => {
    if (!expenses.length) return 0;
    
    // Group expenses by month
    const expensesByMonth = expenses.reduce((acc, exp) => {
      const month = new Date(exp.expense_date).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = 0;
      acc[month] += exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const monthlyTotals = Object.values(expensesByMonth);
    if (monthlyTotals.length === 0) return 0;
    
    // Calculate average
    const sum = monthlyTotals.reduce((a, b) => a + b, 0);
    return sum / monthlyTotals.length;
  }, [expenses]);

  // Calculate net cash flow
  const netCashFlow = monthlyRevenue - monthlyExpenses;

  // Calculate runway (assuming current cash balance from revenue goal or estimate)
  // For now, we'll use a simple calculation based on expenses
  const currentCash = monthlyRevenue * 3; // Assume 3 months of revenue as cash
  const runwayMonths = netCashFlow > 0 
    ? Infinity // Positive cash flow = infinite runway
    : monthlyExpenses > 0 
      ? Math.max(0, currentCash / monthlyExpenses)
      : 0;

  // Calculate burn rate (negative cash flow)
  const burnRate = netCashFlow < 0 ? Math.abs(netCashFlow) : 0;

  // Get status color and message
  const getRunwayStatus = () => {
    if (runwayMonths === Infinity) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500/10',
        icon: TrendingUp,
        message: 'Positive cash flow',
        urgency: 'low',
      };
    } else if (runwayMonths >= 12) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500/10',
        icon: Calendar,
        message: 'Healthy runway',
        urgency: 'low',
      };
    } else if (runwayMonths >= 6) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500/10',
        icon: AlertTriangle,
        message: 'Monitor closely',
        urgency: 'medium',
      };
    } else {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-500/10',
        icon: AlertTriangle,
        message: 'Critical - Take action',
        urgency: 'high',
      };
    }
  };

  const status = getRunwayStatus();
  const StatusIcon = status.icon;

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Cash Runway</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Cash Runway</CardTitle>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bgColor}`}>
          <StatusIcon className={`h-4 w-4 ${status.color}`} />
          <span className={`text-xs font-medium ${status.color}`}>{status.message}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Runway Display */}
          <div className="text-center">
            <div className="mb-2">
              <p className="text-sm text-muted-foreground">Months until $0</p>
            </div>
            <div className="mb-4">
              {runwayMonths === Infinity ? (
                <p className="text-5xl font-bold text-green-600">∞</p>
              ) : (
                <p className={`text-5xl font-bold ${status.color}`}>
                  {runwayMonths.toFixed(1)}
                </p>
              )}
            </div>
            {runwayMonths !== Infinity && runwayMonths < 12 && (
              <p className="text-xs text-muted-foreground">
                {status.urgency === 'high' && '⚠️ Urgent: Consider fundraising or cost reduction'}
                {status.urgency === 'medium' && '⚠️ Start planning for next funding round'}
              </p>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                <p className="text-lg font-semibold text-green-600">
                  ${monthlyRevenue.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Monthly Expenses</p>
                <p className="text-lg font-semibold text-red-600">
                  ${monthlyExpenses.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Net Cash Flow</p>
                <p className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString()}
                </p>
              </div>
              {burnRate > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Monthly Burn Rate</p>
                  <p className="text-sm font-medium text-red-600">
                    ${burnRate.toLocaleString()}/month
                  </p>
                </div>
              )}
            </div>

            {currentCash > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Estimated Cash Balance</p>
                  <p className="text-sm font-medium">
                    ${currentCash.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {runwayMonths !== Infinity && runwayMonths < 12 && (
            <div className={`border-t pt-4 ${status.bgColor} p-3 rounded-lg`}>
              <p className="text-xs font-medium mb-2">Recommendations:</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {runwayMonths < 6 && (
                  <>
                    <li>• Reduce non-essential expenses immediately</li>
                    <li>• Accelerate fundraising efforts</li>
                    <li>• Explore bridge financing options</li>
                  </>
                )}
                {runwayMonths >= 6 && runwayMonths < 12 && (
                  <>
                    <li>• Start fundraising process (takes 3-6 months)</li>
                    <li>• Optimize spending in low-performing areas</li>
                    <li>• Focus on revenue-generating activities</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

