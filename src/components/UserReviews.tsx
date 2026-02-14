import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, CheckCircle2 } from "lucide-react";
import teamDanielaHagg from "@/assets/team-daniela-hagg.jpg";
import teamTylerTennant from "@/assets/team-tyler-tennant.png";
import teamDomagojMarkota from "@/assets/team-domagoj-markota.png";
import teamAamirKhan from "@/assets/team-aamir-khan.jpg";
import teamJavierPena from "@/assets/team-javier-pena.jpg";
import soloFemale from "@/assets/solopreneur-hero-female.jpg";
import soloMale from "@/assets/solopreneur-hero-male.jpg";
import soloGrandpa from "@/assets/solopreneur-hero-grandpa.jpg";

const UserReviews = () => {
  const reviews = [
    {
      name: "Alex Chan",
      comment: "I thought this would be another tool I try once and forget. Nope. Used the sprint board for 2 weeks and finally shipped my landing page. Not perfect yet, but live is better than waiting forever.",
      timestamp: "2 days ago",
      location: "Hong Kong",
      role: "Solo SaaS founder",
      rating: 5,
      avatar: teamTylerTennant,
      verified: true,
      outcome: "First MVP shipped"
    },
    {
      name: "Mei Lin",
      comment: "I mostly came for the planning templates, stayed for the community feedback. People here actually read your draft and give practical notes, not generic 'looks good' comments.",
      timestamp: "5 days ago",
      location: "Taipei, Taiwan",
      role: "Product designer",
      rating: 4.5,
      avatar: teamDanielaHagg,
      verified: true,
      outcome: "Pitch clarity improved"
    },
    {
      name: "Camila Torres",
      comment: "Posted my idea expecting crickets, got 14 comments in a day. A couple were tough to hear tbh, but they were right and it saved me from building the wrong thing.",
      timestamp: "1 week ago",
      location: "Bogota, Colombia",
      role: "Content creator",
      rating: 4,
      avatar: teamJavierPena,
      verified: true,
      outcome: "Reworked offer in 48 hrs"
    },
    {
      name: "Luka Markovic",
      comment: "The reminder system is simple but honestly that's why it works. I stopped over-planning and started doing. Revenue is still small, yet at least it's real now.",
      timestamp: "5 days ago",
      location: "Zagreb, Croatia",
      role: "Bootstrapped founder",
      rating: 4.5,
      avatar: teamDomagojMarkota,
      verified: true,
      outcome: "Closed first 3 customers"
    },
    {
      name: "Aisha Okafor",
      comment: "I was stuck in research mode for months. The daily check-ins pushed me to actually talk to users. Did 11 interviews in one week. Wish I started that sooner.",
      timestamp: "3 weeks ago",
      location: "Lagos, Nigeria",
      role: "Startup founder",
      rating: 5,
      avatar: soloFemale,
      verified: true,
      outcome: "Validated target audience"
    },
    {
      name: "Kwame Mensah",
      comment: "Not gonna lie, I joined for one feature and ignored the rest. Then I tried the accountability partner thing and it changed my pace completely. We check in every morning, even on Sundays.",
      timestamp: "1 week ago",
      location: "Accra, Ghana",
      role: "Solo entrepreneur",
      rating: 4,
      avatar: soloMale,
      verified: true,
      outcome: "4-week build streak"
    },
    {
      name: "Liam O'Connor",
      comment: "The business model prompts were surprisingly good. A bit blunt sometimes lol, but they forced me to tighten pricing and stop guessing.",
      timestamp: "6 days ago",
      location: "Dublin, Ireland",
      role: "Indie developer",
      rating: 4.5,
      avatar: teamAamirKhan,
      verified: true,
      outcome: "Raised prices with confidence"
    },
    {
      name: "Peter Novak",
      comment: "I am not the fastest with new tools, but this one felt easy to follow. The roadmap gave me a clear next step each day, and that lowered the stress a lot.",
      timestamp: "2 weeks ago",
      location: "Bratislava, Slovakia",
      role: "Small business owner",
      rating: 4,
      avatar: soloGrandpa,
      verified: true,
      outcome: "Moved from idea to pilot"
    }
  ];

  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <section className="py-20 lg:py-28 font-poppins">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 sm:mb-20 px-6 sm:px-8 lg:px-12">
          <Badge variant="outline" className="mb-5 text-xs uppercase tracking-wide text-muted-foreground">
            Join Them 💙
          </Badge>
          <h2 className="font-space-grotesk text-3xl sm:text-4xl lg:text-5xl font-semibold mb-6 break-words tracking-tight text-primary">
            Helping Founders Succeed
          </h2>
          <p className="font-poppins text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
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
              animation: reviewScroll 90s linear infinite;
            }
            .reviews-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="flex gap-6 md:gap-8 reviews-scroll" style={{ width: 'max-content' }}>
            {duplicatedReviews.map((review, index) => (
              <Card 
                key={`${review.name}-${index}`} 
                className="group border-border/70 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-[320px] sm:w-[360px] md:w-[400px]"
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

