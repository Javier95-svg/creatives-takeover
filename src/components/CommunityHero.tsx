import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Users, MessageCircle, Heart, Globe } from "lucide-react";

const CommunityHero = () => {
  return (
    <section className="relative py-8 lg:py-12 border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left side - Welcome & Engagement */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                <MessageCircle className="h-5 w-5 text-primary animate-pulse" />
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Share Your Story
                </Badge>
              </div>
              
              <h1 className="text-2xl lg:text-3xl font-bold mb-2 gradient-text">
                Entrepreneur Stories Community
              </h1>
              
              <p className="text-muted-foreground max-w-lg">
                Share your entrepreneurial journey, learn from others, and connect with like-minded founders building the future.
              </p>
            </div>

            {/* Right side - Quick Stats & Activity */}
            <div className="flex lg:flex-col gap-6 lg:gap-4">
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-3">
                <div className="text-center lg:text-right p-3 lg:p-2 rounded-lg bg-primary/5">
                  <div className="text-lg lg:text-xl font-bold text-primary">342+</div>
                  <div className="text-xs text-muted-foreground">Stories Shared</div>
                </div>
                <div className="text-center lg:text-right p-3 lg:p-2 rounded-lg bg-secondary/5">
                  <div className="text-lg lg:text-xl font-bold text-secondary">127</div>
                  <div className="text-xs text-muted-foreground">Active Today</div>
                </div>
                <div className="text-center lg:text-right p-3 lg:p-2 rounded-lg bg-accent/5">
                  <div className="text-lg lg:text-xl font-bold text-accent">89%</div>
                  <div className="text-xs text-muted-foreground">Helpful Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityHero;