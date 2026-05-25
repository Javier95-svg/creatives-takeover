import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, Shield } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AuthWallpaper from "@/components/wallpapers/AuthWallpaper";
import MobileFormOptimizer from "@/components/MobileFormOptimizer";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { mapSignInError } from "@/lib/authErrors";
import { appendReturnParam, persistOnboardingReturn, sanitizeReturnPath } from "@/lib/authRedirect";
import {
  appendCheckoutIntentParam,
  consumeCheckoutIntent,
  persistCheckoutIntent,
  redirectToCheckoutIntent,
  sanitizeCheckoutIntent,
} from "@/lib/checkoutRedirect";
import { setOAuthAuthIntent } from "@/lib/referral";
import { startSocialOAuth, type SocialAuthProviderId } from "@/lib/socialAuth";

const loginHeroSlides = [
  {
    src: "/auth/solofounder.webp",
    alt: "Solo founder working on a laptop in a warm workspace",
  },
  {
    src: "/auth/solopreneur-female.webp",
    alt: "Female solopreneur working on a laptop in a bright studio",
  },
];

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: ""
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [resendEmailLoading, setResendEmailLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeLoginHeroSlide, setActiveLoginHeroSlide] = useState(0);
  const [loginHeroTimerReset, setLoginHeroTimerReset] = useState(0);
  
  const { signIn, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const source = query.get("source") || "direct";
  const returnUrl = sanitizeReturnPath(query.get("return") || query.get("redirect"), "/dashboard");
  const checkoutIntent = sanitizeCheckoutIntent(query.get("checkout"));
  const signupHref = appendCheckoutIntentParam(
    appendReturnParam(
      source !== 'direct' ? `/signup?source=${encodeURIComponent(source)}` : "/signup",
      returnUrl
    ),
    checkoutIntent,
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveLoginHeroSlide((currentSlide) => (currentSlide + 1) % loginHeroSlides.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [loginHeroTimerReset]);

  useEffect(() => {
    if (!checkoutIntent) return;
    persistCheckoutIntent(checkoutIntent);
  }, [checkoutIntent]);

  // Handle redirect after successful login - wait for auth state to update
  useEffect(() => {
    if (user && window.location.pathname === '/login') {
      const pendingCheckoutIntent = consumeCheckoutIntent();
      if (pendingCheckoutIntent) {
        redirectToCheckoutIntent(pendingCheckoutIntent, user);
        return;
      }

      const postLoginTarget = returnUrl.startsWith('/mentorship/book/') ? '/mentorship' : returnUrl;
      navigate(postLoginTarget);
    }
  }, [user, navigate, returnUrl]);

  // Prefill saved email if user opted to be remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
  const validateForm = () => {
    const newErrors = {
      email: "",
      password: ""
    };

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      persistOnboardingReturn(returnUrl);
      if (checkoutIntent) {
        persistCheckoutIntent(checkoutIntent);
      }
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        const mappedError = mapSignInError(error);
        setLoginError(mappedError);
        toast.error(mappedError);
      } else {
        setLoginError(null);
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        toast.success("Login successful! Welcome back.");
        // Don't redirect here - let useEffect handle redirect when user state updates
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Resend confirmation email
  const handleResendConfirmationEmail = async () => {
    if (!formData.email) {
      toast.error('Please enter your email address first');
      return;
    }

    setResendEmailLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        toast.error(error.message || 'Failed to resend confirmation email');
      } else {
        toast.success('Confirmation email sent! Please check your inbox.');
        setLoginError(null);
      }
    } catch {
      toast.error('Failed to resend confirmation email. Please try again.');
    } finally {
      setResendEmailLoading(false);
    }
  };

  // Social OAuth login
  const handleSocialLogin = async (provider: SocialAuthProviderId) => {
    await startSocialOAuth({
      provider,
      intent: 'login',
      beforeRedirect: () => {
        // Preserve post-auth destination for callback + onboarding flow.
        localStorage.setItem('oauth_return_url', returnUrl);
        localStorage.removeItem('oauth_signup_method');
        setOAuthAuthIntent('login');
        persistOnboardingReturn(returnUrl);
      },
    });
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleLinkedInLogin = () => handleSocialLogin('linkedin_oidc');
  const handleXLogin = () => handleSocialLogin('x');

  return (
    <div className="signup-premium min-h-screen bg-background md:h-screen md:overflow-hidden">
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Sign in to your Creatives Takeover account to access AI-powered creative planning tools." />
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
            @keyframes loginTitleFlicker {
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
            style={{ animation: "loginTitleFlicker 3.8s ease-in-out infinite" }}
          >
            Build what only you can build.
          </h1>
        </div>

        <div className="relative z-10 mt-6 flex min-h-0 flex-1 items-center justify-center md:mt-8">
          <div className="signup-premium-carousel-shell flex h-full w-full max-w-[560px] flex-col items-center justify-center gap-2">
            <div className="signup-premium-carousel-frame flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl">
              <div
                className="flex h-full w-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${activeLoginHeroSlide * 100}%)` }}
              >
                {loginHeroSlides.map((slide) => (
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
              {loginHeroSlides.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  aria-label={`Show login image ${index + 1}`}
                  aria-current={activeLoginHeroSlide === index}
                  onClick={() => {
                    setActiveLoginHeroSlide(index);
                    setLoginHeroTimerReset((resetKey) => resetKey + 1);
                  }}
                  className={`signup-premium-carousel-dot h-2.5 w-2.5 rounded-full border border-white transition-all duration-300 ${
                    activeLoginHeroSlide === index
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
          <h1 className="signup-premium-right-title text-3xl font-bold mt-4 mb-2">Welcome back</h1>
        </div>

        {/* Login Form */}
        <MobileFormOptimizer>
          <Card className="signup-premium-card glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="signup-premium-card-header space-y-1 pb-4">
            <h2 className="signup-premium-card-title text-xl font-semibold text-center">Sign in to your account</h2>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={handleSubmit} 
              autoComplete="on" 
              className="signup-premium-form space-y-6"
              name="loginForm"
              id="loginForm"
              data-password-manager-enabled="true"
            >
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
                    className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    inputMode="email"
                    form="loginForm"
                    data-lpignore="false"
                    data-1p-ignore="false"
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
                    placeholder="Enter your password"
                    className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="current-password"
                    form="loginForm"
                    data-lpignore="false"
                    data-1p-ignore="false"
                    data-password-field="true"
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
                {errors.password && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.password}</p>
                )}
              </div>

              {/* Email Confirmation Error & Resend */}
              {loginError && loginError.toLowerCase().includes('email') && loginError.toLowerCase().includes('confirm') && (
                <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your email hasn't been confirmed yet. Check your inbox for the confirmation email.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendConfirmationEmail}
                    disabled={resendEmailLoading || !formData.email}
                    className="w-full"
                  >
                    {resendEmailLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      'Resend Confirmation Email'
                    )}
                  </Button>
                </div>
              )}

              {/* Remember Me + Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                    disabled={isLoading}
                  />
                  <Label htmlFor="rememberMe" className="text-sm">
                    Remember email
                    {rememberMe && <span className="text-xs text-muted-foreground ml-1">(✓ saved)</span>}
                  </Label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Password Manager Hint */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                    💡
                  </div>
                  <span>Tip: Save your password in your browser for instant sign-in next time</span>
                </div>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <AuthSocialButtons
                variant="signupPremium"
                disabled={isLoading}
                onGoogleContinue={handleGoogleLogin}
                onLinkedInContinue={handleLinkedInLogin}
                onXContinue={handleXLogin}
              />

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 pt-2 pb-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-primary/70" />
                <span>Secure authentication powered by Supabase</span>
              </div>
            </form>
          </CardContent>
        </Card>
        </MobileFormOptimizer>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to={signupHref}
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
