import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, User, Mail, Calendar, Upload, Twitter, Linkedin, Instagram, Facebook, Youtube, Github, Globe, Camera, Users, UserCheck, MessageSquare, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import { FriendRequestsModal } from "@/components/social/FriendRequestsModal";
import { useSocial } from "@/hooks/useSocial";
import { ProfilePictureCropModal } from "@/components/ProfilePictureCropModal";
import { AccountWallpaper } from "@/components/AccountWallpaper";
import { ProfileCompletionTracker } from "@/components/ProfileCompletionTracker";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

const Account = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [friendRequestsOpen, setFriendRequestsOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { pendingFriendRequests } = useSocial();
  
  // Profile state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Social counts state
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  
  // Social links state
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Track initial values for unsaved changes detection
  const [initialValues, setInitialValues] = useState({
    fullName: "",
    bio: "",
    avatarUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    githubUrl: "",
    websiteUrl: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          return;
        }
        
        if (data) {
          const profileData = {
            fullName: data.full_name || "",
            bio: data.bio || "",
            avatarUrl: data.avatar_url || "",
            twitterUrl: data.twitter_url || "",
            linkedinUrl: data.linkedin_url || "",
            instagramUrl: data.instagram_url || "",
            facebookUrl: data.facebook_url || "",
            youtubeUrl: data.youtube_url || "",
            githubUrl: data.github_url || "",
            websiteUrl: data.website_url || "",
          };

          setFullName(profileData.fullName);
          setAvatarUrl(profileData.avatarUrl);
          setBio(profileData.bio);
          setTwitterUrl(profileData.twitterUrl);
          setLinkedinUrl(profileData.linkedinUrl);
          setInstagramUrl(profileData.instagramUrl);
          setFacebookUrl(profileData.facebookUrl);
          setYoutubeUrl(profileData.youtubeUrl);
          setGithubUrl(profileData.githubUrl);
          setWebsiteUrl(profileData.websiteUrl);
          setInitialValues(profileData);

          // Set social counts
          setFollowersCount(data.followers_count || 0);
          setFollowingCount(data.following_count || 0);
          setFriendsCount(data.friends_count || 0);

          // Check if user should see onboarding checklist
          setShowOnboarding(data.onboarding_completed === false);
        }
        
        // Fetch posts count
        const { count, error: postsError } = await supabase
          .from('community_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (!postsError && count !== null) {
          setPostsCount(count);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user]);

  // Real-time listener for profile updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            setFollowersCount(newData.followers_count || 0);
            setFollowingCount(newData.following_count || 0);
            setFriendsCount(newData.friends_count || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return (
      fullName !== initialValues.fullName ||
      bio !== initialValues.bio ||
      avatarUrl !== initialValues.avatarUrl ||
      twitterUrl !== initialValues.twitterUrl ||
      linkedinUrl !== initialValues.linkedinUrl ||
      instagramUrl !== initialValues.instagramUrl ||
      facebookUrl !== initialValues.facebookUrl ||
      youtubeUrl !== initialValues.youtubeUrl ||
      githubUrl !== initialValues.githubUrl ||
      websiteUrl !== initialValues.websiteUrl
    );
  };

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fullName, bio, avatarUrl, twitterUrl, linkedinUrl, instagramUrl, facebookUrl, youtubeUrl, githubUrl, websiteUrl, initialValues]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Create a temporary URL for the crop modal
    const tempUrl = URL.createObjectURL(file);
    setTempImageUrl(tempUrl);
    setCropModalOpen(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    setUploadLoading(true);
    setCropModalOpen(false);

    try {
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(data.publicUrl);
      toast.success("Profile picture updated successfully!");
      
      // Clean up temp URL
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
        setTempImageUrl("");
      }
    } catch (error: any) {
      toast.error("Failed to upload profile picture: " + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    console.log('Starting profile update...', { userId: user.id, bio });
    setLoading(true);
    try {
      // Update user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
        }
      });

      if (authError) {
        console.error('Auth update error:', authError);
        throw authError;
      }

      // Update profiles table
      const { data: updateData, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
          bio: bio,
          twitter_url: twitterUrl,
          linkedin_url: linkedinUrl,
          instagram_url: instagramUrl,
          facebook_url: facebookUrl,
          youtube_url: youtubeUrl,
          github_url: githubUrl,
          website_url: websiteUrl,
        })
        .eq('id', user.id)
        .select();

      console.log('Profile update result:', { updateData, profileError });

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Update initial values after successful save
      setInitialValues({
        fullName,
        bio,
        avatarUrl,
        twitterUrl,
        linkedinUrl,
        instagramUrl,
        facebookUrl,
        youtubeUrl,
        githubUrl,
        websiteUrl,
      });

      toast.success("Profile updated successfully!");
      console.log('Profile updated successfully!');

      // Redirect to setup quiz if this is from onboarding
      if (showOnboarding) {
        setTimeout(() => {
          window.location.href = '/setup-quiz';
        }, 1000);
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error("Failed to update profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const bioCharCount = bio.length;
  const bioMaxLength = 500;

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AccountWallpaper />
        <div className="relative z-10">
          <Navigation />
          <div className="container mx-auto px-6 pt-24">
            <Card className="max-w-md mx-auto backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Please log in to access your account settings.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AccountWallpaper />
      <div className="relative z-10">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          {/* Centered Hero Section */}
          <div className="text-center py-12 space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                My Profile
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Manage your account information and preferences.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Onboarding Checklist (for first-time users) */}
            {showOnboarding && user && (
              <OnboardingChecklist
                userId={user.id}
                fullName={fullName}
                bio={bio}
                avatarUrl={avatarUrl}
                socialLinks={{
                  twitter: twitterUrl,
                  linkedin: linkedinUrl,
                  instagram: instagramUrl,
                  facebook: facebookUrl,
                  youtube: youtubeUrl,
                  github: githubUrl,
                  website: websiteUrl,
                }}
              />
            )}

            {/* Profile Completion Tracker (for all users) */}
            {!showOnboarding && (
              <ProfileCompletionTracker
                fullName={fullName}
                bio={bio}
                avatarUrl={avatarUrl}
                socialLinks={{
                  twitter: twitterUrl,
                  linkedin: linkedinUrl,
                  instagram: instagramUrl,
                  facebook: facebookUrl,
                  youtube: youtubeUrl,
                  github: githubUrl,
                  website: websiteUrl,
                }}
              />
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-8">
            {/* Profile Picture Section */}
            <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Upload your profile picture (PNG or JPEG)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarUrl} alt="Profile picture" />
                    <AvatarFallback className="text-xl">
                      {fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                       user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLoading}
                    >
                      {uploadLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported: PNG, JPEG (Max 5MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and bio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="bio">Bio</Label>
                    <span className={`text-sm ${bioCharCount > bioMaxLength ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {bioCharCount}/{bioMaxLength}
                    </span>
                  </div>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="min-h-[100px]"
                    maxLength={bioMaxLength}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Media Links */}
            <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Social Media & Links
                </CardTitle>
                <CardDescription>
                  Add your social media profiles and website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="flex items-center gap-2">
                      <Twitter className="w-4 h-4" />
                      Twitter
                    </Label>
                    <Input
                      id="twitter"
                      type="url"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin"
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </Label>
                    <Input
                      id="instagram"
                      type="url"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="flex items-center gap-2">
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </Label>
                    <Input
                      id="facebook"
                      type="url"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="youtube" className="flex items-center gap-2">
                      <Youtube className="w-4 h-4" />
                      YouTube
                    </Label>
                    <Input
                      id="youtube"
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/@username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="github" className="flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      GitHub
                    </Label>
                    <Input
                      id="github"
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Website
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardContent className="pt-6">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {showOnboarding ? 'Saving...' : 'Updating Profile...'}
                    </>
                  ) : showOnboarding ? (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>

          {/* Social Stats & Friend Requests */}
          <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Social & Connections
              </CardTitle>
              <CardDescription>
                Your social statistics and manage friend requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-6">
                <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                  <Users className="h-4 w-4" />
                  {followersCount} Followers
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                  <UserCheck className="h-4 w-4" />
                  {followingCount} Following
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                  <MessageSquare className="h-4 w-4" />
                  {friendsCount} Friends
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                  <MessageSquare className="h-4 w-4" />
                  {postsCount} Posts
                </Badge>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => setFriendRequestsOpen(true)}
                className="relative"
              >
                Friend Requests
                {pendingFriendRequests.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {pendingFriendRequests.length > 9 ? '9+' : pendingFriendRequests.length}
                  </Badge>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                View your account details and registration information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                <p className="text-sm mt-1">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Account Created</Label>
                <p className="text-sm mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Sign In</Label>
                <p className="text-sm mt-1">
                  {user.last_sign_in_at ? 
                    new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 
                    'Never'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
        <FriendRequestsModal 
          open={friendRequestsOpen} 
          onOpenChange={setFriendRequestsOpen} 
        />
        <ProfilePictureCropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            if (tempImageUrl) {
              URL.revokeObjectURL(tempImageUrl);
              setTempImageUrl("");
            }
          }}
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
        />
        <Footer />
      </div>
    </div>
  );
};

export default Account;