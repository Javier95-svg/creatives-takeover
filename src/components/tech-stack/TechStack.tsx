import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { techStackData, TechStackCategory, TechStackData, TechStackProduct } from '@/data/techStack';
import { CheckCircle2, Calculator, DollarSign, Monitor, Server, Cloud, BarChart, CreditCard, Mail, Users, TrendingUp, AlertTriangle, Lightbulb, Target, Link2, Zap, Save, FolderOpen, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useCredits } from '@/hooks/useCredits';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildDashboardReturnToastAction } from '@/components/dashboard/dashboardReturnToast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { captureEvent } from '@/lib/analytics';
import { clearAnonymousToolState, readAnonymousToolState, saveAnonymousToolState } from '@/lib/anonymousToolState';
import { markFirstArtifactCreated, trackRetentionEvent } from '@/lib/retentionSystem';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor,
  Server,
  Cloud,
  BarChart,
  CreditCard,
  Mail,
  Users,
};

interface SelectedProducts {
  [categoryId: string]: string | null;
}

interface BudgetBreakdown {
  category: string;
  product: string;
  price: string;
  isVariable: boolean;
}

interface TechStackReport {
  id: string;
  name: string | null;
  selected_products: Record<string, string | null>;
  budget_total: number;
  budget_breakdown: BudgetBreakdown[];
  has_variable: boolean;
  created_at: string;
}

interface IntegrationSuggestion {
  title: string;
  description: string;
  tools: string[];
  difficulty: 'easy' | 'medium' | 'advanced';
  benefits: string[];
}

interface TechStackAnonymousState {
  selectedProducts: SelectedProducts;
  budget: {
    total: number;
    breakdown: BudgetBreakdown[];
    hasVariable: boolean;
  };
}

const buildSelectedProductsKey = (selectedProducts: SelectedProducts) =>
  techStackData.map((category) => `${category.id}:${selectedProducts[category.id] || ''}`).join('|');

const TechStack: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscriptionData, loading: subscriptionLoading } = useSubscription();
  const { checkFeatureAccess } = useFeatureGating();
  const { refreshBalance, loading: creditsLoading } = useCredits();
  const { deductCredits } = useCreditActions();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { refreshProgress } = useBizMapProgress();
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>({});
  const [showBudget, setShowBudget] = useState(false);
  const [savedReports, setSavedReports] = useState<TechStackReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportName, setReportName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<TechStackReport | null>(null);
  const [loginRedirectPending, setLoginRedirectPending] = useState(false);
  const [generatingBudget, setGeneratingBudget] = useState(false);
  const [generatedBudgetKey, setGeneratedBudgetKey] = useState<string | null>(null);
  const [hydratedStack, setHydratedStack] = useState(false);
  const [, startLoginNavigation] = useTransition();

  const currentTier = (subscriptionData.subscription_tier || 'rookie').toLowerCase();
  useEffect(() => {
    if (!user) {
      setSavedReports([]);
      return;
    }

    const fetchReports = async () => {
      setReportsLoading(true);
      const { data, error } = await supabase
        .from('tech_stack_reports')
        .select('id, name, selected_products, budget_total, budget_breakdown, has_variable, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load tech stack reports', error);
        toast({
          title: 'Failed to load saved reports',
          description: 'Please refresh and try again.',
          variant: 'destructive'
        });
        setSavedReports([]);
      } else {
        setSavedReports((data as TechStackReport[]) || []);
      }
      setReportsLoading(false);
    };

    void fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [user?.id, toast]);

  const handleProductSelect = (categoryId: string, productId: string) => {
    setShowBudget(false);
    setGeneratedBudgetKey(null);
    setSelectedProducts(prev => {
      // If clicking the same product, deselect it
      if (prev[categoryId] === productId) {
        const updated = { ...prev };
        updated[categoryId] = null;
        return updated;
      }
      // Otherwise, select the new product
      return {
        ...prev,
        [categoryId]: productId
      };
    });
  };

  const isProductSelected = (categoryId: string, productId: string): boolean => {
    return selectedProducts[categoryId] === productId;
  };

  const calculateBudget = (): { total: number; breakdown: BudgetBreakdown[]; hasVariable: boolean } => {
    const breakdown: BudgetBreakdown[] = [];
    let total = 0;
    let hasVariable = false;

    techStackData.forEach(category => {
      const selectedProductId = selectedProducts[category.id];
      if (selectedProductId) {
        const product = category.products.find(p => p.id === selectedProductId);
        if (product) {
          const priceStr = product.price.toLowerCase();
          const isVariable = priceStr.includes('usage-based') ||
            priceStr.includes('free') ||
            priceStr.includes('%') ||
            priceStr.includes('per transaction');

          if (isVariable) {
            hasVariable = true;
          } else {
            // Try to extract numeric value from price string
            const priceMatch = priceStr.match(/\$?(\d+(?:\.\d+)?)/);
            if (priceMatch) {
              total += parseFloat(priceMatch[1]);
            }
          }

          breakdown.push({
            category: category.name,
            product: product.name,
            price: product.price,
            isVariable
          });
        }
      }
    });

    return { total, breakdown, hasVariable };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  const budget = useMemo(() => calculateBudget(), [selectedProducts]);
  const selectedProductsKey = useMemo(
    () => buildSelectedProductsKey(selectedProducts),
    [selectedProducts]
  );

  const persistPublicBudget = () => {
    if (!showBudget && !allCategoriesSelected) return;
    saveAnonymousToolState<TechStackAnonymousState>('tech_stack', {
      selectedProducts,
      budget: {
        total: budget.total,
        breakdown: budget.breakdown,
        hasVariable: budget.hasVariable,
      },
    });
  };

  useEffect(() => {
    if (hydratedStack || searchParams.get('hydrate') !== '1') return;

    const stored = readAnonymousToolState<TechStackAnonymousState>('tech_stack');
    if (!stored?.selectedProducts) return;

    setHydratedStack(true);
    setSelectedProducts(stored.selectedProducts);
    setShowBudget(true);
    setGeneratedBudgetKey(buildSelectedProductsKey(stored.selectedProducts));

    if (user) {
      void trackRetentionEvent('artifact_resumed', {
        user_id: user.id,
        tool: 'tech_stack',
        source: 'tech_stack_unlock',
        resume_url: '/tech-stack?hydrate=1',
      });
    }
  }, [hydratedStack, searchParams, user]);

  const handleSeeBudget = async () => {
    if (generatingBudget) return;

    if (!user) {
      // Public (logged-out) flow: the budget is computed entirely client-side, so
      // we show the monthly partial for free — no login wall, no credits. The
      // annual cost + full build plan are gated inside <BudgetDisplay /> below.
      if (selectedCount !== techStackData.length) {
        const firstUnselected = techStackData.find((category) => !selectedProducts[category.id]);
        if (firstUnselected) {
          document.getElementById(`tech-stack-category-${firstUnselected.id}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
        toast({
          title: 'Selection Required',
          description: `Please select one product from all ${techStackData.length} categories to see your monthly budget.`,
          variant: 'destructive',
        });
        return;
      }

      captureEvent('free_tool_input_submitted', { tool: 'tech_stack', categories: techStackData.length });
      setShowBudget(true);
      setGeneratedBudgetKey(selectedProductsKey);
      saveAnonymousToolState<TechStackAnonymousState>('tech_stack', {
        selectedProducts,
        budget: {
          total: budget.total,
          breakdown: budget.breakdown,
          hasVariable: budget.hasVariable,
        },
      });
      captureEvent('free_tool_partial_result_shown', { tool: 'tech_stack', monthly_budget: budget.total });
      return;
    }

    if (selectedCount !== techStackData.length) {
      const firstUnselectedCategory = techStackData.find((category) => !selectedProducts[category.id]);
      if (firstUnselectedCategory) {
        document.getElementById(`tech-stack-category-${firstUnselectedCategory.id}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }

      toast({
        title: "Selection Required",
        description: `Please select one product from all ${techStackData.length} categories to generate your budget.`,
        variant: "destructive",
      });
      return;
    }

    if (showBudget && generatedBudgetKey === selectedProductsKey) {
      toast({
        title: "Budget Already Generated",
        description: "Your current tech stack budget is ready below.",
      });
      return;
    }

    await trackRetentionEvent('activation_first_input_submitted', {
      user_id: user.id,
      tool: 'tech_stack',
      source: 'tech_stack',
      selected_categories: techStackData.length,
    });
    setGeneratingBudget(true);

    if (subscriptionLoading || creditsLoading) {
      toast({
        title: "Checking access",
        description: "Please wait a moment for your plan and credit balance to finish loading.",
      });
      setGeneratingBudget(false);
      return;
    }

    const featureAccess = checkFeatureAccess('tech_stack_generation');
    if (featureAccess.isLoading) {
      toast({
        title: "Checking access",
        description: "Please wait a moment for your plan and credit balance to finish loading.",
      });
      setGeneratingBudget(false);
      return;
    }

    if (!featureAccess.hasAccess) {
        openUpgradePrompt({
          reason: 'feature',
          featureName: 'Tech Stack Generator',
          requiredTier: featureAccess.requiredTier as 'starter' | 'rising' | 'pro' | undefined,
          description: featureAccess.message || "Upgrade to Rising for full Tech Stack access.",
        });
        setGeneratingBudget(false);
        return;
      }

    try {
      if (currentTier === 'rookie') {
        try {
          const { data: usageData, error: usageError } = await supabase
            .rpc('get_feature_usage', {
              p_user_id: user.id,
              p_feature_name: 'tech_stack_generations'
            });

          if (!usageError && usageData) {
            const usage = usageData as { current_usage: number; limit: number; remaining: number };
            if (usage.remaining <= 0 && usage.limit > 0) {
              openUpgradePrompt({
                reason: 'limit',
                limit: usage.limit,
                limitLabel: 'Tech Stack generations',
                featureName: 'Tech Stack Generator',
                requiredTier: 'rising',
                description: "You've used your Tech Stack generation allowance for this billing cycle.",
              });
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to check Tech Stack usage', error);
        }
      }

      // Tech Stack Builder is part of our welcome Gifts: the first analysis per
      // account is on us. claim_first_use_gift atomically comps exactly one run
      // (lifetime); every later build bills the normal 4 credits.
      let firstRunFree = false;
      try {
        const { data: claimed, error: giftError } = await supabase.rpc('claim_first_use_gift', {
          p_feature: 'TECH_STACK_GENERATION',
        });
        firstRunFree = !giftError && claimed === true;
      } catch (error) {
        console.warn('Failed to check Tech Stack gift', error);
      }

      if (firstRunFree) {
        toast({
          title: 'First Tech Stack build is on us',
          description: 'Enjoy your free build. Future builds cost 4 credits.',
        });
      } else {
        const deducted = await deductCredits('TECH_STACK_GENERATION', {
          featureName: 'Tech Stack Generation',
          operationId: `tech-stack-${Date.now()}`,
          metadata: {
            selectedCategories: techStackData.length,
            selectedProductsKey,
          }
        });
        if (!deducted) return;
      }

      try {
        await supabase.rpc('check_and_increment_usage', {
          p_user_id: user.id,
          p_feature_name: 'tech_stack_generations',
          p_increment_by: 1
        });
      } catch (error) {
        console.warn('Failed to update Tech Stack usage', error);
      }

      setShowBudget(true);
      setGeneratedBudgetKey(selectedProductsKey);
      await trackRetentionEvent('activation_first_output_generated', {
        user_id: user.id,
        tool: 'tech_stack',
        source: 'tech_stack',
        monthly_budget: budget.total,
      });
      toast({
        title: "Budget Generated!",
        description: "Scroll down to view your tech stack budget and integration guide.",
      });
      await refreshBalance();
    } finally {
      setGeneratingBudget(false);
    }
  };

  const handleSaveReport = async () => {
    if (!user) {
      setLoginRedirectPending(true);
      startLoginNavigation(() => {
        navigate('/login');
      });
      return;
    }

    if (!allCategoriesSelected) {
      toast({
        title: 'Select all categories',
        description: `Please select one product in all ${techStackData.length} categories before saving.`,
        variant: 'destructive'
      });
      return;
    }

    setSavingReport(true);
    const fallbackName = `Tech Stack Report - ${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
    const name = reportName.trim() || fallbackName;

    const { data, error } = await supabase
      .from('tech_stack_reports')
      .insert({
        user_id: user.id,
        name,
        selected_products: selectedProducts,
        budget_total: budget.total,
        budget_breakdown: budget.breakdown,
        has_variable: budget.hasVariable
      })
      .select('id, name, selected_products, budget_total, budget_breakdown, has_variable, created_at')
      .single();

    if (error) {
      console.error('Failed to save tech stack report', error);
      toast({
        title: 'Failed to save report',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    } else if (data) {
      setSavedReports((prev) => [data as TechStackReport, ...prev]);
      setReportName('');
      setSaveDialogOpen(false);
      await refreshProgress();
      clearAnonymousToolState('tech_stack');
      await trackRetentionEvent('activation_first_output_generated', {
        user_id: user.id,
        tool: 'tech_stack',
        source: 'tech_stack',
        artifact_type: 'tech_stack_report',
        artifact_id: data.id,
      });
      await markFirstArtifactCreated({
        userId: user.id,
        artifactType: 'tech_stack_report',
        artifactId: data.id,
        label: name,
        resumeUrl: '/tech-stack',
        source: 'tech_stack',
      });
      toast({
        title: 'Report saved',
        description: 'You can access it anytime from Saved Reports.',
        action: buildDashboardReturnToastAction('tech-stack', navigate),
      });
    }

    setSavingReport(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('tech_stack_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Failed to delete report',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
      return;
    }

    setSavedReports((prev) => prev.filter((report) => report.id !== reportId));
    toast({ title: 'Report deleted' });
  };

  const selectedCount = Object.values(selectedProducts).filter(id => id !== null).length;
  const allCategoriesSelected = selectedCount === techStackData.length;
  const canGenerateBudget = allCategoriesSelected;
  const canSaveReport = Boolean(user) && showBudget && allCategoriesSelected;
  const previewBreakdown = previewReport?.budget_breakdown || [];
  const firstUnselectedCategory = techStackData.find((category) => !selectedProducts[category.id]);
  const generateButtonLabel = !user
    ? firstUnselectedCategory
      ? 'Complete selections first'
      : 'See My Budget'
      : generatingBudget
        ? 'Generating...'
      : subscriptionLoading || creditsLoading
        ? 'Loading access...'
      : firstUnselectedCategory
        ? 'Complete selections first'
        : currentTier === 'rookie'
          ? 'Generate (1/month)'
          : 'Generate Budget';

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Tech Stack Report</DialogTitle>
            <DialogDescription>
              Keep this budget report so you can load it anytime without rebuilding the stack.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tech-stack-report-name">Report name</Label>
            <Input
              id="tech-stack-report-name"
              value={reportName}
              onChange={(event) => setReportName(event.target.value)}
              placeholder="e.g., MVP Stack - Jan 2026"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-name it with today&apos;s date.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} disabled={savingReport || !allCategoriesSelected}>
              <Save className="w-4 h-4 mr-2" />
              {savingReport ? 'Saving...' : 'Save Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewReport(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewReport?.name || 'Tech Stack Report'}</DialogTitle>
            <DialogDescription>
              Preview your saved budget report before reusing it.
            </DialogDescription>
          </DialogHeader>
          {previewReport ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 bg-muted/40">
                <div>
                  <p className="text-xs text-muted-foreground">Saved on</p>
                  <p className="font-medium">
                    {new Date(previewReport.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Estimated monthly total</p>
                  <p className="text-lg font-semibold">
                    ${Number(previewReport.budget_total || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {previewReport.has_variable && (
                <div className="rounded-lg border border-warning bg-warning-subtle p-3 text-sm text-warning dark:border-warning dark:bg-warning/20 dark:text-warning">
                  Variable costs included. Total only reflects fixed monthly pricing.
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Selected tools</p>
                {previewBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No selections saved.</p>
                ) : (
                  <div className="space-y-2">
                    {previewBreakdown.map((item, idx) => (
                      <div key={idx} className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{item.product}</p>
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{item.price}</p>
                            {item.isVariable && (
                              <p className="text-xs text-muted-foreground">Variable</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No report selected.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {user && (
        <Card className="border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Saved Reports
            </CardTitle>
            <CardDescription>
              Reopen past budgets without redoing your selections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportsLoading ? (
              <p className="text-sm text-muted-foreground">Loading saved reports...</p>
            ) : savedReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved reports yet.</p>
            ) : (
              <div className="space-y-3">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">
                        {report.name || 'Tech Stack Report'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })} · ${Number(report.budget_total || 0).toFixed(2)} / mo
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewReport(report);
                          setPreviewOpen(true);
                        }}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteReport(report.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {techStackData.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          selectedProductId={selectedProducts[category.id]}
          onProductSelect={handleProductSelect}
          isProductSelected={isProductSelected}
          isMobile={isMobile}
        />
      ))}

      <div className="sticky bottom-4 z-10 flex justify-center px-4">
        <Card className="w-full max-w-2xl shadow-lg border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {techStackData.length} categories selected
                </p>
                {!allCategoriesSelected && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {/* FIX(dead-click): /tech-stack — the sticky CTA now names the exact blocker so it does not look like a dead primary action. */}
                    {firstUnselectedCategory
                      ? `Next blocker: choose a tool in ${firstUnselectedCategory.name} to unlock the budget.`
                      : `Select one product in all ${techStackData.length} categories to view budget and strategy.`}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                {canSaveReport && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setSaveDialogOpen(true)}
                    className="w-full sm:w-auto min-w-[140px]"
                    disabled={savingReport}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingReport ? 'Saving...' : 'Save Report'}
                  </Button>
                )}
                <Button
                  onClick={handleSeeBudget}
                  size="lg"
                  variant={!allCategoriesSelected && user ? "outline" : "default"}
                  className={`w-full sm:w-auto min-w-[140px] ${loginRedirectPending ? 'pointer-events-none opacity-70' : ''}`}
                  aria-disabled={!canGenerateBudget}
                  disabled={loginRedirectPending || generatingBudget || (Boolean(user) && (subscriptionLoading || creditsLoading))}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  {generateButtonLabel}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showBudget && allCategoriesSelected && (
        <BudgetDisplay
          budget={budget}
          selectedProducts={selectedProducts}
          techStackData={techStackData}
          saveName={reportName}
          onSaveNameChange={setReportName}
          onSave={handleSaveReport}
          saving={savingReport}
          onClose={() => setShowBudget(false)}
          isPublic={!user}
          onGateCtaClick={() => {
            persistPublicBudget();
            captureEvent('free_tool_signup_gate_cta_clicked', { tool: 'tech_stack' });
          }}
        />
      )}

    </div>
  );
};

interface CategorySectionProps {
  category: TechStackCategory;
  selectedProductId: string | null;
  onProductSelect: (categoryId: string, productId: string) => void;
  isProductSelected: (categoryId: string, productId: string) => boolean;
  isMobile: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  selectedProductId,
  onProductSelect,
  isProductSelected,
  isMobile
}) => {
  return (
    <Card id={`tech-stack-category-${category.id}`}>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          {category.name}
          {(() => {
            const IconComponent = iconMap[category.icon];
            return IconComponent ? <IconComponent className="w-6 h-6 text-primary" /> : null;
          })()}
        </CardTitle>
        <CardDescription>
          {category.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <div className="space-y-3">
            {category.products.map((product) => {
              const selected = isProductSelected(category.id, product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onProductSelect(category.id, product.id)}
                  className={`w-full min-h-[44px] rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold leading-tight">{product.name}</p>
                      <p className="inline-flex rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground mt-2">
                        {product.price}
                      </p>
                    </div>
                    {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{product.description}</p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium mb-1">Pros</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                        {product.pros.map((pro, idx) => (
                          <li key={idx}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">Cons</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                        {product.cons.map((con, idx) => (
                          <li key={idx}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px] sm:w-[200px]">Product</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="min-w-[180px]">Pros</TableHead>
                  <TableHead className="min-w-[180px]">Cons</TableHead>
                  <TableHead className="min-w-[120px] sm:w-[150px]">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.products.map((product) => {
                  const selected = isProductSelected(category.id, product.id);
                  return (
                    <TableRow
                      key={product.id}
                      onClick={() => onProductSelect(category.id, product.id)}
                      className={`cursor-pointer transition-all ${selected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/50'
                        }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <span className="whitespace-nowrap">{product.name}</span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-primary ml-1.5" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md text-sm">
                        {product.description}
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                          {product.pros.map((pro, idx) => (
                            <li key={idx} className="text-muted-foreground">
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                          {product.cons.map((con, idx) => (
                            <li key={idx} className="text-muted-foreground">
                              {con}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.price}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface BudgetDisplayProps {
  budget: { total: number; breakdown: BudgetBreakdown[]; hasVariable: boolean };
  selectedProducts: SelectedProducts;
  techStackData: TechStackData;
  saveName: string;
  onSaveNameChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  onClose: () => void;
  /** Logged-out preview: show the monthly partial, gate the annual + full build plan. */
  isPublic?: boolean;
  onGateCtaClick?: () => void;
}

// Gate for the full build plan. For signed-in users it renders the deliverable
// inline; for logged-out visitors it blurs/locks it behind a free-account CTA.
const PlanGate: React.FC<{ isPublic: boolean; onGateCtaClick?: () => void; children: React.ReactNode }> = ({
  isPublic,
  onGateCtaClick,
  children,
}) => {
  if (!isPublic) return <>{children}</>;
  return (
    <PreviewModeWrapper
      featureName="Full build plan"
      headline="Your stack budget is ready"
      description="Create a free account to unlock your annual cost, strategy plan, recommendations, and integration guide, then save and export your stack."
      ctaLabel="Create free account"
      signupSource="tech-stack"
      signupReturnPath="/tech-stack?hydrate=1"
      analyticsTool="tech_stack"
      onCtaClick={onGateCtaClick}
    >
      <div className="space-y-6">{children}</div>
    </PreviewModeWrapper>
  );
};

const BudgetDisplay: React.FC<BudgetDisplayProps> = ({
  budget,
  selectedProducts,
  techStackData,
  saveName,
  onSaveNameChange,
  onSave,
  saving,
  onClose,
  isPublic = false,
  onGateCtaClick,
}) => {
  const { total, breakdown, hasVariable } = budget;

  const annualBlock = (
    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
      <div>
        <span className="text-base font-semibold text-foreground">Annual Fixed Cost:</span>
        <p className="text-xs text-muted-foreground mt-1">12-month commitment savings potential</p>
      </div>
      <span className="text-2xl font-bold text-primary">${(total * 12).toFixed(2)}</span>
    </div>
  );

  // Generate strategy plan based on selected products
  const generateStrategy = useMemo(() => {
    const selectedProductDetails = techStackData.map(category => {
      const productId = selectedProducts[category.id];
      const product = category.products.find(p => p.id === productId);
      return { category: category.name, product, productId };
    }).filter(item => item.product);

    // Analyze stack composition
    const hasEnterpriseTools = selectedProductDetails.some(item =>
      item.product?.name.toLowerCase().includes('aws') ||
      item.product?.name.toLowerCase().includes('angular') ||
      item.product?.name.toLowerCase().includes('enterprise')
    );

    const hasStartupTools = selectedProductDetails.some(item =>
      item.product?.name.toLowerCase().includes('vercel') ||
      item.product?.name.toLowerCase().includes('supabase') ||
      item.product?.name.toLowerCase().includes('stripe')
    );

    const totalCost = total;
    const isBudgetConscious = totalCost < 200;
    const isMidRange = totalCost >= 200 && totalCost < 500;
    const isHighBudget = totalCost >= 500;

    let stage = 'early';
    let goalFocus = 'rapid validation';

    if (isBudgetConscious) {
      stage = 'early-stage';
      goalFocus = 'cost-efficient MVP and rapid market validation';
    } else if (isMidRange) {
      stage = 'growth-stage';
      goalFocus = 'scaling operations and expanding market reach';
    } else {
      stage = 'scale-stage';
      goalFocus = 'enterprise-grade operations and market leadership';
    }

    if (hasEnterpriseTools && !hasStartupTools) {
      stage = 'enterprise-stage';
      goalFocus = 'enterprise-scale operations and complex infrastructure';
    }

    return {
      stage,
      goalFocus,
      insights: generateInsights(selectedProductDetails),
      recommendations: generateRecommendations(selectedProductDetails, totalCost, hasVariable)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [selectedProducts, techStackData, total, hasVariable]);

  // Generate insights about the stack
  function generateInsights(selectedProductDetails: Array<{ category: string; product: TechStackProduct | undefined }>) {
    const insights: string[] = [];

    // Frontend insights
    const frontend = selectedProductDetails.find(item => item.category === 'Frontend');
    if (frontend?.product) {
      if (frontend.product.name.toLowerCase().includes('next')) {
        insights.push('Your Next.js choice indicates a focus on SEO and performance, ideal for content-driven products or marketing-heavy startups.');
      } else if (frontend.product.name.toLowerCase().includes('react')) {
        insights.push('React provides maximum flexibility for custom UI development, perfect for products requiring unique user experiences.');
      } else if (frontend.product.name.toLowerCase().includes('vue')) {
        insights.push('Vue.js offers an excellent balance of simplicity and power, great for teams seeking fast development cycles.');
      }
    }

    // Backend insights
    const backend = selectedProductDetails.find(item => item.category === 'Backend');
    if (backend?.product) {
      if (backend.product.name.toLowerCase().includes('supabase') || backend.product.name.toLowerCase().includes('firebase')) {
        insights.push('BaaS solutions (Supabase/Firebase) accelerate development, enabling faster time-to-market at the expense of some flexibility.');
      } else if (backend.product.name.toLowerCase().includes('node')) {
        insights.push('Node.js enables full-stack JavaScript development, reducing context switching and improving team efficiency.');
      }
    }

    // Hosting insights
    const hosting = selectedProductDetails.find(item => item.category === 'Hosting');
    if (hosting?.product) {
      if (hosting.product.name.toLowerCase().includes('vercel')) {
        insights.push('Vercel hosting suggests a focus on developer experience and seamless deployment workflows.');
      } else if (hosting.product.name.toLowerCase().includes('aws')) {
        insights.push('AWS indicates readiness for enterprise-scale infrastructure and advanced cloud services.');
      }
    }

    // Budget insights
    if (total < 150) {
      insights.push('Your lean stack prioritizes cost efficiency, ideal for bootstrapped founders focused on validating product-market fit.');
    } else if (total > 400) {
      insights.push('Your comprehensive stack investment shows commitment to robust infrastructure and scaling capabilities.');
    }

    return insights;
  }

  // Generate actionable recommendations
  function generateRecommendations(
    selectedProductDetails: Array<{ category: string; product: TechStackProduct | undefined }>,
    totalCost: number,
    hasVariable: boolean
  ) {
    const recommendations: Array<{ type: 'optimization' | 'upgrade' | 'risk'; title: string; description: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Cost optimization recommendations
    if (totalCost > 300) {
      recommendations.push({
        type: 'optimization',
        title: 'Cost Optimization Opportunity',
        description: 'Consider consolidating tools or exploring bundle deals. Some hosting providers offer credits for analytics and email services.',
        priority: 'medium'
      });
    }

    // Variable pricing warnings
    if (hasVariable) {
      recommendations.push({
        type: 'risk',
        title: 'Monitor Variable Costs',
        description: 'Some tools use usage-based pricing. Set up alerts and regularly review usage to avoid unexpected costs as you scale.',
        priority: 'high'
      });
    }

    // Upgrade path recommendations
    const frontend = selectedProductDetails.find(item => item.category === 'Frontend');
    const backend = selectedProductDetails.find(item => item.category === 'Backend');

    if (frontend?.product?.name.toLowerCase().includes('react') &&
      backend?.product?.name.toLowerCase().includes('node')) {
      recommendations.push({
        type: 'upgrade',
        title: 'Consider Full-Stack Framework',
        description: 'Your React + Node.js stack could benefit from Next.js or Remix for better integration and performance optimization.',
        priority: 'low'
      });
    }

    // Analytics recommendations
    const analytics = selectedProductDetails.find(item => item.category === 'Analytics');
    if (analytics?.product?.name.toLowerCase().includes('google')) {
      recommendations.push({
        type: 'upgrade',
        title: 'Enhanced Analytics Capability',
        description: 'Consider adding event tracking with Mixpanel or PostHog for deeper user behavior insights as you scale.',
        priority: 'low'
      });
    }

    // Risk management
    const hosting = selectedProductDetails.find(item => item.category === 'Hosting');
    if (hosting?.product?.name.toLowerCase().includes('vercel') &&
      frontend?.product?.name.toLowerCase().includes('next')) {
      recommendations.push({
        type: 'risk',
        title: 'Vendor Lock-in Consideration',
        description: 'Next.js + Vercel provides excellent DX but creates dependency. Ensure you have a migration plan if needed.',
        priority: 'low'
      });
    }

    // Budget risk
    if (totalCost < 100 && hasVariable) {
      recommendations.push({
        type: 'risk',
        title: 'Budget Buffer Needed',
        description: 'With variable pricing, plan for 20-30% budget buffer for usage spikes during growth phases.',
        priority: 'high'
      });
    }

    return recommendations;
  }

  // Generate integration suggestions
  function generateIntegrationSuggestions(selectedProductDetails: Array<{ category: string; product: TechStackProduct | undefined }>) {
    const integrations: IntegrationSuggestion[] = [];

    const frontend = selectedProductDetails.find(item => item.category === 'Frontend')?.product;
    const backend = selectedProductDetails.find(item => item.category === 'Backend')?.product;
    const hosting = selectedProductDetails.find(item => item.category === 'Hosting / Infrastructure')?.product;
    const analytics = selectedProductDetails.find(item => item.category === 'Analytics')?.product;
    const payments = selectedProductDetails.find(item => item.category === 'Payments')?.product;
    const email = selectedProductDetails.find(item => item.category === 'Email')?.product;
    const leadGen = selectedProductDetails.find(item => item.category === 'Lead Generation')?.product;
    const crm = selectedProductDetails.find(item => item.category === 'CRM')?.product;

    // Next.js + Vercel integration
    if (frontend?.name === 'Next.js' && hosting?.name === 'Vercel') {
      integrations.push({
        title: 'Seamless Next.js + Vercel Deployment',
        description: 'Deploy your Next.js app with zero configuration. Connect your Git repository and Vercel will automatically build and deploy on every push.',
        tools: ['Next.js', 'Vercel'],
        difficulty: 'easy',
        benefits: [
          'Automatic builds on git push',
          'Preview deployments for every branch',
          'Optimized edge network delivery',
          'Built-in analytics and monitoring'
        ]
      });
    }

    // Frontend + Supabase integration
    if ((frontend?.name === 'React' || frontend?.name === 'Next.js') && backend?.name === 'Supabase') {
      integrations.push({
        title: `${frontend.name} + Supabase Full-Stack Integration`,
        description: 'Use Supabase JavaScript client for authentication, database queries, and real-time subscriptions directly from your React components.',
        tools: [frontend.name, 'Supabase'],
        difficulty: 'easy',
        benefits: [
          'Type-safe database queries with auto-generated types',
          'Real-time data sync across users',
          'Built-in authentication hooks',
          'Row-level security for data protection'
        ]
      });
    }

    // Stripe integration
    if (payments?.name === 'Stripe') {
      const frontendName = frontend?.name || 'your frontend';
      integrations.push({
        title: `Stripe Checkout Integration`,
        description: `Integrate Stripe's hosted checkout page or embedded components into ${frontendName}. Use Stripe webhooks to handle payment events in your backend.`,
        tools: ['Stripe', frontendName],
        difficulty: 'medium',
        benefits: [
          'PCI compliance handled by Stripe',
          'Support for 135+ currencies',
          'Subscription billing automation',
          'Fraud prevention built-in'
        ]
      });
    }

    // Analytics integration
    if (analytics?.name === 'Google Analytics') {
      integrations.push({
        title: 'Google Analytics 4 Event Tracking',
        description: 'Set up GA4 using gtag.js or Google Tag Manager. Track custom events like signups, purchases, and feature usage to understand user behavior.',
        tools: ['Google Analytics', frontend?.name || 'Frontend'],
        difficulty: 'easy',
        benefits: [
          'Free and comprehensive tracking',
          'Integration with Google Ads',
          'Demographic and interest data',
          'Custom event tracking'
        ]
      });
    } else if (analytics?.name === 'Mixpanel' || analytics?.name === 'Amplitude') {
      integrations.push({
        title: `${analytics.name} Product Analytics Setup`,
        description: 'Implement event tracking throughout your app. Track user journeys, feature adoption, and conversion funnels with detailed segmentation.',
        tools: [analytics.name, frontend?.name || 'Frontend'],
        difficulty: 'medium',
        benefits: [
          'User-level event tracking',
          'Funnel and retention analysis',
          'A/B testing capabilities',
          'Cohort-based insights'
        ]
      });
    }

    // Email service integration
    if (email?.name === 'SendGrid' || email?.name === 'Resend' || email?.name === 'Postmark') {
      integrations.push({
        title: `${email.name} Transactional Email Setup`,
        description: `Use ${email.name}'s API to send password resets, welcome emails, and notifications. Create email templates and track delivery rates.`,
        tools: [email.name, backend?.name || 'Backend'],
        difficulty: 'easy',
        benefits: [
          'High deliverability rates',
          'Email template management',
          'Bounce and spam tracking',
          'Webhooks for email events'
        ]
      });
    }

    // Firebase + Hosting optimization
    if (backend?.name === 'Firebase' && hosting?.name === 'Vercel') {
      integrations.push({
        title: 'Firebase + Vercel Hybrid Architecture',
        description: 'Host your frontend on Vercel while using Firebase for backend services. Use Vercel Edge Functions for performance-critical logic.',
        tools: ['Firebase', 'Vercel', frontend?.name || 'Frontend'],
        difficulty: 'medium',
        benefits: [
          'Best-in-class frontend performance',
          'Real-time database capabilities',
          'Scalable backend infrastructure',
          'Optimized global delivery'
        ]
      });
    }

    // Lead generation + CRM workflow
    if (leadGen?.name === 'Apollo.io' || leadGen?.name === 'Hunter') {
      integrations.push({
        title: `${leadGen.name} Lead Enrichment Workflow`,
        description: `Set up automated workflows to enrich leads from your app with contact data. Sync enriched leads to ${crm?.name || 'your CRM'} or send them into ${email?.name || 'email'} sequences.`,
        tools: [leadGen.name, crm?.name || 'CRM', email?.name || 'Email Service'],
        difficulty: 'advanced',
        benefits: [
          'Automated lead enrichment',
          'Contact verification',
          'Email sequence automation',
          'Sales pipeline integration'
        ]
      });
    }

    // Node.js + PostgreSQL (Supabase) patterns
    if (backend?.name === 'Node.js' && hosting?.name === 'Railway') {
      integrations.push({
        title: 'Node.js + PostgreSQL on Railway',
        description: 'Deploy your Node.js backend and PostgreSQL database on Railway. Use environment variables for database connection and automatic SSL.',
        tools: ['Node.js', 'Railway'],
        difficulty: 'medium',
        benefits: [
          'Database and backend in one platform',
          'Automatic SSL certificates',
          'Simple CI/CD pipeline',
          'Cost-effective for startups'
        ]
      });
    }

    // Full-stack modern setup
    if (frontend?.name === 'Next.js' && backend?.name === 'Supabase' && payments?.name === 'Stripe') {
      integrations.push({
        title: 'Complete SaaS Stack Integration',
        description: 'Build a full-featured SaaS with Next.js frontend, Supabase backend, and Stripe billing. Use Next.js API routes to handle Stripe webhooks securely.',
        tools: ['Next.js', 'Supabase', 'Stripe'],
        difficulty: 'advanced',
        benefits: [
          'End-to-end type safety',
          'Subscription billing automation',
          'Real-time data updates',
          'Production-ready architecture'
        ]
      });
    }

    return integrations;
  }

  const integrationSuggestions = useMemo(() => {
    const selectedProductDetails = techStackData.map(category => {
      const productId = selectedProducts[category.id];
      const product = category.products.find(p => p.id === productId);
      return { category: category.name, product, productId };
    }).filter(item => item.product);

    return generateIntegrationSuggestions(selectedProductDetails);
  }, [selectedProducts, techStackData]);

  return (
    <div className="space-y-6">
      {/* Budget Summary Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Estimated Monthly Budget
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPublic && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Save this report</p>
                <Input
                  value={saveName}
                  onChange={(event) => onSaveNameChange(event.target.value)}
                  placeholder="Report name (optional)"
                  className="text-sm"
                />
              </div>
              <Button onClick={onSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{item.product}</p>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.price}</p>
                  {item.isVariable && (
                    <p className="text-xs text-muted-foreground">Variable</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-4">
            {/* Monthly Cost */}
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-muted-foreground">Monthly Fixed Cost:</span>
              <span className="text-2xl font-bold text-foreground">${total.toFixed(2)}</span>
            </div>

            {/* Annual Cost — gated for logged-out visitors (shown blurred below) */}
            {!isPublic && annualBlock}

            {/* Budget Range Info */}
            <div className="p-3 bg-info-subtle dark:bg-info/20 rounded-lg border border-info dark:border-info">
              <p className="text-sm text-info dark:text-info">
                <strong>Budget Range:</strong> {
                  total < 200 ? 'Budget-Conscious (Great for bootstrapped startups and MVPs)' :
                    total < 500 ? 'Mid-Range (Suitable for growth-stage startups)' :
                      'Premium (Enterprise-grade tools for scaling teams)'
                }
              </p>
            </div>

            {hasVariable && (
              <div className="p-3 bg-warning-subtle dark:bg-warning/20 rounded-lg border border-warning dark:border-warning">
                <p className="text-sm text-warning dark:text-warning">
                  <strong>Variable Costs Alert:</strong> Some selected products use usage-based pricing.
                  The totals above only include fixed monthly costs. Plan for 20-30% additional budget for
                  variable charges as you scale.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PlanGate isPublic={isPublic} onGateCtaClick={onGateCtaClick}>
      {isPublic && (
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">{annualBlock}</CardContent>
        </Card>
      )}

      {/* Strategy Plan Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Target className="w-6 h-6" />
            Strategy Plan
          </CardTitle>
          <CardDescription>
            How your tech stack supports your {generateStrategy.stage} goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Your Stack is Optimized For:
            </h4>
            <p className="text-sm text-foreground/90">
              {generateStrategy.goalFocus.charAt(0).toUpperCase() + generateStrategy.goalFocus.slice(1)}.
            </p>
          </div>

          {generateStrategy.insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Key Insights
              </h4>
              <ul className="space-y-2">
                {generateStrategy.insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations Card */}
      {generateStrategy.recommendations.length > 0 && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6" />
              Actionable Recommendations
            </CardTitle>
            <CardDescription>
              Optimize your stack and mitigate risks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {generateStrategy.recommendations.map((rec, idx) => {
              const priorityColors = {
                high: 'border-destructive dark:border-destructive bg-destructive-subtle dark:bg-destructive/20',
                medium: 'border-warning dark:border-warning bg-warning-subtle dark:bg-warning/20',
                low: 'border-info dark:border-info bg-info-subtle dark:bg-info/20'
              };

              const iconColors = {
                high: 'text-destructive dark:text-destructive',
                medium: 'text-warning dark:text-warning',
                low: 'text-info dark:text-info'
              };

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}
                >
                  <div className="flex items-start gap-3">
                    {rec.type === 'risk' ? (
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${iconColors[rec.priority]}`} />
                    ) : rec.type === 'upgrade' ? (
                      <TrendingUp className={`w-5 h-5 mt-0.5 ${iconColors[rec.priority]}`} />
                    ) : (
                      <Lightbulb className={`w-5 h-5 mt-0.5 ${iconColors[rec.priority]}`} />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{rec.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${rec.priority === 'high' ? 'bg-destructive-subtle dark:bg-destructive/30 text-destructive dark:text-destructive' :
                          rec.priority === 'medium' ? 'bg-warning-subtle dark:bg-warning/30 text-warning dark:text-warning' :
                            'bg-info-subtle dark:bg-info/30 text-info dark:text-info'
                          }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80">{rec.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Integration Suggestions Card */}
      {integrationSuggestions.length > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Link2 className="w-6 h-6" />
              Integration Guide
            </CardTitle>
            <CardDescription>
              Step-by-step guidance on connecting your selected tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrationSuggestions.map((integration, idx) => {
              const difficultyColors = {
                easy: 'bg-success-subtle dark:bg-success/30 text-success dark:text-success border-success dark:border-success',
                medium: 'bg-warning-subtle dark:bg-warning/30 text-warning dark:text-warning border-warning dark:border-warning',
                advanced: 'bg-warning-subtle dark:bg-warning/30 text-warning dark:text-warning border-warning dark:border-warning'
              };

              return (
                <div
                  key={idx}
                  className="p-5 rounded-lg border-2 bg-background/80 backdrop-blur-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-1">{integration.title}</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {integration.tools.map((tool, toolIdx) => (
                            <span
                              key={toolIdx}
                              className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium border flex-shrink-0 ${difficultyColors[integration.difficulty]}`}>
                      {integration.difficulty.charAt(0).toUpperCase() + integration.difficulty.slice(1)}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {integration.description}
                  </p>

                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Key Benefits:
                    </h5>
                    <ul className="space-y-1.5 ml-5">
                      {integration.benefits.map((benefit, benefitIdx) => (
                        <li key={benefitIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1.5 text-xs">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}

            {/* Call to Action */}
            <div className="mt-6 p-4 bg-primary/10 border-2 border-primary/20 rounded-lg">
              <p className="text-sm text-foreground/90 flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Pro Tip:</strong> Start with "Easy" integrations first to get quick wins.
                  Build confidence before tackling "Advanced" integrations. All these tools have
                  excellent documentation and active communities to help you succeed.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </PlanGate>
    </div>
  );
};

export default TechStack;

