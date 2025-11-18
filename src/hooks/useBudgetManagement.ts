import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  session_id: string | null;
  amount: number;
  description: string;
  expense_date: string;
  payment_method: string | null;
  receipt_url: string | null;
  tags: string[];
  notes: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocation {
  id: string;
  user_id: string;
  category_id: string;
  allocated_amount: number;
  period_start: string;
  period_end: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  created_at: string;
  updated_at: string;
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage_used: number;
}

export const useBudgetManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['budget-categories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as BudgetCategory[];
    },
    enabled: !!user,
  });

  // Initialize default categories if none exist
  const initializeDefaultCategories = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const defaultCategories = [
        { name: 'Marketing', description: 'Marketing and advertising expenses', color: '#3b82f6', icon: 'megaphone' },
        { name: 'Operations', description: 'Day-to-day operational costs', color: '#10b981', icon: 'settings' },
        { name: 'Development', description: 'Product development and engineering', color: '#8b5cf6', icon: 'code' },
        { name: 'Sales', description: 'Sales team and tools', color: '#f59e0b', icon: 'trending-up' },
        { name: 'Support', description: 'Customer support costs', color: '#ef4444', icon: 'headphones' },
        { name: 'Legal', description: 'Legal and compliance expenses', color: '#6b7280', icon: 'scale' },
        { name: 'Other', description: 'Miscellaneous expenses', color: '#9ca3af', icon: 'more-horizontal' },
      ];

      const { error } = await supabase
        .from('budget_categories')
        .insert(
          defaultCategories.map(cat => ({
            user_id: user.id,
            ...cat,
            is_default: true,
            is_active: true,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      toast.success('Default categories created');
    },
    onError: (error) => {
      toast.error('Failed to create default categories');
      console.error('Error creating default categories:', error);
    },
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });

  // Fetch budget allocations
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ['budget-allocations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const now = new Date();
      const { data, error } = await supabase
        .from('budget_allocations')
        .select('*')
        .eq('user_id', user.id)
        .gte('period_end', now.toISOString().split('T')[0])
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as BudgetAllocation[];
    },
    enabled: !!user,
  });

  // Create expense
  const createExpense = useMutation({
    mutationFn: async (expenseData: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          ...expenseData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budget-spending'] });
      toast.success('Expense added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add expense');
      console.error('Error creating expense:', error);
    },
  });

  // Update expense
  const updateExpense = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budget-spending'] });
      toast.success('Expense updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update expense');
      console.error('Error updating expense:', error);
    },
  });

  // Delete expense
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budget-spending'] });
      toast.success('Expense deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete expense');
      console.error('Error deleting expense:', error);
    },
  });

  // Create budget allocation
  const createAllocation = useMutation({
    mutationFn: async (allocationData: Omit<BudgetAllocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('budget_allocations')
        .insert({
          user_id: user.id,
          ...allocationData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['budget-spending'] });
      toast.success('Budget allocation created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create budget allocation');
      console.error('Error creating budget allocation:', error);
    },
  });

  // Calculate category spending
  const { data: categorySpending = [], isLoading: spendingLoading } = useQuery({
    queryKey: ['budget-spending', user?.id, allocations, expenses],
    queryFn: async () => {
      if (!user || !allocations.length) return [];

      const currentDate = new Date();
      const activeAllocations = allocations.filter(
        alloc => new Date(alloc.period_start) <= currentDate && new Date(alloc.period_end) >= currentDate
      );

      const spending: CategorySpending[] = await Promise.all(
        activeAllocations.map(async (allocation) => {
          const category = categories.find(c => c.id === allocation.category_id);
          const { data } = await supabase.rpc('get_category_spent', {
            p_user_id: user.id,
            p_category_id: allocation.category_id,
            p_start_date: allocation.period_start,
            p_end_date: allocation.period_end,
          });

          const spent = data || 0;
          const remaining = allocation.allocated_amount - spent;
          const percentage_used = allocation.allocated_amount > 0 
            ? (spent / allocation.allocated_amount) * 100 
            : 0;

          return {
            category_id: allocation.category_id,
            category_name: category?.name || 'Unknown',
            allocated: allocation.allocated_amount,
            spent,
            remaining,
            percentage_used,
          };
        })
      );

      return spending;
    },
    enabled: !!user && !!allocations.length && !!categories.length,
  });

  // Calculate total expenses
  const { data: totalExpenses = 0 } = useQuery({
    queryKey: ['total-expenses', user?.id, expenses],
    queryFn: async () => {
      if (!user || !expenses.length) return 0;
      return expenses.reduce((sum, exp) => sum + exp.amount, 0);
    },
    enabled: !!user && expenses.length > 0,
  });

  return {
    categories,
    expenses,
    allocations,
    categorySpending,
    totalExpenses,
    isLoading: categoriesLoading || expensesLoading || allocationsLoading || spendingLoading,
    initializeDefaultCategories: initializeDefaultCategories.mutate,
    createExpense: createExpense.mutate,
    updateExpense: updateExpense.mutate,
    deleteExpense: deleteExpense.mutate,
    createAllocation: createAllocation.mutate,
  };
};

