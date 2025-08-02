import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Video, Headphones, ExternalLink, Gift } from "lucide-react";

const resources = [
  {
    icon: FileText,
    title: "AI Business Blueprint",
    description: "Complete 47-page guide to building your AI-powered empire",
    type: "PDF Guide",
    downloads: "12,847",
    color: "text-blue-400",
    bgGradient: "from-blue-500/10 to-blue-600/5"
  },
  {
    icon: Video,
    title: "Automation Masterclass",
    description: "3-hour workshop: Set up your first AI automation system",
    type: "Video Course",
    downloads: "8,492",
    color: "text-purple-400",
    bgGradient: "from-purple-500/10 to-purple-600/5"
  },
  {
    icon: Headphones,
    title: "AI Strategy Toolkit",
    description: "Templates, checklists, and frameworks for AI implementation",
    type: "Resource Kit",
    downloads: "15,203",
    color: "text-green-400",
    bgGradient: "from-green-500/10 to-green-600/5"
  }
];

const tools = [
  {
    name: "AI ROI Calculator",
    description: "Calculate potential savings and revenue from AI automation",
    icon: "🧮"
  },
  {
    name: "Prompt Library",
    description: "500+ proven AI prompts for business applications",
    icon: "📝"
  },
  {
    name: "Implementation Checklist",
    description: "Step-by-step guide to deploy AI in your business",
    icon: "✅"
  },
  {
    name: "AI Vendor Comparison",
    description: "Compare 50+ AI tools for different business needs",
    icon: "⚖️"
  }
];

const FreeResources = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 glass-card mb-6">
            <Gift className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">100% Free • No Credit Card Required</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Free <span className="gradient-text">Resources Hub</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get started with our comprehensive collection of AI business resources. 
            Everything you need to begin your transformation, absolutely free.
          </p>
        </div>

        {/* Main Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {resources.map((resource, index) => (
            <Card 
              key={resource.title}
              className="glass-card hover-lift relative overflow-hidden group cursor-pointer"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${resource.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <resource.icon className={`w-8 h-8 ${resource.color}`} />
                  <span className="text-xs bg-muted/20 px-2 py-1 rounded-full">
                    {resource.downloads} downloads
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3">{resource.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {resource.description}
                </p>

                {/* Type Badge */}
                <div className={`inline-block text-xs font-medium px-3 py-1 rounded-full bg-${resource.color.split('-')[1]}-400/10 ${resource.color} mb-6`}>
                  {resource.type}
                </div>

                {/* CTA */}
                <Button className="w-full glass bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Download className="mr-2 w-4 h-4" />
                  Free Download
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Free Tools Grid */}
        <div className="glass-card max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">
              Bonus: <span className="gradient-text">Free AI Tools</span>
            </h3>
            <p className="text-muted-foreground">
              Interactive tools to help you plan and implement your AI strategy
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tools.map((tool, index) => (
              <div 
                key={tool.name}
                className="flex items-center gap-4 p-6 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors group cursor-pointer"
                style={{ animationDelay: `${0.8 + index * 0.1}s` }}
              >
                <div className="text-3xl">{tool.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{tool.name}</h4>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="glass-card max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Start Your <span className="gradient-text">AI Transformation?</span>
            </h3>
            <p className="text-muted-foreground mb-6">
              Join 50,000+ entrepreneurs who've downloaded our resources and transformed their businesses.
            </p>
            <Button size="lg" className="glass bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white px-8 py-4">
              Get All Resources Free
              <Download className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FreeResources;