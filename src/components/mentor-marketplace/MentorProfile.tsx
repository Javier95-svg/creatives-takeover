import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MentorProfile as MentorProfileType } from "@/types/mentor";
import { Star, Calendar, MessageCircle, CheckCircle2, Heart, Users, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getCountryFlag } from "@/utils/countryFlags";
import { useAuth } from "@/contexts/AuthContext";
import { useMessaging, SAMUEL_STARKMAN_EMAIL, SAMUEL_STARKMAN_USER_ID, SAMUEL_STARKMAN_USERNAME, NIC_M_RAYCE_EMAIL } from "@/hooks/useMessaging";
import { useState } from "react";
import { toast } from "sonner";

interface MentorProfileProps {
  mentor: MentorProfileType;
  onBookClick?: () => void;
}

export const MentorProfile = ({ mentor, onBookClick }: MentorProfileProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { startConversation, getUserIdByEmail } = useMessaging();
  const hourlyRateFormatted = `$${(mentor.hourly_rate / 100).toFixed(0)}`;
  const averageRating = mentor.rating || 0;
  const reviewCount = mentor.review_count || 0;
  const sessionsCompleted = mentor.total_sessions_completed || 0;
  
  // Truncate bio for display
  const bioMaxLength = 250;
  const truncatedBio = mentor.bio.length > bioMaxLength 
    ? mentor.bio.substring(0, bioMaxLength) + '...'
    : mentor.bio;
  
  // Get country flag - special cases for Samuel (American), Nic M Rayce (Singapore), Irfan Ahmad Malik (Pakistan), Gonzalo Wangüemert (Spain), Marc Bright (Great Britain), Vashti Joseph (France), Ramona Chihaia (Netherlands), and Dikshit Kukreja (India)
  const getNationality = () => {
    if (mentor.nationality) {
      return mentor.nationality;
    }
    // Special case: Samuel is American
    if (mentor.name.toLowerCase().includes('samuel')) {
      return 'USA';
    }
    // Special case: Nic M Rayce is from Singapore
    if (mentor.name.toLowerCase().includes('nic') && mentor.name.toLowerCase().includes('rayce')) {
      return 'Singapore';
    }
    // Special case: Irfan Ahmad Malik is from Pakistan
    if (mentor.name.toLowerCase().includes('irfan') && mentor.name.toLowerCase().includes('malik')) {
      return 'Pakistan';
    }
    // Special case: Gonzalo Wangüemert is from Spain
    if (mentor.name.toLowerCase().includes('gonzalo') && mentor.name.toLowerCase().includes('wangüemert')) {
      return 'Spain';
    }
    // Special case: Marc Bright is from Great Britain
    if (mentor.name.toLowerCase().includes('marc') && mentor.name.toLowerCase().includes('bright')) {
      return 'United Kingdom';
    }
    // Special case: Vashti Joseph is from France
    if (mentor.name.toLowerCase().includes('vashti') && mentor.name.toLowerCase().includes('joseph')) {
      return 'France';
    }
    // Special case: Ramona Chihaia is from Netherlands
    if (mentor.name.toLowerCase().includes('ramona') && mentor.name.toLowerCase().includes('chihaia')) {
      return 'Netherlands';
    }
    // Special case: Dikshit Kukreja is from India
    if (mentor.name.toLowerCase().includes('dikshit') && mentor.name.toLowerCase().includes('kukreja')) {
      return 'India';
    }
    return null;
  };
  const nationality = getNationality();
  const countryFlag = getCountryFlag(nationality);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3.5 w-3.5",
              star <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/20"
            )}
          />
        ))}
      </div>
    );
  };

  const handleSendMessage = async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      navigate('/auth');
      return;
    }

    const mentorNameLower = mentor.name.toLowerCase();
    
    // Check if this is Samuel Starkman's profile
    const isSamuelStarkman = (mentorNameLower.includes('samuel') && mentorNameLower.includes('starkman')) ||
                             mentorNameLower.includes('samuel starkman');

    // Check if this is Nic M Rayce's profile
    const isNicMRayce = (mentorNameLower.includes('nic') && mentorNameLower.includes('rayce')) ||
                        mentorNameLower.includes('nic m rayce');

    if (isSamuelStarkman) {
      // Navigate to messages page to see all chats
      navigate('/messages');
      return;
    }

    if (isNicMRayce) {
      try {
        // Get user ID by email
        const userId = await getUserIdByEmail(NIC_M_RAYCE_EMAIL);
        
        if (!userId) {
          toast.error('Unable to find user. Please try again later.');
          return;
        }

        // Start conversation
        const conversationId = await startConversation(userId);
        if (conversationId) {
          // Navigate to messages page with conversationId to automatically open the chat
          navigate(`/messages?conversationId=${conversationId}`);
        } else {
          toast.error('Failed to start conversation. Please try again.');
        }
      } catch (error) {
        console.error('Error starting conversation with Nic M Rayce:', error);
        toast.error('Failed to start conversation. Please try again.');
      }
      return;
    }

    // For other mentors, just navigate to auth for now
    navigate('/auth');
  };

  return (
    <Card className="border-2 border-border/60 rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-background">
      <CardContent className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: Large Profile Picture */}
          <div className="flex-shrink-0 flex justify-center lg:justify-start">
            <div className="relative group">
              <Avatar className="h-28 w-28 lg:h-36 lg:w-36 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105 shadow-lg">
                <AvatarImage 
                  src={mentor.picture || undefined} 
                  alt={mentor.name}
                  className="object-cover w-full h-full"
                />
                <AvatarFallback className="text-2xl lg:text-3xl bg-muted text-foreground font-semibold">
                  {mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Name and Verification */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {mentor.name}
              </h1>
              <CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              {countryFlag && (
                <span className="text-2xl lg:text-3xl" title={getNationality() || ''}>
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
                    className="text-muted-foreground hover:text-blue-600 transition-colors hover:scale-110"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5 lg:h-6 lg:w-6" />
                  </a>
                )}
                {mentor.twitter_x_url && (
                  <a
                    href={mentor.twitter_x_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors hover:scale-110"
                    aria-label="X (Twitter)"
                  >
                    <svg className="h-5 w-5 lg:h-6 lg:w-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {mentor.website_url && (
                  <a
                    href={mentor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors hover:scale-110"
                    aria-label="Website"
                  >
                    <svg className="h-5 w-5 lg:h-6 lg:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Rating and Reviews */}
            {averageRating > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {renderStars(averageRating)}
                <span className="text-sm text-muted-foreground">
                  {averageRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
                {sessionsCompleted > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{sessionsCompleted} sessions</span>
                  </>
                )}
              </div>
            )}

            {/* Statistics Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{averageRating.toFixed(1)}</span>
                </div>
              )}
              {reviewCount > 0 && <span>{reviewCount} reviews</span>}
              {sessionsCompleted > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{sessionsCompleted} sessions</span>
                  </div>
                </>
              )}
            </div>

            {/* Bio Snippet */}
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-1">
                {truncatedBio}
              </p>
              {mentor.bio.length > bioMaxLength && (
                <button 
                  onClick={() => {
                    const element = document.getElementById('full-bio');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Learn more
                </button>
              )}
            </div>

            {/* Expertise Tags */}
            {mentor.expertise && mentor.expertise.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {mentor.expertise.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{mentor.expertise.length - 5} more
                  </Badge>
                )}
              </div>
            )}

            {/* 8 Week Coaching Program / Hourly Rate Basis */}
            <div className="text-xs lg:text-sm text-muted-foreground">
              {mentor.name.toLowerCase().includes('marc') && mentor.name.toLowerCase().includes('bright')
                ? 'Hourly Rate Basis'
                : '8 Week Coaching Program'}
            </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={onBookClick}
                    size="default"
                    className="flex-1 hover:shadow-md transition-all duration-200"
                    disabled={mentor.is_active === false}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Discovery Call
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleSendMessage}
                    className="flex-1 hover:shadow-md transition-all duration-200"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
          </div>

          {/* Right: Heart */}
          <div className="flex-shrink-0 flex flex-col items-center lg:items-end justify-start">
            <button 
              className="p-2 hover:bg-muted rounded-md transition-all duration-200 hover:scale-110 self-end lg:self-start"
              aria-label="Favorite"
            >
              <Heart className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </div>
        </div>
      </CardContent>

      {/* Full Bio Section (expandable) */}
      {mentor.bio.length > bioMaxLength && (
        <div id="full-bio" className="border-t border-border/50">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {mentor.bio}
            </p>
          </CardContent>
        </div>
      )}
    </Card>
  );
};
