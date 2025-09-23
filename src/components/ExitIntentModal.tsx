import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Clock, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ExitIntentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExitIntentModal = ({ isOpen, onClose }: ExitIntentModalProps) => {
  const { isAuthenticated } = useAuth();

  // Don't show modal if user is authenticated
  if (isAuthenticated) return null;

  const benefits = [
    "FREE strategic business analysis report",
    "Complete 5-minute survey = up to 7 bonus credits",
    "AI-powered market analysis & validation included",
    "Join our growing community of entrepreneurs"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border/20 bg-background/98 backdrop-blur-2xl shadow-2xl z-[100]">
        <div className="relative">
          {/* Enhanced Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/8 to-accent/10" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/25 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-secondary/25 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-gradient-to-r from-accent/20 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          <div className="relative z-10 p-8">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/15 to-secondary/15 border border-primary/30 rounded-full shadow-lg mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary">🎁 FREE Credits Available!</span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl md:text-3xl font-bold mb-4 animate-slide-up">
              <span className="gradient-text">Get FREE Business Report</span>
              <br />
              <span className="text-foreground">+ Up to 7 Credits Before You Go!</span>
            </h2>

            {/* Subheadline */}
            <p className="text-lg text-muted-foreground mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Complete our 5-minute feedback survey and get your comprehensive business plan plus bonus credits to unlock premium features.
            </p>

            {/* Benefits List */}
            <div className="grid gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm">Growing entrepreneur community</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm">5 minute survey</span>
              </div>
            </div>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <Button size="lg" className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group" asChild>
                <Link to="/dream2plan" onClick={onClose}>
                  <span className="relative z-10 font-semibold">Get FREE Report + Credits</span>
                  <ArrowRight className="ml-2 w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="flex-1 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 shadow-md hover:shadow-lg transition-all duration-300" asChild>
                <Link to="/signup" onClick={onClose}>
                  <span className="font-semibold">Sign Up for More</span>
                </Link>
              </Button>
            </div>

            {/* Footer Text */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Free to start • No credit card required • Join in 30 seconds
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};