import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, CheckCircle2 } from "lucide-react";

const UserReviews = () => {
  const reviews = [
    {
      name: "Priya Sharma",
      comment: "BizMap AI made planning my creative business so much easier. The conversational approach felt natural, and I had a solid plan in minutes instead of days. The success score really helped me validate my idea before investing more time.",
      timestamp: "3 days ago",
      location: "Mumbai, India",
      role: "Indie founder",
      rating: 5,
      avatar: "https://ui-avatars.com/api/?name=Priya+Sharma&background=6366f1&color=fff&size=128&bold=true",
      verified: true,
      outcome: "Launched in 28 days"
    },
    {
      name: "James Mitchell",
      comment: "The fundraising toolkit through Insighta is incredible. I found three accelerator programs that were perfect fits for my stage. The deadline reminders saved me from missing applications. Already got accepted to one!",
      timestamp: "1 week ago",
      location: "London, UK",
      role: "First-time creator",
      rating: 4.5,
      avatar: "https://ui-avatars.com/api/?name=James+Mitchell&background=3b82f6&color=fff&size=128&bold=true",
      verified: true,
      outcome: "Accepted to accelerator"
    },
    {
      name: "Sofia Martinez",
      comment: "The community here is unlike anything I've experienced. Everyone genuinely wants to help each other succeed. My accountability partner has been a game-changer - we check in daily and keep each other motivated.",
      timestamp: "2 weeks ago",
      location: "Barcelona, Spain",
      role: "Creative entrepreneur",
      rating: 4,
      avatar: "https://ui-avatars.com/api/?name=Sofia+Martinez&background=ec4899&color=fff&size=128&bold=true",
      verified: true,
      outcome: "30-day streak maintained"
    },
    {
      name: "David Kim",
      comment: "The feedback quality on my business plan was outstanding. Community members gave me actionable insights I hadn't considered. The anonymous sharing feature let me get honest feedback without feeling exposed.",
      timestamp: "5 days ago",
      location: "Seoul, South Korea",
      role: "Tech founder",
      rating: 4.5,
      avatar: "https://ui-avatars.com/api/?name=David+Kim&background=10b981&color=fff&size=128&bold=true",
      verified: true,
      outcome: "Improved plan score by 25%"
    },
    {
      name: "Aisha Okafor",
      comment: "Investor visibility through the platform has been amazing. I shared my plan and got connected with an angel investor who's now mentoring me. The Demo Days feature helped me practice my pitch with real feedback.",
      timestamp: "1 month ago",
      location: "Lagos, Nigeria",
      role: "Startup founder",
      rating: 5,
      avatar: "https://ui-avatars.com/api/?name=Aisha+Okafor&background=f59e0b&color=fff&size=128&bold=true",
      verified: true,
      outcome: "Connected with angel investor"
    },
    {
      name: "Lucas Anderson",
      comment: "The Prompt Library saved me hours of research. I found templates for my exact niche and adapted them quickly. Combined with BizMap AI, I went from idea to launch-ready plan in one weekend.",
      timestamp: "1 week ago",
      location: "Stockholm, Sweden",
      role: "Solo entrepreneur",
      rating: 4,
      avatar: "https://ui-avatars.com/api/?name=Lucas+Anderson&background=8b5cf6&color=fff&size=128&bold=true",
      verified: true,
      outcome: "Plan completed in 2 days"
    },
    {
      name: "Yuki Tanaka",
      comment: "Sprint-based accountability is what I needed. The daily check-ins keep me focused, and seeing my progress visually motivates me. I've completed more in 30 days than I did in the previous 6 months.",
      timestamp: "4 days ago",
      location: "Tokyo, Japan",
      role: "Indie developer",
      rating: 4.5,
      avatar: "https://ui-avatars.com/api/?name=Yuki+Tanaka&background=ef4444&color=fff&size=128&bold=true",
      verified: true,
      outcome: "5x productivity increase"
    },
    {
      name: "Emma Thompson",
      comment: "As someone new to business, the step-by-step guidance from BizMap AI was perfect. It asked questions I didn't know I needed to answer. The PDF export made it easy to share with my co-founder and get aligned.",
      timestamp: "2 weeks ago",
      location: "Melbourne, Australia",
      role: "First-time creator",
      rating: 4,
      avatar: "https://ui-avatars.com/api/?name=Emma+Thompson&background=06b6d4&color=fff&size=128&bold=true",
      verified: true,
      outcome: "Secured co-founder alignment"
    }
  ];

  // Duplicate reviews for seamless infinite scroll
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Clean neutral background */}
      <div className="absolute inset-0 bg-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header - Enhanced */}
        <div className="text-center mb-16 sm:mb-20 animate-fade-in px-6 sm:px-8 lg:px-12">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 break-words tracking-tight">
            <span className="gradient-unified">Helping Founders Succeed</span>
          </h2>
          <p className="text-lg sm:text-xl text-foreground/75 max-w-3xl mx-auto leading-[1.7] font-light">
            See how founders are turning their ideas into thriving projects.
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
              animation: scroll 90s linear infinite;
            }
            .auto-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="flex gap-6 md:gap-8 auto-scroll" style={{ width: 'max-content' }}>
            {duplicatedReviews.map((review, index) => (
              <Card 
                key={`${review.name}-${index}`} 
                className="relative overflow-hidden group hover:shadow-2xl transition-all duration-700 border hover:border-primary/40 flex-shrink-0 w-[320px] sm:w-[380px] md:w-[420px] hover:-translate-y-2 backdrop-blur-sm bg-card/60"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardContent className="relative p-6 md:p-8">
                  {/* Rating Stars and Verification */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-0.5">
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
                    {review.verified && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  {/* Review Comment */}
                  <p className="text-muted-foreground mb-4 leading-relaxed text-sm sm:text-base">
                    "{review.comment}"
                  </p>
                  
                  {/* Outcome Badge */}
                  {review.outcome && (
                    <div className="mb-6">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {review.outcome}
                      </Badge>
                    </div>
                  )}

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

