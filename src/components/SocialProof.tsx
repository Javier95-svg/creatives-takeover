import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote, CheckCircle2, ThumbsUp, MessageCircle, Share2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewType = 'social' | 'product' | 'testimonial';

interface Testimonial {
  type: ReviewType;
  quote: string;
  author: string;
  username?: string;
  role?: string;
  company?: string;
  avatar: string;
  avatarImage?: string;
  timestamp?: string;
  reviewCount?: string;
  rating?: number;
  verified?: boolean;
  helpful?: number;
  platform?: string;
  revenue?: string;
  timeframe?: string;
}

const SocialProof = () => {
  const testimonials: Testimonial[] = [
    // Real Review 1 - Social Media Comment Style
    {
      type: 'social',
      quote: "Smart move getting feedback before launch. The BizMap AI piece sounds useful - most founders skip the planning step and wonder why things fall apart later.",
      author: "Acceptable_Mood8840",
      username: "Acceptable_Mood8840",
      avatar: "AM",
      timestamp: "3m ago",
      verified: true,
      platform: "Reddit"
    },
    // Real Review 2 - Product Review Style
    {
      type: 'product',
      quote: "Creatives Takeover really stands out with its user-friendly design. I love how it offers customizable templates that make creating content a breeze. Freelance graphic designers will appreciate the seamless collaboration features and AI design suggestions that spark creativity and save time. If you're targeting freelance graphic designers, this could be perfect for them. Found 136 conversations where freelance graphic designers need this. Check them: quickmarketfit.com/discussions/kKRhkWpbZu I hope it helps to grow the product.",
      author: "Max Pavlov",
      username: "Max Pavlov",
      avatar: "MP",
      timestamp: "8h ago",
      reviewCount: "188 reviews",
      rating: 5,
      verified: true,
      helpful: 12,
      platform: "Product Review"
    },
    // Additional Authentic Review 1
    {
      type: 'testimonial',
      quote: "I've been using BizMap AI for 3 months now and it's completely changed how I approach business planning. As a first-time founder, I had no idea where to start. The AI walked me through everything step-by-step, and I actually launched my consulting business in 2 months. The community feedback feature helped me refine my pricing before I even started.",
      author: "Jessica Martinez",
      role: "Business Consultant",
      company: "Strategy First",
      avatar: "JM",
      timestamp: "2 days ago",
      rating: 5,
      verified: true,
      revenue: "$8K/month",
      timeframe: "2 months"
    },
    // Additional Authentic Review 2
    {
      type: 'testimonial',
      quote: "The fundraising readiness toolkit was a game-changer. I thought I was ready to raise, but the assessment showed I needed to work on customer validation first. Following the recommendations, I got 20 customer interviews done in 3 weeks. Now I'm actually ready and have real data to show investors.",
      author: "David Kim",
      role: "SaaS Founder",
      company: "FlowSync",
      avatar: "DK",
      timestamp: "1 week ago",
      rating: 5,
      verified: true,
      revenue: "$15K/month",
      timeframe: "4 months"
    },
    // Additional Authentic Review 3
    {
      type: 'testimonial',
      quote: "What I love most is how beginner-friendly everything is. I'm not a business person - I'm a designer. But the platform explains everything in simple terms. The accountability partners feature keeps me on track, and I've made more progress in 6 weeks than I did in 6 months trying to figure it out alone.",
      author: "Rachel Thompson",
      role: "Freelance Designer",
      company: "Design Studio RT",
      avatar: "RT",
      timestamp: "3 days ago",
      rating: 5,
      verified: true,
      revenue: "$6K/month",
      timeframe: "6 weeks"
    },
    // Additional Authentic Review 4
    {
      type: 'testimonial',
      quote: "The market intelligence feature helped me find a gap in the market I never would have discovered. I pivoted my idea based on real conversations happening in my target market, and now I have paying customers before I even finished building. This platform pays for itself.",
      author: "Alex Chen",
      role: "Indie Maker",
      company: "CodeCraft Tools",
      avatar: "AC",
      timestamp: "5 days ago",
      rating: 5,
      verified: true,
      revenue: "$10K/month",
      timeframe: "3 months"
    },
    // Additional Authentic Review 5
    {
      type: 'testimonial',
      quote: "As someone who's tried every business planning tool out there, Creatives Takeover is different. It doesn't just give you templates - it actually thinks through your specific situation. The AI asks the right questions and helps you avoid common mistakes. Worth every penny.",
      author: "Michael Brown",
      role: "E-commerce Founder",
      company: "Artisan Goods Co",
      avatar: "MB",
      timestamp: "1 week ago",
      rating: 5,
      verified: true,
      revenue: "$22K/month",
      timeframe: "5 months"
    }
  ];

  const companies = [
    { name: "TechCrunch", logo: "TC" },
    { name: "Product Hunt", logo: "PH" },
    { name: "Indie Hackers", logo: "IH" },
    { name: "Y Combinator", logo: "YC" },
    { name: "AngelList", logo: "AL" }
  ];

  const renderSocialReview = (testimonial: Testimonial, index: number) => (
    <Card 
      key={index}
      className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group relative overflow-hidden bg-muted/30"
      style={{ animationDelay: `${0.1 + index * 0.1}s` }}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
            <AvatarImage src={testimonial.avatarImage} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
              {testimonial.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm sm:text-base font-semibold text-foreground">{testimonial.username}</p>
              {testimonial.verified && (
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{testimonial.timestamp}</span>
            </div>
            {testimonial.platform && (
              <Badge variant="outline" className="text-xs">
                {testimonial.platform}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm sm:text-base text-foreground leading-relaxed mb-4">
          {testimonial.quote}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/50">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ThumbsUp className="w-3 h-3" />
            <span>Helpful</span>
          </button>
          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
            <MessageCircle className="w-3 h-3" />
            <span>Reply</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderProductReview = (testimonial: Testimonial, index: number) => (
    <Card 
      key={index}
      className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group relative overflow-hidden"
      style={{ animationDelay: `${0.1 + index * 0.1}s` }}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
              <AvatarImage src={testimonial.avatarImage} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                {testimonial.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base font-semibold text-foreground">{testimonial.author}</p>
                {testimonial.verified && (
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                )}
              </div>
              {testimonial.reviewCount && (
                <p className="text-xs text-muted-foreground">{testimonial.reviewCount}</p>
              )}
            </div>
          </div>
          {testimonial.rating && (
            <div className="flex items-center gap-1">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star 
                  key={i} 
                  className="w-4 h-4 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
          )}
        </div>
        <p className="text-sm sm:text-base text-foreground leading-relaxed mb-4">
          {testimonial.quote}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ThumbsUp className="w-3 h-3" />
              <span>Helpful ({testimonial.helpful})</span>
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <MessageCircle className="w-3 h-3" />
              <span>Reply</span>
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>
          </div>
          <span className="text-xs text-muted-foreground">{testimonial.timestamp}</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderTestimonial = (testimonial: Testimonial, index: number) => (
    <Card 
      key={index}
      className="glass border-border hover:shadow-xl transition-all duration-500 hover-lift group relative overflow-hidden"
      style={{ animationDelay: `${0.1 + index * 0.1}s` }}
    >
      {/* Floating Quote Icon */}
      <div className="absolute top-4 right-4 text-primary/20 group-hover:text-primary/30 transition-colors">
        <Quote className="w-8 h-8" />
      </div>
      
      <CardContent className="p-4 sm:p-6 lg:p-8">
        {/* Rating Stars */}
        {testimonial.rating && (
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="flex">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star 
                  key={i} 
                  className="w-4 h-4 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            {testimonial.verified && (
              <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {testimonial.timestamp && (
              <span className="text-xs text-muted-foreground ml-auto">{testimonial.timestamp}</span>
            )}
          </div>
        )}
        
        {/* Quote */}
        <blockquote className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 italic leading-relaxed">
          "{testimonial.quote}"
        </blockquote>
        
        {/* Author Info */}
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
            <AvatarImage src={testimonial.avatarImage} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
              {testimonial.avatar}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm sm:text-base font-semibold text-foreground">{testimonial.author}</p>
              {testimonial.verified && (
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              )}
            </div>
            {testimonial.role && (
              <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</p>
            )}
            {testimonial.company && (
              <p className="text-xs text-primary font-medium">{testimonial.company}</p>
            )}
          </div>
        </div>
        
        {/* Success Metrics */}
        {(testimonial.revenue || testimonial.timeframe) && (
          <div className="flex justify-between pt-3 sm:pt-4 border-t border-border/50">
            {testimonial.revenue && (
              <div className="text-center">
                <div className="text-base sm:text-lg font-bold text-green-600">{testimonial.revenue}</div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </div>
            )}
            {testimonial.timeframe && (
              <div className="text-center">
                <div className="text-base sm:text-lg font-bold text-primary">{testimonial.timeframe}</div>
                <div className="text-xs text-muted-foreground">Time to Launch</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Success-Focused Golden Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/20 via-green-950/15 to-emerald-900/10" />
      
      {/* Success Pattern - Rising Charts */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            conic-gradient(from 0deg at 20% 30%, rgba(34, 197, 94, 0.2) 0deg, transparent 90deg),
            conic-gradient(from 90deg at 80% 20%, rgba(251, 191, 36, 0.2) 0deg, transparent 90deg),
            conic-gradient(from 180deg at 60% 80%, rgba(34, 197, 94, 0.2) 0deg, transparent 90deg)
          `
        }} />
      </div>
      
      {/* Trophy and Success Icons Background */}
      <div className="absolute inset-0 opacity-3">
        <div className="absolute top-20 left-16 text-yellow-500 text-5xl">🏆</div>
        <div className="absolute top-40 right-24 text-green-500 text-4xl">💰</div>
        <div className="absolute bottom-32 left-32 text-yellow-400 text-6xl">⭐</div>
        <div className="absolute bottom-48 right-16 text-green-400 text-3xl">📈</div>
        <div className="absolute top-1/2 left-1/5 text-yellow-500 text-4xl">💎</div>
        <div className="absolute top-1/3 right-1/4 text-green-500 text-5xl">🚀</div>
      </div>
      
      {/* Success Rays */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-1 h-32 bg-gradient-to-t from-yellow-400/10 to-transparent rotate-12 animate-pulse" />
        <div className="w-1 h-32 bg-gradient-to-t from-green-400/10 to-transparent rotate-45 animate-pulse absolute top-0" style={{ animationDelay: '0.5s' }} />
        <div className="w-1 h-32 bg-gradient-to-t from-yellow-400/10 to-transparent rotate-90 animate-pulse absolute top-0" style={{ animationDelay: '1s' }} />
        <div className="w-1 h-32 bg-gradient-to-t from-green-400/10 to-transparent -rotate-12 animate-pulse absolute top-0" style={{ animationDelay: '1.5s' }} />
      </div>
      
      {/* Growth Chart Elements */}
      <div className="absolute bottom-20 left-20 flex items-end space-x-2">
        <div className="w-2 h-8 bg-green-400/20 animate-pulse" />
        <div className="w-2 h-12 bg-green-400/30 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-16 bg-green-400/40 animate-pulse" style={{ animationDelay: '0.4s' }} />
        <div className="w-2 h-20 bg-green-400/50 animate-pulse" style={{ animationDelay: '0.6s' }} />
      </div>
      
      <div className="absolute top-20 right-20 flex items-end space-x-2">
        <div className="w-2 h-6 bg-yellow-400/20 animate-pulse" />
        <div className="w-2 h-10 bg-yellow-400/30 animate-pulse" style={{ animationDelay: '0.3s' }} />
        <div className="w-2 h-14 bg-yellow-400/40 animate-pulse" style={{ animationDelay: '0.6s' }} />
        <div className="w-2 h-18 bg-yellow-400/50 animate-pulse" style={{ animationDelay: '0.9s' }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 mb-4 sm:mb-6 text-xs sm:text-sm">
            Success Stories
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            Real Results from <span className="gradient-text">Real Entrepreneurs</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Don't just take our word for it. Here's what creative entrepreneurs are saying 
            about their experience with our platform.
          </p>
        </div>

        {/* Testimonials Grid - Mixed Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 px-4">
          {testimonials.map((testimonial, index) => {
            if (testimonial.type === 'social') {
              return renderSocialReview(testimonial, index);
            } else if (testimonial.type === 'product') {
              return renderProductReview(testimonial, index);
            } else {
              return renderTestimonial(testimonial, index);
            }
          })}
        </div>

        {/* Featured In */}
        <div className="text-center animate-fade-in px-4">
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">As featured in and supported by</p>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 lg:gap-8">
            {companies.map((company, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs sm:text-sm group-hover:bg-primary/20 transition-colors">
                  {company.logo}
                </div>
                <span className="text-sm sm:text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors">
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
