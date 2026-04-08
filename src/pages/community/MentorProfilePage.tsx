import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommunityMentorsWallpaper from "@/components/wallpapers/CommunityMentorsWallpaper";
import { MentorProfile } from "@/components/mentor-marketplace/MentorProfile";
import { Button } from "@/components/ui/button";
import { MentorProfile as MentorProfileType } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { ArrowLeft, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { completeActivationJourney, trackRetentionEvent } from "@/lib/retentionSystem";
import { buildDiscoveryCallRedirectUrl, createDiscoveryCallIntent, storePendingDiscoveryCallRedirect } from "@/services/discoveryCallService";
import { createIdempotencyKey } from "@/lib/idempotency";

const MentorProfilePage = () => {
  const { id, slug: paramSlug } = useParams<{ id?: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentorById, fetchMentorBySlug } = useMentors();
  const { openUpgradePrompt } = useUpgradePrompt();
  const [mentor, setMentor] = useState<MentorProfileType | null>(null);
  const [loadingMentor, setLoadingMentor] = useState(true);

  // CRITICAL: Extract slug directly from URL pathname to avoid useParams timing issues
  // This ensures we always get the current route slug, even if useParams hasn't updated yet
  // Using useMemo ensures this recalculates when location.pathname changes
  const slug = useMemo(() => {
    if (paramSlug) return paramSlug;
    const pathMatch = location.pathname.match(/^\/community\/([^/]+)$/);
    return pathMatch ? pathMatch[1] : null;
  }, [paramSlug, location.pathname]);

  useEffect(() => {
    // Reset state immediately when route changes to prevent stale data
    setMentor(null);
    setLoadingMentor(true);

    if (!id && !slug) {
      setLoadingMentor(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const found = slug
          ? await fetchMentorBySlug(slug)
          : await fetchMentorById(id!);

        if (!cancelled && found) {
          setMentor(found as MentorProfileType);
        }
      } catch (error) {
        console.error('Failed to load mentor profile:', error);
      } finally {
        if (!cancelled) {
          setLoadingMentor(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id, slug, location.pathname, fetchMentorById, fetchMentorBySlug]);

  const handleBookClick = async () => {
    if (!mentor) return;

    const calendlyUrl = mentor.calendly_url?.trim();

    if (!calendlyUrl) {
      toast.error("This mentor does not have a Calendly link configured yet.");
      return;
    }
    const normalizedCalendlyUrl = /^https?:\/\//i.test(calendlyUrl) ? calendlyUrl : `https://${calendlyUrl}`;

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      storePendingDiscoveryCallRedirect({
        url: calendlyUrl,
        mentorId: mentor.id,
        mentorName: mentor.name,
        source: 'mentor_profile_page',
      });
      // Redirect to auth page
      navigate('/login?return=/community');
      return;
    }

    const calendlyTab = window.open('', '_blank', 'noopener,noreferrer');
    if (!calendlyTab) {
      toast.error('Popup blocked. Please allow popups and try again.');
      return;
    }

    try {
      const bookingIntent = await createDiscoveryCallIntent({
        mentorId: mentor.id,
        mentorName: mentor.name,
        source: 'mentor_profile_page',
        idempotencyKey: createIdempotencyKey(`mentor-profile-discovery-call-${mentor.id}`),
        metadata: { mentor_id: mentor.id, mentor_name: mentor.name },
      });

      if (!bookingIntent.success || !bookingIntent.callId) {
        calendlyTab.close();

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

      calendlyTab.location.href = buildDiscoveryCallRedirectUrl(normalizedCalendlyUrl, bookingIntent.callId);

      await trackRetentionEvent('discovery_call_booked', {
        user_id: user.id,
        mentor_id: mentor.id,
        mentor_name: mentor.name,
        source: 'mentor_profile_page',
      });
      await completeActivationJourney({
        user,
        action: 'book_call',
        mentorId: mentor.id,
        mentorName: mentor.name,
        source: 'mentor_profile_page',
        actionUrl: location.pathname,
      });
    } catch (error) {
      calendlyTab.close();
      console.error('Error creating discovery call intent:', error);
      toast.error('Unable to process booking. Please try again.');
    }
  };


  if (loadingMentor) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading mentor profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (!mentor) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Mentor Not Found</h2>
          <p className="text-muted-foreground">
            The mentor profile you're looking for doesn't exist or may have been removed.
          </p>
          {(id || slug) && (
            <p className="text-sm text-muted-foreground">
              Looking for: {slug || id}
            </p>
          )}
          <Button asChild className="mt-4">
            <Link to="/community">Browse All Mentors</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{mentor.name} | Mentor Profile</title>
        <meta name="description" content={mentor.bio.substring(0, 160)} />
      </Helmet>
      <div className="min-h-screen bg-background relative">
        <CommunityMentorsWallpaper />
        <div className="relative z-10">
          <Navigation />
          <div className="pt-16">
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/community" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Community
                  </Link>
                </Button>
                {isAdmin && mentor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/community/admin/edit/${mentor.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Mentor
                  </Button>
                )}
              </div>

              <MentorProfile mentor={mentor} onBookClick={handleBookClick} />
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default MentorProfilePage;
