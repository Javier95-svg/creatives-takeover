import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const SocialProof = () => {
  const testimonials = [
    {
      quote: "This platform helped me turn my design agency idea into a $50K/month business in just 6 months. The AI insights were spot-on.",
      author: "Sarah Chen",
      role: "Creative Director",
      company: "Pixel Perfect Studio",
      avatar: "SC",
      revenue: "$50K/month",
      timeframe: "6 months"
    },
    {
      quote: "As a solo founder, I was overwhelmed by all the business planning. This AI made it so simple - I launched my SaaS in 3 months instead of 3 years.",
      author: "Marcus Rodriguez",
      role: "Indie Hacker",
      company: "TaskFlow Pro",
      avatar: "MR",
      revenue: "$12K/month",
      timeframe: "3 months"
    },
    {
      quote: "The no-code automation tools saved me literally hundreds of hours. I went from idea to profitable e-commerce business faster than I thought possible.",
      author: "Emily Johnson",
      role: "E-commerce Founder",
      company: "Craft & Co.",
      avatar: "EJ",
      revenue: "$25K/month",
      timeframe: "4 months"
    }
  ];

  const companies = [
    { name: "TechCrunch", logo: "TC" },
    { name: "Product Hunt", logo: "PH" },
    { name: "Indie Hackers", logo: "IH" },
    { name: "Y Combinator", logo: "YC" },
    { name: "AngelList", logo: "AL" }
  ];

  return (
    <section className="py-20 lg:py-32 bg-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-1/3 left-1/5 w-20 h-20 bg-primary/3 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-1/3 right-1/5 w-32 h-32 bg-secondary/3 rounded-full blur-3xl animate-spiral" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 mb-6">
            Success Stories
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Real Results from <span className="gradient-text">Real Entrepreneurs</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Don't just take our word for it. Here's what creative entrepreneurs are saying 
            about their experience with our platform.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group relative overflow-hidden" 
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              {/* Floating Quote Icon */}
              <div className="absolute top-4 right-4 text-primary/20 group-hover:text-primary/30 transition-colors">
                <Quote className="w-8 h-8" />
              </div>
              
              <CardContent className="p-8">
                {/* Rating Stars */}
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                
                {/* Quote */}
                <blockquote className="text-muted-foreground mb-6 italic leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                
                {/* Author Info */}
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-primary font-medium">{testimonial.company}</p>
                  </div>
                </div>
                
                {/* Success Metrics */}
                <div className="flex justify-between pt-4 border-t border-border/50">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{testimonial.revenue}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{testimonial.timeframe}</div>
                    <div className="text-xs text-muted-foreground">Time to Launch</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured In */}
        <div className="text-center animate-fade-in">
          <p className="text-muted-foreground mb-8">As featured in and supported by</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {companies.map((company, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary/20 transition-colors">
                  {company.logo}
                </div>
                <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {company.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;