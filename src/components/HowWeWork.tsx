import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lightbulb, Bot, Rocket } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Share Your Idea",
    desc: "Tell us your concept in minutes. We capture goals, audience, and outcomes.",
  },
  {
    icon: Bot,
    title: "AI Builds Your Operations",
    desc: "We automate workflows, tools, and templates—ready for real execution.",
  },
  {
    icon: Rocket,
    title: "Launch & Grow",
    desc: "Deploy your startup and scale using our marketplace and expert support.",
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="glass-card p-6 hover-scale h-full">
              <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/pricing">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowWeWork;
