import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, User, Sparkles, Shield, Calendar as CalendarIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackActivity } from "@/lib/activity";

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: ""
  });
  
  const { signUp, user } = useAuth();
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
      // Check if user has saved progress from BizMap
      const savedProgress = localStorage.getItem('bizmap_progress');
      if (savedProgress && conversionSource.returnUrl.includes('dream2plan')) {
        navigate(conversionSource.returnUrl);
      } else {
        navigate('/');
      }
    }
  }, [user, navigate, conversionSource.returnUrl]);

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

  // Calculate age from date of birth
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

  // Form validation
  const validateForm = () => {
    const newErrors = {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      dateOfBirth: ""
    };

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
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
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Date of birth validation (optional - only validate if provided)
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old to create an account";
      } else if (age > 120) {
        newErrors.dateOfBirth = "Please enter a valid date of birth";
      }
    }

    setErrors(newErrors);
    return !newErrors.fullName && !newErrors.email && !newErrors.password && !newErrors.confirmPassword && !newErrors.dateOfBirth;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signUp(formData.email, formData.password, formData.fullName, formData.dateOfBirth);
      
      if (error) {
        toast.error(error.message || "Failed to create account. Please try again.");
      } else {
        // Track conversion source
        if (conversionSource.source !== 'direct') {
          console.log('User signed up from:', conversionSource.source);
          // Could send this to analytics here
        }

        try {
          await trackActivity('user:signup', { source: conversionSource.source });
        } catch {}
        
        toast.success("Account created successfully! Redirecting...");
        
        // Check for saved BizMap progress
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
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Google OAuth signup
  const handleGoogleSignup = async () => {
    try {
      console.log("Starting Google OAuth signup...");
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
        toast.error(`Google sign-up error: ${error.message}`);
        return;
      }
      
      // If we get here without error, the redirect should have happened
      console.log("OAuth initiated successfully");
      try {
        await trackActivity('user:signup_oauth', { provider: 'google' });
      } catch {}
      
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
          <h1 className="text-3xl font-bold mt-4 mb-2">Join us</h1>
          <p className="text-muted-foreground">
            Start turning your creative ideas into reality
          </p>
        </div>

        {/* Signup Form */}
        <Card className="glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-xl font-semibold text-center">Create your account</h2>
            <p className="text-sm text-muted-foreground text-center">Get started with your free account today</p>
          </CardHeader>
          <CardContent>
            {/* Google OAuth Button - Primary Option */}
            <div className="mb-5">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={handleGoogleSignup}
                className="w-full h-12 border-2 hover:bg-muted/50 transition-all duration-200 bg-background/50 backdrop-blur-sm font-medium"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or sign up with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="on" className="space-y-5">
              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.fullName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.fullName}</p>
                )}
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
                    className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    inputMode="email"
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
                    className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="new-password"
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
                  <p className="text-xs text-muted-foreground">Use at least 8 characters</p>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Date of Birth Field (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-sm font-medium">
                  Date of birth <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.dateOfBirth ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
                    autoComplete="bday"
                  />
                </div>
                {!errors.dateOfBirth && formData.dateOfBirth && (
                  <p className="text-xs text-muted-foreground">You must be at least 18 years old</p>
                )}
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Sign Up Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </div>
                ) : (
                  "Create Account"
                )}
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
          </CardContent>
        </Card>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
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
