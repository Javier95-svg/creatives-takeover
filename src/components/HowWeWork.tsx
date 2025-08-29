import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lightbulb, Bot, Rocket } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Share Your Idea",
    desc: "Describe your business concept through our intuitive interface. Our AI captures your target market, goals, and competitive landscape, transforming your vision into actionable insights within minutes.",
  },
  {
    icon: Bot,
    title: "AI Builds Your Operations",
    desc: "Our AI engine creates a complete operational framework including workflows, business processes, marketing strategies, and financial projections. Every tool and template is tailored to your specific business model.",
  },
  {
    icon: Rocket,
    title: "Launch & Grow",
    desc: "Deploy with confidence using our launch toolkit. Access our marketplace, connect with experts, and leverage community support for ongoing guidance and sustainable growth strategies.",
  },
];

const HowWeWork = () => {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-secondary/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <header className="text-center max-w-2xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 gradient-text animate-slide-up">How It Works</h2>
          <p className="text-muted-foreground animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Transform your ideas into reality through our streamlined three-step process.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, title, desc }, index) => (
            <article 
              key={title} 
              className="glass-card p-8 hover-scale h-full group relative overflow-hidden animate-fade-in transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Animated background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Floating particles on hover */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-primary/30 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-float transition-all duration-300" />
              <div className="absolute bottom-6 left-6 w-1 h-1 bg-secondary/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-300" style={{ animationDelay: '0.5s' }} />
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 animate-pulse-slow">
                  <Icon className="w-8 h-8 text-primary group-hover:animate-bounce" />
                </div>
                
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 animate-scale-in group-hover:bg-primary/30 transition-colors duration-300" style={{ animationDelay: `${index * 0.2 + 0.3}s` }}>
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <h3 className="text-2xl font-semibold gradient-text group-hover:text-primary transition-colors duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.2 + 0.4}s` }}>
                    {title}
                  </h3>
                </div>
                
                <p className="text-base text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.2 + 0.6}s` }}>
                  {desc}
                </p>
                
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                
                {/* Connection line to next step */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-primary/30 to-transparent animate-pulse" />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowWeWork;
