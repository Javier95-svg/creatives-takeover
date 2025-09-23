import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Star,
  Zap,
  Target
} from "lucide-react";

const SuccessStats = () => {
  const stats = [
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      number: "15,000+",
      label: "Active Entrepreneurs",
      description: "Building successful businesses"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      number: "$2.4M+",
      label: "Revenue Generated",
      description: "By our community members"
    },
    {
      icon: <Clock className="w-8 h-8 text-primary" />,
      number: "87%",
      label: "Faster Planning",
      description: "Compared to traditional methods"
    },
    {
      icon: <Star className="w-8 h-8 text-primary" />,
      number: "4.9/5",
      label: "User Rating",
      description: "From verified entrepreneurs"
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      number: "50K+",
      label: "AI Conversations",
      description: "Business insights generated"
    },
    {
      icon: <Target className="w-8 h-8 text-primary" />,
      number: "92%",
      label: "Success Rate",
      description: "Users launch within 90 days"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-primary/3 rounded-full blur-3xl animate-spiral" />
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-secondary/3 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/6 w-20 h-20 bg-accent/3 rounded-full blur-xl animate-zigzag" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Platform Success Metrics
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Trusted by Entrepreneurs Worldwide
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join thousands of successful entrepreneurs who have transformed their ideas 
            into profitable businesses using our AI-powered platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group text-center" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <CardContent className="p-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors group-hover:scale-110 duration-300">
                    {stat.icon}
                  </div>
                </div>
                
                <div className="text-4xl font-bold gradient-text mb-2 animate-pulse-glow">
                  {stat.number}
                </div>
                
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {stat.label}
                </h3>
                
                <p className="text-muted-foreground text-sm">
                  {stat.description}
                </p>
                
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Trust Indicators */}
        <div className="mt-16 text-center animate-fade-in">
          <p className="text-muted-foreground mb-6">Trusted by entrepreneurs from</p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded-sm"></div>
              <span>United States</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-sm"></div>
              <span>United Kingdom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-red-600 rounded-sm"></div>
              <span>Germany</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-gradient-to-r from-green-500 to-red-600 rounded-sm"></div>
              <span>Italy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-gradient-to-r from-red-500 via-white to-red-600 rounded-sm"></div>
              <span>Canada</span>
            </div>
            <div className="text-primary font-medium">+ 45 more countries</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuccessStats;