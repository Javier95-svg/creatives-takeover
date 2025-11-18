import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { Plus, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

export const BudgetAllocation = () => {
  const { categories, allocations, categorySpending, createAllocation, isLoading } = useBudgetManagement();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    allocated_amount: '',
    period_type: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
  });

  const getPeriodDates = (periodType: 'monthly' | 'quarterly' | 'yearly') => {
    const now = new Date();
    switch (periodType) {
      case 'monthly':
        return {
          start: startOfMonth(now).toISOString().split('T')[0],
          end: endOfMonth(now).toISOString().split('T')[0],
        };
      case 'quarterly':
        return {
          start: startOfQuarter(now).toISOString().split('T')[0],
          end: endOfQuarter(now).toISOString().split('T')[0],
        };
      case 'yearly':
        return {
          start: startOfYear(now).toISOString().split('T')[0],
          end: endOfYear(now).toISOString().split('T')[0],
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dates = getPeriodDates(formData.period_type);
    
    createAllocation({
      category_id: formData.category_id,
      allocated_amount: parseFloat(formData.allocated_amount),
      period_start: dates.start,
      period_end: dates.end,
      period_type: formData.period_type,
    });

    setFormData({
      category_id: '',
      allocated_amount: '',
      period_type: 'monthly',
    });
    setIsDialogOpen(false);
  };

  const totalAllocated = categorySpending.reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = categorySpending.reduce((sum, cat) => sum + cat.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Budget Allocation</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Set Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Budget Allocation</DialogTitle>
              <DialogDescription>
                Allocate budget for a category for the current period.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Allocated Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.allocated_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, allocated_amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select
                  value={formData.period_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period_type: value as 'monthly' | 'quarterly' | 'yearly' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                Set Budget
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        ) : categorySpending.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No budget allocations yet. Set your first budget allocation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Summary */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Budget</span>
                <span className="text-sm font-bold">${totalAllocated.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Spent</span>
                <span className="text-sm">${totalSpent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Remaining</span>
                <span className={`text-sm font-semibold ${totalRemaining < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  ${totalRemaining.toLocaleString()}
                </span>
              </div>
              <Progress value={overallPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {overallPercentage.toFixed(1)}% of budget used
              </p>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-3">
              {categorySpending.map((cat) => {
                const category = categories.find(c => c.id === cat.category_id);
                const isOverBudget = cat.spent > cat.allocated;
                
                return (
                  <div
                    key={cat.category_id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category?.color || '#9ca3af' }}
                        />
                        <span className="font-medium">{cat.category_name}</span>
                        {isOverBudget && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <span className="text-sm font-semibold">
                        ${cat.spent.toLocaleString()} / ${cat.allocated.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(cat.percentage_used, 100)} 
                      className={`h-2 ${isOverBudget ? 'bg-destructive' : ''}`}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {cat.percentage_used.toFixed(1)}% used
                      </span>
                      <span className={`text-xs font-medium ${
                        cat.remaining < 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {cat.remaining < 0 ? `Over by $${Math.abs(cat.remaining).toLocaleString()}` : `$${cat.remaining.toLocaleString()} remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

