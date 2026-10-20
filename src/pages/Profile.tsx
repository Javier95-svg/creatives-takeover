import { Helmet } from "react-helmet-async";
import SEO, { createBreadcrumbSchema, createPersonSchema, createWebPageSchema } from "@/components/SEO";
import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProfileWallpaper from "@/components/wallpapers/ProfileWallpaper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Settings, Briefcase, MapPin, MessageCircle, Rocket, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SocialButtons } from "@/components/social/SocialButtons";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ProfilePosts } from "@/components/profile/ProfilePosts";
import { ConnectionsDialog } from "@/components/profile/ConnectionsDialog";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { describeRoleProfile } from '@/lib/roleProfileSchema';
import { isUserType } from '@/lib/accountTypes';
import { getPublicStageLabel } from "@/lib/accountabilityPreferences";
import { founderStageLabel } from "@/lib/bizmapStageOrder";
import { captureEvent } from "@/lib/analytics";
import { currentFocusLabel } from "@/lib/currentFocus";
import { ProfileShareButton } from "@/components/profile/ProfileShareButton";
import { ProfileLinks } from "@/components/profile/ProfileLinks";
import { PublicProgressCard } from "@/components/profile/PublicProgressCard";
import { ProfileSupportSection } from "@/components/profile/ProfileSupportSection";
import { FounderIdHeader } from "@/components/profile/FounderIdHeader";
import { isFounderIdAccount } from "@/lib/founderId";

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

// The founder's story, public since 20261020090000_public_profile_story_fields.
// The same migration made assigned_stage null unless the founder made their
// stage public, so a visitor may only see the stage when this projection loads.
// Before it runs, assigned_stage is the raw quiz placement and stays hidden.
const STORY_PUBLIC_PROFILE_SELECT = [
  PUBLIC_PROFILE_SELECT,
  'founder_role',
  'startup_description',
  'current_focus',
  'startup_links',
].join(', ');

// LIKE treats _ and % as wildcards, and usernames contain underscores.
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (character) => `\\${character}`);

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
  founder_role?: string | null;
  startup_description?: string | null;
  current_focus?: string | null;
  startup_links?: unknown;
}

const asStartupLinks = (value: unknown): Profile['startup_links'] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const links: NonNullable<Profile['startup_links']> = {};
  for (const key of ['pitchDeck', 'waitlist', 'demo', 'website', 'github', 'loom'] as const) {
    const url = (value as Record<string, unknown>)[key];
    if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) links[key] = url.trim();
  }
  return Object.keys(links).length ? links : null;
};

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

