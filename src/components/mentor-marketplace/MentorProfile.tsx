import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MentorProfile as MentorProfileType, getCurrencySymbol } from "@/types/mentor";
import { Star, Calendar, MessageCircle, CheckCircle2, Users, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getCountryFlag } from "@/utils/countryFlags";
import { useAuth } from "@/contexts/AuthContext";
import { useMessaging } from "@/hooks/useMessaging";
import { toast } from "sonner";
import { useMentorSaves } from "@/hooks/useMentorSaves";

interface MentorProfileProps {
  mentor: MentorProfileType;
  onBookClick?: () => void;
}

export const MentorProfile = ({ mentor, onBookClick }: MentorProfileProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { startConversation, resolveMentorUserId } = useMessaging({ autoLoad: false });
  const { saveMentor, buildSaveButtonState } = useMentorSaves();
  const currencySymbol = getCurrencySymbol(mentor.currency);
  const hourlyRate = ((mentor as any).hourly_rate_per_hour || 0) / 100;
  const averageRating = mentor.rating || 0;
  const reviewCount = mentor.review_count || 0;
  const sessionsCompleted = mentor.total_sessions_completed || 0;
  const saveButton = buildSaveButtonState(mentor.id);
  const SaveButtonIcon = saveButton.icon;
  const hasBookableCall = Boolean(mentor.calendly_url?.trim()) && mentor.is_active !== false;
  const hasMessagingAccount = Boolean(mentor.user_id?.trim());
  
  // Truncate bio for display
  const bioMaxLength = 250;
  const truncatedBio = mentor.bio.length > bioMaxLength 
    ? mentor.bio.substring(0, bioMaxLength) + '...'
    : mentor.bio;
  
  // Get country flag - special cases for mentors whose nationality is not set in the database yet
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
    // Special case: Julio Sanchez Redondo is from Spain
    if (
      mentor.name.toLowerCase().includes('julio') &&
      (mentor.name.toLowerCase().includes('sanchez') || mentor.name.toLowerCase().includes('sánchez')) &&
      mentor.name.toLowerCase().includes('redondo')
    ) {
      return 'Spain';
    }
    // Special case: Jelena Dabovic is from Serbia
    if (mentor.name.toLowerCase().includes('jelena') && mentor.name.toLowerCase().includes('dabovic')) {
      return 'Serbia';
    }
    // Special case: Marc Bright is from Great Britain
    if (mentor.name.toLowerCase().includes('marc') && mentor.name.toLowerCase().includes('bright')) {
      return 'United Kingdom';
    }
    // Special case: Vashti Joseph is from France
    if (mentor.name.toLowerCase().includes('vashti') && mentor.name.toLowerCase().includes('joseph')) {
      return 'France';
    }
    // Special case: Charlotte Joseph is from France
    if (mentor.name.toLowerCase().includes('charlotte') && mentor.name.toLowerCase().includes('joseph')) {
      return 'France';
    }
    // Special case: Ramona Chihaia is from Romania
    if (mentor.name.toLowerCase().includes('ramona') && mentor.name.toLowerCase().includes('chihaia')) {
      return 'Romania';
    }
    // Special case: Dikshit Kukreja is from India
    if (mentor.name.toLowerCase().includes('dikshit') && mentor.name.toLowerCase().includes('kukreja')) {
      return 'India';
    }
    // Special case: Delraj Singh Uppal is from United Kingdom
    if (mentor.name.toLowerCase().includes('delraj') && mentor.name.toLowerCase().includes('uppal')) {
      return 'United Kingdom';
    }
    // Special case: Ceren Aslan is from Turkey
    if (mentor.name.toLowerCase().includes('ceren') && mentor.name.toLowerCase().includes('aslan')) {
      return 'Turkey';
    }
    // Special case: Parnika Sharma is from India
    if (mentor.name.toLowerCase().includes('parnika') && mentor.name.toLowerCase().includes('sharma')) {
      return 'India';
    }
    // Special case: Akshita Yadav is from India
    if (mentor.name.toLowerCase().includes('akshita') && mentor.name.toLowerCase().includes('yadav')) {
      return 'India';
    }
    // Special case: Sakina Lokhandwala is from India
    if (mentor.name.toLowerCase().includes('sakina') && mentor.name.toLowerCase().includes('lokhandwala')) {
      return 'India';
    }
    // Special case: Rachel Yenko-Martinka is from USA
    if (mentor.name.toLowerCase().includes('rachel') && mentor.name.toLowerCase().includes('yenko')) {
      return 'USA';
    }
    // Special case: Sophia Lopez Pimenta is from Portugal
    if (
      mentor.name.toLowerCase().includes('sophia') &&
      (mentor.name.toLowerCase().includes('pimenta') || mentor.name.toLowerCase().includes('lopez'))
    ) {
      return 'Portugal';
    }
    // Special case: Yasmine Caxeiro is from Brazil
    if (mentor.name.toLowerCase().includes('yasmine') && mentor.name.toLowerCase().includes('caxeiro')) {
      return 'Brazil';
    }
    // Special case: Matias Pancorvo is from Argentina
    if (mentor.name.toLowerCase().includes('matias') && mentor.name.toLowerCase().includes('pancorvo')) {
      return 'Argentina';
    }
    // Special case: Carolina Barthalot is from Spain
    if (mentor.name.toLowerCase().includes('carolina') && mentor.name.toLowerCase().includes('barthalot')) {
      return 'Spain';
    }
    // Special case: Lucas Annarattone is from Argentina
    if (mentor.name.toLowerCase().includes('lucas') && mentor.name.toLowerCase().includes('annarattone')) {
      return 'Argentina';
    }
    // Special case: Artur Sindarsky is from Ukraine
    if (mentor.name.toLowerCase().includes('artur') && mentor.name.toLowerCase().includes('sindarsky')) {
      return 'Ukraine';
    }
    // Special case: Daiana Tokpayeva is from Kazakhstan
    if (mentor.name.toLowerCase().includes('daiana') && mentor.name.toLowerCase().includes('tokpayeva')) {
      return 'Kazakhstan';
    }
    // Special case: Karolina Żurawska is from Poland
    if (mentor.name.toLowerCase().includes('karolina') && mentor.name.toLowerCase().includes('urawska')) {
      return 'Poland';
    }
    // Special case: Ricardo Quiroga is from UAE
    if (mentor.name.toLowerCase().includes('ricardo') && mentor.name.toLowerCase().includes('quiroga')) {
      return 'UAE';
    }
    // Special case: Katie Brett is from South Africa
    if (mentor.name.toLowerCase().includes('katie') && mentor.name.toLowerCase().includes('brett')) {
      return 'South Africa';
    }
    // Special case: Felicity Mukunju is from Kenya
    if (mentor.name.toLowerCase().includes('felicity') && mentor.name.toLowerCase().includes('mukunju')) {
      return 'Kenya';
    }
    // Special case: Sharon Praise-Akpunne is from United Kingdom
    if (
      mentor.name.toLowerCase().includes('sharon') &&
      mentor.name.toLowerCase().includes('praise') &&
      mentor.name.toLowerCase().includes('akpunne')
    ) {
      return 'United Kingdom';
    }
    // Special case: Vivian Ubochi is from Nigeria
    if (mentor.name.toLowerCase().includes('vivian') && mentor.name.toLowerCase().includes('ubochi')) {
      return 'Nigeria';
    }
    // Special case: Johnny Bou Malhab is from Lebanon
    if (
      mentor.name.toLowerCase().includes('johnny') &&
      mentor.name.toLowerCase().includes('bou') &&
      mentor.name.toLowerCase().includes('malhab')
    ) {
      return 'Lebanon';
    }
    // Special case: Albert Hovhannisyan is from Armenia
    if (mentor.name.toLowerCase().includes('albert') && mentor.name.toLowerCase().includes('hovhannisyan')) {
      return 'Armenia';
    }
    // Special case: Matas Ramanauskas is from Lithuania
    if (mentor.name.toLowerCase().includes('matas') && mentor.name.toLowerCase().includes('ramanauskas')) {
      return 'Lithuania';
    }
    // Special case: Pedro Monestel is from Costa Rica
    if (mentor.name.toLowerCase().includes('pedro') && mentor.name.toLowerCase().includes('monestel')) {
      return 'Costa Rica';
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
    if (!hasMessagingAccount) {
      toast.error('This mentor has not enabled direct messaging yet. Try the social links on this profile instead.');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    const mentorUserId = await resolveMentorUserId({
      name: mentor.name,
      user_id: mentor.user_id || null
    });

    if (!mentorUserId) {
      toast.error('This mentor does not have messaging enabled. Please contact them through their other channels.');
      return;
    }

    // Prevent messaging yourself
    if (mentorUserId === user.id) {
      toast.error('You cannot message yourself.');
      return;
    }

    try {
      // Start or find existing conversation
      const conversationId = await startConversation(mentorUserId);
      if (conversationId) {
        // Navigate to messages page with conversationId to automatically open the chat
        navigate(`/messages?conversationId=${conversationId}`);
      } else {
        toast.error('Failed to start conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation. Please try again.');
    }
  };

  const handleSaveMentor = async () => {
    if (!isAuthenticated || !user) {
      navigate(`/login?return=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (saveButton.saved) {
      return;
    }

    await saveMentor(
      {
        id: mentor.id,
        name: mentor.name,
      },
      'mentor_profile',
    );
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
          <div className="flex-1 min-w-0 space-y-3 text-center lg:text-left">
            {/* Name and Verification */}
            <div className="flex items-center justify-center gap-2 flex-wrap lg:justify-start">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {mentor.name}
              </h1>
              <CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6 text-primary flex-shrink-0" />
              {countryFlag && (
                <span className="hidden text-2xl lg:text-3xl sm:inline" title={getNationality() || ''}>
                  {countryFlag}
                </span>
              )}
            </div>

            {/* Social Links */}
            {(countryFlag || mentor.linkedin_url || mentor.twitter_x_url || mentor.website_url) && (
              <div className="flex items-center justify-center gap-2.5 sm:justify-start sm:gap-3">
                {countryFlag && (
                  <span className="flex h-5 w-5 items-center justify-center text-base leading-none sm:hidden" title={getNationality() || ''}>
                    {countryFlag}
                  </span>
                )}
                {mentor.linkedin_url && (
                  <a
                    href={mentor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-blue-600 hover:scale-110 sm:h-auto sm:w-auto"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                  </a>
                )}
                {mentor.twitter_x_url && (
                  <a
                    href={mentor.twitter_x_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:scale-110 sm:h-auto sm:w-auto"
                    aria-label="X (Twitter)"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {mentor.website_url && (
                  <a
                    href={mentor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-primary hover:scale-110 sm:h-auto sm:w-auto"
                    aria-label="Website"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
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

            {/* Expertise Areas */}
            {mentor.expertise && mentor.expertise.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary/85">
                  Expertise Areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {mentor.expertise.slice(0, 6).map((skill) => (
                    <Badge
                      key={skill}
                      className="border border-primary/30 bg-primary/90 text-xs font-semibold text-primary-foreground hover:bg-primary"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {mentor.expertise.length > 6 && (
                    <Badge className="border border-primary/40 bg-background text-xs font-semibold text-primary hover:bg-primary/10">
                      +{mentor.expertise.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Pricing: Hourly Rate */}
            {hourlyRate > 0 && (
              <div className="text-xs lg:text-sm">
                <span className="text-foreground font-semibold">
                  {currencySymbol}{hourlyRate.toLocaleString()}<span className="text-muted-foreground font-normal">/hr</span>
                </span>
              </div>
            )}

	                {/* Action Buttons */}
	                <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row">
	                  <Button
	                    onClick={hasBookableCall ? onBookClick : undefined}
	                    size="default"
	                    variant={hasBookableCall ? "default" : "outline"}
	                    className="w-full flex-1 text-sm sm:text-base hover:shadow-md transition-all duration-200"
	                    disabled={!hasBookableCall}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {hasBookableCall ? 'Book Discovery Call' : 'Discovery Call Unavailable'}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={hasMessagingAccount ? handleSendMessage : undefined}
                    className="w-full flex-1 text-sm sm:text-base hover:shadow-md transition-all duration-200"
                    disabled={!hasMessagingAccount}
                  >
	                    <MessageCircle className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
	                    {hasMessagingAccount ? 'Send Message' : 'Messaging Unavailable'}
	                  </Button>
	                  <Button
	                    variant={saveButton.saved ? "secondary" : "outline"}
	                    size="default"
	                    onClick={handleSaveMentor}
	                    className="w-full flex-1 text-sm sm:text-base hover:shadow-md transition-all duration-200"
	                    disabled={saveButton.saving || saveButton.saved}
	                  >
	                    <SaveButtonIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
	                    {saveButton.saving ? 'Saving...' : saveButton.label}
	                  </Button>
	                </div>
            {(!hasBookableCall || !hasMessagingAccount) && (
              <>
                {/* FIX(dead-click): /community/[user-profile] — unavailable mentor actions now render as explicit secondary states instead of primary-looking buttons that silently fail. */}
                <p className="text-xs text-muted-foreground">
                  {!hasBookableCall && !hasMessagingAccount
                    ? 'This mentor currently supports profile browsing only. Use the external links above to reach out.'
                    : !hasBookableCall
                      ? 'Discovery calls are not enabled for this mentor yet.'
                      : 'Direct messaging is not enabled for this mentor yet.'}
                </p>
              </>
            )}
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
