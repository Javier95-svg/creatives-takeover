import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, CheckCircle2 } from "lucide-react";

const avatarSvg = (name: string, bg: string) => {
  const initials = name.split(' ').map(n => n[0]).join('');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="${bg}"/><text x="64" y="64" dominant-baseline="central" text-anchor="middle" fill="white" font-size="48" font-weight="bold" font-family="Arial,sans-serif">${initials}</text></svg>`)}`;
};

const UserReviews = () => {
  const reviews = [
    {
      name: "Priya Sharma",
      comment: "BizMap AI made planning my creative business so much easier. The conversational approach felt natural, and I had a solid plan in minutes instead of days. The success score really helped me validate my idea before investing more time.",
      timestamp: "3 days ago",
      location: "Mumbai, India",
      role: "Indie founder",
      rating: 5,
      avatar: avatarSvg("Priya Sharma", "#6366f1"),
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
      avatar: avatarSvg("James Mitchell", "#3b82f6"),
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
      avatar: avatarSvg("Sofia Martinez", "#ec4899"),
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
      avatar: avatarSvg("David Kim", "#10b981"),
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
      avatar: avatarSvg("Aisha Okafor", "#f59e0b"),
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
      avatar: avatarSvg("Lucas Anderson", "#8b5cf6"),
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
      avatar: avatarSvg("Yuki Tanaka", "#ef4444"),
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
      avatar: avatarSvg("Emma Thompson", "#06b6d4"),
      verified: true,
      outcome: "Secured co-founder alignment"
    }
  ];

  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <section className="section-shell">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="section-header px-6 sm:px-8 lg:px-12">
          <h2 className="section-title mb-6 break-words">
            Helping Founders Succeed
          </h2>
          <p className="section-description max-w-3xl mx-auto">
            See how founders are turning their ideas into thriving projects.
          </p>
        </div>
        <div className="relative overflow-hidden -mx-4 sm:-mx-6 px-4 sm:px-6">
          <style>{`
            @keyframes reviewScroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(calc(-50% - 1rem));
              }
            }
            .reviews-scroll {
              animation: reviewScroll 72s linear infinite;
            }
            .reviews-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="flex gap-6 md:gap-8 reviews-scroll" style={{ width: 'max-content' }}>
            {duplicatedReviews.map((review, index) => (
              <Card 
                key={`${review.name}-${index}`} 
                className="group surface-panel trust-outline flex-shrink-0 w-[320px] sm:w-[360px] md:w-[400px]"
              >
                <CardContent className="p-6">
                  {/* Rating Stars and Verification */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => {
                        const rating = review.rating || 5;
                        const starValue = i + 1;
                        const isFullStar = starValue <= Math.floor(rating);
                        const isHalfStar = !isFullStar && starValue === Math.ceil(rating) && rating % 1 !== 0;
                        
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
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[11px]">
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
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
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
                        <h4 className="font-space-grotesk font-semibold text-sm sm:text-base mb-1 group-hover:text-primary transition-colors">
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

