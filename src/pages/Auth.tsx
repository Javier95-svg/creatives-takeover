import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { getSessionSafely } from '@/integrations/supabase/auth';
import { toast } from 'sonner';
import { AuthSocialButtons } from '@/components/auth/AuthSocialButtons';
import AuthWallpaper from '@/components/wallpapers/AuthWallpaper';
import MobileFormOptimizer from '@/components/MobileFormOptimizer';
import { useFeedbackCredits } from '@/hooks/useFeedbackCredits';
import { useAuth } from '@/contexts/AuthContext';
import { signUpWithFallback } from '@/lib/authSignup';
import { mapSignInError, mapSignUpError } from '@/lib/authErrors';
import { MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_ERROR } from '@/lib/passwordPolicy';
import { persistOnboardingReturn, sanitizeReturnPath } from '@/lib/authRedirect';
import {
  persistAuthMethod,
  readAuthMethod,
  trackSignupCompleted,
} from '@/lib/analytics';
import {
  clearPendingReferralCode,
  getPendingReferralCode,
  persistPendingReferralCode,
  setOAuthAuthIntent,
} from '@/lib/referral';
import {
  getSocialAuthSignupMethod,
  startSocialOAuth,
  type SocialAuthIntent,
  type SocialAuthProviderId,
} from '@/lib/socialAuth';
import {
  PENDING_DISCOVERY_CALL_KEY,
  resumePendingDiscoveryCallRedirect,
} from '@/services/discoveryCallService';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const { hasPendingCredits } = useFeedbackCredits();
  const { user } = useAuth();

  // Get redirect parameter from URL
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = sanitizeReturnPath(searchParams.get('redirect') || searchParams.get('return'), '/dashboard');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle redirect after successful login - wait for auth state to update
  useEffect(() => {
    if (!user) return;

    void (async () => {
      const resumedDiscoveryCall = await resumePendingDiscoveryCallRedirect();
      if (resumedDiscoveryCall) {
        navigate('/mentorship');
        return;
      }

      // Only redirect if we're still on the auth page
      if (window.location.pathname === '/auth') {
        // If redirect is a booking flow, go to /mentorship instead
        const finalRedirect = redirectUrl.startsWith('/mentorship/book/') ? '/mentorship' : redirectUrl;
        
        // If redirect is just '/', check onboarding status to avoid double redirect
        if (finalRedirect === '/') {
          // Let Index.tsx handle the redirect based on onboarding status
          navigate('/');
        } else {
          // Use the specific redirect URL
          navigate(finalRedirect);
        }
      }
    })();
  }, [user, navigate, redirectUrl]);

  // Prefill saved email if user opted to be remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(mapSignInError(error));
      setLoading(false);
    } else {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      toast.success('Welcome back!');
      setLoading(false);
      // Don't redirect here - let useEffect handle redirect when user state updates
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!firstName.trim()) {
      setError('First name is required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(PASSWORD_LENGTH_ERROR);
      setLoading(false);
      return;
    }

    persistOnboardingReturn(redirectUrl);
    const pendingReferralCode = getPendingReferralCode();

    const { error } = await signUpWithFallback({
      email,
      password,
      fullName: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
      referralCode: pendingReferralCode,
    });

    if (error) {
      setError(mapSignUpError(error));
      setLoading(false);
    } else {
      clearPendingReferralCode();
      let session = await getSessionSafely();

      // Ensure account creation immediately logs in without email confirmation gating.
      if (!session) {
        const { error: autoSignInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (autoSignInError) {
          setError('Account created, but automatic sign in failed. Please sign in manually.');
          setActiveTab('login');
          setLoading(false);
          return;
        }

        session = await getSessionSafely();
      }

      if (!session) {
        setError('Account created, but session initialization is delayed. Please sign in.');
        setActiveTab('login');
        setLoading(false);
        return;
      }

      toast.success('Account created successfully!');
      trackSignupCompleted({ method: readAuthMethod() ?? 'email' });
      setLoading(false);
    }
  };

  const handleSocialAuth = async (
    intent: SocialAuthIntent,
    provider: SocialAuthProviderId,
  ) => {
    const finalRedirect = redirectUrl.startsWith('/mentorship/book/') ? '/mentorship' : redirectUrl;
    const signupMethod = getSocialAuthSignupMethod(provider);

    await startSocialOAuth({
      provider,
      intent,
      beforeRedirect: () => {
        if (intent === 'login') {
          const pendingCalendlyUrl = localStorage.getItem(PENDING_DISCOVERY_CALL_KEY);

          localStorage.setItem('oauth_return_url', finalRedirect);
          localStorage.removeItem('oauth_signup_method');
          setOAuthAuthIntent('login');
          persistOnboardingReturn(finalRedirect);

          if (pendingCalendlyUrl) {
            localStorage.setItem('oauth_calendly_redirect', pendingCalendlyUrl);
          }

          return;
        }

        if (signupMethod === 'google' || signupMethod === 'linkedin') {
          persistAuthMethod(signupMethod);
        }

        localStorage.setItem('oauth_return_url', finalRedirect);
        localStorage.setItem('oauth_signup_method', signupMethod);
        setOAuthAuthIntent('signup');

        const pendingReferralCode = getPendingReferralCode();
        if (pendingReferralCode) {
          persistPendingReferralCode(pendingReferralCode);
        }

        persistOnboardingReturn(finalRedirect);
      },
    });
  };

  const handleGoogleLogin = () => handleSocialAuth('login', 'google');
  const handleLinkedInLogin = () => handleSocialAuth('login', 'linkedin_oidc');
  const handleXLogin = () => handleSocialAuth('login', 'x');
  const handleGoogleSignup = () => handleSocialAuth('signup', 'google');
  const handleLinkedInSignup = () => handleSocialAuth('signup', 'linkedin_oidc');
  const handleXSignup = () => handleSocialAuth('signup', 'x');

  return (
    <div className="relative min-h-dvh flex items-center justify-center p-4 overflow-hidden safe-area-inset"
         style={{ minHeight: 'max(100vh, 100dvh)' }}>
      {/* Auth Wallpaper */}
      <AuthWallpaper />
      
      <MobileFormOptimizer>
        <Card className="w-full max-w-md relative z-10 glass-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img 
              src="/lovable-uploads/2ae69f5c-24f2-4a91-ae89-df8696970fd3.png" 
              alt="Creatives Takeover Logo" 
              className="h-8 w-auto animate-fade-in" 
            />
            <CardTitle className="text-2xl font-bold takeover-gradient creatives-font">Welcome</CardTitle>
          </div>
          <CardDescription>
            Start your entrepreneurial journey with us
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">SIGN IN</TabsTrigger>
              <TabsTrigger value="signup">SIGN UP</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form 
                onSubmit={handleLogin} 
                className="space-y-4" 
                name="loginForm"
                id="loginForm" 
                autoComplete="on"
                data-password-manager-enabled="true"
              >
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    inputMode="email"
                    form="loginForm"
                    data-lpignore="false"
                    data-1p-ignore="false"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                      autoComplete="current-password"
                      form="loginForm"
                      data-lpignore="false"
                      data-1p-ignore="false"
                      data-password-field="true"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                      disabled={loading}
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
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <AuthSocialButtons
                className="mt-6"
                disabled={loading}
                onGoogleContinue={handleGoogleLogin}
                onLinkedInContinue={handleLinkedInLogin}
                onXContinue={handleXLogin}
              />
            </TabsContent>

            <TabsContent value="signup">
              <form 
                onSubmit={handleSignUp} 
                className="space-y-4" 
                name="signupForm"
                id="signupForm" 
                autoComplete="on"
                data-password-manager-enabled="true"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name</Label>
                    <Input
                      id="signup-firstname"
                      name="firstName"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      name="lastName"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={loading}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    inputMode="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={MIN_PASSWORD_LENGTH}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={MIN_PASSWORD_LENGTH}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign Up Button */}
              <AuthSocialButtons
                className="mt-6"
                disabled={loading}
                onGoogleContinue={handleGoogleSignup}
                onLinkedInContinue={handleLinkedInSignup}
                onXContinue={handleXSignup}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </MobileFormOptimizer>
    </div>
  );
};

export default Auth;
