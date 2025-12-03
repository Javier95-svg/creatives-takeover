import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { Link, useNavigate } from "react-router-dom";
import { Star, CheckCircle2, MessageCircle, Calendar, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorCardProps {
  mentor: Mentor;
  className?: string;
}

export const MentorCard = ({ mentor, className }: MentorCardProps) => {
  const navigate = useNavigate();
  const hourlyRateFormatted = `$${(mentor.hourly_rate / 100).toFixed(0)}`;
  
  // Truncate bio if too long
  const bioMaxLength = 200;
  const truncatedBio = mentor.bio.length > bioMaxLength 
    ? mentor.bio.substring(0, bioMaxLength) + '...'
    : mentor.bio;

  const rating = mentor.rating || 0;
  const reviewCount = mentor.review_count || 0;
  const sessionsCompleted = mentor.total_sessions_completed || 0;

  const renderStars = (ratingValue: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3.5 w-3.5",
              star <= Math.round(ratingValue)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/20"
            )}
          />
        ))}
      </div>
    );
  };

  const handleBookSession = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/community/book/${mentor.id}`);
  };

  const handleSendMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/messages?mentor=${mentor.id}`);
  };

  return (
    <Card className={cn("border rounded-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Left: Avatar */}
          <div className="flex-shrink-0">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={mentor.picture} alt={mentor.name} />
                <AvatarFallback className="bg-muted text-foreground font-semibold">
                  {mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {mentor.is_active !== false && (
                <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0">
            {/* Name and Verification */}
            <div className="flex items-center gap-2 mb-1">
              <Link 
                to={`/community/mentors/${mentor.id}`}
                className="font-semibold text-foreground hover:underline"
              >
                {mentor.name}
              </Link>
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            </div>

            {/* Rating and Reviews */}
            {rating > 0 && (
              <div className="flex items-center gap-2 mb-2">
                {renderStars(rating)}
                <span className="text-sm text-muted-foreground">
                  {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
                {sessionsCompleted > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{sessionsCompleted} sessions</span>
                  </>
                )}
              </div>
            )}

            {/* Bio */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {truncatedBio}
            </p>
            <Link 
              to={`/community/mentors/${mentor.id}`}
              className="text-sm text-primary hover:underline inline-block mb-3"
            >
              Learn more
            </Link>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
              {reviewCount > 0 && <span>{reviewCount} reviews</span>}
              {sessionsCompleted > 0 && <span>{sessionsCompleted} sessions</span>}
            </div>

            {/* Expertise/Languages */}
            {mentor.expertise && mentor.expertise.length > 0 && (
              <div className="text-xs text-muted-foreground mb-4">
                Expertise: {mentor.expertise.slice(0, 3).join(', ')}
                {mentor.expertise.length > 3 && '...'}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleBookSession}
                className="h-9"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                Book Session
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendMessage}
                className="h-9"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Message
              </Button>
            </div>
          </div>

          {/* Right: Price and Heart */}
          <div className="flex-shrink-0 flex flex-col items-end justify-between">
            <button className="p-2 hover:bg-muted rounded-sm transition-colors">
              <Heart className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </button>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {hourlyRateFormatted}
              </div>
              <div className="text-sm text-muted-foreground">
                50-min session
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

