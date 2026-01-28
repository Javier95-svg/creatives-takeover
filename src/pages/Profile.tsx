import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProfileWallpaper from "@/components/wallpapers/ProfileWallpaper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, MessageCircle, Twitter, Linkedin, Instagram, Globe, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SocialButtons } from "@/components/social/SocialButtons";
import { ContentGrid } from "@/components/profile/ContentGrid";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { PinnedPosts } from "@/components/profile/PinnedPosts";
import { PicturesGallery } from "@/components/profile/PicturesGallery";
import { useProfileData } from "@/hooks/useProfileData";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import DOMPurify from "dompurify";

// Calendly link for Samuel Starkman
const SAMUEL_STARKMAN_CALENDLY_URL = 'https://calendly.com/samstarkman/1-on-1-with-sam?month=2025-12';

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
  created_at: string;
  followers_count: number;
  following_count: number;
  friends_count: number;
  creative_niche: string | null;
  business_stage: string | null;
  role: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  tags: string[];
  upvotes: number;
  comment_count: number;
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
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const isOwnProfile = currentUser?.id === profile?.id;
  
  const { stats, loading: statsLoading } = useProfileData(profile?.id || '');

  const formatLabel = (value: string) =>
    value
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const handleBookDiscoveryCall = () => {
    window.open(SAMUEL_STARKMAN_CALENDLY_URL, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;

      try {
        setLoading(true);

        // Load profile by username
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        let finalProfileData = profileData;
        
        if (profileError) {
          console.error('Profile lookup error:', profileError);
          console.error('Looking for username:', username);
          console.error('Error code:', profileError.code);
          console.error('Error message:', profileError.message);
          
          // Try to find if there's a similar username (case-insensitive fallback)
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', username)
            .maybeSingle();
          
          if (fallbackData) {
            console.log('Found profile with case-insensitive match:', fallbackData.id);
            finalProfileData = fallbackData;
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
                .from('profiles')
                .select('*')
                .ilike('full_name', `%${baseUsername}%`)
                .maybeSingle();
              
              if (nameFallbackData) {
                console.log('Found profile by name pattern match:', nameFallbackData.id);
                finalProfileData = nameFallbackData;
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
        
        if (!finalProfileData) {
          console.error('No profile found for username:', username);
          toast.error('Profile not found');
          setLoading(false);
          return;
        }
        
        setProfile(finalProfileData as Profile);

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

      } catch (error) {
        logError('Error loading profile', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  // Real-time listener for profile updates
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
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
  }, [profile?.id]);

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
                  <Link to="/community">Back to Community</Link>
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
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link to="/community" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Community
                </Link>
              </Button>

              {/* Profile Header */}
              <Card className="p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div>
                        <h1 className="text-2xl font-bold mb-1">
                          {profile.full_name || 'Anonymous User'}
                        </h1>
                        <p className="text-sm text-muted-foreground mb-3">
                          @{profile.username || username}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {profile.role && (
                            <Badge variant="default" className="capitalize bg-blue-600 text-white border-blue-600">
                              {profile.role === 'founders' ? 'Founder' :
                               profile.role === 'investors' ? 'Investor' :
                               profile.role === 'accelerators' ? 'Accelerator' : profile.role}
                            </Badge>
                          )}
                          {profile.creative_niche && (
                            <Badge className="bg-green-600 text-white border-green-600">
                              {formatLabel(profile.creative_niche)}
                            </Badge>
                          )}
                          {profile.business_stage && (
                            <Badge className="bg-red-600 text-white border-red-600">
                              {formatLabel(profile.business_stage)}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {isOwnProfile ? (
                          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        ) : profile.id && (
                          <>
                            {/* Book Discovery Call button for Samuel Starkman */}
                            {isSamuelStarkmanProfile(profile) && (
                              <Button 
                                size="sm" 
                                onClick={handleBookDiscoveryCall}
                                className="hover:shadow-md transition-all duration-200"
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Book Discovery Call
                              </Button>
                            )}
                            <SocialButtons 
                              userId={profile.id} 
                              userName={profile.full_name || undefined}
                              showAccountabilityPartner={true}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {(profile.bio_html || profile.bio) && (() => {
                      const bioContent = profile.bio_html || profile.bio || '';
                      const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(bioContent);

                      if (hasHtmlTags) {
                        return (
                          <div 
                            className="text-muted-foreground mb-4 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: DOMPurify.sanitize(bioContent, {
                                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span', 'div'],
                                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel']
                              })
                            }}
                          />
                        );
                      }

                      return (
                        <p className="text-muted-foreground mb-4 whitespace-pre-line">
                          {bioContent}
                        </p>
                      );
                    })()}

                    {/* Social Media Links */}
                    {(profile.website_url || profile.twitter_url || profile.linkedin_url || profile.instagram_url) && (
                      <div className="flex gap-3 mb-4">
                        {profile.website_url && (
                          <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Globe className="h-5 w-5" />
                          </a>
                        )}
                        {profile.twitter_url && (
                          <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Twitter className="h-5 w-5" />
                          </a>
                        )}
                        {profile.linkedin_url && (
                          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Linkedin className="h-5 w-5" />
                          </a>
                        )}
                        {profile.instagram_url && (
                          <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Instagram className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    )}

                    <Separator className="my-4" />

                    {/* Stats */}
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats.totalPosts}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{profile.followers_count}</div>
                        <div className="text-xs text-muted-foreground">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{profile.following_count}</div>
                        <div className="text-xs text-muted-foreground">Following</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Pinned Posts */}
              <PinnedPosts posts={pinnedPosts} isOwnProfile={isOwnProfile} />

              {/* Tabbed Content */}
              <Tabs defaultValue="posts" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="posts">Content</TabsTrigger>
                  <TabsTrigger value="pictures">Pictures</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      All Content
                    </h2>
                  </div>
                  <ContentGrid 
                    items={posts.map(p => ({ ...p, content_type: 'post' }))} 
                    isOwnProfile={isOwnProfile}
                    onEdit={(id) => console.log('Edit', id)}
                    onDelete={(id) => console.log('Delete', id)}
                  />
                </TabsContent>

                <TabsContent value="pictures" className="space-y-4">
                  <PicturesGallery userId={profile.id} isOwnProfile={isOwnProfile} />
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  {statsLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-32 bg-muted rounded-lg" />
                      <div className="h-32 bg-muted rounded-lg" />
                    </div>
                  ) : (
                    <ProfileStats stats={{...stats, joinDate: profile.created_at}} />
                  )}
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
