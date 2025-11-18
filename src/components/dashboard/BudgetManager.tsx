import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, TrendingDown, AlertCircle } from 'lucide-react';
import { ExpenseTracker } from './ExpenseTracker';
import { BudgetAllocation } from './BudgetAllocation';
import { RunwayCalculator } from './RunwayCalculator';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { useKPIGoals } from '@/hooks/useKPIGoals';
import { useEffect } from 'react';

export const BudgetManager = () => {
  const { categories, totalExpenses, categorySpending, initializeDefaultCategories, isLoading } = useBudgetManagement();
  const { goals } = useKPIGoals();
  const revenueGoal = goals.find(g => g.goal_type === 'revenue');
  const monthlyRevenue = revenueGoal?.current_value || 0;

  // Initialize default categories if none exist
  useEffect(() => {
    if (!isLoading && categories.length === 0) {
      initializeDefaultCategories();
    }
  }, [categories.length, isLoading, initializeDefaultCategories]);

  const totalAllocated = categorySpending.reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = categorySpending.reduce((sum, cat) => sum + cat.spent, 0);
  const netCashFlow = monthlyRevenue - (totalExpenses / 3); // Rough estimate

  // Check for budget alerts
  const overBudgetCategories = categorySpending.filter(cat => cat.spent > cat.allocated);
  const nearBudgetCategories = categorySpending.filter(
    cat => cat.percentage_used >= 80 && cat.percentage_used < 100
  );

  return (
    <Card id="budget-manager" className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-5 w-5 text-primary" />
          Budget Management
        </CardTitle>
        {(overBudgetCategories.length > 0 || nearBudgetCategories.length > 0) && (
          <div className="flex items-center gap-2">
            {overBudgetCategories.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{overBudgetCategories.length} over budget</span>
              </div>
            )}
            {nearBudgetCategories.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-yellow-600">
                <AlertCircle className="h-3 w-3" />
                <span>{nearBudgetCategories.length} near limit</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-lg font-bold">${totalSpent.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Budget Allocated</p>
            <p className="text-lg font-bold">${totalAllocated.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            <p className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="runway">Runway</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="mt-4">
            <ExpenseTracker />
          </TabsContent>
          <TabsContent value="budget" className="mt-4">
            <BudgetAllocation />
          </TabsContent>
          <TabsContent value="runway" className="mt-4">
            <RunwayCalculator />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

