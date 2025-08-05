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
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-muted-foreground mb-8">
            Trusted by innovative companies worldwide
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
          {clients.map((client, index) => (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-all duration-300 bg-background/50 backdrop-blur-sm border-border/50">
              <div className="text-2xl mb-2">{client.logo}</div>
              <p className="text-xs text-muted-foreground font-medium">{client.name}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientLogos;