import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { techStackData, TechStackCategory, TechStackData, TechStackProduct } from '@/data/techStack';
import { CheckCircle2, Calculator, DollarSign, Monitor, Server, Cloud, BarChart, CreditCard, Mail, Users, Lock, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Target, Link2, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useCredits } from '@/hooks/useCredits';
import { CreditGate } from '@/components/CreditGate';
import { CREDIT_COSTS } from '@/config/constants';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface IntegrationSuggestion {
  title: string;
  description: string;
  tools: string[];
  difficulty: 'easy' | 'medium' | 'advanced';
  benefits: string[];
}

const TechStack: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscriptionData } = useSubscription();
  const { checkFeatureAccess } = useFeatureGating();
  const { hasCredits } = useCredits();
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>({});
  const [showBudget, setShowBudget] = useState(false);
  const [creditGateOpen, setCreditGateOpen] = useState(false);
  
  const currentTier = subscriptionData.subscription_tier?.toLowerCase() || 'free';
  const hasPaidAccess = user && ['creator', 'professional'].includes(currentTier);

  const handleProductSelect = (categoryId: string, productId: string) => {
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

  const budget = useMemo(() => calculateBudget(), [selectedProducts]);

  const handleSeeBudget = async () => {
    console.log('🔍 Debug - Button clicked');
    console.log('🔍 Debug - User:', user);
    console.log('🔍 Debug - Selected count:', selectedCount, '/', techStackData.length);

    if (!user) {
      console.log('❌ No user - redirecting to login');
      navigate('/login');
      return;
    }

    // Require all categories to be selected
    if (selectedCount !== techStackData.length) {
      console.log('❌ Not all categories selected');
      toast({
        title: "Selection Required",
        description: `Please select one product from all ${techStackData.length} categories to generate your budget.`,
        variant: "destructive",
      });
      return;
    }

    console.log('✅ All categories selected');
    console.log('🔍 Checking feature access...');

    // Check feature access and credits
    const featureAccess = checkFeatureAccess('tech_stack_generation');
    console.log('🔍 Feature access:', featureAccess);

    if (!featureAccess.hasAccess) {
      console.log('❌ No feature access');
      toast({
        title: "Upgrade Required",
        description: featureAccess.message || "Upgrade to Creator tier for unlimited Tech Stack generations.",
        variant: "destructive",
      });
      setCreditGateOpen(true);
      return;
    }

    console.log('✅ Feature access granted');
    console.log('🔍 Checking credits...');

    if (!hasCredits(CREDIT_COSTS.TECH_STACK_GENERATION)) {
      console.log('❌ Insufficient credits');
      setCreditGateOpen(true);
      return;
    }

    console.log('✅ Has credits');

    // Check usage limits for free tier (1/month)
    if (currentTier === 'free') {
      console.log('🔍 Free tier - checking usage limits...');
      try {
        const { data: usageData, error: usageError } = await supabase
          .rpc('get_feature_usage', {
            p_user_id: user.id,
            p_feature_name: 'tech_stack_generations'
          });

        console.log('🔍 Usage data:', usageData, 'Error:', usageError);

        if (!usageError && usageData) {
          const usage = usageData as { current_usage: number; limit: number; remaining: number };
          if (usage.remaining <= 0 && usage.limit > 0) {
            console.log('❌ Usage limit reached');
            toast({
              title: "Usage Limit Reached",
              description: "You've used your 1 free Tech Stack generation this month. Upgrade to Creator for unlimited generations.",
              variant: "destructive",
            });
            setCreditGateOpen(true);
            return;
          }
        }
      } catch (error) {
        console.error('⚠️ Error checking usage:', error);
      }
    }

    console.log('🔍 Attempting to deduct credits...');

    // Deduct credits and increment usage
    try {
      const { data: creditData, error: creditError } = await supabase.functions.invoke('credit-service', {
        body: {
          action: 'deduct',
          amount: CREDIT_COSTS.TECH_STACK_GENERATION,
          feature: 'Tech Stack Generation'
        }
      });

      console.log('🔍 Credit deduction response:', creditData, 'Error:', creditError);

      if (creditError || !creditData?.success) {
        console.log('❌ Credit deduction failed');
        toast({
          title: "Error",
          description: "Failed to process. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Credits deducted');
      console.log('🔍 Incrementing usage...');

      // Increment usage
      await supabase.rpc('check_and_increment_usage', {
        p_user_id: user.id,
        p_feature_name: 'tech_stack_generations',
        p_increment_by: 1
      });

      console.log('✅ Usage incremented');
      console.log('✅ SHOWING BUDGET!');

      setShowBudget(true);

      toast({
        title: "Budget Generated!",
        description: "Scroll down to view your tech stack budget and integration guide.",
      });
    } catch (error) {
      console.error('❌ Error processing generation:', error);
      toast({
        title: "Error",
        description: "Failed to process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedCount = Object.values(selectedProducts).filter(id => id !== null).length;
  const allCategoriesSelected = selectedCount === techStackData.length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {techStackData.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          selectedProductId={selectedProducts[category.id]}
          onProductSelect={handleProductSelect}
          isProductSelected={isProductSelected}
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
                {!allCategoriesSelected && hasPaidAccess && user && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Select one product in all {techStackData.length} categories to view budget and strategy
                  </p>
                )}
              </div>
              <Button
                onClick={handleSeeBudget}
                size="lg"
                className="w-full sm:w-auto min-w-[140px]"
                disabled={!user || !allCategoriesSelected}
              >
                {!user ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In to View Budget
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    {currentTier === 'free' ? 'Generate (1/month)' : 'Generate Budget'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showBudget && user && allCategoriesSelected && (
        <BudgetDisplay
          budget={budget}
          selectedProducts={selectedProducts}
          techStackData={techStackData}
          onClose={() => setShowBudget(false)}
        />
      )}

      <CreditGate
        isOpen={creditGateOpen}
        onClose={() => setCreditGateOpen(false)}
        requiredCredits={CREDIT_COSTS.TECH_STACK_GENERATION}
        feature="Tech Stack Generation"
      />
    </div>
  );
};

interface CategorySectionProps {
  category: TechStackCategory;
  selectedProductId: string | null;
  onProductSelect: (categoryId: string, productId: string) => void;
  isProductSelected: (categoryId: string, productId: string) => boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  selectedProductId,
  onProductSelect,
  isProductSelected
}) => {
  return (
    <Card>
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
                    className={`cursor-pointer transition-all ${
                      selected
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
      </CardContent>
    </Card>
  );
};

interface BudgetDisplayProps {
  budget: { total: number; breakdown: BudgetBreakdown[]; hasVariable: boolean };
  selectedProducts: SelectedProducts;
  techStackData: TechStackData;
  onClose: () => void;
}

const BudgetDisplay: React.FC<BudgetDisplayProps> = ({ budget, selectedProducts, techStackData, onClose }) => {
  const { total, breakdown, hasVariable } = budget;

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
        description: 'Set up automated workflows to enrich leads from your app with contact data. Sync enriched leads to your CRM or send to email sequences.',
        tools: [leadGen.name, email?.name || 'Email Service'],
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

            {/* Annual Cost */}
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div>
                <span className="text-base font-semibold text-foreground">Annual Fixed Cost:</span>
                <p className="text-xs text-muted-foreground mt-1">12-month commitment savings potential</p>
              </div>
              <span className="text-2xl font-bold text-primary">${(total * 12).toFixed(2)}</span>
            </div>

            {/* Budget Range Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Budget Range:</strong> {
                  total < 200 ? 'Budget-Conscious (Great for bootstrapped startups and MVPs)' :
                  total < 500 ? 'Mid-Range (Suitable for growth-stage startups)' :
                  'Premium (Enterprise-grade tools for scaling teams)'
                }
              </p>
            </div>

            {hasVariable && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Variable Costs Alert:</strong> Some selected products use usage-based pricing.
                  The totals above only include fixed monthly costs. Plan for 20-30% additional budget for
                  variable charges as you scale.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                high: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20',
                medium: 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20',
                low: 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20'
              };
              
              const iconColors = {
                high: 'text-red-600 dark:text-red-400',
                medium: 'text-yellow-600 dark:text-yellow-400',
                low: 'text-blue-600 dark:text-blue-400'
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          rec.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
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
                easy: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900',
                medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900',
                advanced: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900'
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
    </div>
  );
};

export default TechStack;

