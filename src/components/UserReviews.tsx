import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";

const UserReviews = () => {
  const reviews = [
    {
      name: "Priya Sharma",
      comment: "BizMap AI made planning my creative business so much easier. The conversational approach felt natural, and I had a solid plan in minutes instead of days. The success score really helped me validate my idea before investing more time.",
      timestamp: "3 days ago",
      location: "Mumbai, India",
      role: "Indie founder",
      rating: 5,
      avatar: "https://ui-avatars.com/api/?name=Priya+Sharma&background=6366f1&color=fff&size=128&bold=true"
    },
    {
      name: "James Mitchell",
      comment: "The fundraising toolkit through Insighta is incredible. I found three accelerator programs that were perfect fits for my stage. The deadline reminders saved me from missing applications. Already got accepted to one!",
      timestamp: "1 week ago",
      location: "London, UK",
      role: "First-time creator",
      rating: 4.5,
      avatar: "https://ui-avatars.com/api/?name=James+Mitchell&background=3b82f6&color=fff&size=128&bold=true"
    },
    {
      name: "Sofia Martinez",
      comment: "The community here is unlike anything I've experienced. Everyone genuinely wants to help each other succeed. My accountability partner has been a game-changer - we check in daily and keep each other motivated.",
      timestamp: "2 weeks ago",
      location: "Barcelona, Spain",
      role: "Creative entrepreneur",
      rating: 4,
      avatar: "https://ui-avatars.com/api/?name=Sofia+Martinez&background=ec4899&color=fff&size=128&bold=true"
    },
    {
      name: "David Kim",
      comment: "The feedback quality on my business plan was outstanding. Community members gave me actionable insights I hadn't considered. The anonymous sharing feature let me get honest feedback without feeling exposed.",
      timestamp: "5 days ago",
      location: "Seoul, South Korea",
      role: "Tech founder",
      rating: 4.5,
      avatar: "https://ui-avatars.com/api/?name=David+Kim&background=10b981&color=fff&size=128&bold=true"
    },
    {
      name: "Aisha Okafor",
      comment: "Investor visibility through the platform has been amazing. I shared my plan and got connected with an angel investor who's now mentoring me. The Demo Days feature helped me practice my pitch with real feedback.",
      timestamp: "1 month ago",
      location: "Lagos, Nigeria",
      role: "Startup founder",
      rating: 5,
      avatar: "https://ui-avatars.com/api/?name=Aisha+Okafor&background=f59e0b&color=fff&size=128&bold=true"
    },
    {
      name: "Lucas Anderson",
      comment: "The Prompt Library saved me hours of research. I found templates for my exact niche and adapted them quickly. Combined with BizMap AI, I went from idea to launch-ready plan in one weekend.",
      timestamp: "1 week ago",
      location: "Stockholm, Sweden",
      role: "Solo entrepreneur",
      rating: 4,
      avatar: "https://ui-avatars.com/api/?name=Lucas+Anderson&background=8b5cf6&color=fff&size=128&bold=true"
    },
    {
      name: "Yuki Tanaka",
      comment: "Sprint-based accountability is what I needed. The daily check-ins keep me focused, and seeing my progress visually motivates me. I've completed more in 30 days than I did in the previous 6 months.",
      timestamp: "4 days ago",
      location: "Tokyo, Japan",
      role: "Indie developer",
      rating: 4.5,
      avatar: "https://ui-avatars.com/api/?name=Yuki+Tanaka&background=ef4444&color=fff&size=128&bold=true"
    },
    {
      name: "Emma Thompson",
      comment: "As someone new to business, the step-by-step guidance from BizMap AI was perfect. It asked questions I didn't know I needed to answer. The PDF export made it easy to share with my co-founder and get aligned.",
      timestamp: "2 weeks ago",
      location: "Melbourne, Australia",
      role: "First-time creator",
      rating: 4,
      avatar: "https://ui-avatars.com/api/?name=Emma+Thompson&background=06b6d4&color=fff&size=128&bold=true"
    }
  ];

  // Duplicate reviews for seamless infinite scroll
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <section className="py-20 lg:py-32 bg-background relative overflow-hidden">
      {/* Animated Blue Neon Wallpaper - matching ValuePropositionCards style */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-background to-cyan-950/30" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Animated Glow Orbs */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Neon Light Streaks */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-pulse" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] break-words">
            Write Your Own Story
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-2">
            Real stories from entrepreneurs who are building their businesses with Creatives Takeover.
          </p>
        </div>

        {/* Reviews Auto-Scrolling */}
        <div className="relative overflow-hidden -mx-4 sm:-mx-6 px-4 sm:px-6">
          <style>{`
            @keyframes scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(calc(-50% - 1rem));
              }
            }
            .auto-scroll {
              animation: scroll 60s linear infinite;
            }
            .auto-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="flex gap-6 md:gap-8 auto-scroll" style={{ width: 'max-content' }}>
            {duplicatedReviews.map((review, index) => (
              <Card 
                key={`${review.name}-${index}`} 
                className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 flex-shrink-0 w-[320px] sm:w-[380px] md:w-[420px]"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardContent className="relative p-6 md:p-8">
                  {/* Rating Stars */}
                  <div className="flex items-center mb-4 gap-0.5">
                    {[...Array(5)].map((_, i) => {
                      const rating = review.rating || 5;
                      const starValue = i + 1;
                      const isFullStar = starValue <= Math.floor(rating);
                      const isHalfStar = !isFullStar && starValue === Math.ceil(rating) && rating % 1 !== 0;
                      const isEmptyStar = starValue > Math.ceil(rating);
                      
                      return (
                        <div key={i} className="relative inline-block w-4 h-4">
                          {/* Empty star background */}
                          <Star className="absolute inset-0 w-4 h-4 fill-gray-300 text-gray-300" />
                          {/* Full star overlay */}
                          {isFullStar && (
                            <Star className="absolute inset-0 w-4 h-4 fill-yellow-400 text-yellow-400" />
                          )}
                          {/* Half star overlay */}
                          {isHalfStar && (
                            <div className="absolute inset-0 w-4 h-4" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}>
                              <Star className="absolute inset-0 w-4 h-4 fill-yellow-400 text-yellow-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Review Comment */}
                  <p className="text-muted-foreground mb-6 leading-relaxed text-sm sm:text-base">
                    "{review.comment}"
                  </p>

                  {/* User Info */}
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <AvatarImage src={review.avatar} alt={review.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
                          {review.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base mb-1 group-hover:text-primary transition-colors">
                          {review.name}
                        </h4>
                        {review.role && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {review.role}
                          </p>
                        )}
                        {review.location && (
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {review.location}
                          </p>
                        )}
                        {review.timestamp && (
                          <p className="text-xs text-muted-foreground">
                            {review.timestamp}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserReviews;

