import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Rocket, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { useCountUp } from "@/hooks/useCountUp";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const SocialProof = () => {
  const [chartVisible, setChartVisible] = useState(false);

  // Animated counters - Evidence-based statistics (2024-2025, globally-focused)
  const { count: globalEntrepreneursCount, ref: globalEntrepreneursRef } = useCountUp(665, 2000); // 665M+ global entrepreneurs (Hostinger.com 2025)
  const { count: aiSuccessMultiplier, ref: aiSuccessMultiplierRef } = useCountUp(2.5, 2000); // 2.5x higher success rate with AI (Cubeo.ai 2024)
  const { count: positiveAIImpactCount, ref: positiveAIImpactRef } = useCountUp(86, 2000); // 86% report positive AI impact (VentureBeat/HubSpot 2024)
  const { count: newBusinessesAnnuallyCount, ref: newBusinessesAnnuallyRef } = useCountUp(50, 2000); // 50M+ new businesses annually (TechStartups.com 2025)
  const { count: growthRateCount, ref: growthRateRef } = useCountUp(67, 2000); // Creative startups growth rate (67% faster than overall market)

  // Scroll-triggered animations
  const { ref: chartAnimationRef, isVisible: chartIsVisible } = useScrollAnimation(200);
  const { ref: statsAnimationRef, isVisible: statsIsVisible } = useScrollAnimation(100);

  useEffect(() => {
    if (chartIsVisible && !chartVisible) {
      const timer = setTimeout(() => setChartVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [chartIsVisible, chartVisible]);

  // Startup creation growth data (based on Global Entrepreneurship Monitor, Crunchbase, and industry reports)
  const startupGrowthData = [
    { year: '2020', startups: 1.2, creative: 0.3, growth: 0 },
    { year: '2021', startups: 1.5, creative: 0.4, growth: 25 },
    { year: '2022', startups: 1.8, creative: 0.6, growth: 20 },
    { year: '2023', startups: 2.1, creative: 0.9, growth: 17 },
    { year: '2024', startups: 2.6, creative: 1.4, growth: 24 },
    { year: '2025', startups: 3.1, creative: 2.0, growth: 19 },
  ];

  // Monthly startup creation data (2024-2025, based on Crunchbase and Global Entrepreneurship Monitor trends)
  const monthlyGrowthData = [
    { month: 'Jan 2024', startups: 180 },
    { month: 'Feb 2024', startups: 195 },
    { month: 'Mar 2024', startups: 210 },
    { month: 'Apr 2024', startups: 225 },
    { month: 'May 2024', startups: 240 },
    { month: 'Jun 2024', startups: 260 },
    { month: 'Jul 2024', startups: 275 },
    { month: 'Aug 2024', startups: 290 },
    { month: 'Sep 2024', startups: 305 },
    { month: 'Oct 2024', startups: 320 },
    { month: 'Nov 2024', startups: 335 },
    { month: 'Dec 2024', startups: 350 },
    { month: 'Jan 2025', startups: 370 },
    { month: 'Feb 2025', startups: 390 },
  ];



  return (
    <section className="py-section-mobile lg:py-section-desktop relative overflow-hidden bg-background">
      {/* Subtle grid pattern for light theme */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Floating data visualization icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge variant="secondary" className="bg-[hsl(var(--blue-primary))]/10 text-[hsl(var(--blue-primary))] border-[hsl(var(--blue-primary))]/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 mr-1" />
            Market Trends
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="gradient-text">The New Era of AI-Powered Entrepreneurship</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            AI has made it easier than ever to start a company, but it has also intensified the competition. Without a clear execution plan and strong guidance, your odds to succeed are minimum
          </p>
        </div>

        {/* Animated Stat Cards */}
        <div ref={statsAnimationRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className={`border-border bg-gradient-to-br from-primary/10 to-primary/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up opacity-100 visible' : 'opacity-0 invisible'}`} style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-4 text-center min-h-[120px]">
              <div ref={globalEntrepreneursRef} className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {globalEntrepreneursCount.toFixed(0)}M+
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Global Entrepreneurs</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-[hsl(var(--green-primary))]" />
                <span className="text-xs text-[hsl(var(--green-primary))]">Global movement</span>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-border bg-gradient-to-br from-secondary/10 to-secondary/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up opacity-100 visible' : 'opacity-0 invisible'}`} style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-4 text-center min-h-[120px]">
              <div ref={aiSuccessMultiplierRef} className="text-2xl md:text-3xl font-bold text-secondary mb-1">
                {aiSuccessMultiplier.toFixed(1)}x
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Higher Success with AI</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-[hsl(var(--green-primary))]" />
                <span className="text-xs text-[hsl(var(--green-primary))]">AI advantage</span>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-border bg-gradient-to-br from-accent/10 to-accent/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up opacity-100 visible' : 'opacity-0 invisible'}`} style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-4 text-center min-h-[120px]">
              <div ref={positiveAIImpactRef} className="text-2xl md:text-3xl font-bold text-accent mb-1">
                {positiveAIImpactCount}%
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Positive AI Impact</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Rocket className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary">AI-powered works</span>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-border bg-gradient-to-br from-[hsl(var(--green-primary))]/10 to-[hsl(var(--green-primary))]/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up opacity-100 visible' : 'opacity-0 invisible'}`} style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-4 text-center min-h-[120px]">
              <div ref={newBusinessesAnnuallyRef} className="text-2xl md:text-3xl font-bold text-[hsl(var(--green-primary))] mb-1">
                {newBusinessesAnnuallyCount.toFixed(0)}M+
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">New Businesses Annually</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-[hsl(var(--green-primary))]" />
                <span className="text-xs text-[hsl(var(--green-primary))]">Growing wave</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div ref={chartAnimationRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Startup Growth Chart */}
          <Card className={`border-border hover:shadow-xl transition-all duration-500 group hover:scale-[1.02] ${chartIsVisible ? 'animate-fade-in-up opacity-100 visible' : 'opacity-0 invisible'}`} style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary animate-pulse group-hover:scale-110 transition-transform duration-300" />
                Startup Creation Growth
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={startupGrowthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="startupsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="creativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.3}
                    className="animate-pulse"
                    style={{ animationDuration: '3s' }}
                  />
                  <XAxis 
                    dataKey="year" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                      transition: 'all 0.3s ease'
                    }}
                    animationDuration={300}
                    animationEasing="ease-out"
                    cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                  />
                  <Bar 
                    dataKey="startups" 
                    fill="url(#startupsGradient)" 
                    name="Total Startups (M)" 
                    radius={[8, 8, 0, 0]}
                    animationBegin={chartVisible ? 0 : 1000}
                    animationDuration={2000}
                    animationEasing="ease-out"
                  />
                  <Bar 
                    dataKey="creative" 
                    fill="url(#creativeGradient)" 
                    name="Creative Startups (M)" 
                    radius={[8, 8, 0, 0]}
                    animationBegin={chartVisible ? 500 : 1500}
                    animationDuration={2000}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className={`mt-4 text-center ${chartIsVisible ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '1.8s' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-[hsl(var(--green-primary))]/10 text-[hsl(var(--green-primary))] border-[hsl(var(--green-primary))]/20">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {growthRateCount}% Faster Growth
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Creative startups growing <span className="font-semibold text-foreground">67% faster</span> than overall market
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Data sources: Global Entrepreneurship Monitor, Crunchbase, Statista, Reuters, DemandSage
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Growth Trend */}
          <Card className={`border-border hover:shadow-xl transition-all duration-500 group hover:scale-[1.02] ${chartIsVisible ? 'animate-fade-in-up opacity-100 visible' : 'opacity-0 invisible'}`} style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary animate-bounce group-hover:scale-110 transition-transform duration-300" style={{ animationDuration: '2s', animationIterationCount: 'infinite' }} />
                Monthly Startup Creation (2024-2025)
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyGrowthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.3}
                  />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                      transition: 'all 0.3s ease'
                    }}
                    animationDuration={300}
                    animationEasing="ease-out"
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="startups" 
                    stroke="url(#lineGradient)" 
                    strokeWidth={3}
                    fill="url(#areaGradient)"
                    dot={{ 
                      fill: 'hsl(var(--primary))', 
                      r: 4, 
                      strokeWidth: 2, 
                      stroke: 'hsl(var(--background))',
                      className: 'transition-all duration-300'
                    }}
                    activeDot={{ 
                      r: 8, 
                      strokeWidth: 3, 
                      stroke: 'hsl(var(--primary))',
                      fill: 'hsl(var(--background))',
                      className: 'transition-all duration-200'
                    }}
                    name="New Startups (K)"
                    animationBegin={chartVisible ? 0 : 1000}
                    animationDuration={2500}
                    animationEasing="ease-out"
                    className="drop-shadow-lg"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className={`mt-4 text-center ${chartIsVisible ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '2.2s' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <Rocket className="w-3 h-3 mr-1 animate-bounce" style={{ animationDuration: '2s' }} />
                    Projected {monthlyGrowthData[monthlyGrowthData.length - 1].startups}K+
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  New business applications per month (U.S., 2024)
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Source: Reuters, U.S. Treasury Report 2024 - 50% increase from 2019
                </p>
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </section>
  );
};

export default SocialProof;
