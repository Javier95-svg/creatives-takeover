import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Heart, Sparkles, TrendingUp, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SignupInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignupInviteModal = ({ isOpen, onClose }: SignupInviteModalProps) => {
  const { isAuthenticated } = useAuth();

  // Don't show if user is authenticated
  if (isAuthenticated) return null;

  const benefits = [
    {
      icon: <Heart className="w-4 h-4" />,
      title: "Save Your Interests",
      description: "Get personalized article recommendations"
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: "Exclusive Content",
      description: "Access premium insights and deep-dives"
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      title: "Track Your Progress",
      description: "See your reading journey and achievements"
    },
    {
      icon: <BookOpen className="w-4 h-4" />,
      title: "Reading Lists",
      description: "Create and organize your favorite articles"
    }
  ];

  const popularTopics = ["AI", "Productivity", "Growth Hacking", "No-Code", "Startups"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-background/95 backdrop-blur-sm border shadow-xl">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <DialogTitle className="text-xl font-bold">Join Insighta Community</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Unlock personalized content and save your reading preferences
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Popular Topics */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Popular topics you can follow:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {popularTopics.map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-3 rounded-lg bg-muted/30">
                <div className="flex justify-center mb-2 text-primary">
                  {benefit.icon}
                </div>
                <h4 className="text-xs font-semibold mb-1">{benefit.title}</h4>
                <p className="text-xs text-muted-foreground leading-tight">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full" size="sm">
              <Link to="/signup" onClick={onClose}>
                Create Free Account
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full" size="sm">
              <Link to="/login" onClick={onClose}>
                Already have an account? Sign In
              </Link>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Free forever • No spam • Unsubscribe anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupInviteModal;