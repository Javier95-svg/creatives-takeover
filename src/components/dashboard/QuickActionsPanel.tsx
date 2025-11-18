import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, TrendingUp, Users, BookOpen, DollarSign, BarChart3, Mail, Wallet, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { useMarketValidation } from '@/hooks/useMarketValidation';
import { useOutreachCampaigns } from '@/hooks/useOutreachCampaigns';

export const QuickActionsPanel = () => {
  const { createExpense } = useBudgetManagement();
  const { triggerValidation } = useMarketValidation();
  const { createCampaign } = useOutreachCampaigns();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', category_id: '' });
  const [validationForm, setValidationForm] = useState({ business_idea: '', industry: '', target_market: '' });
  const [campaignForm, setCampaignForm] = useState({ name: '', channel: 'email' as const, description: '' });

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    createExpense({
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description,
      category_id: expenseForm.category_id || null,
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: null,
      notes: null,
      is_recurring: false,
      recurring_frequency: null,
      tags: [],
      receipt_url: null,
      session_id: null,
    });
    setExpenseForm({ amount: '', description: '', category_id: '' });
    setExpenseDialogOpen(false);
  };

  const handleQuickValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerValidation({
      business_idea: validationForm.business_idea,
      industry: validationForm.industry || undefined,
      target_market: validationForm.target_market || undefined,
    });
    setValidationForm({ business_idea: '', industry: '', target_market: '' });
    setValidationDialogOpen(false);
  };

  const handleQuickCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign({
      name: campaignForm.name,
      description: campaignForm.description || null,
      channel: campaignForm.channel,
      status: 'draft',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      budget: 0,
      target_contacts: 0,
      session_id: null,
    });
    setCampaignForm({ name: '', channel: 'email', description: '' });
    setCampaignDialogOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const actions = [
    {
      title: 'Track Expense',
      description: 'Quick expense entry',
      icon: DollarSign,
      action: () => setExpenseDialogOpen(true),
      color: 'from-green-500/20 to-green-500/5',
      iconColor: 'text-green-500',
    },
    {
      title: 'Validate Market',
      description: 'Run market validation',
      icon: BarChart3,
      action: () => setValidationDialogOpen(true),
      color: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Start Campaign',
      description: 'Create outreach campaign',
      icon: Mail,
      action: () => setCampaignDialogOpen(true),
      color: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-500',
    },
    {
      title: 'View Budget',
      description: 'Open budget manager',
      icon: Wallet,
      action: () => scrollToSection('budget-manager'),
      color: 'from-orange-500/20 to-orange-500/5',
      iconColor: 'text-orange-500',
    },
    {
      title: 'Check Runway',
      description: 'View cash runway',
      icon: TrendingDown,
      action: () => scrollToSection('budget-manager'),
      color: 'from-red-500/20 to-red-500/5',
      iconColor: 'text-red-500',
    },
    {
      title: 'New Project',
      description: 'Start a new creative project',
      icon: PlusCircle,
      link: '/bizmap-ai',
      color: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Funding',
      description: 'Explore funding opportunities',
      icon: TrendingUp,
      link: '/insighta',
      color: 'from-green-500/20 to-green-500/5',
      iconColor: 'text-green-500',
    },
    {
      title: 'Community',
      description: 'Connect with creators',
      icon: Users,
      link: '/community',
      color: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-500',
    },
  ];

  const { categories } = useBudgetManagement();

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((action) => {
              if (action.link) {
                return (
                  <Link key={action.title} to={action.link}>
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent transition-all group"
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform`}>
                        <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  </Link>
                );
              }
              return (
                <Button
                  key={action.title}
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent transition-all group"
                  onClick={action.action}
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Expense Entry</DialogTitle>
            <DialogDescription>Add an expense quickly</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                required
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What is this expense for?"
              />
            </div>
            <Button type="submit" className="w-full">Add Expense</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Validation Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Market Validation</DialogTitle>
            <DialogDescription>Validate your business idea</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickValidation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_idea">Business Idea *</Label>
              <Textarea
                id="business_idea"
                required
                value={validationForm.business_idea}
                onChange={(e) => setValidationForm(prev => ({ ...prev, business_idea: e.target.value }))}
                placeholder="Describe your business idea..."
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full">Validate Market</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Campaign Setup</DialogTitle>
            <DialogDescription>Create a new outreach campaign</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickCampaign} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign_name">Campaign Name *</Label>
              <Input
                id="campaign_name"
                required
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Campaign name"
              />
            </div>
            <Button type="submit" className="w-full">Create Campaign</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
