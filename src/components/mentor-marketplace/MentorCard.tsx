import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { Link, useNavigate } from "react-router-dom";
import { Star, CheckCircle2, MessageCircle, Calendar, Heart, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getCountryFlag } from "@/utils/countryFlags";

// Calendly link for Samuel Starkman
const SAMUEL_STARKMAN_CALENDLY_URL = 'https://calendly.com/samstarkman/1-on-1-with-sam?month=2025-12';
const CALENDLY_REDIRECT_KEY = 'pending_calendly_redirect';

interface MentorCardProps {
  mentor: Mentor;
  className?: string;
}

export const MentorCard = ({ mentor, className }: MentorCardProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const hourlyRateFormatted = `$${(mentor.hourly_rate / 100).toFixed(0)}`;
  
  // Truncate bio if too long
  const bioMaxLength = 200;
  const truncatedBio = mentor.bio.length > bioMaxLength 
    ? mentor.bio.substring(0, bioMaxLength) + '...'
    : mentor.bio;

  const rating = mentor.rating || 0;
  const reviewCount = mentor.review_count || 0;
  
  // Get country flag - special case for Samuel (American)
  const getNationality = () => {
    if (mentor.nationality) {
      return mentor.nationality;
    }
    // Special case: Samuel is American
    if (mentor.name.toLowerCase().includes('samuel')) {
      return 'USA';
    }
    return null;
  };
  
  const countryFlag = getCountryFlag(getNationality());

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

  const handleBookDiscoveryCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is Samuel Starkman's profile
    const mentorNameLower = mentor.name.toLowerCase();
    const isSamuelStarkman = (mentorNameLower.includes('samuel') && mentorNameLower.includes('starkman')) ||
                             mentorNameLower.includes('samuel starkman');
    
    // Use hardcoded URL for Samuel Starkman, otherwise use mentor's calendly_url
    const calendlyUrl = isSamuelStarkman 
      ? SAMUEL_STARKMAN_CALENDLY_URL 
      : mentor.calendly_url;
    
    if (!calendlyUrl) {
      // Fallback: show message if no Calendly link is set
      alert('Discovery call scheduling is not yet available for this mentor. Please check back soon!');
      return;
    }
    
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      // Store Calendly URL in localStorage for redirect after auth
      localStorage.setItem(CALENDLY_REDIRECT_KEY, calendlyUrl);
      // Redirect to auth page
      navigate('/auth?redirect=/community');
      return;
    }
    
    // User is authenticated, open Calendly directly
    window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/auth');
  };

  return (
    <Card className={cn("border-2 border-border/60 rounded-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-background", className)}>
      <CardContent className="p-6 lg:p-8">
        <div className="flex gap-6 lg:gap-8">
          {/* Left: Avatar */}
          <div className="flex-shrink-0">
            <div className="relative group">
              <Avatar className="h-20 w-20 lg:h-24 lg:w-24 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105 shadow-lg">
                <AvatarImage 
                  src={mentor.picture || undefined} 
                  alt={mentor.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted text-foreground font-semibold text-lg lg:text-xl">
                  {mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name and Verification */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link 
                to={`/community/mentors/${mentor.id}`}
                className="text-lg lg:text-xl font-bold text-foreground hover:text-primary transition-colors"
              >
                {mentor.name}
              </Link>
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              {countryFlag && (
                <span className="text-lg lg:text-xl" title={getNationality() || ''}>
                  {countryFlag}
                </span>
              )}
            </div>

            {/* Social Links */}
            {(mentor.linkedin_url || mentor.twitter_x_url || mentor.website_url) && (
              <div className="flex items-center gap-3">
                {mentor.linkedin_url && (
                  <a
                    href={mentor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-blue-600 transition-colors"
                    aria-label="LinkedIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {mentor.twitter_x_url && (
                  <a
                    href={mentor.twitter_x_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="X (Twitter)"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {mentor.website_url && (
                  <a
                    href={mentor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Website"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Rating and Reviews */}
            {rating > 0 && (
              <div className="flex items-center gap-2">
                {renderStars(rating)}
                <span className="text-sm text-muted-foreground">
                  {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            {/* Bio */}
            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed line-clamp-2">
              {truncatedBio}
            </p>
            <Link 
              to={`/community/mentors/${mentor.id}`}
              className="text-sm font-medium text-primary hover:underline inline-block"
            >
              Learn more
            </Link>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-xs lg:text-sm text-muted-foreground">
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
              {reviewCount > 0 && <span>{reviewCount} reviews</span>}
            </div>

            {/* Expertise/Languages */}
            {mentor.expertise && mentor.expertise.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Expertise: <span className="font-medium">{mentor.expertise.slice(0, 3).join(', ')}</span>
                {mentor.expertise.length > 3 && '...'}
              </div>
            )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="default"
                    onClick={handleBookDiscoveryCall}
                    className="h-10 flex-1 hover:shadow-md transition-all duration-200"
                  >
                    <Calendar className="h-4 w-4 mr-1.5" />
                    Book Discovery Call
                  </Button>
                  <Button
                    size="default"
                    variant="outline"
                    onClick={handleSendMessage}
                    className="h-10 flex-1 hover:shadow-md transition-all duration-200"
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Message
                  </Button>
                </div>
          </div>

          {/* Right: Price and Heart */}
          <div className="flex-shrink-0 flex flex-col items-end justify-between gap-4">
            <button className="p-2 hover:bg-muted rounded-md transition-all duration-200 hover:scale-110">
              <Heart className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
            <div className="text-right">
              <div className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
                {hourlyRateFormatted}
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground">
                8 Week Coaching Program
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

