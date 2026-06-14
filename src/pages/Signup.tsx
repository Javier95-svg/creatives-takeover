import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, Sparkles, Shield, User, Loader2 } from "lucide-react";
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
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { mapSignUpError } from "@/lib/authErrors";
import { MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_ERROR } from "@/lib/passwordPolicy";
import { captureEvent, persistAuthMethod, persistSignupIntent, trackSignupCompletedAttributed } from "@/lib/analytics";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import {
  isUsernameAvailable,
  normalizeUsernameInput,
  validateUsername,
} from "@/lib/username";
import {
  appendReturnParam,
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
import {
  clearPendingReferralCode,
  getPendingReferralCode,
  persistPendingReferralCode,
  setOAuthAuthIntent,
} from "@/lib/referral";
import { getSocialAuthSignupMethod, startSocialOAuth, type SocialAuthProviderId } from "@/lib/socialAuth";

const signupHeroSlides = [
  {
    src: "/auth/solofounder.webp",
    alt: "Solo founder working on a laptop in a warm workspace",
  },
  {
    src: "/auth/solopreneur-female.webp",
    alt: "Female solopreneur working on a laptop in a bright studio",
  },
];

const Signup = () => {
  // New accounts go to the onboarding quiz first; the dashboard's guided
  // redirect catches anyone who arrives with an explicit return=/dashboard.
  const defaultPostSignupPath = '/onboarding';
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });
  const [activeSignupHeroSlide, setActiveSignupHeroSlide] = useState(0);
  const [signupHeroTimerReset, setSignupHeroTimerReset] = useState(0);

  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { trackSignupStarted, trackSignupCompleted } = useConversionTracking();
  const { get: getAttribution, clear: clearAttribution } = useCTAAttribution();
  const formSubmitted = useRef(false);
  const [lastFocused, setLastFocused] = useState<string | null>(null);
  const [fieldsInteracted, setFieldsInteracted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSignupHeroSlide((currentSlide) => (currentSlide + 1) % signupHeroSlides.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [signupHeroTimerReset]);

  // Fire abandonment event when user leaves without submitting
  useEffect(() => {
    return () => {
      if (fieldsInteracted.size > 0 && !formSubmitted.current) {
        captureEvent('signup_form_abandoned', {
          last_field: lastFocused,
          fields_touched: Array.from(fieldsInteracted),
          fields_count: fieldsInteracted.size,
        });
      }
    };
   
  }, [lastFocused, fieldsInteracted]);

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
        const pendingCheckoutIntent = consumeCheckoutIntent();
        if (pendingCheckoutIntent) {
          redirectToCheckoutIntent(pendingCheckoutIntent, user);
          return;
        }

        const targetAfterAuth = sanitizeReturnPath(conversionSource.returnUrl, '/dashboard');

        const savedProgress = localStorage.getItem('bizmap_progress');
        if (savedProgress && targetAfterAuth.includes('dream2plan')) {
          navigate(targetAfterAuth, { replace: true });
          return;
        }

        navigate(targetAfterAuth, { replace: true });
      } catch (error) {
        console.error('Error resolving signup redirect:', error);
        const fallbackDestination = sanitizeReturnPath(conversionSource.returnUrl, '/dashboard');
        navigate(fallbackDestination, { replace: true });
      }
    };

    void redirectAuthenticatedUser();
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
      void trackSignupStarted(triggerType);
      // Mark this as a fresh email signup so AuthContext fires `signup_completed`
      // to PostHog once the resulting SIGNED_IN event is handled.
      persistSignupIntent('email');

      const fullName = [formData.firstName.trim(), formData.lastName.trim()].filter(Boolean).join(" ");
      const pendingReferralCode = getPendingReferralCode();
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
        pendingReferralCode,
      );

      if (error) {
        console.error('Signup error:', error);
        toast.error(mapSignUpError(error));
      } else {
        clearPendingReferralCode();
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
        void trackSignupCompleted(triggerType);
        formSubmitted.current = true;

        const attr = getAttribution();
        trackSignupCompletedAttributed({
          method: 'email',
          entry_cta: attr?.ctaId ?? 'direct',
          entry_page: attr?.page ?? 'unknown',
          minutes_from_cta: attr ? Math.round((Date.now() - attr.clickedAt) / 60000) : null,
        });
        clearAttribution();

        try {
          await trackActivity('user:signup', { source: conversionSource.source });
        } catch (activityError) {
          console.warn('Signup activity tracking failed', activityError);
        }

        toast.success("Account created successfully! Redirecting...");

        setIsRedirecting(true);

        setTimeout(() => {
          const pendingCheckoutIntent = consumeCheckoutIntent();
          if (pendingCheckoutIntent) {
            redirectToCheckoutIntent(pendingCheckoutIntent, session.user);
            return;
          }

          if (checkoutIntent) {
            return;
          }

          const destination = sanitizeReturnPath(conversionSource.returnUrl, '/dashboard');
          navigate(destination, { replace: true });
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

  const handleSocialSignup = async (provider: SocialAuthProviderId) => {
    const signupMethod = getSocialAuthSignupMethod(provider);

    await startSocialOAuth({
      provider,
      intent: 'signup',
      beforeRedirect: () => {
        if (signupMethod === 'google' || signupMethod === 'linkedin') {
          persistAuthMethod(signupMethod);
        }

        // Mark this as a fresh OAuth signup so AuthContext fires `signup_completed`
        // to PostHog after the OAuth round-trip resolves to SIGNED_IN.
        if (signupMethod === 'google' || signupMethod === 'linkedin' || signupMethod === 'github') {
          persistSignupIntent(signupMethod);
        }

        localStorage.setItem('oauth_return_url', conversionSource.returnUrl);
        localStorage.setItem('oauth_source', conversionSource.source);
        localStorage.setItem('oauth_signup_method', signupMethod);
        setOAuthAuthIntent('signup');

        const pendingReferralCode = getPendingReferralCode();
        if (pendingReferralCode) {
          persistPendingReferralCode(pendingReferralCode);
        }

        persistOnboardingReturn(conversionSource.returnUrl);

        const savedProgress = localStorage.getItem('bizmap_progress');
        if (savedProgress) {
          localStorage.setItem('oauth_bizmap_progress', savedProgress);
        }
      },
      onInitiated: async () => {
        try {
          await trackActivity('user:signup_oauth', { provider: signupMethod });
        } catch (activityError) {
          console.warn('OAuth signup activity tracking failed', activityError);
        }
      },
    });
  };

  const handleGoogleSignup = () => handleSocialSignup('google');
  const handleLinkedInSignup = () => handleSocialSignup('linkedin_oidc');
  const handleXSignup = () => handleSocialSignup('x');

  return (
    <>
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Setting up your account…</p>
        </div>
      )}
    <div className="signup-premium min-h-screen bg-background md:h-screen md:overflow-hidden">
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Create your Creatives Takeover account to start transforming creative ideas into actionable plans with AI-powered insights." />
      </Helmet>

      <aside className="signup-premium-left-panel relative flex h-[44vmax] flex-col overflow-hidden bg-[#080c14] px-6 py-6 text-white md:fixed md:left-0 md:top-0 md:h-screen md:w-1/2 md:px-10 md:py-8 lg:px-14">
        <div
          aria-hidden
          className="signup-premium-left-ambient absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 14%, hsl(var(--blue-primary) / 0.16), transparent 34%), radial-gradient(circle at 82% 84%, hsl(var(--green-primary) / 0.10), transparent 36%)",
          }}
        />

        <Link
          to="/"
          className="signup-premium-left-logo relative z-20 inline-flex w-fit items-center gap-3 text-base font-bold tracking-tight text-white transition-opacity hover:opacity-85"
        >
          <img
            src="/auth/creatives-takeover-polished-borders.webp"
            alt="Creatives Takeover Logo"
            className="h-12 w-12 object-contain md:h-14 md:w-14"
          />
        </Link>

        <div className="relative z-10 mt-7 max-w-xl md:mt-8">
          <style>{`
            @keyframes signupTitleFlicker {
              0%, 100% {
                opacity: 1;
                text-shadow: 0 0 0 rgba(255, 255, 255, 0);
              }
              45% {
                opacity: 0.9;
                text-shadow: 0 0 14px rgba(255, 255, 255, 0.26);
              }
              48% {
                opacity: 0.58;
                text-shadow: 0 0 6px rgba(255, 255, 255, 0.16);
              }
              51% {
                opacity: 1;
                text-shadow: 0 0 18px rgba(255, 255, 255, 0.32);
              }
              54% {
                opacity: 0.76;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
              }
              58% {
                opacity: 1;
                text-shadow: 0 0 0 rgba(255, 255, 255, 0);
              }
            }
          `}</style>
          <h1
            className="signup-premium-left-title text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl"
            style={{ animation: "signupTitleFlicker 3.8s ease-in-out infinite" }}
          >
            Build what only you can build.
          </h1>
        </div>

        <div className="relative z-10 mt-6 flex min-h-0 flex-1 items-center justify-center md:mt-8">
          <div className="signup-premium-carousel-shell flex h-full w-full max-w-[560px] flex-col items-center justify-center gap-2">
            <div className="signup-premium-carousel-frame flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl">
              <div
                className="flex h-full w-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${activeSignupHeroSlide * 100}%)` }}
              >
                {signupHeroSlides.map((slide) => (
                  <div key={slide.src} className="flex h-full min-w-full items-center justify-center">
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      className="signup-premium-carousel-image h-auto max-h-full w-full rounded-2xl object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="signup-premium-carousel-dots flex items-center justify-center gap-2">
              {signupHeroSlides.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  aria-label={`Show signup image ${index + 1}`}
                  aria-current={activeSignupHeroSlide === index}
                  onClick={() => {
                    setActiveSignupHeroSlide(index);
                    setSignupHeroTimerReset((resetKey) => resetKey + 1);
                  }}
                  className={`signup-premium-carousel-dot h-2.5 w-2.5 rounded-full border border-white transition-all duration-300 ${
                    activeSignupHeroSlide === index
                      ? "bg-white opacity-100"
                      : "bg-transparent opacity-45 hover:opacity-80"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="signup-premium-right-panel md:ml-[50vw] md:h-screen md:overflow-y-scroll">
        <div className="signup-premium-right-surface relative flex min-h-screen items-center justify-center overflow-hidden p-4">
          <AuthWallpaper />

          <div className="relative z-10 w-full">
            <div className="signup-premium-form-shell mx-auto w-full max-w-md">
            {/* Header */}
            <div className="signup-premium-header text-center mb-8">
              <Link to="/" className="signup-premium-brand inline-flex items-center gap-3 text-2xl font-bold gradient-text hover:opacity-80 transition-opacity">
                <img
                  src="/lovable-uploads/04a4b9d0-4213-4186-ba00-c7acd22bad98.png"
                  alt="Creatives Takeover Logo"
                  className="w-8 h-8"
                />
                Creatives Takeover
              </Link>
              <h1 className="signup-premium-right-title text-3xl font-bold mt-4 mb-2">Join Today</h1>
            </div>

            {/* Signup Form */}
            <MobileFormOptimizer>
              <Card className="signup-premium-card glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <CardHeader className="signup-premium-card-header space-y-1 pb-4">
                  <h2 className="signup-premium-card-title text-xl font-semibold text-center">Create your account</h2>
                  <p className="text-sm text-muted-foreground text-center">Rookie plan available for free</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} autoComplete="on" className="signup-premium-form space-y-5">
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
                        className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.firstName ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                        disabled={isLoading}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-sm text-destructive animate-fade-in">{errors.firstName}</p>
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
                      className={`h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.lastName ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                      disabled={isLoading}
                      autoComplete="family-name"
                      required
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive animate-fade-in">{errors.lastName}</p>
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
                      className={`h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.username ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                      disabled={isLoading}
                      autoComplete="username"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                  </div>
                  {!errors.username && formData.username && (
                    <p className={`text-xs ${usernameStatus === "taken" ? "text-destructive" : "text-muted-foreground"}`}>
                      {usernameStatus === "checking" && "Checking username availability..."}
                      {usernameStatus === "available" && "Username is available"}
                      {usernameStatus === "taken" && "That username is already taken"}
                      {usernameStatus === "idle" && "Use lowercase letters, numbers, and underscores"}
                    </p>
                  )}
                  {errors.username && (
                    <p className="text-sm text-destructive animate-fade-in">{errors.username}</p>
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
                      onBlur={() => { setLastFocused('email'); setFieldsInteracted(prev => new Set(prev).add('email')); }}
                      placeholder="Enter your email"
                      className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.email ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
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
                    <p className="text-sm text-destructive animate-fade-in">{errors.email}</p>
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
                      onBlur={() => { setLastFocused('password'); setFieldsInteracted(prev => new Set(prev).add('password')); }}
                      placeholder="Create a password"
                      className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.password ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''
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
                    <p className="text-sm text-destructive animate-fade-in">{errors.password}</p>
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
                <AuthSocialButtons
                  variant="signupPremium"
                  disabled={isLoading}
                  onGoogleContinue={handleGoogleSignup}
                  onLinkedInContinue={handleLinkedInSignup}
                  onXContinue={handleXSignup}
                />

                {/* Hype Text */}
                <div className="text-center mt-4 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Join <span className="font-semibold text-foreground">1,247 entrepreneurs</span> building their businesses.
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none relative w-2 h-2 rounded-full bg-success"
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
        </div>
      </main>
    </div>
    </>
  );
};

export default Signup;
