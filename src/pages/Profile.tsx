import { Helmet } from "react-helmet-async";
import SEO, { createBreadcrumbSchema, createPersonSchema, createWebPageSchema } from "@/components/SEO";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProfileWallpaper from "@/components/wallpapers/ProfileWallpaper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Linkedin, Instagram, Globe, Settings, MapPin, Briefcase, Rocket, Users2, ExternalLink, FileText, Zap, TrendingUp, Image, Video, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SocialButtons } from "@/components/social/SocialButtons";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { PinnedPosts } from "@/components/profile/PinnedPosts";
import { PicturesGallery } from "@/components/profile/PicturesGallery";
import { ConnectionsDialog } from "@/components/profile/ConnectionsDialog";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { describeRoleProfile } from '@/lib/roleProfileSchema';
import { isUserType } from '@/lib/accountTypes';
import { getPublicStageLabel, shouldShowPublicStage } from "@/lib/accountabilityPreferences";
import { founderStageLabel } from "@/lib/bizmapStageOrder";

// Keep a stable projection that can still resolve an account while a newly
// deployed optional profile field is waiting for its database migration. A
// missing optional column must never turn an existing account into a 404.
const CORE_PUBLIC_PROFILE_FIELDS = [
  'id',
  'username',
  'full_name',
  'avatar_url',
  'bio',
  'positioning_line',
  'creative_niche',
  'followers_count',
  'following_count',
  'location',
  'startup_name',
  'startup_tagline',
  'startup_stage',
  'startup_industry',
  'website_url',
  'twitter_url',
  'linkedin_url',
  'instagram_url',
  'facebook_url',
  'youtube_url',
  'github_url',
  'tiktok_url',
];

const CORE_PUBLIC_PROFILE_SELECT = CORE_PUBLIC_PROFILE_FIELDS.join(', ');

const PUBLIC_PROFILE_SELECT = [
  ...CORE_PUBLIC_PROFILE_FIELDS,
  'seo_indexable',
  'assigned_stage',
  'user_type',
  'role_profile',
].join(', ');

interface PublicProfileRow {
  id: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  positioning_line: string | null;
  creative_niche: string | null;
  followers_count: number | null;
  following_count: number | null;
  location: string | null;
  startup_name: string | null;
  startup_tagline: string | null;
  startup_stage: string | null;
  startup_industry: string[] | null;
  website_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  github_url: string | null;
  tiktok_url: string | null;
  seo_indexable?: boolean | null;
  assigned_stage?: number | null;
  user_type?: string | null;
  role_profile?: Record<string, unknown> | null;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  bio_html: string | null;
  website_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  github_url: string | null;
  tiktok_url: string | null;
  created_at: string | null;
  followers_count: number;
  following_count: number;
  friends_count: number;
  creative_niche: string | null;
  business_stage: string | null;
  /** Quiz placement on the Startup Development Cycle, 1..7. */
  assigned_stage: number | null;
  /** Which of the five account types this person is. */
  user_type?: string | null;
  /** The answers to whatever that type was asked for. */
  role_profile?: Record<string, unknown> | null;
  role: string | null;
  updated_at?: string | null;
  user_preferences?: Record<string, unknown> | null;

  // Founder-specific fields
  founder_role: string | null;
  location: string | null;
  positioning_line: string | null;
  last_active_at: string | null;

  // Startup information
  startup_name: string | null;
  startup_tagline: string | null;
  startup_logo_url: string | null;
  startup_stage: string | null;
  startup_industry: string[] | null;
  startup_description: string | null;

  // Journey data
  current_focus: string | null;
  looking_for: string[] | null;
  startup_links: {
    pitchDeck?: string;
    waitlist?: string;
    demo?: string;
    website?: string;
    github?: string;
    loom?: string;
  } | null;

  // Traction metrics
  traction_visible: boolean;
  traction_metrics: {
    users?: number;
    revenue?: number;
    growth_rate?: number;
  } | null;
  seo_indexable: boolean;
  search_indexing_requested?: boolean | null;
  search_indexing_review_status?: 'not_requested' | 'pending' | 'approved' | 'rejected' | null;
}

