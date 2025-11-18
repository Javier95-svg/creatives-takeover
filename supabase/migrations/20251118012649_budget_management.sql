-- ================================================
-- BUDGET MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ================================================

-- ============================================
-- 1. BUDGET CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6', -- Default blue color for UI
  icon TEXT, -- Icon identifier for UI
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Insert default categories for new users (via trigger or app logic)
-- Common categories: Marketing, Operations, Development, Sales, Support, Legal, Other

-- ============================================
-- 2. EXPENSES
-- ============================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL, -- Link to project
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT, -- cash, credit_card, bank_transfer, etc.
  receipt_url TEXT, -- URL to receipt image/document
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT, -- monthly, quarterly, yearly
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. BUDGET ALLOCATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE CASCADE NOT NULL,
  allocated_amount DECIMAL(10, 2) NOT NULL CHECK (allocated_amount >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (period_end > period_start)
);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES - BUDGET CATEGORIES
-- ============================================

CREATE POLICY "Users can view their own budget categories"
  ON public.budget_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget categories"
  ON public.budget_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget categories"
  ON public.budget_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget categories"
  ON public.budget_categories FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. RLS POLICIES - EXPENSES
-- ============================================

CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. RLS POLICIES - BUDGET ALLOCATIONS
-- ============================================

CREATE POLICY "Users can view their own budget allocations"
  ON public.budget_allocations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget allocations"
  ON public.budget_allocations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget allocations"
  ON public.budget_allocations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget allocations"
  ON public.budget_allocations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_budget_categories_user_id ON public.budget_categories(user_id);
CREATE INDEX idx_budget_categories_active ON public.budget_categories(user_id, is_active);

CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX idx_expenses_session_id ON public.expenses(session_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, expense_date DESC);

CREATE INDEX idx_budget_allocations_user_id ON public.budget_allocations(user_id);
CREATE INDEX idx_budget_allocations_category_id ON public.budget_allocations(category_id);
CREATE INDEX idx_budget_allocations_period ON public.budget_allocations(period_start, period_end);

-- ============================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_budget_categories_updated_at
  BEFORE UPDATE ON public.budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_allocations_updated_at
  BEFORE UPDATE ON public.budget_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 10. HELPER FUNCTION: Calculate spent amount for category
-- ============================================

CREATE OR REPLACE FUNCTION public.get_category_spent(
  p_user_id UUID,
  p_category_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount)
     FROM public.expenses
     WHERE user_id = p_user_id
       AND category_id = p_category_id
       AND expense_date >= p_start_date
       AND expense_date <= p_end_date),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. HELPER FUNCTION: Calculate total expenses for user
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_total_expenses(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
  IF p_start_date IS NULL AND p_end_date IS NULL THEN
    RETURN COALESCE(
      (SELECT SUM(amount) FROM public.expenses WHERE user_id = p_user_id),
      0
    );
  ELSE
    RETURN COALESCE(
      (SELECT SUM(amount)
       FROM public.expenses
       WHERE user_id = p_user_id
         AND expense_date >= COALESCE(p_start_date, '1900-01-01'::DATE)
         AND expense_date <= COALESCE(p_end_date, CURRENT_DATE)),
      0
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

