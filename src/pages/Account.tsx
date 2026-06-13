import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, User, Mail, Calendar, Upload, Twitter, Linkedin, Instagram, Facebook, Youtube, Github, Globe, Camera, Users, UserCheck, MessageSquare, ArrowRight, ClipboardList, CheckCircle2, Edit2, X, Lock, Eye, EyeOff } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import { FriendRequestsModal } from "@/components/social/FriendRequestsModal";
import { useSocial } from "@/hooks/useSocial";
import { ProfilePictureCropModal } from "@/components/ProfilePictureCropModal";
import { AccountWallpaper } from "@/components/AccountWallpaper";
import { CreditActivityCard } from "@/components/CreditActivityCard";
import { NotificationPreferencesCard } from "@/components/NotificationPreferencesCard";
import { ProfileCompletionTracker } from "@/components/ProfileCompletionTracker";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { trackActivity } from "@/lib/activity";
import {
  isUsernameAvailable,
  normalizeUsernameInput,
  validateUsername,
} from "@/lib/username";

const Account = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [friendRequestsOpen, setFriendRequestsOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [quizEditMode, setQuizEditMode] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { pendingFriendRequests } = useSocial();
  
  // Profile state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  // Password update state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVerificationCode, setPasswordVerificationCode] = useState("");
  const [passwordStep, setPasswordStep] = useState<"input" | "verify">("input");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordResendCooldown, setPasswordResendCooldown] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Social counts state
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  
  // Social links state
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Quiz responses state
  const [quizData, setQuizData] = useState<{
    isFirstStartup: string | null;
    currentStage: string | null;
    biggestChallenge: string | null;
    launchTimeline: string | null;
    lookingForCofounder: string | null;
    completed: boolean;
    completedAt: string | null;
  }>({
    isFirstStartup: null,
    currentStage: null,
    biggestChallenge: null,
    launchTimeline: null,
    lookingForCofounder: null,
    completed: false,
    completedAt: null,
  });

  // Temporary quiz edit state
  const [tempQuizData, setTempQuizData] = useState({
    isFirstStartup: "",
    currentStage: "",
    biggestChallenge: "",
    launchTimeline: "",
    lookingForCofounder: "",
  });

  // Track initial values for unsaved changes detection
  const [initialValues, setInitialValues] = useState({
    fullName: "",
    username: "",
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
            username: data.username || "",
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
          setUsername(profileData.username);
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

          // Activation now lives in /onboarding plus the first-value journey.
          // Keep Account focused on profile management instead of prematurely completing onboarding.
          setShowOnboarding(false);

          // Set quiz data
          setQuizData({
            isFirstStartup: data.quiz_is_first_startup,
            currentStage: data.quiz_current_stage,
            biggestChallenge: data.quiz_biggest_challenge,
            launchTimeline: data.quiz_launch_timeline,
            lookingForCofounder: data.quiz_looking_for_cofounder,
            completed: data.quiz_completed || false,
            completedAt: data.quiz_completed_at,
          });
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setUsernameStatus("idle");
      return;
    }
    const currentUserId = user.id;

    const normalized = normalizeUsernameInput(username);
    if (!normalized) {
      setUsernameStatus("idle");
      return;
    }

    if (validateUsername(normalized)) {
      setUsernameStatus("invalid");
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const available = await isUsernameAvailable(normalized, currentUserId);
        if (!cancelled) {
          setUsernameStatus(available ? "available" : "taken");
        }
      } catch {
        if (!cancelled) {
          setUsernameStatus("idle");
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [username, user?.id]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return (
      fullName !== initialValues.fullName ||
      username !== initialValues.username ||
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
    if (passwordResendCooldown <= 0) return;

    const timerId = window.setInterval(() => {
      setPasswordResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [passwordResendCooldown]);

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
  }, [fullName, username, bio, avatarUrl, twitterUrl, linkedinUrl, instagramUrl, facebookUrl, youtubeUrl, githubUrl, websiteUrl, initialValues]);

  const resetPasswordVerificationFlow = () => {
    setPasswordStep("input");
    setPasswordVerificationCode("");
    setPasswordResendCooldown(0);
  };

  const handleRestartPasswordVerification = () => {
    resetPasswordVerificationFlow();
    void trackActivity("security:password_change_verification_reset", {}, user?.id);
    toast.info("Verification reset. Request a new code to continue.");
  };

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
    const previousAvatarUrl = avatarUrl;

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

      if (!data?.publicUrl) {
        throw new Error("Unable to generate a public URL for the uploaded image.");
      }

      const nextAvatarUrl = data.publicUrl;
      setAvatarUrl(nextAvatarUrl);

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          avatar_url: nextAvatarUrl,
        },
      });

      if (authError) {
        throw authError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: nextAvatarUrl })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      setInitialValues((prev) => ({ ...prev, avatarUrl: nextAvatarUrl }));
      toast.success("Profile picture updated successfully!");
    } catch (error: any) {
      setAvatarUrl(previousAvatarUrl);
      toast.error("Failed to upload profile picture: " + error.message);
    } finally {
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
        setTempImageUrl("");
      }
      setUploadLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    console.log('Starting profile update...', { userId: user.id, bio });
    setLoading(true);
    try {
      const normalizedUsername = normalizeUsernameInput(username);
      const usernameError = validateUsername(normalizedUsername);
      if (usernameError) {
        throw new Error(usernameError);
      }

      let usernameAvailable = true;
      try {
        usernameAvailable = await isUsernameAvailable(normalizedUsername, user.id);
      } catch (availabilityError) {
        console.warn("Username availability check failed during profile update", availabilityError);
      }
      if (!usernameAvailable) {
        throw new Error("That username is already taken.");
      }

      // Update user metadata
      // Update profiles table first so uniqueness/validation errors fail fast.
      const { data: updateData, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: normalizedUsername,
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

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          username: normalizedUsername,
          avatar_url: avatarUrl,
        }
      });

      if (authError) {
        console.error('Auth update error:', authError);
        throw authError;
      }

      setUsername(normalizedUsername);

      // Update initial values after successful save
      setInitialValues({
        fullName,
        username: normalizedUsername,
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
      const errorMessage = String(error?.message || '').toLowerCase();
      const isUsernameConflict =
        error?.code === '23505' ||
        errorMessage.includes('profiles_username_lower_unique_idx') ||
        (errorMessage.includes('duplicate key value') && errorMessage.includes('username'));

      if (isUsernameConflict) {
        toast.error("That username is already taken. Please choose another one.");
      } else {
        toast.error("Failed to update profile: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("Please sign in to update your password.");
      return;
    }

    if (!newPassword.trim()) {
      toast.error("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (passwordStep === "input") {
      setPasswordLoading(true);
      try {
        const { error } = await supabase.auth.reauthenticate();

        if (error) {
          throw error;
        }

        setPasswordStep("verify");
        setPasswordResendCooldown(45);
        void trackActivity("security:password_change_verification_sent", { source: "account_page_initial" }, user.id);
        toast.success("Verification code sent to your email. Enter it to confirm password change.");
      } catch (error: any) {
        void trackActivity("security:password_change_verification_send_failed", {
          source: "account_page_initial",
          message: error?.message || "unknown_error",
        }, user.id);
        toast.error("Failed to send verification code: " + error.message);
      } finally {
        setPasswordLoading(false);
      }
      return;
    }

    if (!passwordVerificationCode.trim()) {
      toast.error("Please enter the verification code from your email.");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        nonce: passwordVerificationCode.trim(),
      });

      if (error) {
        throw error;
      }

      setNewPassword("");
      setConfirmPassword("");
      resetPasswordVerificationFlow();
      void trackActivity("security:password_change_completed", { source: "account_page" }, user.id);
      toast.success("Password updated successfully.");
    } catch (error: any) {
      void trackActivity("security:password_change_verification_failed", {
        source: "account_page",
        message: error?.message || "unknown_error",
      }, user.id);
      toast.error("Failed to update password: " + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendPasswordVerificationCode = async () => {
    if (!user) {
      toast.error("Please sign in to continue.");
      return;
    }

    if (passwordResendCooldown > 0) {
      toast.info(`Please wait ${passwordResendCooldown}s before requesting another code.`);
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.reauthenticate();

      if (error) {
        throw error;
      }

      setPasswordResendCooldown(45);
      void trackActivity("security:password_change_verification_resent", { source: "account_page" }, user.id);
      toast.success("New verification code sent.");
    } catch (error: any) {
      void trackActivity("security:password_change_verification_resend_failed", {
        source: "account_page",
        message: error?.message || "unknown_error",
      }, user.id);
      toast.error("Failed to resend verification code: " + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const bioCharCount = bio.length;
  const bioMaxLength = 500;

  const handleEditQuiz = () => {
    // Copy current quiz data to temp state for editing
    setTempQuizData({
      isFirstStartup: quizData.isFirstStartup || "",
      currentStage: quizData.currentStage || "",
      biggestChallenge: quizData.biggestChallenge || "",
      launchTimeline: quizData.launchTimeline || "",
      lookingForCofounder: quizData.lookingForCofounder || "",
    });
    setQuizEditMode(true);
  };

  const handleCancelQuizEdit = () => {
    setQuizEditMode(false);
    setTempQuizData({
      isFirstStartup: "",
      currentStage: "",
      biggestChallenge: "",
      launchTimeline: "",
      lookingForCofounder: "",
    });
  };

  const handleSaveQuiz = async () => {
    if (!user) return;

    setQuizSaving(true);
    try {
      // Check if looking for co-founder changed from no to yes
      const cofounderChanged = quizData.lookingForCofounder !== 'yes' && tempQuizData.lookingForCofounder === 'yes';

      const { error } = await supabase
        .from('profiles')
        .update({
          quiz_is_first_startup: tempQuizData.isFirstStartup,
          quiz_current_stage: tempQuizData.currentStage,
          quiz_biggest_challenge: tempQuizData.biggestChallenge,
          quiz_launch_timeline: tempQuizData.launchTimeline,
          quiz_looking_for_cofounder: tempQuizData.lookingForCofounder,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update the main quiz data state
      setQuizData({
        ...quizData,
        isFirstStartup: tempQuizData.isFirstStartup,
        currentStage: tempQuizData.currentStage,
        biggestChallenge: tempQuizData.biggestChallenge,
        launchTimeline: tempQuizData.launchTimeline,
        lookingForCofounder: tempQuizData.lookingForCofounder,
      });

      setQuizEditMode(false);

      // If user changed to looking for co-founder, redirect to create post
      if (cofounderChanged) {
        toast.success("Quiz updated! Let's create your co-founder post...");
        setTimeout(() => {
          window.location.href = '/co-founder/create';
        }, 1500);
      } else {
        toast.success("Quiz responses updated successfully!");
      }
    } catch (error: any) {
      console.error('Error updating quiz responses:', error);
      toast.error("Failed to update quiz responses: " + error.message);
    } finally {
      setQuizSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AccountWallpaper />
        <div className="relative z-10">
          <Navigation />
          <div className="container mx-auto px-6 pt-header-offset">
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
        <div className="container mx-auto px-6 pt-header-offset pb-12">
          {/* Centered Hero Section */}
          <div className="text-center py-12 space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-white via-info to-purple-200 bg-clip-text text-transparent">
                My Profile
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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

            <div id="credit-activity">
              <CreditActivityCard />
            </div>

            <div id="notification-preferences">
              <NotificationPreferencesCard />
            </div>

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
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(normalizeUsernameInput(e.target.value))}
                    placeholder="Choose your username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="username"
                  />
                  <p className="text-xs text-muted-foreground">
                    Public profile URL: <span className="font-medium">/profile/{username || "username"}</span>
                  </p>
                  {usernameStatus === "checking" && (
                    <p className="text-xs text-muted-foreground">Checking username availability...</p>
                  )}
                  {usernameStatus === "available" && (
                    <p className="text-xs text-muted-foreground">Username is available.</p>
                  )}
                  {usernameStatus === "taken" && (
                    <p className="text-xs text-destructive">That username is already taken.</p>
                  )}
                  {usernameStatus === "invalid" && (
                    <p className="text-xs text-destructive">{validateUsername(username)}</p>
                  )}
                  {usernameStatus === "idle" && username && (
                    <p className="text-xs text-muted-foreground">Use lowercase letters, numbers, and underscores.</p>
                  )}
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
                      Project URL
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourstartup.com"
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

          {/* Security */}
          <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>
                Update your password with email verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter a new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {passwordStep === "verify" && (
                  <div className="space-y-2">
                    <Label htmlFor="password-verification-code">Verification Code</Label>
                    <Input
                      id="password-verification-code"
                      type="text"
                      value={passwordVerificationCode}
                      onChange={(e) => setPasswordVerificationCode(e.target.value)}
                      placeholder="Enter the code sent to your email"
                      autoComplete="one-time-code"
                    />
                    <p className="text-xs text-muted-foreground">
                      Check your inbox for the verification code to confirm this password change.
                    </p>
                    {passwordResendCooldown > 0 && (
                      <p className="text-xs text-muted-foreground">
                        You can request a new code in {passwordResendCooldown}s.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
                  <div className="flex w-full sm:w-auto gap-2">
                    {passwordStep === "verify" && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={passwordLoading}
                        onClick={handleRestartPasswordVerification}
                      >
                        Start Over
                      </Button>
                    )}
                    {passwordStep === "verify" && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={passwordLoading || passwordResendCooldown > 0}
                        onClick={handleResendPasswordVerificationCode}
                      >
                        {passwordResendCooldown > 0 ? `Resend in ${passwordResendCooldown}s` : "Resend Code"}
                      </Button>
                    )}
                    <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto">
                      {passwordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {passwordStep === "input" ? "Sending Code..." : "Updating..."}
                        </>
                      ) : (
                        passwordStep === "input" ? "Send Verification Code" : "Verify & Update Password"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

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
                  <MessageSquare className="h-4 w-4" />
                  {postsCount} Posts
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                  <Users className="h-4 w-4" />
                  {followersCount} Followers
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
                  <UserCheck className="h-4 w-4" />
                  {followingCount} Following
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
                <Label className="text-sm font-medium text-muted-foreground">Profile URL</Label>
                <p className="text-sm mt-1">
                  {username ? `/profile/${username}` : "Not set"}
                </p>
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

          {/* Onboarding Quiz Responses */}
          {quizData.completed && (
            <Card className="backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Onboarding Quiz Responses
                    </CardTitle>
                    <CardDescription>
                      Your answers from the setup quiz
                    </CardDescription>
                  </div>
                  {!quizEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditQuiz}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {quizData.completedAt && !quizEditMode && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Completed on {new Date(quizData.completedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                )}

                {!quizEditMode ? (
                  // View mode
                  <div className="grid gap-4">
                    {quizData.isFirstStartup && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <Label className="text-sm font-medium text-muted-foreground">Is this your first startup?</Label>
                        <p className="text-sm mt-1 font-medium">
                          {quizData.isFirstStartup === 'yes' ? 'Yes, this is my first one' : 'No, I\'ve built before'}
                        </p>
                      </div>
                    )}

                    {quizData.currentStage && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <Label className="text-sm font-medium text-muted-foreground">Current Stage</Label>
                        <p className="text-sm mt-1 font-medium">
                          {quizData.currentStage === 'idea' && 'Just an idea'}
                          {quizData.currentStage === 'building-mvp' && 'Building an MVP'}
                          {quizData.currentStage === 'mvp-ready' && 'MVP is ready'}
                          {quizData.currentStage === 'early-users' && 'Already have early users'}
                          {quizData.currentStage === 'funded' && 'Funded / Revenue generating'}
                        </p>
                      </div>
                    )}

                    {quizData.biggestChallenge && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <Label className="text-sm font-medium text-muted-foreground">Biggest Challenge</Label>
                        <p className="text-sm mt-1 font-medium">
                          {quizData.biggestChallenge === 'idea-to-product' && 'Turning an idea into a real product'}
                          {quizData.biggestChallenge === 'users-validation' && 'Finding users or validation'}
                          {quizData.biggestChallenge === 'focus-accountability' && 'Staying focused and accountable'}
                          {quizData.biggestChallenge === 'find-team' && 'Find the right people (team)'}
                          {quizData.biggestChallenge === 'not-sure' && 'Not sure yet'}
                        </p>
                      </div>
                    )}

                    {quizData.launchTimeline && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <Label className="text-sm font-medium text-muted-foreground">Launch Timeline</Label>
                        <p className="text-sm mt-1 font-medium">
                          {quizData.launchTimeline === '30-days' && 'Within 30 days'}
                          {quizData.launchTimeline === '60-days' && 'Within 60 days'}
                          {quizData.launchTimeline === '90-plus-days' && 'Within 90+ days'}
                          {quizData.launchTimeline === 'not-sure' && 'Not sure yet'}
                        </p>
                      </div>
                    )}

                    {quizData.lookingForCofounder && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <Label className="text-sm font-medium text-muted-foreground">Looking for a Co-Founder?</Label>
                        <p className="text-sm mt-1 font-medium">
                          {quizData.lookingForCofounder === 'yes' ? 'Yes' : 'No'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Edit mode
                  <div className="space-y-6">
                    {/* First Startup Question */}
                    <div className="space-y-3">
                      <Label>Is this your first startup?</Label>
                      <RadioGroup value={tempQuizData.isFirstStartup} onValueChange={(value) => setTempQuizData({...tempQuizData, isFirstStartup: value})}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="first-yes" />
                          <Label htmlFor="first-yes" className="cursor-pointer">Yes, this is my first one</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="first-no" />
                          <Label htmlFor="first-no" className="cursor-pointer">No, I've built before</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Current Stage */}
                    <div className="space-y-3">
                      <Label>Current Stage</Label>
                      <RadioGroup value={tempQuizData.currentStage} onValueChange={(value) => setTempQuizData({...tempQuizData, currentStage: value})}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="idea" id="stage-idea" />
                          <Label htmlFor="stage-idea" className="cursor-pointer">Just an idea</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="building-mvp" id="stage-building" />
                          <Label htmlFor="stage-building" className="cursor-pointer">Building an MVP</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mvp-ready" id="stage-ready" />
                          <Label htmlFor="stage-ready" className="cursor-pointer">MVP is ready</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="early-users" id="stage-users" />
                          <Label htmlFor="stage-users" className="cursor-pointer">Already have early users</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="funded" id="stage-funded" />
                          <Label htmlFor="stage-funded" className="cursor-pointer">Funded / Revenue generating</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Biggest Challenge */}
                    <div className="space-y-3">
                      <Label>Biggest Challenge</Label>
                      <RadioGroup value={tempQuizData.biggestChallenge} onValueChange={(value) => setTempQuizData({...tempQuizData, biggestChallenge: value})}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="idea-to-product" id="challenge-idea" />
                          <Label htmlFor="challenge-idea" className="cursor-pointer">Turning an idea into a real product</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="users-validation" id="challenge-users" />
                          <Label htmlFor="challenge-users" className="cursor-pointer">Finding users or validation</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="focus-accountability" id="challenge-focus" />
                          <Label htmlFor="challenge-focus" className="cursor-pointer">Staying focused and accountable</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="find-team" id="challenge-team" />
                          <Label htmlFor="challenge-team" className="cursor-pointer">Find the right people (team)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="not-sure" id="challenge-unsure" />
                          <Label htmlFor="challenge-unsure" className="cursor-pointer">Not sure yet</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Launch Timeline */}
                    <div className="space-y-3">
                      <Label>Launch Timeline</Label>
                      <RadioGroup value={tempQuizData.launchTimeline} onValueChange={(value) => setTempQuizData({...tempQuizData, launchTimeline: value})}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="30-days" id="timeline-30" />
                          <Label htmlFor="timeline-30" className="cursor-pointer">Within 30 days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="60-days" id="timeline-60" />
                          <Label htmlFor="timeline-60" className="cursor-pointer">Within 60 days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="90-plus-days" id="timeline-90" />
                          <Label htmlFor="timeline-90" className="cursor-pointer">Within 90+ days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="not-sure" id="timeline-unsure" />
                          <Label htmlFor="timeline-unsure" className="cursor-pointer">Not sure yet</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Looking for Co-Founder */}
                    <div className="space-y-3">
                      <Label>Looking for a Co-Founder?</Label>
                      <RadioGroup value={tempQuizData.lookingForCofounder} onValueChange={(value) => setTempQuizData({...tempQuizData, lookingForCofounder: value})}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="cofounder-yes" />
                          <Label htmlFor="cofounder-yes" className="cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="cofounder-no" />
                          <Label htmlFor="cofounder-no" className="cursor-pointer">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={handleSaveQuiz}
                        disabled={quizSaving}
                        className="flex-1"
                      >
                        {quizSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelQuizEdit}
                        disabled={quizSaving}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
