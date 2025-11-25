import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Mail, Lock, User, Sparkles, Shield, Calendar as CalendarIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import MobileFormOptimizer from "@/components/MobileFormOptimizer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackActivity } from "@/lib/activity";

const AuthLanding = () => {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState({
    email: "",
    password: ""
  });
  const [rememberMe, setRememberMe] = useState(false);

  // Signup form state
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: ""
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [signupErrors, setSignupErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: ""
  });

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Get conversion source from URL
  const [conversionSource] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('source') || 'direct',
      returnUrl: params.get('return') || '/'
    };
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Prefill saved email if user opted to be remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setLoginData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Login handlers
  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (loginErrors[name as keyof typeof loginErrors]) {
      setLoginErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateLoginForm = () => {
    const newErrors = {
      email: "",
      password: ""
    };

    if (!loginData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(loginData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!loginData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (loginData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setLoginErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }

    setIsLoginLoading(true);
    
    try {
      const { error } = await signIn(loginData.email, loginData.password);
      
      if (error) {
        toast.error(error.message || "Login failed. Please check your credentials.");
      } else {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', loginData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        toast.success("Login successful! Welcome back.");
        navigate('/');
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      toast("Redirecting to Google...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
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
        toast.error(`Google sign-in error: ${error.message}`);
        return;
      }
    } catch (err) {
      toast.error(`Google sign-in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Signup handlers
  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (signupErrors[name as keyof typeof signupErrors]) {
      setSignupErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const validateSignupForm = () => {
    const newErrors = {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      dateOfBirth: ""
    };

    if (!signupData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (signupData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    if (!signupData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(signupData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!signupData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (signupData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!signupData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (signupData.password !== signupData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!signupData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const age = calculateAge(signupData.dateOfBirth);
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old to create an account";
      } else if (age > 120) {
        newErrors.dateOfBirth = "Please enter a valid date of birth";
      }
    }

    setSignupErrors(newErrors);
    return !newErrors.fullName && !newErrors.email && !newErrors.password && !newErrors.confirmPassword && !newErrors.dateOfBirth;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignupForm()) {
      return;
    }

    setIsSignupLoading(true);
    
    try {
      const { error } = await signUp(signupData.email, signupData.password, signupData.fullName, signupData.dateOfBirth);
      
      if (error) {
        toast.error(error.message || "Failed to create account. Please try again.");
      } else {
        if (conversionSource.source !== 'direct') {
          console.log('User signed up from:', conversionSource.source);
        }

        try {
          await trackActivity('user:signup', { source: conversionSource.source });
        } catch {}
        
        toast.success("Account created successfully! Redirecting...");
        
        const savedProgress = localStorage.getItem('bizmap_progress');
        if (savedProgress && conversionSource.returnUrl.includes('dream2plan')) {
          toast.success("Restoring your business plan...");
          setTimeout(() => {
            navigate(conversionSource.returnUrl);
          }, 1500);
        } else {
          setTimeout(() => {
            navigate(conversionSource.returnUrl);
          }, 1500);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSignupLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      toast("Redirecting to Google...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
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
        toast.error(`Google sign-up error: ${error.message}`);
        return;
      }
      
      try {
        await trackActivity('user:signup_oauth', { provider: 'google' });
      } catch {}
      
    } catch (err) {
      toast.error(`Google sign-up failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden flex items-center justify-center p-4 safe-area-inset"
         style={{ minHeight: 'max(100vh, 100dvh)' }}>
      <Helmet>
        <title>Creatives Takeover - Sign In or Sign Up</title>
        <meta name="description" content="Sign in to your Creatives Takeover account or create a new account to start transforming creative ideas into actionable plans with AI-powered insights." />
      </Helmet>

      {/* Animated Background */}
      <AnimatedBackground />

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
          <h1 className="text-3xl font-bold mt-4 mb-2">Welcome</h1>
          <p className="text-muted-foreground">
            Sign in or create an account to continue building your creative vision
          </p>
        </div>

        {/* Auth Forms with Tabs */}
        <MobileFormOptimizer>
          <Card className="glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="space-y-1 pb-4">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login" className="mt-6">
                  <form 
                    onSubmit={handleLoginSubmit} 
                    autoComplete="on" 
                    className="space-y-6"
                    name="loginForm"
                    id="loginForm"
                  >
                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">
                        Email address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          value={loginData.email}
                          onChange={handleLoginInputChange}
                          placeholder="Enter your email"
                          className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            loginErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                          }`}
                          disabled={isLoginLoading}
                          autoComplete="email"
                          autoCapitalize="off"
                          autoCorrect="off"
                          inputMode="email"
                        />
                      </div>
                      {loginErrors.email && (
                        <p className="text-sm text-red-500 animate-fade-in">{loginErrors.email}</p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="login-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={loginData.password}
                          onChange={handleLoginInputChange}
                          placeholder="Enter your password"
                          className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            loginErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                          }`}
                          disabled={isLoginLoading}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isLoginLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {loginErrors.password && (
                        <p className="text-sm text-red-500 animate-fade-in">{loginErrors.password}</p>
                      )}
                    </div>

                    {/* Remember Me + Forgot Password */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="rememberMe"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                          disabled={isLoginLoading}
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

                    {/* Sign In Button */}
                    <Button
                      type="submit"
                      disabled={isLoginLoading}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    >
                      {isLoginLoading ? (
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

                    {/* Google Login Button */}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoginLoading}
                      onClick={handleGoogleLogin}
                      className="w-full h-12 border-2 hover:bg-muted/50 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>

                    {/* Security Badge */}
                    <div className="flex items-center justify-center gap-2 pt-2 pb-2 text-xs text-muted-foreground">
                      <Shield className="w-3.5 h-3.5 text-primary/70" />
                      <span>Secure authentication powered by Supabase</span>
                    </div>
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignupSubmit} autoComplete="on" className="space-y-5">
                    {/* Full Name Field */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-fullName" className="text-sm font-medium">
                        Full name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="signup-fullName"
                          name="fullName"
                          type="text"
                          value={signupData.fullName}
                          onChange={handleSignupInputChange}
                          placeholder="Enter your full name"
                          className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            signupErrors.fullName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                          }`}
                          disabled={isSignupLoading}
                          autoComplete="name"
                        />
                      </div>
                      {signupErrors.fullName && (
                        <p className="text-sm text-red-500 animate-fade-in">{signupErrors.fullName}</p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">
                        Email address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          value={signupData.email}
                          onChange={handleSignupInputChange}
                          placeholder="Enter your email"
                          className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            signupErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                          }`}
                          disabled={isSignupLoading}
                          autoComplete="email"
                          autoCapitalize="off"
                          autoCorrect="off"
                          inputMode="email"
                        />
                      </div>
                      {signupErrors.email && (
                        <p className="text-sm text-red-500 animate-fade-in">{signupErrors.email}</p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="signup-password"
                          name="password"
                          type={showSignupPassword ? "text" : "password"}
                          value={signupData.password}
                          onChange={handleSignupInputChange}
                          placeholder="Create a password"
                          className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            signupErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                          }`}
                          disabled={isSignupLoading}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isSignupLoading}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {!signupErrors.password && signupData.password.length > 0 && (
                        <p className="text-xs text-muted-foreground">Use at least 8 characters</p>
                      )}
                      {signupErrors.password && (
                        <p className="text-sm text-red-500 animate-fade-in">{signupErrors.password}</p>
                      )}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirmPassword" className="text-sm font-medium">
                        Confirm password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="signup-confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={signupData.confirmPassword}
                          onChange={handleSignupInputChange}
                          placeholder="Confirm your password"
                          className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            signupErrors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                          }`}
                          disabled={isSignupLoading}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isSignupLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {signupErrors.confirmPassword && (
                        <p className="text-sm text-red-500 animate-fade-in">{signupErrors.confirmPassword}</p>
                      )}
                    </div>

                    {/* Date of Birth Field */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-dateOfBirth" className="text-sm font-medium">
                        Date of birth
                      </Label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="signup-dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={signupData.dateOfBirth}
                          onChange={handleSignupInputChange}
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                          className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            signupErrors.dateOfBirth ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                          }`}
                          disabled={isSignupLoading}
                          autoComplete="bday"
                        />
                      </div>
                      {!signupErrors.dateOfBirth && signupData.dateOfBirth && (
                        <p className="text-xs text-muted-foreground">You must be at least 18 years old</p>
                      )}
                      {signupErrors.dateOfBirth && (
                        <p className="text-sm text-red-500 animate-fade-in">{signupErrors.dateOfBirth}</p>
                      )}
                    </div>

                    {/* Sign Up Button */}
                    <Button
                      type="submit"
                      disabled={isSignupLoading}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 mt-6"
                    >
                      {isSignupLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Creating account...
                        </div>
                      ) : (
                        "Create Account"
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

                    {/* Google Signup Button */}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSignupLoading}
                      onClick={handleGoogleSignup}
                      className="w-full h-12 border-2 hover:bg-muted/50 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>

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
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </MobileFormOptimizer>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>
            By continuing, you agree to our{" "}
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
  );
};

export default AuthLanding;

