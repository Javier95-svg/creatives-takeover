import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedBackground from "@/components/AnimatedBackground";

const Auth = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
      fullName: "",
      email: "",
      password: "",
      confirmPassword: ""
    };

    // Full name validation (only for signup)
    if (mode === 'signup') {
      if (!formData.fullName.trim()) {
        newErrors.fullName = "Full name is required";
      } else if (formData.fullName.trim().length < 2) {
        newErrors.fullName = "Full name must be at least 2 characters";
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
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation (only for signup)
    if (mode === 'signup') {
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return !newErrors.fullName && !newErrors.email && !newErrors.password && !newErrors.confirmPassword;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      let result;
      
      if (mode === 'signup') {
        result = await signUp(formData.email, formData.password, formData.fullName);
        if (!result.error) {
          toast.success("Account created successfully! Please check your email to confirm your account.");
        }
      } else {
        result = await signIn(formData.email, formData.password);
        if (!result.error) {
          toast.success("Welcome back!");
          navigate('/');
        }
      }

      if (result.error) {
        toast.error(result.error.message || `${mode === 'signup' ? 'Sign up' : 'Sign in'} failed. Please try again.`);
      }
      
    } catch (error) {
      toast.error(`${mode === 'signup' ? 'Sign up' : 'Sign in'} failed. Please try again.`);
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

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <Helmet>
        <title>{mode === 'signin' ? 'Sign In' : 'Sign Up'} - BizMap AI</title>
        <meta name="description" content={mode === 'signin' 
          ? "Sign in to your BizMap AI account to access AI-powered business planning tools." 
          : "Create your BizMap AI account to start transforming business ideas into actionable plans with AI-powered insights."} />
      </Helmet>

      {/* Animated Background */}
      <AnimatedBackground />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold gradient-text hover:opacity-80 transition-opacity">
            <Sparkles className="w-6 h-6" />
            BizMap AI
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Join BizMap AI'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'signin' 
              ? 'Sign in to continue building your business' 
              : 'Start turning your business ideas into reality'}
          </p>
        </div>

        {/* Auth Form */}
        <Card className="glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-xl font-semibold text-center">
              {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
            </h2>
            {mode === 'signup' && (
              <p className="text-sm text-muted-foreground text-center">Get started with your free account today</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name Field - Only for signup */}
              {mode === 'signup' && (
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
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-red-500 animate-fade-in">{errors.fullName}</p>
                  )}
                </div>
              )}

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
                    placeholder={mode === 'signin' ? "Enter your password" : "Create a password"}
                    className={`pl-10 pr-12 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                    disabled={isLoading}
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
                {mode === 'signup' && !errors.password && formData.password.length > 0 && (
                  <p className="text-xs text-muted-foreground">Use at least 6 characters</p>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field - Only for signup */}
              {mode === 'signup' && (
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
              )}

              {/* Forgot Password Link - Only for signin */}
              {mode === 'signin' && (
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </div>
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </Button>

              {/* Mode Switch */}
              <div className="text-center">
                <p className="text-muted-foreground">
                  {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                    disabled={isLoading}
                  >
                    {mode === 'signin' ? 'Sign up for free' : 'Sign in'}
                  </button>
                </p>
              </div>

              {/* Terms */}
              {mode === 'signup' && (
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
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;