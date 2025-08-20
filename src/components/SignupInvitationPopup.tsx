import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SignupInvitationPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignupInvitationPopup = ({ isOpen, onClose }: SignupInvitationPopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-2 border-primary/20">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold gradient-text">
            Ready to Transform Your Ideas?
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Join thousands of entrepreneurs using BizMap AI to turn their business dreams into reality
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>AI-powered business plan generation</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Market analysis & competitor insights</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Financial projections & funding guidance</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <Button asChild className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold">
              <Link to="/signup" onClick={onClose}>
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            <Button variant="ghost" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline" onClick={onClose}>
              Sign in here
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};