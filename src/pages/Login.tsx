import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, Sparkles, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import MobileFormOptimizer from "@/components/MobileFormOptimizer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

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
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        toast.error(error.message || "Login failed. Please check your credentials.");
      } else {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        toast.success("Login successful! Welcome back.");
        navigate('/');
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Google OAuth login
  const handleGoogleLogin = async () => {
    try {
      console.log("Starting Google OAuth...");
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
      
      console.log("OAuth response:", { data, error });
      
      if (error) {
        console.error("OAuth error:", error);
        toast.error(`Google sign-in error: ${error.message}`);
        return;
      }
      
      // If we get here without error, the redirect should have happened
      console.log("OAuth initiated successfully");
      
    } catch (err) {
      console.error("Caught error:", err);
      toast.error(`Google sign-in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden flex items-center justify-center p-4 safe-area-inset"
         style={{ minHeight: 'max(100vh, 100dvh)' }}>
      <Helmet>
        <title>Sign In - Creatives Takeover</title>
        <meta name="description" content="Sign in to your Creatives Takeover account to access AI-powered creative planning tools." />
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
          <h1 className="text-3xl font-bold mt-4 mb-2">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to continue building your creative vision
          </p>
        </div>

        {/* Login Form */}
        <MobileFormOptimizer>
          <Card className="glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-xl font-semibold text-center">Sign in to your account</h2>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={handleSubmit} 
              autoComplete="on" 
              className="space-y-6"
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
              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="h-12 border-2 hover:bg-muted/50 transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>

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
              to="/signup"
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
  );
};

export default Login;