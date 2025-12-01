import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  Calculator,
  Target,
  AlertCircle,
  CheckCircle,
  Building,
  BarChart3,
  Zap
} from "lucide-react";

interface ValuationInputs {
  annualRevenue: number;
  monthlyGrowthRate: number;
  grossMargin: number;
  netMargin: number;
  customerCount: number;
  averageRevenuePerCustomer: number;
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  marketSize: number;
  teamSize: number;
  fundingRaised: number;
  monthsOfRunway: number;
}

interface ValuationResults {
  revenueMultiple: number;
  dcfValuation: number;
  marketComparison: number;
  riskAdjustedValue: number;
  finalValuation: number;
  investmentReadiness: number;
  keyStrengths: string[];
  riskFactors: string[];
  recommendations: string[];
}

const BusinessValuation = ({ businessPlan }: { businessPlan?: any }) => {
  const [inputs, setInputs] = useState<ValuationInputs>({
    annualRevenue: businessPlan?.projectedRevenue || 0,
    monthlyGrowthRate: 10,
    grossMargin: 70,
    netMargin: 15,
    customerCount: 100,
    averageRevenuePerCustomer: 1200,
    customerAcquisitionCost: 100,
    customerLifetimeValue: 3600,
    marketSize: 1000000000,
    teamSize: 3,
    fundingRaised: 0,
    monthsOfRunway: 12
  });

  const [results, setResults] = useState<ValuationResults | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("comprehensive");

  useEffect(() => {
    calculateValuation();
  }, [inputs, selectedMethod]);

  const calculateValuation = () => {
    const {
      annualRevenue,
      monthlyGrowthRate,
      grossMargin,
      netMargin,
      customerCount,
      customerAcquisitionCost,
      customerLifetimeValue,
      marketSize,
      teamSize,
      monthsOfRunway
    } = inputs;

    // Revenue Multiple Method (SaaS: 5-15x, E-commerce: 1-3x)
    const industryMultiplier = businessPlan?.category === 'Software' ? 8 : 
                              businessPlan?.category === 'E-commerce' ? 2 : 4;
    const growthBonus = Math.min(monthlyGrowthRate / 10, 2); // Up to 2x for high growth
    const revenueMultiple = annualRevenue * (industryMultiplier + growthBonus);

    // DCF Valuation (simplified)
    const projectedCashFlow = annualRevenue * (netMargin / 100);
    const growthRate = monthlyGrowthRate / 100;
    const terminalMultiple = 10; // Conservative terminal multiple
    const discountRate = 0.15; // 15% discount rate
    
    let dcfValue = 0;
    for (let year = 1; year <= 5; year++) {
      const cashFlow = projectedCashFlow * Math.pow(1 + growthRate * 12, year);
      dcfValue += cashFlow / Math.pow(1 + discountRate, year);
    }
    const terminalValue = (projectedCashFlow * Math.pow(1 + growthRate * 12, 5) * terminalMultiple) / 
                         Math.pow(1 + discountRate, 5);
    const dcfValuation = dcfValue + terminalValue;

    // Market Comparison (based on market penetration potential)
    const marketPenetration = customerCount / (marketSize / 100000); // Assume market size in revenue
    const marketComparison = marketSize * 0.001 * Math.min(marketPenetration * 100, 5); // Max 0.5% market share

    // Risk Assessment
    let riskScore = 100;
    const riskFactors: string[] = [];
    const strengths: string[] = [];
    
    // Positive factors
    if (grossMargin > 60) {
      strengths.push("Strong gross margins indicate good unit economics");
    }
    if (customerLifetimeValue / customerAcquisitionCost > 3) {
      strengths.push("Excellent LTV:CAC ratio shows sustainable growth potential");
    }
    if (monthlyGrowthRate > 15) {
      strengths.push("High growth rate demonstrates strong market demand");
    }
    if (teamSize >= 2) {
      strengths.push("Team diversity reduces key person risk");
    }
    if (monthsOfRunway > 18) {
      strengths.push("Strong runway provides time for execution");
    }

    // Risk factors
    if (grossMargin < 40) {
      riskScore -= 20;
      riskFactors.push("Low gross margins may indicate pricing or cost structure issues");
    }
    if (customerLifetimeValue / customerAcquisitionCost < 2) {
      riskScore -= 25;
      riskFactors.push("Poor LTV:CAC ratio suggests unsustainable unit economics");
    }
    if (customerCount < 50) {
      riskScore -= 15;
      riskFactors.push("Small customer base increases concentration risk");
    }
    if (monthsOfRunway < 6) {
      riskScore -= 30;
      riskFactors.push("Short runway creates immediate funding pressure");
    }
    if (teamSize === 1) {
      riskScore -= 20;
      riskFactors.push("Single founder increases execution and key person risk");
    }

    const riskMultiplier = Math.max(riskScore / 100, 0.3); // Minimum 30% of base valuation
    const riskAdjustedValue = Math.max(revenueMultiple, dcfValuation) * riskMultiplier;

    // Final valuation (weighted average)
    const finalValuation = (revenueMultiple * 0.4 + dcfValuation * 0.4 + marketComparison * 0.2) * riskMultiplier;

    // Investment readiness score
    const investmentReadiness = Math.min(
      (grossMargin / 70) * 20 + 
      (Math.min(customerLifetimeValue / customerAcquisitionCost, 5) / 5) * 25 +
      (Math.min(monthlyGrowthRate, 25) / 25) * 20 +
      (Math.min(customerCount / 500, 1)) * 15 +
      (Math.min(monthsOfRunway / 24, 1)) * 20,
      100
    );

    // Recommendations
    const recommendations: string[] = [];
    if (grossMargin < 50) {
      recommendations.push("Focus on improving gross margins through pricing optimization or cost reduction");
    }
    if (customerLifetimeValue / customerAcquisitionCost < 3) {
      recommendations.push("Improve unit economics by increasing LTV or reducing CAC");
    }
    if (monthlyGrowthRate < 10) {
      recommendations.push("Accelerate growth through marketing investment or product improvements");
    }
    if (customerCount < 100) {
      recommendations.push("Focus on customer acquisition to reduce concentration risk");
    }
    if (monthsOfRunway < 12) {
      recommendations.push("Extend runway through cost reduction or revenue acceleration before fundraising");
    }

    setResults({
      revenueMultiple: Math.round(revenueMultiple),
      dcfValuation: Math.round(dcfValuation),
      marketComparison: Math.round(marketComparison),
      riskAdjustedValue: Math.round(riskAdjustedValue),
      finalValuation: Math.round(finalValuation),
      investmentReadiness: Math.round(investmentReadiness),
      keyStrengths: strengths,
      riskFactors: riskFactors,
      recommendations: recommendations
    });
  };

  const updateInput = (field: keyof ValuationInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return "text-[hsl(var(--green-primary))]";
    if (score >= 60) return "text-[hsl(var(--blue-primary))]";
    if (score >= 40) return "text-orange-600";
    return "text-[hsl(var(--red-primary))]";
  };

  const getReadinessLabel = (score: number) => {
    if (score >= 80) return "Investment Ready";
    if (score >= 60) return "Strong Fundamentals";
    if (score >= 40) return "Needs Improvement";
    return "High Risk";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold creatives-font gradient-text">
          Business Valuation Calculator
        </h2>
        <p className="text-muted-foreground">
          Professional valuation analysis using multiple methodologies
        </p>
      </div>

      {/* Valuation Results */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company Valuation</p>
                  <p className="text-2xl font-bold gradient-text">
                    ${results.finalValuation.toLocaleString()}
                  </p>
                </div>
                <Building className="w-8 h-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Weighted average of multiple valuation methods
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Investment Readiness</p>
                  <p className={`text-2xl font-bold ${getReadinessColor(results.investmentReadiness)}`}>
                    {results.investmentReadiness}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-[hsl(var(--blue-primary))]" />
              </div>
              <Badge className={getReadinessColor(results.investmentReadiness)}>
                {getReadinessLabel(results.investmentReadiness)}
              </Badge>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue Multiple</p>
                  <p className="text-2xl font-bold text-[hsl(var(--green-primary))]">
                    ${results.revenueMultiple.toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-[hsl(var(--green-primary))]" />
              </div>
              <p className="text-xs text-muted-foreground">
                Industry-adjusted revenue multiplier
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">DCF Valuation</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${results.dcfValuation.toLocaleString()}
                  </p>
                </div>
                <Calculator className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                Discounted cash flow analysis
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Valuation Inputs */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Business Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Annual Revenue ($)</Label>
              <Input
                type="number"
                value={inputs.annualRevenue}
                onChange={(e) => updateInput('annualRevenue', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Growth Rate (%)</Label>
              <Input
                type="number"
                value={inputs.monthlyGrowthRate}
                onChange={(e) => updateInput('monthlyGrowthRate', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Gross Margin (%)</Label>
              <Input
                type="number"
                value={inputs.grossMargin}
                onChange={(e) => updateInput('grossMargin', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Net Margin (%)</Label>
              <Input
                type="number"
                value={inputs.netMargin}
                onChange={(e) => updateInput('netMargin', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Count</Label>
              <Input
                type="number"
                value={inputs.customerCount}
                onChange={(e) => updateInput('customerCount', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Acquisition Cost ($)</Label>
              <Input
                type="number"
                value={inputs.customerAcquisitionCost}
                onChange={(e) => updateInput('customerAcquisitionCost', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Lifetime Value ($)</Label>
              <Input
                type="number"
                value={inputs.customerLifetimeValue}
                onChange={(e) => updateInput('customerLifetimeValue', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Team Size</Label>
              <Input
                type="number"
                value={inputs.teamSize}
                onChange={(e) => updateInput('teamSize', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Months of Runway</Label>
              <Input
                type="number"
                value={inputs.monthsOfRunway}
                onChange={(e) => updateInput('monthsOfRunway', parseInt(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <div className="lg:col-span-2 space-y-6">
          {results && (
            <>
              {/* Investment Readiness */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Investment Readiness Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Score</span>
                      <span className={`font-bold ${getReadinessColor(results.investmentReadiness)}`}>
                        {results.investmentReadiness}%
                      </span>
                    </div>
                    <Progress value={results.investmentReadiness} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      {getReadinessLabel(results.investmentReadiness)} - Based on key metrics investors evaluate
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[hsl(var(--green-primary))]">
                      <CheckCircle className="w-5 h-5" />
                      Key Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.keyStrengths.length > 0 ? (
                        results.keyStrengths.map((strength, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-[hsl(var(--green-primary))] rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-sm">{strength}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Focus on improving key metrics to build strengths
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[hsl(var(--red-primary))]">
                      <AlertCircle className="w-5 h-5" />
                      Risk Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.riskFactors.length > 0 ? (
                        results.riskFactors.map((risk, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-[hsl(var(--red-primary))] rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-sm">{risk}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-[hsl(var(--green-primary))]">
                          ✓ No major risk factors identified
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Action Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.recommendations.length > 0 ? (
                      results.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-[hsl(var(--blue-primary))] rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm">{recommendation}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[hsl(var(--green-primary))]">
                        ✓ Business metrics are strong. Focus on execution and growth.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Valuation Methods Breakdown */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Valuation Methods Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Revenue Multiple</span>
                      <span className="font-bold">${results.revenueMultiple.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">DCF Valuation</span>
                      <span className="font-bold">${results.dcfValuation.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Market Comparison</span>
                      <span className="font-bold">${results.marketComparison.toLocaleString()}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold">Final Valuation</span>
                      <span className="font-bold gradient-text">${results.finalValuation.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button size="lg" variant="outline">
          Download Valuation Report
        </Button>
        <Button size="lg">
          Prepare Investor Pitch
        </Button>
      </div>
    </div>
  );
};

export default BusinessValuation;