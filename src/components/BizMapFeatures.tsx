import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain,
  Target, 
  Zap,
  BarChart3,
  Users,
  Clock,
  Download,
  Lightbulb,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowRight
} from "lucide-react";

const BizMapFeatures = () => {
  const mainFeatures = [
    {
      icon: Brain,
      title: "GPT-5 Powered Analysis",
      description: "Latest AI technology creates comprehensive business plans tailored to your specific situation and constraints.",
      highlights: ["Contextual recommendations", "Industry-specific insights", "Real-time market analysis"]
    },
    {
      icon: Target,
      title: "Viability Scoring",
      description: "Get objective 1-10 viability scores with detailed reasoning based on market potential, competition, and execution difficulty.",
      highlights: ["Market potential analysis", "Risk assessment", "Competitive landscape review"]
    },
    {
      icon: Zap,
      title: "Quick Validation Experiments", 
      description: "Receive 2-3 simple tests you can run in under 2 weeks to validate market demand before building.",
      highlights: ["Low-cost testing methods", "Clear success metrics", "2-week timeline"]
    },
    {
      icon: BarChart3,
      title: "Custom Execution Phases",
      description: "4-phase roadmap (Validation → MVP → Marketing → Scaling) adapted to your budget, skills, and time constraints.",
      highlights: ["Personalized timelines", "Budget-appropriate tools", "Skill-based recommendations"]
    }
  ];

  const additionalFeatures = [
    {
      icon: Users,
      title: "Community Integration",
      description: "Connect with fellow entrepreneurs and share your progress in our thriving community.",
    },
    {
      icon: Clock,
      title: "Prioritized Action Lists",
      description: "Get clear next steps for this week, this month, and this quarter.",
    },
    {
      icon: Download,
      title: "Exportable Plans",
      description: "Download your business plan as PDF or document for easy sharing and reference.",
    },
    {
      icon: Lightbulb,
      title: "Prompt Library",
      description: "Browse curated business idea prompts across different industries and business models.",
    },
    {
      icon: TrendingUp,
      title: "Success Tracking",
      description: "Monitor your progress and get updated recommendations as you grow.",
    },
    {
      icon: Shield,
      title: "Always Updated",
      description: "AI knowledge continuously updated with latest market trends and business strategies.",
    }
  ];

  const comparisonData = [
    { feature: "AI-Powered Analysis", bizMap: true, traditional: false },
    { feature: "Personalized to Your Context", bizMap: true, traditional: false },
    { feature: "Validation Experiments", bizMap: true, traditional: false },
    { feature: "Quick Turnaround (Minutes)", bizMap: true, traditional: false },
    { feature: "Budget-Appropriate Recommendations", bizMap: true, traditional: false },
    { feature: "Exportable Format", bizMap: true, traditional: true },
    { feature: "Cost", bizMap: "Free", traditional: "$500-5,000" },
    { feature: "Time to Complete", bizMap: "3-5 minutes", traditional: "2-4 weeks" },
  ];

  return (
    <section id="features" className="scroll-mt-24 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-card mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Powerful Features</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 gradient-text">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            BizMap AI combines cutting-edge AI with proven business frameworks to give you the most comprehensive business planning experience available.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {mainFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="glass-card hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground mb-4">{feature.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {feature.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Features */}
        <div className="mb-20">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 animate-fade-in">Plus Many More Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="glass-card hover:shadow-md transition-all hover-scale animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <CardContent className="p-6">
                    <Icon className="w-8 h-8 text-primary mb-3" />
                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mb-16 animate-fade-in">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-8">BizMap AI vs Traditional Business Planning</h3>
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold bg-primary/5">BizMap AI</th>
                      <th className="text-center p-4 font-semibold">Traditional Consulting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr key={row.feature} className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/20' : ''}`}>
                        <td className="p-4">{row.feature}</td>
                        <td className="p-4 text-center bg-primary/5">
                          {typeof row.bizMap === 'boolean' ? (
                            row.bizMap ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">✓</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">✗</Badge>
                            )
                          ) : (
                            <Badge className="bg-primary/20 text-primary">{row.bizMap}</Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.traditional === 'boolean' ? (
                            row.traditional ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">✓</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">✗</Badge>
                            )
                          ) : (
                            <Badge variant="outline">{row.traditional}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center animate-fade-in">
          <Card className="glass-card max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Experience the Future of Business Planning</h3>
              <p className="text-muted-foreground mb-6">
                Join thousands of entrepreneurs who've already discovered the power of AI-driven business planning.
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground hover-scale" asChild>
                <a href="/dream2plan">
                  Try All Features Free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default BizMapFeatures;