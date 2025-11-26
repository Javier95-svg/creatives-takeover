import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import AuthWallpaper from "@/components/wallpapers/AuthWallpaper";
import MobileFormOptimizer from "@/components/MobileFormOptimizer";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError("");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message || "Failed to send password reset email. Please try again.");
        toast.error(resetError.message || "Failed to send password reset email");
      } else {
        setIsSuccess(true);
        toast.success("Password reset email sent! Check your inbox.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden flex items-center justify-center p-4 safe-area-inset"
         style={{ minHeight: 'max(100vh, 100dvh)' }}>
      <Helmet>
        <title>Forgot Password - Creatives Takeover</title>
        <meta name="description" content="Reset your Creatives Takeover account password. Enter your email to receive a password reset link." />
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
          <h1 className="text-3xl font-bold mt-4 mb-2">Reset your password</h1>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Forgot Password Form */}
        <MobileFormOptimizer>
          <Card className="glass-card border-2 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="space-y-1 pb-4">
              <h2 className="text-xl font-semibold text-center">Forgot Password</h2>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <div className="space-y-6 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Check your email</h3>
                    <p className="text-muted-foreground">
                      We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click the link in the email to reset your password. The link will expire in 1 hour.
                    </p>
                  </div>
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={() => navigate('/login')}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    >
                      Back to Login
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSuccess(false);
                        setEmail("");
                      }}
                      className="w-full h-12"
                    >
                      Send another email
                    </Button>
                  </div>
                </div>
              ) : (
                <form 
                  onSubmit={handleSubmit} 
                  autoComplete="on" 
                  className="space-y-6"
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
                        value={email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        className={`pl-10 h-12 bg-background/50 backdrop-blur-sm border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                        }`}
                        disabled={isLoading}
                        autoComplete="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        inputMode="email"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-500 animate-fade-in">{error}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  {/* Back to Login */}
                  <div className="text-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </Link>
                  </div>
                </form>
              )}
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
      </div>
    </div>
  );
};

export default ForgotPassword;

