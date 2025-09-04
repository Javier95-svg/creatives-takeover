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
    "Professional business plan in 30 minutes",
    "AI-powered market analysis & validation",
    "Custom marketing assets included",
    "Join 1,200+ successful entrepreneurs"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 bg-background/95 backdrop-blur-xl">
        <div className="relative">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 animate-pulse" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl animate-float" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
          
          <div className="relative z-10 p-8">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-card mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Wait! Don't miss out</span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl md:text-3xl font-bold mb-4 animate-slide-up">
              <span className="gradient-text">Create Your Business Plan</span>
              <br />
              <span className="text-foreground">Before You Go!</span>
            </h2>

            {/* Subheadline */}
            <p className="text-lg text-muted-foreground mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Join thousands who've transformed their ideas into successful businesses in just 30 minutes.
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
                <span className="text-sm">1,200+ entrepreneurs joined</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm">28 min average completion</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <Button size="lg" className="flex-1 glass bg-primary hover:bg-primary/90 text-primary-foreground btn-magnetic" asChild>
                <Link to="/signup" onClick={onClose}>
                  Start Creating My Plan
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="flex-1 glass hover:bg-primary/10 btn-magnetic" asChild>
                <Link to="/dream2plan" onClick={onClose}>
                  Preview Tool
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