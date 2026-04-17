import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, Sparkles, Shield, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AuthWallpaper from "@/components/wallpapers/AuthWallpaper";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafely } from "@/integrations/supabase/auth";
import { trackActivity } from "@/lib/activity";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import MobileFormOptimizer from "@/components/MobileFormOptimizer";
import { mapSignUpError } from "@/lib/authErrors";
import { MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_ERROR } from "@/lib/passwordPolicy";
import { captureEvent } from "@/lib/analytics";
import {
  isUsernameAvailable,
  normalizeUsernameInput,
  validateUsername,
} from "@/lib/username";
import {
  appendReturnParam,
  buildOnboardingPath,
  isIcpUnlockPath,
  persistOnboardingReturn,
  sanitizeReturnPath,
} from "@/lib/authRedirect";
import {
  appendCheckoutIntentParam,
  consumeCheckoutIntent,
  persistCheckoutIntent,
  sanitizeCheckoutIntent,
  redirectToCheckoutIntent,
} from "@/lib/checkoutRedirect";

const Signup = () => {
  const defaultPostSignupPath = '/community/angels?preview=rookie-welcome';
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });

  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { trackSignupStarted, trackSignupCompleted } = useConversionTracking();

  // Get conversion source from URL
  const [conversionSource] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const safeReturn = sanitizeReturnPath(
      params.get('return') || params.get('redirect'),
      defaultPostSignupPath,
    );

    return {
      source: params.get('source') || 'direct',
      returnUrl: safeReturn,
    };
  });

  const checkoutIntent = sanitizeCheckoutIntent(
    new URLSearchParams(window.location.search).get('checkout'),
  );

  const loginHref = (() => {
    const basePath = conversionSource.source !== 'direct'
      ? `/login?source=${encodeURIComponent(conversionSource.source)}`
      : '/login';
    return appendCheckoutIntentParam(
      appendReturnParam(basePath, conversionSource.returnUrl),
      checkoutIntent,
    );
  })();

  useEffect(() => {
    if (!checkoutIntent) return;
    persistCheckoutIntent(checkoutIntent);
  }, [checkoutIntent]);

  // Redirect authenticated users to the correct post-signup destination
  useEffect(() => {
    if (!user) return;

    const redirectAuthenticatedUser = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, quiz_completed')
          .eq('id', user.id)
          .maybeSingle();

        const pendingCheckoutIntent = consumeCheckoutIntent();
        if (pendingCheckoutIntent) {
          redirectToCheckoutIntent(pendingCheckoutIntent, user);
          return;
        }

        const targetAfterAuth = sanitizeReturnPath(conversionSource.returnUrl, '/dashboard');

        // New users should complete onboarding first, then return to intent.
        if (profile?.onboarding_completed !== true && !isIcpUnlockPath(targetAfterAuth)) {
          persistOnboardingReturn(targetAfterAuth);
          navigate(buildOnboardingPath(targetAfterAuth), { replace: true });
          return;
        }

        if (profile?.onboarding_completed === true && profile?.quiz_completed !== true) {
          navigate('/setup-quiz', { replace: true });
          return;
        }

        const savedProgress = localStorage.getItem('bizmap_progress');
        if (savedProgress && targetAfterAuth.includes('dream2plan')) {
          navigate(targetAfterAuth, { replace: true });
          return;
        }

        navigate(targetAfterAuth, { replace: true });
      } catch (error) {
        console.error('Error resolving signup redirect:', error);
        navigate(buildOnboardingPath(conversionSource.returnUrl), { replace: true });
      }
    };

    redirectAuthenticatedUser();
  }, [user, navigate, conversionSource.returnUrl]);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const normalized = normalizeUsernameInput(formData.username);
    if (!normalized) {
      setUsernameStatus("idle");
      return;
    }

    if (validateUsername(normalized)) {
      setUsernameStatus("idle");
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const available = await isUsernameAvailable(normalized);
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
  }, [formData.username]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === "username" ? normalizeUsernameInput(value) : value;
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));

    // Clear errors when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Form validation
  const validateForm = async () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: ""
    };

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      newErrors.username = usernameError;
    } else {
      try {
        const available = await isUsernameAvailable(formData.username);
        if (!available) {
          newErrors.username = "That username is already taken";
        }
      } catch (availabilityError) {
        console.warn("Username availability check failed during signup validation", availabilityError);
      }
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = PASSWORD_LENGTH_ERROR;
    }

    setErrors(newErrors);
    return !newErrors.firstName && !newErrors.lastName && !newErrors.username && !newErrors.email && !newErrors.password;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!await validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Get trigger type from conversion source
      const triggerType = conversionSource.source !== 'direct' ? conversionSource.source : 'signup-page';

      // Track sign-up started
      // FIX(retention): signup — emit canonical signup events so the onboarding funnel can be reconciled against PostHog and admin diagnostics.
      captureEvent('signup_started', {
        triggerType,
        source: conversionSource.source,
        returnUrl: conversionSource.returnUrl,
      });
      trackSignupStarted(triggerType);

      const fullName = [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" ");
      persistOnboardingReturn(conversionSource.returnUrl);
      if (checkoutIntent) {
        persistCheckoutIntent(checkoutIntent);
      }

      const { error } = await signUp(
        formData.email,
        formData.password,
        fullName,
        undefined,
        normalizeUsernameInput(formData.username),
      );

      if (error) {
        console.error('Signup error:', error);
        toast.error(mapSignUpError(error));
      } else {
        let session = await getSessionSafely();

        // Ensure users are signed in immediately after signup.
        if (!session) {
          const { error: autoSignInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (autoSignInError) {
            console.error('Auto sign-in after signup failed:', autoSignInError);
            toast.error("Account created, but automatic sign in failed. Please sign in manually.");
            navigate('/login');
            return;
          }

          session = await getSessionSafely();
        }

        if (!session) {
          toast.error("Account created, but session initialization is delayed. Please sign in.");
          navigate('/login');
          return;
        }

        // Track conversion completion
        captureEvent('signup_completed', {
          triggerType,
          source: conversionSource.source,
          returnUrl: conversionSource.returnUrl,
        });
        trackSignupCompleted(triggerType);

        try {
          await trackActivity('user:signup', { source: conversionSource.source });
        } catch (activityError) {
          console.warn('Signup activity tracking failed', activityError);
        }

        toast.success("Account created successfully! Redirecting...");

        setTimeout(() => {
          navigate(buildOnboardingPath(conversionSource.returnUrl), { replace: true });
        }, 300);
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Unexpected signup error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.";

      // Check if it's a database/profile error
      if (errorMessage.includes('database') || errorMessage.includes('profile') || errorMessage.includes('saving')) {
        toast.error("There was an issue creating your profile. Your account may have been created - please try signing in.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Google OAuth signup
  const handleGoogleSignup = async () => {
    try {
      // Preserve post-auth intent and complete onboarding before final return.
      localStorage.setItem('oauth_return_url', conversionSource.returnUrl);
      localStorage.setItem('oauth_source', conversionSource.source);
      persistOnboardingReturn(conversionSource.returnUrl);

      // Also save BizMap progress if it exists
      const savedProgress = localStorage.getItem('bizmap_progress');
      if (savedProgress) {
        localStorage.setItem('oauth_bizmap_progress', savedProgress);
      }

      toast("Redirecting to Google...");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      });

      if (error) {
        console.error("OAuth error:", error);
        toast.error(`Google sign-up error: ${error.message}`);
        return;
      }

      // If we get here without error, the redirect should have happened
      try {
        await trackActivity('user:signup_oauth', { provider: 'google' });
      } catch (activityError) {
        console.warn('OAuth signup activity tracking failed', activityError);
      }

    } catch (err) {
      console.error("Caught error:", err);
      toast.error(`Google sign-up failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Create your Creatives Takeover account to start transforming creative ideas into actionable plans with AI-powered insights." />
      </Helmet>

      {/* Modern Animated Wallpaper */}
      <AuthWallpaper />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 text-2xl font-bold gradient-text hover:opacity-80 transition-opacity">
            <img
              src="/lovable-uploads/04a4b9d0-4213-4186-ba00-c7acd22bad98.png"
              alt="Creatives Takeover Logo"
              className="w-8 h-8"
            />
            Creatives Takeover
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Join us</h1>
          <p className="text-muted-foreground">
            Start turning your creative ideas into reality
          </p>
        </div>

        {/* Signup Form */}
        <MobileFormOptimizer>
          <Card className="glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="space-y-1 pb-4">
              <h2 className="text-xl font-semibold text-center">Create your account</h2>
              <p className="text-sm text-muted-foreground text-center">Get started with your free account today</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} autoComplete="on" className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="First name"
                        className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                        disabled={isLoading}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-sm text-red-500 animate-fade-in">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last name"
                      className={`h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                      disabled={isLoading}
                      autoComplete="family-name"
                      required
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-500 animate-fade-in">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Choose your username"
                      className={`h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                      disabled={isLoading}
                      autoComplete="username"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                  </div>
                  {!errors.username && formData.username && (
                    <p className={`text-xs ${usernameStatus === "taken" ? "text-red-500" : "text-muted-foreground"}`}>
                      {usernameStatus === "checking" && "Checking username availability..."}
                      {usernameStatus === "available" && "Username is available"}
                      {usernameStatus === "taken" && "That username is already taken"}
                      {usernameStatus === "idle" && "Use lowercase letters, numbers, and underscores"}
                    </p>
                  )}
                  {errors.username && (
                    <p className="text-sm text-red-500 animate-fade-in">{errors.username}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your public profile will be at <span className="font-medium">/profile/{formData.username || "username"}</span>
                  </p>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                        }`}
                      disabled={isLoading}
                      autoComplete="email"
                      autoCapitalize="off"
                      autoCorrect="off"
                      inputMode="email"
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 animate-fade-in">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a password"
                      className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                        }`}
                      disabled={isLoading}
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {!errors.password && formData.password.length > 0 && (
                    <p className="text-xs text-muted-foreground">Use at least {MIN_PASSWORD_LENGTH} characters</p>
                  )}
                  {errors.password && (
                    <p className="text-sm text-red-500 animate-fade-in">{errors.password}</p>
                  )}
                </div>

                {/* Sign Up Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 mt-6 group"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--blue-primary)), hsl(var(--blue-dark)))',
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      OR
                    </span>
                  </div>
                </div>

                {/* Social Login Buttons - Enhanced */}
                <div className="grid grid-cols-1 gap-3">
                  <div
                    className="relative p-[2px] rounded-md"
                    style={{
                      background: 'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), #EAB308, hsl(var(--green-primary)))'
                    }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      onClick={handleGoogleSignup}
                      className="h-12 w-full font-medium relative bg-background hover:bg-muted/50 transition-all duration-200 border-0"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="hsl(var(--blue-primary))" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="hsl(var(--red-primary))" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#EAB308" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="hsl(var(--green-primary))" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span
                        className="bg-clip-text text-transparent font-medium"
                        style={{
                          backgroundImage: 'linear-gradient(90deg, hsl(var(--blue-primary)), hsl(var(--red-primary)), #EAB308, hsl(var(--green-primary)))'
                        }}
                      >
                        Continue with Google
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Hype Text */}
                <div className="text-center mt-4 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Join <span className="font-semibold text-foreground">1,247 entrepreneurs</span> building their businesses.
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span
                      className="relative w-2 h-2 rounded-full bg-green-500"
                      style={{
                        animation: 'flicker 1.5s ease-in-out infinite',
                        boxShadow: '0 0 6px rgba(34, 197, 94, 0.8), 0 0 12px rgba(34, 197, 94, 0.5)'
                      }}
                    >
                      <style>{`
                      @keyframes flicker {
                        0%, 100% {
                          opacity: 1;
                          transform: scale(1);
                          box-shadow: 0 0 6px rgba(34, 197, 94, 0.8), 0 0 12px rgba(34, 197, 94, 0.5);
                        }
                        50% {
                          opacity: 0.4;
                          transform: scale(0.8);
                          box-shadow: 0 0 4px rgba(34, 197, 94, 0.4), 0 0 8px rgba(34, 197, 94, 0.2);
                        }
                      }
                    `}</style>
                    </span>
                    <span className="font-semibold text-foreground">2 people</span> signed up in the last hour.
                  </p>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-2 pb-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary/70" />
                  <span>Secure authentication powered by Supabase</span>
                </div>

                {/* Terms */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    By creating an account, you agree to our{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy-policy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </MobileFormOptimizer>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={loginHref}
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
