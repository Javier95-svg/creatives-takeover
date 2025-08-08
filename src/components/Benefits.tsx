import { Zap, Shield, Bot, Layers } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "Launch in weeks, not months",
    desc: "Accelerated setup with AI-driven automation and ready-to-use playbooks.",
  },
  {
    icon: Shield,
    title: "Keep 100% of your IP",
    desc: "Your ideas and outputs are yours—full ownership and control maintained.",
  },
  {
    icon: Bot,
    title: "AI agents + human expertise",
    desc: "Blend of smart agents and expert guidance to ensure quality outcomes.",
  },
  {
    icon: Layers,
    title: "Templates for every stage",
    desc: "From idea validation to growth—templates that speed up each step.",
  },
];

const Benefits = () => {
  return (
    <section id="benefits" className="scroll-mt-24 py-20">
      <div className="container mx-auto px-6">
        <header className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Why Choose Us</h2>
          <p className="text-muted-foreground">
            Clear advantages that help you move faster while staying in control.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="glass-card p-6 hover-scale h-full">
              <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
