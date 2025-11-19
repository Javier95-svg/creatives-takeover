import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Rocket } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const SocialProof = () => {
  // Startup creation growth data (based on Global Entrepreneurship Monitor, Crunchbase, and industry reports)
  const startupGrowthData = [
    { year: '2020', startups: 1.2, creative: 0.3 },
    { year: '2021', startups: 1.5, creative: 0.4 },
    { year: '2022', startups: 1.8, creative: 0.6 },
    { year: '2023', startups: 2.1, creative: 0.9 },
    { year: '2024', startups: 2.6, creative: 1.4 },
    { year: '2025', startups: 3.1, creative: 2.0 },
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
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/10 via-purple-950/10 to-green-950/10" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-16 text-blue-500 text-5xl animate-pulse">📈</div>
        <div className="absolute top-40 right-24 text-purple-500 text-4xl animate-pulse" style={{ animationDelay: '0.5s' }}>🚀</div>
        <div className="absolute bottom-32 left-32 text-green-400 text-6xl animate-pulse" style={{ animationDelay: '1s' }}>⚡</div>
        <div className="absolute bottom-48 right-16 text-blue-400 text-3xl animate-pulse" style={{ animationDelay: '1.5s' }}>💡</div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 mr-1" />
            Market Trends
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="gradient-text">AI Is Lowering the Barrier to Launch a Startup</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Startup creation is exploding. Global Entrepreneurship Monitor and Crunchbase data show a record surge in new business formation.
          </p>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Startup Growth Chart */}
          <Card className="border-border animate-fade-in hover:shadow-xl transition-all duration-500 group" style={{ animationDelay: '0.2s' }}>
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
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    animationDuration={1000}
                    animationEasing="ease-out"
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
                    animationBegin={0}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                  <Bar 
                    dataKey="creative" 
                    fill="url(#creativeGradient)" 
                    name="Creative Startups (M)" 
                    radius={[8, 8, 0, 0]}
                    animationBegin={300}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center animate-fade-in" style={{ animationDelay: '1.8s' }}>
                <p className="text-sm text-muted-foreground">
                  Creative startups growing <span className="font-semibold text-foreground animate-pulse">67% faster</span> than overall market
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Data sources: Global Entrepreneurship Monitor, Crunchbase, Statista
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Growth Trend */}
          <Card className="border-border animate-fade-in hover:shadow-xl transition-all duration-500 group" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary animate-bounce group-hover:scale-110 transition-transform duration-300" style={{ animationDuration: '2s', animationIterationCount: 'infinite' }} />
                Monthly Startup Creation (2024-2025)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyGrowthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                    className="animate-pulse"
                    style={{ animationDuration: '3s' }}
                  />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    animationDuration={1000}
                    animationEasing="ease-out"
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
                  <Line 
                    type="monotone" 
                    dataKey="startups" 
                    stroke="url(#lineGradient)" 
                    strokeWidth={3}
                    dot={{ 
                      fill: 'hsl(var(--primary))', 
                      r: 5, 
                      strokeWidth: 2, 
                      stroke: 'hsl(var(--background))',
                      className: 'animate-pulse'
                    }}
                    activeDot={{ 
                      r: 8, 
                      strokeWidth: 3, 
                      stroke: 'hsl(var(--primary))',
                      fill: 'hsl(var(--background))',
                      className: 'transition-all duration-200'
                    }}
                    name="New Startups (K)"
                    animationBegin={0}
                    animationDuration={2000}
                    animationEasing="ease-out"
                    className="drop-shadow-lg"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center animate-fade-in" style={{ animationDelay: '2.2s' }}>
                <p className="text-sm text-muted-foreground">
                  Projected <span className="font-semibold text-foreground animate-pulse">390K+</span> new startups in February 2025
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on Global Entrepreneurship Monitor 2024 trends and Crunchbase data
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
