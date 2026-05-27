import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProfileWallpaper from "@/components/wallpapers/ProfileWallpaper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Linkedin, Instagram, Globe, Settings, MapPin, Briefcase, Rocket, Users2, ExternalLink, FileText, Zap, TrendingUp, Image, Video, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SocialButtons } from "@/components/social/SocialButtons";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { PinnedPosts } from "@/components/profile/PinnedPosts";
import { PicturesGallery } from "@/components/profile/PicturesGallery";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { createIdempotencyKey } from "@/lib/idempotency";
import { getPublicStageLabel, shouldShowPublicStage } from "@/lib/accountabilityPreferences";
import {
  buildDiscoveryCallRedirectUrl,
  createDiscoveryCallIntent,
  openDeferredExternalTab,
  storePendingDiscoveryCallRedirect,
} from "@/services/discoveryCallService";

// Fallback booking link for Samuel Starkman
const SAMUEL_STARKMAN_BOOKING_URL = 'https://calendly.com/samstarkman/1-on-1-with-sam?month=2025-12';

const PUBLIC_PROFILE_SELECT = [
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

interface DiscoveryCallMentorConfig {
  id: string;
  name: string;
  calendly_url: string | null;
  is_active: boolean | null;
}

// Helper function to check if profile belongs to Samuel Starkman
const isSamuelStarkmanProfile = (profile: Profile | null): boolean => {
  if (!profile) return false;
  const fullName = profile.full_name?.toLowerCase() || '';
  const username = profile.username?.toLowerCase() || '';
  // Check if full name contains both "samuel" and "starkman"
  // Or if username contains either "samuel" or "starkman"
  return (fullName.includes('samuel') && fullName.includes('starkman')) || 
         username.includes('samuel') || username.includes('starkman');
};

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pictureCount, setPictureCount] = useState(0);
  const isOwnProfile = currentUser?.id === profile?.id;
  const profileId = profile?.id;

  const { openUpgradePrompt } = useUpgradePrompt();

  const showPublicStage = profile ? shouldShowPublicStage(profile.user_preferences, isOwnProfile) : false;
  const publicStageLabel = profile ? getPublicStageLabel(profile.business_stage, profile.startup_stage) : null;

  const resolveDiscoveryCallMentor = async (): Promise<DiscoveryCallMentorConfig | null> => {
    if (!profile) {
      return null;
    }

    const mentorQuery = supabase
      .from('mentors')
      .select('id, name, calendly_url, is_active')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const { data: directMentor, error } = await mentorQuery;
    let data = directMentor;

    if (error) {
      throw error;
    }

    if (!data && isSamuelStarkmanProfile(profile)) {
      const fallback = await supabase
        .from('mentors')
        .select('id, name, calendly_url, is_active')
        .ilike('name', '%samuel%starkman%')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (fallback.error) {
        throw fallback.error;
      }

      data = fallback.data;
    }

    return (data as DiscoveryCallMentorConfig | null) ?? null;
  };

  const handleBookDiscoveryCall = async () => {
    try {
      const mentor = await resolveDiscoveryCallMentor();
      const bookingUrl = mentor?.calendly_url?.trim() || SAMUEL_STARKMAN_BOOKING_URL;

      if (!mentor?.id || !mentor.is_active || !bookingUrl) {
        toast.error('This mentor does not have a discovery call booking link configured yet.');
        return;
      }

      const normalizedBookingUrl = /^https?:\/\//i.test(bookingUrl) ? bookingUrl : `https://${bookingUrl}`;

      if (!currentUser) {
        storePendingDiscoveryCallRedirect({
          url: bookingUrl,
          mentorId: mentor.id,
          mentorName: mentor.name,
          source: 'profile_page',
        });
        navigate(`/login?return=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      const bookingTab = openDeferredExternalTab();
      if (!bookingTab) {
        toast.error('Popup blocked. Please allow popups and try again.');
        return;
      }

      const bookingIntent = await createDiscoveryCallIntent({
        mentorId: mentor.id,
        mentorName: mentor.name,
        source: 'profile_page',
        idempotencyKey: createIdempotencyKey(`profile-discovery-call-${mentor.id}`),
        metadata: {
          mentor_id: mentor.id,
          mentor_name: mentor.name,
          profile_id: profile.id,
          profile_username: profile.username,
        },
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
    } catch (error) {
      logError('profile_discovery_call_booking_failed', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Unable to process booking. Please try again.');
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;

      try {
        setLoading(true);

        // Public profile pages read from a safe projection. Full profile rows
        // are only loaded when the viewed profile belongs to the signed-in user.
        const { data: profileData, error: profileError } = await supabase
          .from('public_profiles')
          .select(PUBLIC_PROFILE_SELECT)
          .eq('username', username)
          .maybeSingle();

        let publicProfileData = profileData as PublicProfileRow | null;
        
        if (profileError || !publicProfileData) {
          if (profileError) {
            console.error('Profile lookup error:', profileError);
          }
          console.error('Looking for username:', username);
          console.error('Error code:', profileError?.code);
          console.error('Error message:', profileError?.message);
          
          // Try to find if there's a similar username (case-insensitive fallback)
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('public_profiles')
            .select(PUBLIC_PROFILE_SELECT)
            .ilike('username', username)
            .maybeSingle();
          
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
              const { data: nameFallbackData } = await supabase
                .from('public_profiles')
                .select(PUBLIC_PROFILE_SELECT)
                .ilike('full_name', `%${baseUsername}%`)
                .maybeSingle();
              
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

        // Load user's posts (handle errors gracefully)
        try {
          const { data: postsData, error: postsError } = await supabase
            .from('community_posts')
            .select('*')
            .eq('user_id', finalProfileData.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (postsError) {
            console.error('Error loading posts:', postsError);
            setPosts([]); // Set empty array on error
          } else {
            setPosts(postsData || []);
          }
        } catch (postsErr) {
          console.error('Error loading posts:', postsErr);
          setPosts([]); // Set empty array on error
        }

        // Load pinned posts (handle errors gracefully)
        try {
          const { data: pinnedData, error: pinnedError } = await supabase
            .from('community_posts')
            .select('*')
            .eq('user_id', finalProfileData.id)
            .eq('is_pinned', true)
            .order('created_at', { ascending: false })
            .limit(4);

          if (pinnedError) {
            logError('Error loading pinned posts', pinnedError);
            setPinnedPosts([]); // Set empty array on error
          } else {
            setPinnedPosts(pinnedData || []);
          }
        } catch (pinnedErr) {
          console.error('Error loading pinned posts:', pinnedErr);
          setPinnedPosts([]); // Set empty array on error
        }

        // Load picture count (handle errors gracefully)
        try {
          const { count, error: photoCountError } = await supabase
            .from('user_photos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', finalProfileData.id);

          if (photoCountError) {
            console.error('Error loading picture count:', photoCountError);
            setPictureCount(0);
          } else {
            setPictureCount(count || 0);
          }
        } catch (photoCountErr) {
          console.error('Error loading picture count:', photoCountErr);
          setPictureCount(0);
        }

      } catch (error) {
        logError('Error loading profile', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
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
      supabase.removeChannel(channel);
    };
  }, [profileId]);

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
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content={`View ${profile.full_name || 'user'}'s profile and posts`} />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <ProfileWallpaper />
        <div className="relative z-10">
          <Navigation />
          <main className="container mx-auto px-4 pt-24 pb-8">
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
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{profile.followers_count}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {!isOwnProfile && profile.id && (
                    <>
                      {isSamuelStarkmanProfile(profile) && (
                        <Button
                          size="sm"
                          onClick={handleBookDiscoveryCall}
                          className="hover:shadow-md transition-all"
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Book Discovery Call
                        </Button>
                      )}
                      {isSamuelStarkmanProfile(profile) && (
                        <p className="basis-full text-xs text-muted-foreground">
                          Discovery Calls cost 10 credits only after the booking is confirmed.
                        </p>
                      )}
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
                <EditProfileModal
                  open={showEditModal}
                  onClose={() => setShowEditModal(false)}
                  profile={profile}
                  onSuccess={() => {
                    setShowEditModal(false);
                    window.location.reload();
                  }}
                />
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
