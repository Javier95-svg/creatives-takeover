import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      quote: "This platform revolutionized how we approach app development. What used to take months now takes days.",
      author: "Sarah Chen",
      role: "CTO, InnovateAI",
      avatar: "SC",
      rating: 5
    },
    {
      quote: "The AI understands our creative vision better than most human developers. It's like having a technical co-founder.",
      author: "Marcus Johnson",
      role: "Founder, CreativeStudio",
      avatar: "MJ",
      rating: 5
    },
    {
      quote: "We've built 12 successful apps using this platform. The community support is incredible.",
      author: "Emily Rodriguez",
      role: "Product Manager, TechCorp",
      avatar: "ER",
      rating: 5
    },
    {
      quote: "From prototype to production in 48 hours. This is the future of software development.",
      author: "David Kim",
      role: "Lead Developer, StartupHub",
      avatar: "DK",
      rating: 5
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/20 to-background relative overflow-hidden">
      {/* Animated background decorations */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-spiral" />
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-secondary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/6 w-20 h-20 bg-accent/5 rounded-full blur-xl animate-zigzag" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-slide-up">
            Loved by <span className="gradient-text">Creators Worldwide</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Join thousands of creators who have transformed their ideas into reality
          </p>
          
          {/* Animated rating stars */}
          <div className="flex items-center justify-center gap-2 mt-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className="w-5 h-5 fill-yellow-400 text-yellow-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-2 animate-pulse">
              4.9 out of 5 stars
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-2xl hover-scale transition-all duration-500 bg-background/80 backdrop-blur-sm border-border/50 animate-fade-in group relative overflow-hidden hover:shadow-primary/5"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Floating quote decoration */}
              <div className="absolute top-4 right-4 text-4xl text-primary/10 group-hover:text-primary/20 transition-colors duration-300 animate-pulse">
                "
              </div>
              
              <div className="relative z-10">
                <div className="flex mb-4 animate-fade-in" style={{ animationDelay: `${index * 0.2 + 0.3}s` }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-4 h-4 fill-yellow-400 text-yellow-400 group-hover:animate-pulse transition-all duration-300"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    />
                  ))}
                </div>
                
                <blockquote className="text-sm text-muted-foreground mb-6 italic group-hover:text-foreground transition-colors duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.2 + 0.5}s` }}>
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${index * 0.2 + 0.7}s` }}>
                  <Avatar className="w-10 h-10 group-hover:scale-110 transition-transform duration-300">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors duration-300">
                      {testimonial.author}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </div>
            </Card>
          ))}
        </div>
        
        {/* Animated trust indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 animate-fade-in" style={{ animationDelay: '1.5s' }}>
          {[
            { stat: "340+", label: "Success Stories", icon: "🎉" },
            { stat: "$12M+", label: "Funding Raised", icon: "💰" },
            { stat: "50+", label: "Countries", icon: "🌍" }
          ].map((item, index) => (
            <div 
              key={item.label}
              className="text-center group hover-scale transition-all duration-300"
            >
              <div className="text-3xl mb-2 group-hover:animate-bounce">
                {item.icon}
              </div>
              <div className="text-2xl font-bold gradient-text mb-1 animate-pulse-glow">
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

export default Testimonials;