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
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by Creators
            <span className="text-primary"> Worldwide</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of creators who have transformed their ideas into reality
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 bg-background/80 backdrop-blur-sm border-border/50">
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <blockquote className="text-sm text-muted-foreground mb-6 italic">
                "{testimonial.quote}"
              </blockquote>
              
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {testimonial.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;