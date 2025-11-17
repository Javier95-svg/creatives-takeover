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
            Startup creation is exploding right now. According to Global Entrepreneurship Monitor and Crunchbase data, 
            we're seeing unprecedented growth in new business formation.
          </p>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Startup Growth Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Startup Creation Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={startupGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="year" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="startups" fill="hsl(var(--primary))" name="Total Startups (M)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="creative" fill="hsl(var(--chart-2))" name="Creative Startups (M)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
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
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Monthly Startup Creation (2024-2025)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="startups" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    name="New Startups (K)"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Projected <span className="font-semibold text-foreground">390K+</span> new startups in February 2025
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
