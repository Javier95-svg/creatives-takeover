import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mentor } from "@/types/mentor";
import { Link } from "react-router-dom";
import { ChevronRight, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorCardProps {
  mentor: Mentor;
  className?: string;
}

export const MentorCard = ({ mentor, className }: MentorCardProps) => {
  const hourlyRateFormatted = `$${(mentor.hourly_rate / 100).toFixed(0)}/hr`;
  const isFeatured = mentor.is_featured === true;
  
  // Truncate bio if too long
  const bioMaxLength = 120;
  const truncatedBio = mentor.bio.length > bioMaxLength 
    ? mentor.bio.substring(0, bioMaxLength) + '...'
    : mentor.bio;

  // Get first 2-3 expertise tags
  const displayedExpertise = mentor.expertise?.slice(0, 3) || [];
  const rating = mentor.rating || 0;
  const reviewCount = mentor.review_count || 0;

  const renderStars = (ratingValue: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3 w-3",
              star <= Math.round(ratingValue)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 relative overflow-hidden",
        "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
        "border-2 hover:border-primary/20",
        isFeatured && "ring-2 ring-primary/20",
        className
      )}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-gradient-unified text-primary-foreground shadow-md">
            <Sparkles className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        </div>
      )}

      <Link to={`/community/mentors/${mentor.id}`}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Avatar and Name */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 flex-shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                <AvatarImage src={mentor.picture} alt={mentor.name} />
                <AvatarFallback className="text-lg bg-gradient-unified text-primary-foreground font-semibold">
                  {mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                  {mentor.name}
                </h3>
                
                {/* Rating */}
                {rating > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(rating)}
                    {reviewCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({reviewCount})
                      </span>
                    )}
                  </div>
                )}
                
                {/* Hourly Rate */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {hourlyRateFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Expertise Badges */}
            {displayedExpertise.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayedExpertise.map((exp, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5"
                  >
                    {exp}
                  </Badge>
                ))}
              </div>
            )}

            {/* Bio */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {truncatedBio}
              </p>
            </div>

            {/* View Profile CTA */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                View profile
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