const mapPublicProfile = (profile: PublicProfileRow, stageIsGated: boolean): Profile => ({
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
  assigned_stage: stageIsGated ? profile.assigned_stage ?? null : null,
  user_type: profile.user_type ?? null,
  role_profile: profile.role_profile ?? null,
  role: null,
  updated_at: null,
  user_preferences: null,
  founder_role: profile.founder_role ?? null,
  location: profile.location,
  positioning_line: profile.positioning_line,
  last_active_at: null,
  startup_name: profile.startup_name,
  startup_tagline: profile.startup_tagline,
  startup_logo_url: null,
  startup_stage: profile.startup_stage,
  startup_industry: profile.startup_industry,
  startup_description: profile.startup_description ?? null,
  current_focus: profile.current_focus ?? null,
  looking_for: null,
  startup_links: asStartupLinks(profile.startup_links),
  traction_visible: false,
  traction_metrics: null,
  seo_indexable: profile.seo_indexable === true,
  search_indexing_requested: null,
  search_indexing_review_status: null,
});

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [loadedProfile, setProfile] = useState<Profile | null>(null);
  // Exactly what the public projection returns, kept so the owner can preview
  // their page as a signed-out visitor sees it.
  const [publicProfile, setPublicProfile] = useState<Profile | null>(null);
  const [previewAsVisitor, setPreviewAsVisitor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConnectionsDialog, setShowConnectionsDialog] = useState(false);
  const viewerIsOwner = Boolean(currentUser?.id) && currentUser?.id === loadedProfile?.id;
  const previewing = viewerIsOwner && previewAsVisitor && publicProfile !== null;
  const profile = previewing ? publicProfile : loadedProfile;
  const isOwnProfile = viewerIsOwner && !previewing;
  const profileId = profile?.id;

  // A visitor's copy of assigned_stage is null unless the founder made it
  // public, so its presence is the opt-in. The owner always sees their own.
  const showPublicStage = profile ? isOwnProfile || profile.assigned_stage !== null : false;
  // The quiz placement first. business_stage and startup_stage are free text and
  // hold ten unvalidated values in production, so they are only a fallback for
  // profiles that predate the quiz, and only where the text names a real stage.
  const publicStageLabel = profile
    ? founderStageLabel(profile.assigned_stage) ?? getPublicStageLabel(profile.business_stage, profile.startup_stage)
    : null;
  const primaryIndustry = profile?.startup_industry?.find((industry) => industry.trim().length > 0) ?? null;
  // Founder and builder profiles are Founder IDs, with progress, support and a
  // short link. Mentors, providers and investors keep a plain profile.
  const isFounderId = isFounderIdAccount(profile?.user_type);
  const profileNoun = isFounderId ? 'Founder ID' : 'Profile';
  const currentFocus = currentFocusLabel(profile?.current_focus);

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
        setPublicProfile(null);

        let stageIsGated = false;
        const queryPublicProfile = async (value: string, caseInsensitive = false) => {
          const run = (select: string) => {
            const query = supabase.from('public_profiles').select(select);
            return caseInsensitive
              ? query.ilike('username', escapeLikePattern(value)).maybeSingle()
              : query.eq('username', value).maybeSingle();
          };

          const story = await run(STORY_PUBLIC_PROFILE_SELECT);
          if (!story.error) {
            stageIsGated = true;
            return story;
          }

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
        const { data: profileData, error: profileError } = await queryPublicProfile(username);

        if (profileError) {
          throw profileError;
        }

        let publicProfileData = profileData as PublicProfileRow | null;

        if (!publicProfileData) {
          // A link typed with different capitals still reaches the account. It
          // never falls back to a name search: a shared link must not open
          // somebody else's profile.
          const { data: fallbackData, error: fallbackError } = await queryPublicProfile(username, true);

          if (fallbackError) {
            throw fallbackError;
          }

          if (!fallbackData) {
            toast.error(`Profile "${username}" not found`);
            setLoading(false);
            return;
          }
          publicProfileData = fallbackData as PublicProfileRow;
        }

        if (!publicProfileData?.id) {
          console.error('No profile found for username:', username);
          toast.error('Profile not found');
          setLoading(false);
          return;
        }

        const visitorView = mapPublicProfile(publicProfileData, stageIsGated);
        let finalProfileData = visitorView;

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
              startup_links: asStartupLinks((ownProfileData as { startup_links?: unknown }).startup_links),
            };
          }
        }
        
        setPublicProfile(visitorView);
        setPreviewAsVisitor(false);
        setProfile(finalProfileData);


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

  // One view per profile load. The referrer's domain shows where shared links
  // bring people from; the username itself never leaves the page.
  const viewedProfileRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profileId || viewedProfileRef.current === profileId) return;
    viewedProfileRef.current = profileId;
    let referrerDomain: string | null = null;
    try {
      referrerDomain = document.referrer ? new URL(document.referrer).hostname : null;
    } catch {
      referrerDomain = null;
    }
    captureEvent('profile_viewed', {
      is_owner: isOwnProfile,
      signed_in: Boolean(currentUser),
      referrer_domain: referrerDomain,
    });
  }, [profileId, isOwnProfile, currentUser]);

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

  const startVisitorPreview = () => {
    setPreviewAsVisitor(true);
    captureEvent('profile_visitor_preview_opened', { founder_id: isFounderId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        title={`${profile.full_name || profile.username || 'Founder'} | ${profileNoun}`}
        description={
          profile.positioning_line
            ? `${profile.full_name || 'Founder'} — ${profile.positioning_line}`
            : (profile.bio || `View ${profile.full_name || 'this founder'}'s public founder profile on Creatives Takeover.`)
        }
        url={`/profile/${profile.username}`}
        image={profile.username ? `https://creatives-takeover.com/og/profile/${encodeURIComponent(profile.username)}?v=4` : "/og-founders-compass-2026-09.png"}
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
            name: `${profile.full_name || profile.username || 'Founder'} — ${profileNoun}`,
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
              {previewing && (
                <div className="mb-4 flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
                  <div className="flex items-start gap-2.5">
                    <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">You are viewing your {profileNoun} as a visitor</p>
                      <p className="text-xs text-muted-foreground">This is what people who open your link see when they are not signed in. Private details and your editing tools are hidden.</p>
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0" onClick={() => setPreviewAsVisitor(false)}>
                    Back to my {profileNoun}
                  </Button>
                </div>
              )}

              {/* Founder-First Profile Hero */}
              <Card className="p-6 mb-6">
                {isFounderId && profile.username && (
                  <FounderIdHeader
                    username={profile.username}
                    name={profile.full_name || profile.username}
                    startupName={profile.startup_name}
                    isOwnProfile={isOwnProfile}
                  />
                )}
                <div className="grid gap-5 md:grid-cols-2 md:gap-6 mb-6">
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
                        <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {profile.location}
                        </p>
                      )}
                      {profile.positioning_line && (
                        <p className="mb-2 text-sm italic text-muted-foreground">
                          "{profile.positioning_line}"
                        </p>
                      )}
                      {/* Follow and Message CTAs */}
                      {!isOwnProfile && !previewing && profile.id && (
                        <div className="mt-4">
                          <SocialButtons
                            userId={profile.id}
                            userName={profile.full_name || undefined}
                            profileActionsOnly
                            showAccountabilityPartner={false}
                          />
                        </div>
                      )}
                      {previewing && (
                        <div className="mt-4 flex flex-wrap gap-2" aria-label="Visitor profile actions">
                          <Button type="button" variant="outline" disabled className="bg-card/50 border-border/50">
                            <UserPlus className="h-4 w-4" />
                            <span className="ml-2">Connect</span>
                          </Button>
                          <Button type="button" variant="outline" disabled className="bg-card/50 border-border/50">
                            <MessageCircle className="h-4 w-4" />
                            <span className="ml-2">Message</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Startup Info */}
                  <div className="border-t border-border pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
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
                              <p className="text-sm text-muted-foreground">
                                {profile.startup_tagline}
                              </p>
                            )}
                          </div>
                        </div>
                        {profile.startup_description && (
                          <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                            {profile.startup_description}
                          </p>
                        )}
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
                <div className="mb-4 grid grid-cols-4 gap-2 rounded-lg bg-muted/30 px-2 py-4 sm:gap-4">
                  <div className="grid min-w-0 grid-rows-2 text-center">
                    <div className="flex min-h-8 items-end justify-center truncate px-1 pb-2 text-base font-semibold text-primary">
                      {profile.user_type === 'builder' ? 'Builder' : 'Founder'}
                    </div>
                    <div className="flex min-h-8 items-start justify-center pt-2 text-sm text-muted-foreground">Role</div>
                  </div>
                  <div className="grid min-w-0 grid-rows-2 text-center">
                    <div className="flex min-h-8 items-end justify-center truncate px-1 pb-2 text-base font-semibold text-primary">
                      {showPublicStage ? (publicStageLabel || 'N/A') : isOwnProfile ? (publicStageLabel || 'Not set') : 'Private'}
                    </div>
                    <div className="flex min-h-8 items-start justify-center pt-2 text-sm text-muted-foreground">Stage</div>
                  </div>
                  <div className="grid min-w-0 grid-rows-2 text-center">
                    <div
                      className="flex min-h-8 items-end justify-center truncate px-1 pb-2 text-base font-semibold text-primary"
                      title={profile.startup_industry?.join(', ') || undefined}
                    >
                      {primaryIndustry || (isOwnProfile ? 'Not set' : 'N/A')}
                    </div>
                    <div className="flex min-h-8 items-start justify-center pt-2 text-sm text-muted-foreground">Industry</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConnectionsDialog(true)}
                    className="grid min-w-0 grid-rows-2 rounded-lg text-center transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${profile.full_name || profile.username || 'this profile'}'s ${connectionCount ?? 0} connections`}
                  >
                    <span className="flex min-h-8 items-end justify-center pb-2 text-base font-semibold text-primary">{connectionCount ?? '—'}</span>
                    <span className="flex min-h-8 items-start justify-center pt-2 text-sm text-muted-foreground">Connections</span>
                  </button>
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

                {/* Startup and social links, inside the hero rather than two extra cards */}
                <ProfileLinks
                  startupLinks={profile.startup_links}
                  social={{
                    website: profile.website_url,
                    linkedin: profile.linkedin_url,
                    twitter: profile.twitter_url,
                    github: profile.github_url,
                    instagram: profile.instagram_url,
                  }}
                />

                {/* Profile actions */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {!isFounderId && !isOwnProfile && !previewing && profile.id && (
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
                      Edit {profileNoun}
                    </Button>
                  )}
                  {isOwnProfile && publicProfile && (
                    <Button variant="outline" size="sm" onClick={startVisitorPreview}>
                      <Eye className="h-4 w-4 mr-2" />
                      View as visitor
                    </Button>
                  )}
                  {profile.username && !isFounderId && (
                    <ProfileShareButton
                      username={profile.username}
                      name={profile.full_name || profile.username}
                      startupName={profile.startup_name}
                      isOwnProfile={isOwnProfile}
                      founderId={isFounderId}
                    />
                  )}
                </div>
              </Card>

              {profile.username && isFounderId && (
                <PublicProgressCard
                  username={profile.username}
                  name={profile.full_name || profile.username}
                  isOwnProfile={isOwnProfile}
                />
              )}

              {profile.username && isFounderId && (
                <ProfileSupportSection
                  username={profile.username}
                  name={profile.full_name || profile.username}
                  startupName={profile.startup_name}
                  productUrl={profile.startup_links?.demo || profile.startup_links?.website || null}
                  currentFocus={currentFocus}
                  isOwnProfile={isOwnProfile}
                  preview={previewing}
                  onEditProfile={() => setShowEditModal(true)}
                />
              )}

              <ProfilePosts
                key={`${profile.id}-${isOwnProfile}`}
                userId={profile.id}
                name={profile.full_name || profile.username || 'Founder'}
                avatarUrl={profile.avatar_url}
                isOwnProfile={isOwnProfile}
              />

              {profile && (
                <ConnectionsDialog
                  open={showConnectionsDialog}
                  onOpenChange={setShowConnectionsDialog}
                  username={profile.username}
                  profileName={profile.full_name || profile.username || 'This founder'}
                  canManage={isOwnProfile}
                />
              )}

              {/* Edit Profile Modal */}
              {isOwnProfile && profile && (
                <>
                  <EditProfileModal
                    open={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    profile={profile}
                    onSuccess={(savedUsername) => {
                      setShowEditModal(false);
                      // Reloading the old URL after a rename shows "Profile Not Found".
                      if (savedUsername && savedUsername !== username) {
                        window.location.assign(`/profile/${encodeURIComponent(savedUsername)}`);
                      } else {
                        window.location.reload();
                      }
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
