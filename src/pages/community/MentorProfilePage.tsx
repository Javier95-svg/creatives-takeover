import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { MentorProfile } from "@/components/mentor-marketplace/MentorProfile";
import { Button } from "@/components/ui/button";
import { MentorProfile as MentorProfileType } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { ArrowLeft, Loader2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Calendly link for Samuel Starkman
const SAMUEL_STARKMAN_CALENDLY_URL = 'https://calendly.com/samstarkman/1-on-1-with-sam?month=2025-12';
const CALENDLY_REDIRECT_KEY = 'pending_calendly_redirect';

const MentorProfilePage = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentorById, fetchMentorBySlug } = useMentors();
  const { checkFeatureAccess } = useFeatureGating();
  const [mentor, setMentor] = useState<MentorProfileType | null>(null);
  const [loadingMentor, setLoadingMentor] = useState(true);

  useEffect(() => {
    if (!id && !slug) return;

    let cancelled = false; // Abort controller for cleanup

    const loadData = async () => {
      try {
        setLoadingMentor(true);

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
      cancelled = true; // Cleanup: prevent state updates after unmount
    };
  }, [id, slug, fetchMentorById, fetchMentorBySlug]); // Complete dependencies

  const handleBookClick = () => {
    if (!mentor) return;

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

    // Check feature access for discovery calls
    try {
      const access = checkFeatureAccess('discovery_calls_mentors');
      if (!access.hasAccess) {
        toast.error(access.message || 'Upgrade to Creator tier or higher to book discovery calls with mentors.');
        if (access.requiredTier) {
          navigate('/pricing');
        }
        return;
      }
    } catch (error) {
      console.error('Error checking discovery call access:', error);
      toast.error('An error occurred. Please try again.');
      return;
    }

    // User is authenticated and has access, open Calendly directly
    window.open(calendlyUrl, '_blank', 'noopener,noreferrer');
  };

  if (loadingMentor) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading mentor profile...</p>
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
      <div className="relative min-h-screen overflow-hidden">
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
