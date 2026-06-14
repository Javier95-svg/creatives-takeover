import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { Link, useNavigate } from "react-router-dom";
import { Star, CheckCircle2, MessageCircle, Calendar, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getCountryFlag } from "@/utils/countryFlags";
import { useMessaging } from "@/hooks/useMessaging";
import { toast } from "sonner";
import { generateMentorSlug } from "@/utils/mentorSlug";
import { useMentorSaves } from "@/hooks/useMentorSaves";
import { completeActivationJourney, trackRetentionEvent } from "@/lib/retentionSystem";
import { clearPendingValueCapture, persistPendingValueCapture, readPendingValueCapture } from "@/lib/valueCapture";
import { useMemo } from "react";
import { useEffect, useRef } from "react";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { buildDiscoveryCallRedirectUrl, createDiscoveryCallIntent, openDeferredExternalTab } from "@/services/discoveryCallService";
import { createIdempotencyKey } from "@/lib/idempotency";

interface MentorCardProps {
  mentor: Mentor;
  className?: string;
  /** Load image eagerly (for above-the-fold items) */
  priority?: boolean;
}

export const MentorCard = ({ mentor, className, priority = false }: MentorCardProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { startConversation, resolveMentorUserId } = useMessaging({ autoLoad: false });
  const { openUpgradePrompt } = useUpgradePrompt();
  const { saveMentor, buildSaveButtonState } = useMentorSaves();
  const mentorSlug = generateMentorSlug(mentor.name);
  const profileUrl = `/mentorship/${mentorSlug}`;
  const saveButton = buildSaveButtonState(mentor.id);
  const SaveButtonIcon = saveButton.icon;
  const hasBookableCall = Boolean(mentor.calendly_url?.trim());
  const hasMessagingAccount = Boolean(mentor.user_id?.trim());
  const hasConsumedPendingAction = useRef(false);

  // Truncate bio if too long
  const bioMaxLength = 200;
  const truncatedBio = mentor.bio.length > bioMaxLength
    ? mentor.bio.substring(0, bioMaxLength) + '...'
    : mentor.bio;

  const rating = mentor.rating || 0;
  const reviewCount = mentor.review_count || 0;

  // Get country flag - special cases for mentors whose nationality is not set in the database yet
  const getNationality = () => {
    if (mentor.nationality) {
      return mentor.nationality;
    }
    const normalizedMentorName = mentor.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
    // Special case: Gabor/Gabor Homik/Hornik is from Hungary
    if (
      normalizedMentorName.includes('gabor') &&
      (normalizedMentorName.includes('hornik') || normalizedMentorName.includes('homik'))
    ) {
      return 'Hungary';
    }
    // Special case: Andrii Stakhov is from Estonia
    if (mentor.name.toLowerCase().includes('andrii') && mentor.name.toLowerCase().includes('stakhov')) {
      return 'Estonia';
    }
    return null;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  const countryFlag = useMemo(() => getCountryFlag(getNationality()), [mentor.id, mentor.nationality, mentor.name]);

  const renderStars = (ratingValue: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-3.5 w-3.5",
              star <= Math.round(ratingValue)
                ? "fill-warning text-warning"
                : "text-muted-foreground/20"
            )}
          />
        ))}
      </div>
    );
  };

  const handleBookDiscoveryCall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const bookingUrl = mentor.calendly_url?.trim();

    if (!hasBookableCall || !bookingUrl) {
      toast.error("This mentor does not have a booking link configured yet.");
      return;
    }
    const normalizedBookingUrl = /^https?:\/\//i.test(bookingUrl) ? bookingUrl : `https://${bookingUrl}`;

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      navigate(`/signup?source=book-discovery-call&return=${encodeURIComponent(profileUrl)}`);
      return;
    }

    const bookingTab = openDeferredExternalTab();
    if (!bookingTab) {
      toast.error('Popup blocked. Please allow popups and try again.');
      return;
    }

    try {
      const bookingIntent = await createDiscoveryCallIntent({
        mentorId: mentor.id,
        mentorName: mentor.name,
        source: 'mentor_card',
        idempotencyKey: createIdempotencyKey(`mentor-card-discovery-call-${mentor.id}`),
        metadata: { mentor_id: mentor.id, mentor_name: mentor.name },
      });

      if (!bookingIntent.success || !bookingIntent.callId) {
        bookingTab.close();

        if (bookingIntent.errorCode === 'PLAN_UPGRADE_REQUIRED' && bookingIntent.requiredTier) {
          openUpgradePrompt({
            reason: 'feature',
            featureName: 'Discovery Calls',
            requiredTier: bookingIntent.requiredTier,
            description: bookingIntent.error,
          });
          return;
        }

        if (bookingIntent.errorCode === 'INSUFFICIENT_CREDITS') {
          openUpgradePrompt({
            reason: 'credits',
            featureName: 'Discovery Calls',
            requiredCredits: bookingIntent.requiredCredits ?? 10,
            description: bookingIntent.error,
          });
          return;
        }

        toast.error(bookingIntent.error || 'Unable to process booking. Please try again.');
        return;
      }

      bookingTab.location.href = buildDiscoveryCallRedirectUrl(normalizedBookingUrl, bookingIntent.callId);

      await trackRetentionEvent('discovery_call_booked', {
        user_id: user.id,
        mentor_id: mentor.id,
        mentor_name: mentor.name,
        source: 'mentor_card',
      });
      await completeActivationJourney({
        user,
        action: 'book_call',
        mentorId: mentor.id,
        mentorName: mentor.name,
        source: 'mentor_card',
        actionUrl: profileUrl,
      });
    } catch (error) {
      bookingTab.close();
      console.error('Error creating discovery call intent:', error);
      toast.error('Unable to process booking. Please try again.');
    }
  };

  const handleSaveMentor = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !user) {
      persistPendingValueCapture({
        action: 'save_mentor',
        entityId: mentor.id,
        source: 'mentor_card',
        resumeLabel: `Save ${mentor.name}`,
      });
      navigate(`/signup?source=save-mentor&return=${encodeURIComponent(profileUrl)}`);
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
      'mentor_card',
    );
  };

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasMessagingAccount) {
      toast.error('This mentor has not enabled direct messaging yet. Try the social links on their profile instead.');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      persistPendingValueCapture({
        action: 'message_mentor',
        entityId: mentor.id,
        source: 'mentor_card',
        resumeLabel: `Message ${mentor.name}`,
      });
      navigate(`/signup?source=message-mentor&return=${encodeURIComponent(profileUrl)}`);
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

  useEffect(() => {
    if (!user || hasConsumedPendingAction.current) return;

    const pendingCapture = readPendingValueCapture();
    if (!pendingCapture || pendingCapture.entityId !== mentor.id) {
      return;
    }

    hasConsumedPendingAction.current = true;

    if (pendingCapture.action === 'save_mentor' && !saveButton.saved) {
      clearPendingValueCapture();
      void saveMentor({ id: mentor.id, name: mentor.name }, 'mentor_card_save_gated_auth');
      return;
    }

    if (pendingCapture.action === 'message_mentor' && hasMessagingAccount) {
      clearPendingValueCapture();
      void (async () => {
        const mentorUserId = await resolveMentorUserId({
          name: mentor.name,
          user_id: mentor.user_id || null,
        });

        if (!mentorUserId || mentorUserId === user.id) {
          return;
        }

        const conversationId = await startConversation(mentorUserId);
        if (conversationId) {
          navigate(`/messages?conversationId=${conversationId}`);
        }
      })();
    }
  }, [hasMessagingAccount, mentor.id, mentor.name, mentor.user_id, navigate, resolveMentorUserId, saveButton.saved, saveMentor, startConversation, user]);

  return (
    <Card className={cn("border-2 border-border/60 rounded-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-background", className)}>
      <CardContent className="p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row gap-6 lg:gap-8">
          {/* Left: Avatar */}
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            <div className="relative group">
              <Avatar className="h-24 w-24 sm:h-20 sm:w-20 lg:h-24 lg:w-24 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105 shadow-lg">
                <AvatarImage
                  src={mentor.picture || undefined}
                  alt={mentor.name}
                  className="object-cover"
                  loading={priority ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={priority ? "high" : "auto"}
                />
                <AvatarFallback className="bg-muted text-foreground font-semibold text-lg lg:text-xl animate-pulse">
                  {mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name and Verification */}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="flex items-center justify-center gap-1.5 text-center sm:gap-2 sm:justify-start sm:text-left">
                <Link
                  to={profileUrl}
                  className="inline-flex items-center text-lg font-bold leading-none text-foreground transition-colors hover:text-primary lg:text-xl"
                >
                  {mentor.name}
                </Link>
                <CheckCircle2 className="h-[18px] w-[18px] flex-shrink-0 text-primary sm:h-5 sm:w-5" />
                {countryFlag && (
                  <span className="hidden text-lg lg:text-xl sm:inline" title={getNationality() || ''}>
                    {countryFlag}
                  </span>
                )}
              </div>

              {(countryFlag || mentor.linkedin_url || mentor.twitter_x_url || mentor.website_url) && (
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 sm:justify-start">
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
                      className="flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-info sm:h-auto sm:w-auto"
                      aria-label="LinkedIn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
                    </a>
                  )}
                  {mentor.twitter_x_url && (
                    <a
                      href={mentor.twitter_x_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground sm:h-auto sm:w-auto"
                      aria-label="X (Twitter)"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                  {mentor.website_url && (
                    <a
                      href={mentor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-primary sm:h-auto sm:w-auto"
                      aria-label="Website"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>

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
              to={profileUrl}
              className="text-sm font-medium text-primary hover:underline inline-block"
            >
              Learn more
            </Link>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-xs lg:text-sm text-muted-foreground">
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
              {reviewCount > 0 && <span>{reviewCount} reviews</span>}
            </div>

            {/* Expertise Areas */}
            {mentor.expertise && mentor.expertise.length > 0 && (
              <div>
                <p className="mb-2 text-label font-semibold uppercase tracking-wider text-primary/85">
                  Expertise Areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {mentor.expertise.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                  {mentor.expertise.length > 4 && (
                    <span className="inline-flex items-center rounded-full border border-primary/40 bg-background px-2.5 py-1 text-xs font-semibold text-primary">
                      +{mentor.expertise.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {/* FIX(dead-click): /mentorship — mentor cards now only show primary call/message actions when the mentor actually supports them, and otherwise render explicit unavailable states. */}
              <Button
                size="default"
                variant={hasBookableCall ? "default" : "outline"}
                onClick={hasBookableCall ? handleBookDiscoveryCall : undefined}
                disabled={!hasBookableCall}
                className="w-full sm:w-auto h-10 flex-1 hover:shadow-md transition-all duration-200"
              >
                <Calendar className="h-4 w-4 mr-1.5" />
                {hasBookableCall ? 'Book Discovery Call' : 'Discovery Call Unavailable'}
              </Button>
              <Button
                size="default"
                variant="outline"
                onClick={hasMessagingAccount ? handleSendMessage : undefined}
                disabled={!hasMessagingAccount}
                className="w-full sm:w-auto h-10 flex-1 hover:shadow-md transition-all duration-200"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                {hasMessagingAccount ? 'Message' : 'Messaging Unavailable'}
              </Button>
              <Button
                size="default"
                variant={saveButton.saved ? "secondary" : "outline"}
                onClick={handleSaveMentor}
                disabled={saveButton.saving || saveButton.saved}
                className="w-full sm:w-auto h-10 flex-1 hover:shadow-md transition-all duration-200"
              >
                <SaveButtonIcon className="h-4 w-4 mr-1.5" />
                {saveButton.saving ? 'Saving...' : saveButton.label}
              </Button>
            </div>
            {(!hasBookableCall || !hasMessagingAccount) && (
              <p className="text-xs text-muted-foreground">
                {!hasBookableCall && !hasMessagingAccount
                  ? 'This mentor currently supports profile browsing only. Use the external links above to reach out.'
                  : !hasBookableCall
                    ? 'Discovery calls are not enabled for this mentor yet.'
                    : 'Direct messaging is not enabled for this mentor yet.'}
              </p>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

