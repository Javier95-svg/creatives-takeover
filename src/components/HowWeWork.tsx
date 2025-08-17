import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lightbulb, Bot, Rocket } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Share Your Idea",
    desc: "Simply describe your business concept, target market, and goals through our intuitive interface. Our AI captures every detail about your audience, competitive landscape, revenue model, and desired outcomes. Whether you're a first-time entrepreneur or seasoned creator, we translate your vision into actionable insights within minutes.",
  },
  {
    icon: Bot,
    title: "AI Builds Your Operations",
    desc: "Our advanced AI engine transforms your idea into a complete operational framework. We automatically generate custom workflows, business processes, marketing strategies, financial projections, and implementation roadmaps. Every tool, template, and system is tailored specifically to your business model and ready for immediate execution.",
  },
  {
    icon: Rocket,
    title: "Launch & Grow",
    desc: "Deploy your business with confidence using our comprehensive launch toolkit. Access our curated marketplace of resources, connect with industry experts, and leverage our community support network. We provide ongoing guidance, performance tracking, and scaling strategies to ensure sustainable growth from day one.",
  },
];

const HowWeWork = () => {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20">
      <div className="container mx-auto px-6">
        <header className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">How We Work</h2>
          <p className="text-muted-foreground">
            Three simple steps from concept to launch—optimized for speed and clarity.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, title, desc }, index) => (
            <article 
              key={title} 
              className="glass-card p-8 hover-scale h-full animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 gradient-text">{title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>

        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Link to="/dream2plan">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4">
              Start Creating
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowWeWork;
