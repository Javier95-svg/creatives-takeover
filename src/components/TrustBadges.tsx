import { Shield, Award, Users, Zap, Lock, HeartHandshake } from "lucide-react";

const TrustBadges = () => {
  const badges = [
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "99.9% Uptime",
      description: "Reliable platform you can count on"
    },
    {
      icon: <Award className="w-8 h-8 text-blue-500" />,
      title: "Award Winning",
      description: "Recognized for excellence in design"
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "50k+ Creatives",
      description: "Trusted by professionals worldwide"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Lightning Fast",
      description: "Optimized for peak performance"
    },
    {
      icon: <Lock className="w-8 h-8 text-red-500" />,
      title: "Bank-Level Security",
      description: "Your data is always protected"
    },
    {
      icon: <HeartHandshake className="w-8 h-8 text-pink-500" />,
      title: "30-Day Guarantee",
      description: "Full refund if not satisfied"
    }
  ];

  const testimonials = [
    {
      text: "Creatives Takeover transformed our design workflow. The unlimited access and AI tools saved us months of work.",
      author: "Sarah Chen",
      role: "Creative Director",
      company: "Design Studio Pro"
    },
    {
      text: "Best investment we've made for our creative team. The collaboration features are game-changing.",
      author: "Mike Rodriguez",
      role: "Marketing Manager",
      company: "Tech Innovations Inc"
    },
    {
      text: "The family plan is perfect for our household. Everyone can pursue their creative projects with premium tools.",
      author: "Emily Thompson",
      role: "Freelance Designer",
      company: "Self-employed"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Trust Badges */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl font-bold mb-6 gradient-text">
            Trusted by Creatives Worldwide
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust our platform for their creative needs.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-20">
          {badges.map((badge, index) => (
            <div 
              key={index} 
              className="text-center p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mx-auto mb-3 w-fit">
                {badge.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1">{badge.title}</h3>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </div>
          ))}
        </div>

        {/* Customer Testimonials */}
        <div className="bg-muted/30 rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4 gradient-text">
              What Our Customers Say
            </h3>
            <p className="text-muted-foreground">
              Real feedback from real creatives using our platform every day.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-background/80 backdrop-blur-sm rounded-lg p-6 animate-slide-in-up"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="mb-4">
                  <div className="flex text-primary mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.text}"</p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  <p className="text-sm text-primary">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Compliance */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-8 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              SSL Encrypted
            </div>
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              GDPR Compliant
            </div>
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-2" />
              SOC 2 Certified
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;