const mapPublicProfile = (profile: PublicProfileRow): Profile => ({
  id: profile.id ?? '',
  username: profile.username,
  full_name: profile.full_name,
  avatar_url: profile.avatar_url,
  banner_url: null,
  bio: profile.bio,
  bio_html: null,
  website_url: profile.website_url,
  twitter_url: profile.twitter_url,
  linkedin_url: profile.linkedin_url,
  instagram_url: profile.instagram_url,
  facebook_url: profile.facebook_url,
  youtube_url: profile.youtube_url,
  github_url: profile.github_url,
  tiktok_url: profile.tiktok_url,
  created_at: null,
  followers_count: profile.followers_count ?? 0,
  following_count: profile.following_count ?? 0,
  friends_count: 0,
  creative_niche: profile.creative_niche,
  business_stage: null,
  assigned_stage: profile.assigned_stage ?? null,
  user_type: profile.user_type ?? null,
  role_profile: profile.role_profile ?? null,
  role: null,
  updated_at: null,
  user_preferences: null,
  founder_role: null,
  location: profile.location,
  positioning_line: profile.positioning_line,
  last_active_at: null,
  startup_name: profile.startup_name,
  startup_tagline: profile.startup_tagline,
  startup_logo_url: null,
  startup_stage: profile.startup_stage,
  startup_industry: profile.startup_industry,
  startup_description: null,
  current_focus: null,
  looking_for: null,
  startup_links: null,
  traction_visible: false,
  traction_metrics: null,
  seo_indexable: profile.seo_indexable === true,
  search_indexing_requested: null,
  search_indexing_review_status: null,
});

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  tags: string[];
  upvotes: number;
  comment_count: number;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConnectionsDialog, setShowConnectionsDialog] = useState(false);
  const [pictureCount, setPictureCount] = useState(0);
  const isOwnProfile = currentUser?.id === profile?.id;
  const profileId = profile?.id;

  const showPublicStage = profile ? shouldShowPublicStage(profile.user_preferences, isOwnProfile) : false;
  // The quiz placement first. business_stage and startup_stage are free text and
  // hold ten unvalidated values in production, so they are only a fallback for
  // profiles that predate the quiz, and only where the text names a real stage.
  const publicStageLabel = profile
    ? founderStageLabel(profile.assigned_stage) ?? getPublicStageLabel(profile.business_stage, profile.startup_stage)
    : null;

  // What this account type was asked for, and only what it was asked for. A
  // founder has no entries here, so nothing renders for them.
  const roleDetails = profile && isUserType(profile.user_type)
    ? describeRoleProfile(profile.user_type, profile.role_profile)
    : [];

  // Connections are accepted requests in either direction, counted by a definer
  // function because friend_requests RLS only exposes rows the viewer is part of.
  const [connectionCount, setConnectionCount] = useState<number | null>(null);
  useEffect(() => {
    if (!profileId) { setConnectionCount(null); return; }
    let cancelled = false;
    void supabase.rpc('connection_count' as never, { target_id: profileId } as never)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setConnectionCount(typeof data === 'number' ? data : 0);
      });
    return () => { cancelled = true; };
  }, [profileId]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;

      try {
        setLoading(true);
        setLoadError(null);
        setProfile(null);

        const queryPublicProfile = async (
          column: 'username' | 'full_name',
          value: string,
          caseInsensitive = false,
        ) => {
          const run = (select: string) => {
            const query = supabase.from('public_profiles').select(select);
            return caseInsensitive
              ? query.ilike(column, value).maybeSingle()
              : query.eq(column, value).maybeSingle();
          };

          const result = await run(PUBLIC_PROFILE_SELECT);
          if (!result.error) return result;

          // Account-type fields were added after the public view was created.
          // During a staggered frontend/database deploy, PostgREST rejects the
          // whole select when even one optional column is absent. Retry the
          // long-lived safe projection so the account itself remains reachable.
          console.warn('Extended public profile projection unavailable; retrying core fields', result.error);
          return run(CORE_PUBLIC_PROFILE_SELECT);
        };

        // Public profile pages read from a safe projection. Full profile rows
        // are only loaded when the viewed profile belongs to the signed-in user.
        const { data: profileData, error: profileError } = await queryPublicProfile('username', username);

        if (profileError) {
          throw profileError;
        }

        let publicProfileData = profileData as PublicProfileRow | null;
        
        if (!publicProfileData) {
          console.error('Looking for username:', username);
          
          // Try to find if there's a similar username (case-insensitive fallback)
          const { data: fallbackData, error: fallbackError } = await queryPublicProfile('username', username, true);

          if (fallbackError) {
            throw fallbackError;
          }
          
          if (fallbackData) {
            console.warn('Found profile with case-insensitive match:', fallbackData.id);
            publicProfileData = fallbackData as PublicProfileRow;
          } else {
            // Additional fallback: Try to find profile by matching full_name
            // This handles edge cases where username might not match exactly
            // For example, if username is "aamirkhan", try to find profiles with "Aamir" or "Khan" in full_name
            // Remove trailing numbers from username for better matching
            const baseUsername = username.replace(/\d+$/, '');
            
            if (baseUsername && baseUsername.length > 2) {
              // Try to find profiles where full_name contains parts of the username
              // This is a best-effort fallback for edge cases
              const { data: nameFallbackData, error: nameFallbackError } = await queryPublicProfile(
                'full_name',
                `%${baseUsername}%`,
                true,
              );

              if (nameFallbackError) {
                throw nameFallbackError;
              }
              
              if (nameFallbackData) {
                console.warn('Found profile by name pattern match:', nameFallbackData.id);
                publicProfileData = nameFallbackData as PublicProfileRow;
              } else {
                // No profile found at all
                console.error('No profile found for username:', username);
                console.error('All fallback searches failed');
                toast.error(`Profile "${username}" not found`);
                setLoading(false);
                return;
              }
            } else {
              // No profile found at all
              console.error('No profile found for username:', username);
              console.error('Fallback search also failed:', fallbackError);
              toast.error(`Profile "${username}" not found`);
              setLoading(false);
              return;
            }
          }
        }
        
        if (!publicProfileData?.id) {
          console.error('No profile found for username:', username);
          toast.error('Profile not found');
          setLoading(false);
          return;
        }

        let finalProfileData = mapPublicProfile(publicProfileData);

        if (currentUser?.id === finalProfileData.id) {
          const { data: ownProfileData, error: ownProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (ownProfileError) {
            console.error('Own profile lookup error:', ownProfileError);
          } else if (ownProfileData) {
            finalProfileData = {
              ...finalProfileData,
              ...(ownProfileData as Partial<Profile>),
            };
          }
        }
        
        setProfile(finalProfileData);

        // The hero (avatar, identity, stats) is ready now, so stop blocking the
        // render on the below-the-fold data. Posts, pinned posts, and the photo
        // count are independent of each other, so fetch them together in the
        // background (parallel) instead of as a serial waterfall, and fill them in
        // as they arrive. This is the main lever for how fast the profile appears.
        void Promise.all([
          supabase
            .from('community_posts')
            .select('*')
            .eq('user_id', finalProfileData.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('community_posts')
            .select('*')
            .eq('user_id', finalProfileData.id)
            .eq('is_pinned', true)
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('user_photos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', finalProfileData.id),
        ])
          .then(([postsRes, pinnedRes, photoRes]) => {
            setPosts(Array.isArray(postsRes.data) ? (postsRes.data as Post[]) : []);
            setPinnedPosts(Array.isArray(pinnedRes.data) ? (pinnedRes.data as Post[]) : []);
            setPictureCount(photoRes.count || 0);
          })
          .catch((secondaryError) => {
            logError('Error loading profile secondary data', secondaryError);
          });

      } catch (error) {
        logError('Error loading profile', error);
        setLoadError("We couldn't load this profile right now. Please try again.");
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [username, currentUser?.id]);

  // Real-time listener for profile updates
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profileId}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as Partial<Profile>;
            setProfile(prev => prev ? {
              ...prev,
              followers_count: (newData.followers_count ?? prev.followers_count) || 0,
              following_count: newData.following_count || 0,
              friends_count: newData.friends_count || 0
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profileId]);

  // Persistent "back to the platform" CTA shown on every profile view — always
  // returns to the public home ("/").
  const platformHref = "/";
  const platformBackCta = (
    <Link
      to={platformHref}
      className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-border hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Platform
    </Link>
  );

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Creatives Takeover</title>
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <ProfileWallpaper />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-20">
              <div className="max-w-4xl mx-auto">
                {platformBackCta}
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-muted rounded-lg" />
                  <div className="h-64 bg-muted rounded-lg" />
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Helmet>
          <title>Creatives Takeover</title>
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <ProfileWallpaper />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-20">
              {platformBackCta}
              <Card className="max-w-md mx-auto p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Profile Temporarily Unavailable</h2>
                <p className="text-muted-foreground mb-6">{loadError}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </Card>
            </main>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Helmet>
          <title>Creatives Takeover</title>
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <ProfileWallpaper />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-20">
              {platformBackCta}
              <Card className="max-w-md mx-auto p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The profile you're looking for doesn't exist.
                </p>
                <Button asChild>
                  <Link to="/mentorship">Back to Community</Link>
                </Button>
              </Card>
            </main>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${profile.full_name || profile.username || 'Founder'} | Founder Profile`}
        description={
          profile.positioning_line
            ? `${profile.full_name || 'Founder'} — ${profile.positioning_line}`
            : (profile.bio || `View ${profile.full_name || 'this founder'}'s public founder profile on Creatives Takeover.`)
        }
        url={`/profile/${profile.username}`}
        image={profile.avatar_url || "/og-founders-compass-2026-09.png"}
        noindex={!profile.seo_indexable}
        structuredData={[
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: profile.full_name || profile.username || "Founder", url: `/profile/${profile.username}` },
          ]),
          createPersonSchema({
            name: profile.full_name || profile.username || "Founder",
            url: `/profile/${profile.username}`,
            description: profile.positioning_line || profile.bio || undefined,
            image: profile.avatar_url,
            jobTitle: profile.founder_role || profile.role,
            sameAs: [profile.website_url, profile.linkedin_url, profile.twitter_url, profile.github_url],
          }),
          createWebPageSchema({
            type: "ProfilePage",
            name: `${profile.full_name || profile.username || 'Founder'} — Founder Profile`,
            description: profile.positioning_line || profile.bio || "Public founder profile on Creatives Takeover.",
            url: `/profile/${profile.username}`,
            mainEntity: { "@id": `https://creatives-takeover.com/profile/${profile.username}#person` },
          }),
        ]}
      />
      <div className="relative min-h-screen overflow-hidden">
        <ProfileWallpaper />
        <div className="relative z-10">
          <Navigation />
          {/* nav-offset-roomy so the card is not flush against the workspace
              header. pt-header-offset alone is zeroed inside the workspace,
              because it reserves space for the legacy nav that renders as null
              there, which left the profile touching the search bar. */}
          <main className="container mx-auto px-4 pt-header-offset nav-offset-roomy pb-8">
            <div className="max-w-4xl mx-auto">
              {/* Founder-First Profile Hero */}
              <Card className="p-6 mb-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Left: Founder Info */}
                  <div className="flex gap-4">
                    <Avatar className="h-20 w-20 ring-2 ring-primary/10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                        {profile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold mb-1 truncate">
                        {profile.full_name || 'Anonymous User'}
                      </h1>
                      {profile.location && (
                        <div className="mb-2">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {profile.location}
                          </span>
                        </div>
                      )}
                      {profile.positioning_line && (
                        <p className="text-sm text-muted-foreground italic mb-2">
                          "{profile.positioning_line}"
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {profile.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {profile.last_active_at && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Active {new Date(profile.last_active_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Follow and Message CTAs */}
                      {!isOwnProfile && profile.id && (
                        <div className="mt-4">
                          <SocialButtons
                            userId={profile.id}
                            userName={profile.full_name || undefined}
                            profileActionsOnly
                            showAccountabilityPartner={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Startup Info */}
                  <div className="border-l border-border pl-6">
                    {profile.startup_name ? (
                      <>
                        <div className="flex items-start gap-3 mb-3">
                          {profile.startup_logo_url && (
                            <img src={profile.startup_logo_url} alt={profile.startup_name} className="h-12 w-12 rounded-lg object-cover" loading="lazy" decoding="async" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-semibold mb-1 truncate flex items-center gap-2">
                              <Rocket className="h-5 w-5 text-primary" />
                              {profile.startup_name}
                            </h2>
                            {profile.startup_tagline && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {profile.startup_tagline}
                              </p>
                            )}
                          </div>
                        </div>
                        {profile.startup_description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {profile.startup_description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {profile.startup_industry?.map((industry, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {industry}
                            </Badge>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        <div className="text-center">
                          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          {isOwnProfile ? 'Add your startup details' : 'No startup info yet'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-4 gap-4 py-4 px-2 bg-muted/30 rounded-lg mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">
                      {profile.founder_role === 'founder' ? 'Founder' :
                       profile.founder_role === 'co-founder' ? 'Co-Founder' :
                       profile.founder_role === 'cto' ? 'CTO' :
                       profile.founder_role === 'cmo' ? 'CMO' :
                       profile.founder_role === 'investor' ? 'Investor' : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Role</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">
                      {showPublicStage ? (publicStageLabel || 'N/A') : isOwnProfile ? (publicStageLabel || 'Not set') : 'Private'}
                    </div>
                    <div className="text-xs text-muted-foreground">Stage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{pictureCount}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                  {isOwnProfile ? (
                    <button
                      type="button"
                      onClick={() => setShowConnectionsDialog(true)}
                      className="min-h-14 rounded-lg text-center transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`View your ${connectionCount ?? 0} connections`}
                    >
                      <span className="block text-xl font-bold text-primary">{connectionCount ?? '—'}</span>
                      <span className="block text-xs text-muted-foreground">Connections</span>
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">{connectionCount ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">Connections</div>
                    </div>
                  )}
                </div>

                {roleDetails.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                    {roleDetails.map((detail) => (
                      <span key={detail.key} className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs">
                        <span className="font-medium">{detail.label}:</span> {detail.display}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons — centered under the stats banner, Platform first */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={platformHref}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Platform
                    </Link>
                  </Button>
                  {!isOwnProfile && profile.id && (
                    <>
                      <SocialButtons
                        userId={profile.id}
                        userName={profile.full_name || undefined}
                        showAccountabilityPartner={false}
                      />
                    </>
                  )}
                  {isOwnProfile && (
                    <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </Card>

              {/* Journey Modules */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* What Inspires You */}
                {(profile.current_focus || isOwnProfile) && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      What Inspires You?
                    </h3>
                    {profile.current_focus ? (
                      <p className="text-sm text-muted-foreground">{profile.current_focus}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">No inspiration shared yet</p>
                    )}
                  </Card>
                )}

                {/* Startup Links */}
                {(profile.startup_links || isOwnProfile) && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-primary" />
                      Startup Links
                    </h3>
                    {profile.startup_links && Object.keys(profile.startup_links).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.startup_links.pitchDeck && (
                          <a href={profile.startup_links.pitchDeck} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                              <FileText className="h-3 w-3 mr-1" />
                              Pitch Deck
                            </Badge>
                          </a>
                        )}
                        {profile.startup_links.waitlist && (
                          <a href={profile.startup_links.waitlist} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                              <Users2 className="h-3 w-3 mr-1" />
                              Waitlist
                            </Badge>
                          </a>
                        )}
                        {profile.startup_links.demo && (
                          <a href={profile.startup_links.demo} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                              <Rocket className="h-3 w-3 mr-1" />
                              Demo
                            </Badge>
                          </a>
                        )}
                        {profile.startup_links.website && (
                          <a href={profile.startup_links.website} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                              <Globe className="h-3 w-3 mr-1" />
                              Website
                            </Badge>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">No links added</p>
                    )}
                  </Card>
                )}

                {/* Social Links */}
                {(profile.website_url || profile.twitter_url || profile.linkedin_url || profile.github_url || profile.instagram_url || isOwnProfile) && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      Social Links
                    </h3>
                    {(profile.website_url || profile.twitter_url || profile.linkedin_url || profile.github_url || profile.instagram_url) ? (
                      <div className="flex gap-3">
                        {profile.website_url && (
                          <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors hover:scale-110 transform duration-200">
                            <Globe className="h-6 w-6" />
                          </a>
                        )}
                        {profile.linkedin_url && (
                          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors hover:scale-110 transform duration-200">
                            <Linkedin className="h-6 w-6" />
                          </a>
                        )}
                        {profile.twitter_url && (
                          <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors hover:scale-110 transform duration-200">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </a>
                        )}
                        {profile.github_url && (
                          <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors hover:scale-110 transform duration-200">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          </a>
                        )}
                        {profile.instagram_url && (
                          <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors hover:scale-110 transform duration-200">
                            <Instagram className="h-6 w-6" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">No social links added</p>
                    )}
                  </Card>
                )}
              </div>

              {/* Pinned Posts */}
              <PinnedPosts posts={pinnedPosts} isOwnProfile={isOwnProfile} />

              {/* Profile Tabs */}
              <Tabs defaultValue="posts" className="space-y-6">
                <TabsList className="adaptive-tabs grid w-full grid-cols-3">
                  <TabsTrigger value="posts" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Posts
                  </TabsTrigger>
                  <TabsTrigger value="reels" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Reels
                  </TabsTrigger>
                  <TabsTrigger value="startup" className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    Startup
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="space-y-4">
                  <PicturesGallery userId={profile.id} isOwnProfile={isOwnProfile} />
                </TabsContent>

                <TabsContent value="reels" className="space-y-4">
                  <Card className="p-6">
                    <div className="text-center py-12 text-muted-foreground">
                      <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Reels Coming Soon</h3>
                      <p>{isOwnProfile ? 'Share short videos about your startup journey' : 'No reels available yet'}</p>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="startup" className="space-y-4">
                  <Card className="p-6">
                    {profile.startup_description ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">About {profile.startup_name || 'the Startup'}</h3>
                          <p className="text-muted-foreground whitespace-pre-line">{profile.startup_description}</p>
                        </div>
                        {profile.startup_links && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Links</h4>
                            <div className="flex flex-wrap gap-2">
                              {profile.startup_links.pitchDeck && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={profile.startup_links.pitchDeck} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Pitch Deck
                                  </a>
                                </Button>
                              )}
                              {profile.startup_links.waitlist && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={profile.startup_links.waitlist} target="_blank" rel="noopener noreferrer">
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Crunchbase
                                  </a>
                                </Button>
                              )}
                              {profile.startup_links.demo && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={profile.startup_links.demo} target="_blank" rel="noopener noreferrer">
                                    <Globe className="h-4 w-4 mr-2" />
                                    Website
                                  </a>
                                </Button>
                              )}
                              {profile.startup_links.loom && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={profile.startup_links.loom} target="_blank" rel="noopener noreferrer">
                                    <Video className="h-4 w-4 mr-2" />
                                    Loom Presentation
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{isOwnProfile ? 'Add your startup details to showcase your product' : 'No startup information available yet'}</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Edit Profile Modal */}
              {isOwnProfile && profile && (
                <>
                  <ConnectionsDialog
                    open={showConnectionsDialog}
                    onOpenChange={setShowConnectionsDialog}
                  />
                  <EditProfileModal
                    open={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    profile={profile}
                    onSuccess={() => {
                      setShowEditModal(false);
                      window.location.reload();
                    }}
                  />
                </>
              )}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Profile;
