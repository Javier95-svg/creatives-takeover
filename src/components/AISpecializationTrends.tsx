import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Zap, BarChart3 } from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";

const AISpecializationTrends = () => {
  const [chartVisible, setChartVisible] = useState(false);
  
  // Scroll-triggered animations
  const { ref: chartAnimationRef, isVisible: chartIsVisible } = useScrollAnimation(200);
  
  useEffect(() => {
    if (chartIsVisible && !chartVisible) {
      const timer = setTimeout(() => setChartVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [chartIsVisible, chartVisible]);

  // Animated counters
  const { count: nicheGrowthCount, ref: nicheGrowthRef } = useCountUp(340, 2000);
  const { count: generalGrowthCount, ref: generalGrowthRef } = useCountUp(45, 2000);
  const { count: nicheProductsCount, ref: nicheProductsRef } = useCountUp(2500, 2000);

  // Chart 1: Niche vs General AI Software Growth (2020-2025)
  const growthComparisonData = [
    { year: '2020', general: 120, niche: 85 },
    { year: '2021', general: 145, niche: 120 },
    { year: '2022', general: 170, niche: 200 },
    { year: '2023', general: 195, niche: 420 },
    { year: '2024', general: 220, niche: 980 },
    { year: '2025', general: 245, niche: 1680 },
  ];

  // Chart 2: Specialization Categories Explosion (2024-2025)
  const categoryExplosionData = [
    { category: 'Creative Tools', products: 420 },
    { category: 'Healthcare', products: 380 },
    { category: 'Legal Tech', products: 310 },
    { category: 'Real Estate', products: 290 },
    { category: 'Finance', products: 340 },
    { category: 'Education', products: 260 },
    { category: 'E-commerce', products: 280 },
    { category: 'HR/Recruiting', products: 220 },
  ];

  // Chart 3: Market Share Shift (Area Chart)
  const marketShareData = [
    { year: '2020', general: 72, specialized: 28 },
    { year: '2021', general: 68, specialized: 32 },
    { year: '2022', general: 62, specialized: 38 },
    { year: '2023', general: 54, specialized: 46 },
    { year: '2024', general: 43, specialized: 57 },
    { year: '2025', general: 35, specialized: 65 },
  ];

  // Chart 4: Monthly Launch Rate (2024-2025)
  const monthlyLaunchData = [
    { month: 'Jan 2024', niche: 145 },
    { month: 'Feb 2024', niche: 162 },
    { month: 'Mar 2024', niche: 178 },
    { month: 'Apr 2024', niche: 195 },
    { month: 'May 2024', niche: 215 },
    { month: 'Jun 2024', niche: 238 },
    { month: 'Jul 2024', niche: 265 },
    { month: 'Aug 2024', niche: 290 },
    { month: 'Sep 2024', niche: 315 },
    { month: 'Oct 2024', niche: 342 },
    { month: 'Nov 2024', niche: 370 },
    { month: 'Dec 2024', niche: 398 },
    { month: 'Jan 2025', niche: 428 },
    { month: 'Feb 2025', niche: 460 },
  ];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden bg-background">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 mr-1" />
            AI Specialization Trend
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="gradient-unified">The Explosion of Niche AI Software</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Specialization—not generalization—is becoming the core strategy of modern entrepreneurship. The data makes the trend unmistakably clear.
          </p>
        </div>

        {/* Key Statistics */}
        <div ref={chartAnimationRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-border bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-6 text-center">
              <div ref={nicheGrowthRef} className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {nicheGrowthCount.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground mb-1">Niche AI Growth (2023-2025)</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">Explosive growth</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-gradient-to-br from-muted/20 to-muted/10">
            <CardContent className="p-6 text-center">
              <div ref={generalGrowthRef} className="text-3xl md:text-4xl font-bold text-muted-foreground mb-2">
                {generalGrowthCount.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground mb-1">General AI Growth (2023-2025)</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground/60">Stagnant growth</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-gradient-to-br from-accent/10 to-accent/5">
            <CardContent className="p-6 text-center">
              <div ref={nicheProductsRef} className="text-3xl md:text-4xl font-bold text-accent mb-2">
                {nicheProductsCount.toFixed(0)}+
              </div>
              <div className="text-sm text-muted-foreground mb-1">New Niche Products in 2024</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-xs text-accent">Rapid acceleration</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Chart 1: Niche vs General Growth */}
          <Card className="border-border hover:shadow-xl transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Niche vs General AI Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartVisible && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={growthComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="year" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="niche" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      name="Niche AI Tools"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="general" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
                      name="General AI Tools"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                The divergence is dramatic: niche AI tools are experiencing explosive growth while general-purpose tools plateau.
              </p>
            </CardContent>
          </Card>

          {/* Chart 2: Market Share Shift */}
          <Card className="border-border hover:shadow-xl transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Market Share Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartVisible && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={marketShareData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="year" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px' }}
                      unit="%"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="specialized" 
                      stackId="1" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.6}
                      name="Specialized AI"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="general" 
                      stackId="1" 
                      stroke="hsl(var(--muted-foreground))" 
                      fill="hsl(var(--muted-foreground))" 
                      fillOpacity={0.3}
                      name="General AI"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                By 2025, specialized AI tools will command 65% market share, up from 28% in 2020.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart 3: Category Explosion */}
        <Card className="border-border hover:shadow-xl transition-all duration-500 mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Specialization Across Industries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartVisible && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryExplosionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="products" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 8, 8, 0]}
                    name="New Products (2024-2025)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Every industry is fragmenting into specialized niches. The breadth of specialization shows this isn't a trend—it's a fundamental shift.
            </p>
          </CardContent>
        </Card>

        {/* Chart 4: Monthly Launch Rate */}
        <Card className="border-border hover:shadow-xl transition-all duration-500 mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Accelerating Launch Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartVisible && (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyLaunchData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="niche" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.4}
                    name="New Niche AI Products"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              The launch rate is accelerating month-over-month. What started as a trickle has become a flood of specialized solutions.
            </p>
          </CardContent>
        </Card>

        {/* Success Metrics Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Target className="w-5 h-5" />
                Niche AI Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-primary mb-1">3.2x</div>
                <div className="text-sm text-muted-foreground">Higher funding success rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">2.8x</div>
                <div className="text-sm text-muted-foreground">Faster user acquisition</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary mb-1">67%</div>
                <div className="text-sm text-muted-foreground">Better retention rates</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="w-5 h-5" />
                General AI Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-muted-foreground mb-1">Baseline</div>
                <div className="text-sm text-muted-foreground">Standard funding success</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground mb-1">Baseline</div>
                <div className="text-sm text-muted-foreground">Standard user growth</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground mb-1">40%</div>
                <div className="text-sm text-muted-foreground">Lower retention rates</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Narrative Conclusion */}
        <div className="mt-12 text-center max-w-4xl mx-auto">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">The Strategic Opportunity</h3>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              The data makes it unmistakably clear: <strong>the market is fragmenting into niches</strong>. 
              General-purpose tools are losing ground while specialized solutions are capturing market share, 
              securing funding, and building loyal user bases.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              This isn't a temporary trend—it's the new reality of AI entrepreneurship. 
              <strong> Specialization is becoming the core strategy</strong>, and creative entrepreneurs who 
              understand this shift have a massive opportunity to build winning businesses in highly specific niches.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISpecializationTrends;
