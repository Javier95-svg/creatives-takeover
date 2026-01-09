import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
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
  const { id, slug: paramSlug } = useParams<{ id?: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentorById, fetchMentorBySlug } = useMentors();
  const { checkFeatureAccess } = useFeatureGating();
  const [mentor, setMentor] = useState<MentorProfileType | null>(null);
  const [loadingMentor, setLoadingMentor] = useState(true);

  // CRITICAL: Extract slug directly from URL pathname to avoid useParams timing issues
  // This ensures we always get the current route slug, even if useParams hasn't updated yet
  // Using useMemo ensures this recalculates when location.pathname changes
  const slug = useMemo(() => {
    if (paramSlug) return paramSlug;
    const pathMatch = location.pathname.match(/^\/community\/([^\/]+)$/);
    return pathMatch ? pathMatch[1] : null;
  }, [paramSlug, location.pathname]);

  useEffect(() => {
    // #region agent log
    const pathMatch = location.pathname.match(/^\/community\/([^\/]+)$/);
    const slugFromPath = pathMatch ? pathMatch[1] : null;
    fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:43',message:'useEffect triggered',data:{id,paramSlug,slugFromPath,slug,hasId:!!id,hasSlug:!!slug,pathname:location.pathname,currentMentorId:mentor?.id,currentMentorName:mentor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    
    // CRITICAL FIX: Reset state immediately when route changes to prevent stale data
    setMentor(null);
    setLoadingMentor(true);
    
    // #region agent log
    fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:42',message:'State reset - mentor cleared, loading set to true',data:{id,slug,pathname:location.pathname,previousMentorId:mentor?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!id && !slug) {
      // #region agent log
      fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:47',message:'Early return - no id or slug',data:{id,slug,pathname:location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setLoadingMentor(false);
      return;
    }

    let cancelled = false; // Abort controller for cleanup

    const loadData = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:52',message:'Starting loadData',data:{id,slug,usingSlug:!!slug,cancelled},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Loading state already set above, no need to set again
        
        // #region agent log
        fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:56',message:'About to fetch mentor',data:{id,slug,usingSlug:!!slug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        const found = slug
          ? await fetchMentorBySlug(slug)
          : await fetchMentorById(id!);

        // #region agent log
        fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:53',message:'Fetch completed',data:{id,slug,found:!!found,foundId:found?.id,foundName:found?.name,cancelled},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (!cancelled && found) {
          // #region agent log
          fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:57',message:'Setting mentor state',data:{foundId:found.id,foundName:found.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          setMentor(found as MentorProfileType);
        } else if (!cancelled) {
          // #region agent log
          fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:61',message:'Mentor not found or cancelled',data:{id,slug,found:!!found,cancelled},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:65',message:'Error loading mentor',data:{id,slug,error:error instanceof Error ? error.message : String(error),cancelled},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('Failed to load mentor profile:', error);
      } finally {
        if (!cancelled) {
          // #region agent log
          fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:71',message:'Setting loading to false',data:{id,slug,currentMentor:!!mentor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          setLoadingMentor(false);
        }
      }
    };

    loadData();

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:88',message:'Cleanup - setting cancelled',data:{id,slug,pathname:location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      cancelled = true; // Cleanup: prevent state updates after unmount
    };
  }, [id, slug, location.pathname, fetchMentorById, fetchMentorBySlug]); // Include location.pathname to detect route changes

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

  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:110',message:'Render check',data:{loadingMentor,hasMentor:!!mentor,mentorId:mentor?.id,mentorName:mentor?.name,id,slug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E'})}).catch(()=>{});
  }
  // #endregion

  if (loadingMentor) {
    // #region agent log
    fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:115',message:'Rendering loading state',data:{id,slug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7259/ingest/efda94d1-ad7a-43dd-93ae-d197dbf341f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MentorProfilePage.tsx:129',message:'Rendering Not Found state',data:{id,slug,loadingMentor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
