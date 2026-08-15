import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import SEO, { createBreadcrumbSchema, createPersonSchema, createWebPageSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommunityMentorsWallpaper from "@/components/wallpapers/CommunityMentorsWallpaper";
import { MentorProfile } from "@/components/mentor-marketplace/MentorProfile";
import { Button } from "@/components/ui/button";
import { MentorProfile as MentorProfileType } from "@/types/mentor";
import { useMentors } from "@/hooks/useMentors";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generateMentorSlug } from "@/utils/mentorSlug";

const MentorProfilePage = () => {
  const { id, slug: paramSlug } = useParams<{ id?: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';
  const { fetchMentorById, fetchMentorBySlug } = useMentors();
  const [mentor, setMentor] = useState<MentorProfileType | null>(null);
  const [loadingMentor, setLoadingMentor] = useState(true);

  // CRITICAL: Extract slug directly from URL pathname to avoid useParams timing issues
  // This ensures we always get the current route slug, even if useParams hasn't updated yet
  // Using useMemo ensures this recalculates when location.pathname changes
  const slug = useMemo(() => {
    if (paramSlug) return paramSlug;
    const pathMatch = location.pathname.match(/^\/mentorship\/([^/]+)$/);
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

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [id, slug, location.pathname, fetchMentorById, fetchMentorBySlug]);

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
            <Link to="/mentorship">Browse All Mentors</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${mentor.name} | Startup Mentor`}
        description={mentor.bio.substring(0, 160)}
        url={`/mentorship/${generateMentorSlug(mentor.name)}`}
        image={mentor.picture}
        structuredData={[
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Startup Mentors", url: "/mentorship" },
            { name: mentor.name, url: `/mentorship/${generateMentorSlug(mentor.name)}` },
          ]),
          createPersonSchema({
            name: mentor.name,
            description: mentor.bio,
            url: `/mentorship/${generateMentorSlug(mentor.name)}`,
            image: mentor.picture,
            jobTitle: "Startup Mentor",
            sameAs: [mentor.linkedin_url, mentor.twitter_x_url, mentor.website_url].filter(Boolean) as string[],
          }),
          createWebPageSchema({
            name: `${mentor.name} | Startup Mentor`,
            description: mentor.bio,
            url: `/mentorship/${generateMentorSlug(mentor.name)}`,
            type: "ProfilePage",
            mainEntityId: `https://creatives-takeover.com/mentorship/${generateMentorSlug(mentor.name)}#person`,
          }),
        ]}
      />
      <div className="min-h-screen bg-background relative">
        <CommunityMentorsWallpaper />
        <div className="relative z-10">
          <Navigation />
          <div className="pt-header-offset">
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/mentorship" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Community
                  </Link>
                </Button>
                {isAdmin && mentor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/mentorship/admin/edit/${mentor.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Mentor
                  </Button>
                )}
              </div>

              <MentorProfile mentor={mentor} />
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default MentorProfilePage;
