import { Card } from "@/components/ui/card";

const ClientLogos = () => {
  const clients = [
    { name: "TechCorp", logo: "🏢" },
    { name: "InnovateAI", logo: "🤖" },
    { name: "StartupHub", logo: "🚀" },
    { name: "CreativeStudio", logo: "🎨" },
    { name: "FutureBuilders", logo: "🏗️" },
    { name: "DigitalMinds", logo: "💡" },
    { name: "AppMakers", logo: "📱" },
    { name: "CodeCrafters", logo: "⚡" }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-secondary/3 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 animate-slide-up">
            Trusted by <span className="gradient-text">Innovative Teams</span>
          </h2>
          <p className="text-muted-foreground animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Join thousands of creators building the future
          </p>
        </div>

        {/* Animated logos grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6 items-center">
          {clients.map((client, index) => (
            <Card 
              key={client.name} 
              className="glass-card p-4 h-20 flex flex-col items-center justify-center transition-all duration-300 animate-fade-in group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-300 animate-bounce-slow">
                {client.logo}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                {client.name}
              </span>
            </Card>
          ))}
        </div>

        {/* Animated stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {[
            { stat: "2,400+", label: "Happy Customers", delay: "0s" },
            { stat: "98%", label: "Success Rate", delay: "0.2s" },
            { stat: "50+", label: "Countries", delay: "0.4s" }
          ].map((item, index) => (
            <div 
              key={item.label}
              className="text-center animate-fade-in hover-scale transition-all duration-300"
              style={{ animationDelay: item.delay }}
            >
              <div className="text-3xl font-bold gradient-text mb-2 animate-pulse-glow">
                {item.stat}
              </div>
              <div className="text-muted-foreground font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientLogos;
