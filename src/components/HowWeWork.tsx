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
    <section id="how-it-works" className="scroll-mt-24 py-20 relative">
      <div className="container mx-auto px-6">
        <header className="text-center max-w-2xl mx-auto mb-12 animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 gradient-text animate-text-shimmer">How We Work</h2>
          <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Three simple steps from concept to launch—optimized for speed and clarity.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, title, desc }, index) => (
            <article 
              key={title} 
              className="glass-card p-8 hover-scale h-full animate-zoom-in group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 btn-magnetic"
              style={{ animationDelay: `${index * 0.3}s` }}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors group-hover:scale-110 duration-300">
                <Icon className="w-8 h-8 text-primary group-hover:animate-pulse" />
              </div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 animate-scale-in" style={{ animationDelay: `${index * 0.3 + 0.2}s` }}>
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                <h3 className="text-2xl font-semibold gradient-text animate-slide-in-right" style={{ animationDelay: `${index * 0.3 + 0.4}s` }}>{title}</h3>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed animate-fade-in" style={{ animationDelay: `${index * 0.3 + 0.6}s` }}>{desc}</p>
            </article>
          ))}
        </div>

        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '1.2s' }}>
          <Link to="/dream2plan">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 hover-scale animate-scale-in" style={{ animationDelay: '1.4s' }}>
              Start Creating
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowWeWork;
