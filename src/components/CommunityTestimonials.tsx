import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Quote, Star, ArrowRight } from "lucide-react";

const CommunityTestimonials = () => {
  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "Freelance Designer",
      avatar: "/placeholder.svg",
      content: "This creative community has completely transformed my career. The collaboration opportunities and feedback I've received have helped me grow exponentially as a designer.",
      rating: 5,
      project: "Rebranded 3 local businesses",
      timeInCommunity: "8 months",
      badge: "Top Contributor"
    },
    {
      name: "Marcus Chen",
      role: "Digital Artist",
      avatar: "/placeholder.svg",
      content: "I've found my creative tribe here! The support and inspiration from fellow artists in this community is incredible. My art has evolved tremendously thanks to the connections I've made.",
      rating: 5,
      project: "AI Art Exhibition featured",
      timeInCommunity: "1 year",
      badge: "Featured Artist"
    },
    {
      name: "Elena Rodriguez",
      role: "Brand Strategist",
      avatar: "/placeholder.svg",
      content: "The creative community platform has been a game-changer for networking and finding collaborative partners. I've worked on amazing projects with talented people from around the world.",
      rating: 5,
      project: "5 successful collaborations",
      timeInCommunity: "6 months",
      badge: "Collaboration Expert"
    },
    {
      name: "David Park",
      role: "UX Designer",
      avatar: "/placeholder.svg",
      content: "What I love most about this creative community is how welcoming and supportive everyone is. Whether you're a beginner or expert, there's always someone willing to help and share knowledge.",
      rating: 5,
      project: "Mentored 10+ newcomers",
      timeInCommunity: "2 years",
      badge: "Community Mentor"
    },
    {
      name: "Anna Thompson",
      role: "Creative Director",
      avatar: "/placeholder.svg",
      content: "This platform has revolutionized how I approach creative projects. The diverse perspectives and collaborative spirit have pushed my work to new heights I never thought possible.",
      rating: 5,
      project: "Award-winning campaign",
      timeInCommunity: "1.5 years",
      badge: "Creative Leader"
    },
    {
      name: "Roberto Silva",
      role: "Photographer",
      avatar: "/placeholder.svg",
      content: "I joined as a beginner photographer and now I'm running workshops for the community! The growth opportunities and supportive environment here are unmatched.",
      rating: 5,
      project: "Host monthly workshops",
      timeInCommunity: "10 months",
      badge: "Workshop Leader"
    }
  ];

  const communityStats = [
    { metric: "98%", label: "Member Satisfaction" },
    { metric: "4.9/5", label: "Community Rating" },
    { metric: "85%", label: "Active Monthly Users" },
    { metric: "92%", label: "Would Recommend" }
  ];

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Community Testimonials
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Stories from Our Creative Community
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Hear from real creatives who have transformed their careers and found their 
            creative family in our vibrant community platform.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {communityStats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center p-6 rounded-lg bg-muted/30 animate-fade-in"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className="text-3xl font-bold text-primary mb-2">{stat.metric}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift relative overflow-hidden"
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              <div className="absolute top-4 right-4 text-primary/20">
                <Quote className="w-8 h-8" />
              </div>
              
              <CardContent className="p-8">
                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-yellow-500" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-muted-foreground mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>

                {/* User Info */}
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={testimonial.avatar} />
                    <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {testimonial.badge}
                  </Badge>
                </div>

                {/* Achievement & Time */}
                <div className="text-sm text-muted-foreground space-y-1 border-t border-border pt-4">
                  <div>✨ <strong>Achievement:</strong> {testimonial.project}</div>
                  <div>⏰ <strong>Member for:</strong> {testimonial.timeInCommunity}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
          <h3 className="text-3xl font-bold mb-4 gradient-text">
            Ready to Write Your Success Story?
          </h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of creatives who have found their perfect creative community. 
            Start collaborating, learning, and growing with us today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <a href="#join-community">
                Join Our Community Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/pricing">
                Upgrade to Premium
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Join 50,000+ creatives • Start collaborating today
          </p>
        </div>
      </div>
    </section>
  );
};

export default CommunityTestimonials;