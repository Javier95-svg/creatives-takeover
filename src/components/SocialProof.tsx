import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Rocket, Users, Zap, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const SocialProof = () => {
  // Startup creation growth data
  const startupGrowthData = [
    { year: '2020', startups: 1.2, creative: 0.3 },
    { year: '2021', startups: 1.5, creative: 0.4 },
    { year: '2022', startups: 1.8, creative: 0.6 },
    { year: '2023', startups: 2.1, creative: 0.9 },
    { year: '2024', startups: 2.6, creative: 1.4 },
  ];

  const monthlyGrowthData = [
    { month: 'Jan', startups: 180 },
    { month: 'Feb', startups: 195 },
    { month: 'Mar', startups: 210 },
    { month: 'Apr', startups: 225 },
    { month: 'May', startups: 240 },
    { month: 'Jun', startups: 260 },
  ];

  const stats = [
    {
      label: "New Startups Created",
      value: "2.6M",
      change: "+45%",
      description: "Year over year growth",
      icon: Rocket,
      color: "text-blue-600"
    },
    {
      label: "Creative Businesses",
      value: "1.4M",
      change: "+67%",
      description: "Fastest growing segment",
      icon: Zap,
      color: "text-purple-600"
    },
    {
      label: "First-Time Founders",
      value: "1.8M",
      change: "+52%",
      description: "New entrepreneurs entering",
      icon: Users,
      color: "text-green-600"
    }
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
            We Are <span className="gradient-text">Gaining Momentum</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Startup creation is exploding right now. Join thousands of entrepreneurs who are building their dreams with the right tools and support.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 sm:mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-border hover:shadow-xl transition-all duration-500 hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-primary/10 ${stat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      {stat.change}
                    </Badge>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold mb-2 gradient-text">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.description}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts and Review Section */}
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
              </div>
            </CardContent>
          </Card>

          {/* Monthly Growth Trend */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Monthly Startup Creation (2024)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
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
                  <span className="font-semibold text-foreground">260K+</span> new startups created in June 2024 alone
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real Review Section */}
        <Card className="border-2 border-primary/20 bg-primary/5 mb-12">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Real User Review
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Here's what real entrepreneurs are saying about Creatives Takeover
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                Verified
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-background rounded-lg border border-border p-6 shadow-lg">
              {/* Review Screenshot Placeholder - User should add the actual image */}
              <div className="relative w-full bg-white rounded-lg border-2 border-border overflow-hidden">
                <img 
                  src="/lovable-uploads/max-pavlov-review.png" 
                  alt="Max Pavlov Review - 5 stars, 188 reviews"
                  className="w-full h-auto"
                  onError={(e) => {
                    // Fallback if image doesn't exist - show structured review
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                {/* Fallback structured review if image not found */}
                <div className="hidden p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">MP</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">Max Pavlov</h3>
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-yellow-400">★</span>
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">188 reviews</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mb-4">
                    Creatives Takeover really stands out with its user-friendly design. I love how it offers customizable templates that make creating content a breeze. Freelance graphic designers will appreciate the seamless collaboration features and AI design suggestions that spark creativity and save time. If you're targeting freelance graphic designers, this could be perfect for them. Found 136 conversations where freelance graphic designers need this. Check them: quickmarketfit.com/discussions/kKRhkWpbZu I hope it helps to grow the product.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t">
                    <button className="flex items-center gap-1 hover:text-foreground">
                      <span>👁️</span> Helpful
                    </button>
                    <button className="flex items-center gap-1 hover:text-foreground">
                      <span>💬</span> Reply
                    </button>
                    <button className="flex items-center gap-1 hover:text-foreground">
                      <span>↗️</span> Share
                    </button>
                    <span className="ml-auto">8h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-8">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Now is the Time to Start
              </h3>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                With startup creation at an all-time high, the opportunity has never been better. 
                Join thousands of entrepreneurs who are building their dreams with Creatives Takeover.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>AI-powered planning tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Real market intelligence</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Community support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Fundraising readiness tools</span>
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
