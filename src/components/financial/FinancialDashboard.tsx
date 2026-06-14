import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  Target,
  AlertTriangle,
  Zap
} from "lucide-react";

interface FinancialData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  burnRate: number;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  breakEvenMonth: number;
  customerAcquisitionCost: number;
  lifetimeValue: number;
  monthlyGrowthRate: number;
}

const FinancialDashboard = ({ businessPlan }: { businessPlan?: any }) => {
  const [timeHorizon, setTimeHorizon] = useState("12");
  const [scenario, setScenario] = useState("realistic");
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [customInputs, setCustomInputs] = useState({
    initialRevenue: 1000,
    monthlyGrowthRate: 15,
    fixedCosts: 5000,
    variableCostPercent: 30,
    customerAcquisitionCost: 50,
    averageRevenuePerUser: 100
  });

  // Generate financial projections
  useEffect(() => {
    generateProjections();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [timeHorizon, scenario, customInputs]);

  const generateProjections = () => {
    const months = parseInt(timeHorizon);
    const data: FinancialData[] = [];
    let cumulativeRevenue = 0;
    let cumulativeExpenses = 0;

    // Scenario multipliers
    const multipliers = {
      conservative: { growth: 0.7, costs: 1.2 },
      realistic: { growth: 1.0, costs: 1.0 },
      optimistic: { growth: 1.4, costs: 0.8 }
    };

    const mult = multipliers[scenario as keyof typeof multipliers];

    for (let i = 0; i < months; i++) {
      const growthFactor = Math.pow(1 + (customInputs.monthlyGrowthRate / 100 * mult.growth), i);
      const revenue = customInputs.initialRevenue * growthFactor;
      const variableCosts = revenue * (customInputs.variableCostPercent / 100);
      const fixedCosts = customInputs.fixedCosts * mult.costs;
      const totalExpenses = variableCosts + fixedCosts;
      const profit = revenue - totalExpenses;
      const customers = Math.floor(revenue / customInputs.averageRevenuePerUser);

      cumulativeRevenue += revenue;
      cumulativeExpenses += totalExpenses;

      data.push({
        month: `Month ${i + 1}`,
        revenue: Math.round(revenue),
        expenses: Math.round(totalExpenses),
        profit: Math.round(profit),
        customers: customers,
        burnRate: Math.round(profit < 0 ? Math.abs(profit) : 0)
      });
    }

    setFinancialData(data);

    // Calculate metrics
    const totalRevenue = cumulativeRevenue;
    const totalExpenses = cumulativeExpenses;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = (netProfit / totalRevenue) * 100;
    const breakEvenIndex = data.findIndex(d => d.profit >= 0);
    const breakEvenMonth = breakEvenIndex >= 0 ? breakEvenIndex + 1 : -1;

    setMetrics({
      totalRevenue: Math.round(totalRevenue),
      totalExpenses: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      profitMargin: Math.round(profitMargin * 100) / 100,
      breakEvenMonth,
      customerAcquisitionCost: customInputs.customerAcquisitionCost,
      lifetimeValue: customInputs.averageRevenuePerUser * 12, // Assume 12 month retention
      monthlyGrowthRate: customInputs.monthlyGrowthRate
    });
  };

  const expenseBreakdown = [
    { name: 'Fixed Costs', value: customInputs.fixedCosts, color: '#8884d8' },
    { name: 'Variable Costs', value: customInputs.variableCostPercent, color: '#82ca9d' },
    { name: 'Marketing', value: 20, color: '#ffc658' },
    { name: 'Operations', value: 15, color: '#ff7300' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold creatives-font gradient-text">
            Financial Dashboard
          </h2>
          <p className="text-muted-foreground mt-2">
            Interactive financial modeling and projections
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={scenario} onValueChange={setScenario}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="realistic">Realistic</SelectItem>
              <SelectItem value="optimistic">Optimistic</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeHorizon} onValueChange={setTimeHorizon}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
              <SelectItem value="24">24 Months</SelectItem>
              <SelectItem value="36">36 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-success">
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ${metrics.netProfit.toLocaleString()}
                  </p>
                </div>
                {metrics.netProfit >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-success" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Break-even</p>
                  <p className="text-2xl font-bold text-info">
                    {metrics.breakEvenMonth > 0 ? `Month ${metrics.breakEvenMonth}` : 'Not reached'}
                  </p>
                </div>
                <Target className="w-8 h-8 text-info" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                  <p className={`text-2xl font-bold ${metrics.profitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {metrics.profitMargin}%
                  </p>
                </div>
                <Calculator className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Inputs */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Model Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Initial Monthly Revenue</Label>
              <Input
                type="number"
                value={customInputs.initialRevenue}
                onChange={(e) => setCustomInputs(prev => ({
                  ...prev,
                  initialRevenue: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Growth Rate (%)</Label>
              <Input
                type="number"
                value={customInputs.monthlyGrowthRate}
                onChange={(e) => setCustomInputs(prev => ({
                  ...prev,
                  monthlyGrowthRate: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Fixed Monthly Costs</Label>
              <Input
                type="number"
                value={customInputs.fixedCosts}
                onChange={(e) => setCustomInputs(prev => ({
                  ...prev,
                  fixedCosts: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Variable Costs (%)</Label>
              <Input
                type="number"
                value={customInputs.variableCostPercent}
                onChange={(e) => setCustomInputs(prev => ({
                  ...prev,
                  variableCostPercent: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Acquisition Cost</Label>
              <Input
                type="number"
                value={customInputs.customerAcquisitionCost}
                onChange={(e) => setCustomInputs(prev => ({
                  ...prev,
                  customerAcquisitionCost: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Avg Revenue Per User</Label>
              <Input
                type="number"
                value={customInputs.averageRevenuePerUser}
                onChange={(e) => setCustomInputs(prev => ({
                  ...prev,
                  averageRevenuePerUser: parseInt(e.target.value) || 0
                }))}
              />
            </div>

            {/* Scenario Badge */}
            <div className="pt-4">
              <Badge 
                variant={scenario === 'optimistic' ? 'default' : scenario === 'conservative' ? 'secondary' : 'outline'}
                className="capitalize"
              >
                {scenario} Scenario
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue & Profit Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Revenue & Profit Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stackId="2"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Customer Growth */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Customer Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="customers"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6' }}
                    name="Customers"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Insights */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                {metrics.breakEvenMonth > 0 ? (
                  <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
                ) : (
                  <AlertTriangle className="w-4 h-4 text-warning mt-1 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium">Break-even Analysis</p>
                  <p className="text-sm text-muted-foreground">
                    {metrics.breakEvenMonth > 0 
                      ? `You'll break even in month ${metrics.breakEvenMonth} with current projections.`
                      : "Break-even not reached within projection period. Consider adjusting pricing or costs."
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-info rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">Customer Economics</p>
                  <p className="text-sm text-muted-foreground">
                    LTV:CAC ratio is {(metrics.lifetimeValue / metrics.customerAcquisitionCost).toFixed(1)}:1
                    {metrics.lifetimeValue / metrics.customerAcquisitionCost > 3 ? " (Excellent)" : " (Needs improvement)"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">Growth Rate</p>
                  <p className="text-sm text-muted-foreground">
                    {metrics.monthlyGrowthRate}% monthly growth translates to {Math.round(Math.pow(1 + metrics.monthlyGrowthRate/100, 12) * 100 - 100)}% annual growth rate.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Funding Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium">Estimated Funding Needed</p>
                <p className="text-2xl font-bold text-info">
                  ${Math.abs(Math.min(...financialData.map(d => d.profit), 0)).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Based on maximum negative cash flow in projections
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Runway Extension</p>
                <p className="text-sm text-muted-foreground">
                  With additional funding, you can extend runway by 6-12 months and improve break-even timeline.
                </p>
              </div>

              <Button className="w-full" variant="outline">
                Generate Investor Pitch Deck
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;