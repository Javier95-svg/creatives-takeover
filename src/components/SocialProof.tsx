import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Rocket, Bot, Users, LayoutDashboard, TrendingDown, ArrowRight, Lightbulb, Target, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { useCountUp } from "@/hooks/useCountUp";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const SocialProof = () => {
  const [chartVisible, setChartVisible] = useState(false);

  // Animated counters
  const { count: startups2025Count, ref: startups2025Ref } = useCountUp(3.1, 2000);
  const { count: creative2025Count, ref: creative2025Ref } = useCountUp(2.0, 2000);
  const { count: monthlyStartupsCount, ref: monthlyStartupsRef } = useCountUp(390, 2000);
  const { count: growthRateCount, ref: growthRateRef } = useCountUp(67, 2000);

  // Scroll-triggered animations
  const { ref: chartAnimationRef, isVisible: chartIsVisible } = useScrollAnimation(200);
  const { ref: statsAnimationRef, isVisible: statsIsVisible } = useScrollAnimation(100);
  const { ref: featuresAnimationRef, isVisible: featuresIsVisible } = useScrollAnimation(150);

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

  // Feature connection data
  const featureConnections = [
    {
      icon: Bot,
      title: "BizMap AI",
      dataPoint: "3.1M startups in 2025",
      connection: "Validate your idea before joining millions of startups",
      description: "Use our AI-powered 7-step framework to test problem-solution fit before building",
      link: "/bizmap-ai",
      color: "from-primary/20 to-primary/5",
      iconColor: "text-primary"
    },
    {
      icon: Users,
      title: "Community",
      dataPoint: "67% faster growth",
      connection: "Join 15K+ founders growing faster than the market",
      description: "Get accountability, feedback, and support from creative entrepreneurs",
      link: "/community",
      color: "from-secondary/20 to-secondary/5",
      iconColor: "text-secondary"
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard",
      dataPoint: "390K+ startups monthly",
      connection: "Track progress like successful founders launching today",
      description: "Maintain focus with clear priorities, progress tracking, and execution systems",
      link: "/dashboard",
      color: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-500"
    },
    {
      icon: TrendingUp,
      title: "Insighta",
      dataPoint: "Intensified competition",
      connection: "Stay ahead with real-time market intelligence",
      description: "Research investors, discover funding opportunities, and track industry trends",
      link: "/insighta",
      color: "from-accent/20 to-accent/5",
      iconColor: "text-accent"
    },
    {
      icon: Lightbulb,
      title: "Prompt Library",
      dataPoint: "Need execution plan",
      connection: "Use proven frameworks from successful startups",
      description: "30+ battle-tested prompts for AI, E-commerce, SaaS, and creative businesses",
      link: "/prompt-library",
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-500"
    }
  ];


  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/10 via-purple-950/10 to-green-950/10" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'pulse 4s ease-in-out infinite'
        }} />
      </div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-16 text-blue-500 text-5xl animate-pulse">📈</div>
        <div className="absolute top-40 right-24 text-purple-500 text-4xl animate-pulse" style={{ animationDelay: '0.5s' }}>🚀</div>
        <div className="absolute bottom-32 left-32 text-green-400 text-6xl animate-pulse" style={{ animationDelay: '1s' }}>⚡</div>
        <div className="absolute bottom-48 right-16 text-blue-400 text-3xl animate-pulse" style={{ animationDelay: '1.5s' }}>💡</div>
      </div>
      
      {/* Floating data visualization icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 mb-4 sm:mb-6 text-xs sm:text-sm">
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
          <Card className={`border-border bg-gradient-to-br from-primary/10 to-primary/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-4 text-center">
              <div ref={startups2025Ref} className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {startups2025Count.toFixed(1)}M
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Startups in 2025</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+158%</span>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-border bg-gradient-to-br from-secondary/10 to-secondary/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-4 text-center">
              <div ref={creative2025Ref} className="text-2xl md:text-3xl font-bold text-secondary mb-1">
                {creative2025Count.toFixed(1)}M
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Creative Startups</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+{growthRateCount}% faster</span>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-border bg-gradient-to-br from-accent/10 to-accent/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-4 text-center">
              <div ref={monthlyStartupsRef} className="text-2xl md:text-3xl font-bold text-accent mb-1">
                {monthlyStartupsCount}K+
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Monthly Launches</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Rocket className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary">Growing</span>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-border bg-gradient-to-br from-green-500/10 to-green-500/5 transition-all duration-500 ${statsIsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-500 mb-1">
                90%
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Fail Rate</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-xs text-red-500">Need help</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div ref={chartAnimationRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Startup Growth Chart */}
          <Card className={`border-border hover:shadow-xl transition-all duration-500 group hover:scale-[1.02] ${chartIsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary animate-pulse group-hover:scale-110 transition-transform duration-300" />
                Startup Creation Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    className="hover:opacity-80 transition-all duration-300 hover:scale-y-105"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'scaleY(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scaleY(1)';
                    }}
                  />
                  <Bar 
                    dataKey="creative" 
                    fill="url(#creativeGradient)" 
                    name="Creative Startups (M)" 
                    radius={[8, 8, 0, 0]}
                    animationBegin={chartVisible ? 500 : 1500}
                    animationDuration={2000}
                    animationEasing="ease-out"
                    className="hover:opacity-80 transition-all duration-300 hover:scale-y-105 animate-pulse"
                    style={{ animationDuration: '3s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'scaleY(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scaleY(1)';
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className={`mt-4 text-center ${chartIsVisible ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '1.8s' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {growthRateCount}% Faster Growth
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Creative startups growing <span className="font-semibold text-foreground">67% faster</span> than overall market
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Data sources: Global Entrepreneurship Monitor, Crunchbase, Statista
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Growth Trend */}
          <Card className={`border-border hover:shadow-xl transition-all duration-500 group hover:scale-[1.02] ${chartIsVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary animate-bounce group-hover:scale-110 transition-transform duration-300" style={{ animationDuration: '2s', animationIterationCount: 'infinite' }} />
                Monthly Startup Creation (2024-2025)
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    Projected {monthlyStartupsCount}K+
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  New startups launching in February 2025
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on Global Entrepreneurship Monitor 2024 trends and Crunchbase data
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Connection Section */}
        <div ref={featuresAnimationRef} className="mt-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">
              How We Help You Succeed
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Connect market insights to actionable tools that help you build faster and smarter
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureConnections.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className={`border-border bg-gradient-to-br ${feature.color} hover:shadow-xl transition-all duration-500 group hover:scale-105 overflow-hidden ${featuresIsVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-lg bg-background/50 ${feature.iconColor} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                        <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                          {feature.title}
                        </h4>
                        <Badge variant="outline" className="text-xs mb-2">
                          {feature.dataPoint}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm font-semibold text-foreground mb-2">
                      {feature.connection}
                    </p>
                    
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      {feature.description}
                    </p>

                    <Link to={feature.link}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                      >
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className={`mt-16 text-center ${featuresIsVisible ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.8s' }}>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-8">
            <CardContent className="p-0">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="text-2xl font-bold">Ready to Build Your Startup?</h3>
              </div>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of founders using our platform to validate ideas, track progress, and launch faster. 
                Don't become part of the 90% failure rate—get the tools and support you need to succeed.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Building Today
                    <Rocket className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/features">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore Features
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>15,000+ Founders</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>67% Faster Growth</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>92% Launch Success</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </section>
  );
};

export default SocialProof;
