import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Zap, BarChart3 } from "lucide-react";
import { 
  LineChart, 
  Line, 
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


  return (
    <section className="py-20 lg:py-28 relative overflow-hidden font-poppins">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header - Enhanced */}
        <div className="text-center mb-16 sm:mb-20">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            How the Market is Evolving
          </Badge>
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 tracking-tight">
            The explosion of niche startups
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-4 leading-relaxed">
            Specialization is emerging as the core strategy of modern entrepreneurship, and the data clearly confirms it.
          </p>
        </div>

        {/* Key Statistics */}
        <div ref={chartAnimationRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-border/70 bg-card shadow-sm">
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
          
          <Card className="border-border/70 bg-card shadow-sm">
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
          
          <Card className="border-border/70 bg-card shadow-sm">
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
          <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Niche vs General AI Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartVisible && (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={growthComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="nicheGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
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
                          borderRadius: '8px',
                          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                          transition: 'all 0.3s ease'
                        }}
                        animationDuration={400}
                        animationEasing="ease-out"
                        cursor={{ 
                          fill: 'hsl(var(--primary) / 0.1)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 2,
                          strokeDasharray: '5 5'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          transition: 'all 0.3s ease',
                          paddingTop: '10px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="niche" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ 
                          fill: 'hsl(var(--primary))', 
                          r: 5,
                          strokeWidth: 2,
                          stroke: 'hsl(var(--background))',
                          style: { 
                            filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))',
                            transition: 'all 0.3s ease'
                          }
                        }}
                        activeDot={{ 
                          r: 7, 
                          fill: 'hsl(var(--primary))',
                          stroke: 'hsl(var(--background))',
                          strokeWidth: 2,
                          style: { 
                            filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.8))',
                            transition: 'all 0.3s ease'
                          }
                        }}
                        name="Niche AI Tools"
                        animationBegin={0}
                        animationDuration={2500}
                        animationEasing="ease-out"
                        style={{ 
                          filter: 'drop-shadow(0 2px 4px hsl(var(--primary) / 0.3))',
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="general" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={{ 
                          fill: 'hsl(var(--muted-foreground))', 
                          r: 4,
                          strokeWidth: 2,
                          stroke: 'hsl(var(--background))',
                          style: { 
                            transition: 'all 0.3s ease'
                          }
                        }}
                        activeDot={{ 
                          r: 6, 
                          fill: 'hsl(var(--muted-foreground))',
                          stroke: 'hsl(var(--background))',
                          strokeWidth: 2,
                          style: { 
                            transition: 'all 0.3s ease'
                          }
                        }}
                        name="General AI Tools"
                        animationBegin={600}
                        animationDuration={2500}
                        animationEasing="ease-out"
                        style={{ 
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                The divergence is dramatic: niche AI tools are experiencing explosive growth while general-purpose tools plateau.
              </p>
            </CardContent>
          </Card>

          {/* Chart 2: Market Share Shift */}
          <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-space-grotesk text-base sm:text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Market Share Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartVisible && (
                <div className="chart-container" style={{ animationDelay: '0.2s' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={marketShareData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="specializedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        </linearGradient>
                        <linearGradient id="generalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15} />
                        </linearGradient>
                        <filter id="areaGlow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
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
                          borderRadius: '8px',
                          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                          transition: 'all 0.3s ease'
                        }}
                        animationDuration={400}
                        animationEasing="ease-out"
                        cursor={{ 
                          fill: 'hsl(var(--primary) / 0.1)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 2,
                          strokeDasharray: '5 5'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          transition: 'all 0.3s ease',
                          paddingTop: '10px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="specialized" 
                        stackId="1" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2.5}
                        fill="url(#specializedGradient)" 
                        fillOpacity={0.7}
                        name="Specialized AI"
                        animationBegin={0}
                        animationDuration={2800}
                        animationEasing="ease-out"
                        style={{ 
                          filter: 'drop-shadow(0 2px 4px hsl(var(--primary) / 0.2))',
                          transition: 'all 0.3s ease'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="general" 
                        stackId="1" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={2}
                        fill="url(#generalGradient)" 
                        fillOpacity={0.4}
                        name="General AI"
                        animationBegin={500}
                        animationDuration={2800}
                        animationEasing="ease-out"
                        style={{ 
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                By 2025, specialized AI tools will command 65% market share, up from 28% in 2020.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Narrative Conclusion */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-muted/40 border border-border/70 rounded-lg p-8">
            <h3 className="font-space-grotesk text-2xl font-semibold mb-4 text-center">
              A lifetime opportunity
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              It has never been a better time to be a founder. Markets are unbundling, and software is breaking into focused, founder-sized opportunities instead of being dominated by a few general-purpose giants.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              The data shows that niche, specialized products are the ones growing fastest, raising capital, and building loyal communities. For creative entrepreneurs, that means the barrier to starting is lower than ever, and the upside for solving a specific problem has never been higher.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISpecializationTrends;
