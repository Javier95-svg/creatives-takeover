import { Zap, Shield, Bot, Layers, ArrowRight } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "Get your business plan in 30 minutes, not 30 days",
    desc: "Complete comprehensive business planning with AI assistance in under half an hour.",
  },
  {
    icon: Shield,
    title: "Validate demand before you build anything",
    desc: "Smart market research and validation tools to test your ideas before investing time and money.",
  },
  {
    icon: Bot,
    title: "Professional marketing assets without hiring designers",
    desc: "Generate logos, marketing copy, and brand materials as part of your business plan creation.",
  },
  {
    icon: Layers,
    title: "Connect with fellow entrepreneurs building real businesses",
    desc: "Join our community of creators and get feedback, support, and networking opportunities.",
  },
];

const Benefits = () => {
  return (
    <section id="benefits" className="scroll-mt-24 py-20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-secondary/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <header className="text-center max-w-2xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 animate-slide-up">
            Why Choose <span className="gradient-text">BizMap AI</span>
          </h2>
          <p className="text-muted-foreground animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Clear advantages that help you move faster while staying in control.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map(({ icon: Icon, title, desc }, index) => (
            <article 
              key={title} 
              className="glass-card p-6 hover-scale h-full group relative overflow-hidden animate-fade-in transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Animated background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Floating particles on hover */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary/30 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-float transition-all duration-300" />
              <div className="absolute bottom-4 left-4 w-1 h-1 bg-secondary/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-300" style={{ animationDelay: '0.5s' }} />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 animate-pulse-slow">
                  <Icon className="w-6 h-6 text-primary group-hover:animate-pulse" />
                </div>
                
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.15 + 0.3}s` }}>
                  {title}
                </h3>
                
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.15 + 0.5}s` }}>
                  {desc}
                </p>
                
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            </article>
          ))}
        </div>
        
        {/* Animated call-to-action */}
        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '1s' }}>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-3 rounded-full backdrop-blur-sm border border-primary/20 animate-glow">
            <span className="text-sm font-medium">Ready to experience these benefits?</span>
            <ArrowRight className="w-4 h-4 text-primary animate-bounce-x" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
