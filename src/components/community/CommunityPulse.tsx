import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, TrendingUp, Activity, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CommunityPulse = () => {
  const interactionPrompts = [
    {
      icon: MessageSquare,
      title: "Share Your Journey",
      description: "Tell your story, wins and failures",
      action: "Start Writing",
      gradient: "from-info/10 to-purple-500/10"
    },
    {
      icon: Users,
      title: "Ask the Community",
      description: "Get advice from fellow entrepreneurs", 
      action: "Ask Question",
      gradient: "from-success/10 to-info/10"
    },
    {
      icon: TrendingUp,
      title: "Share an Insight",
      description: "What did you learn recently?",
      action: "Share Tip",
      gradient: "from-warning/10 to-destructive/10"
    },
    {
      icon: Sparkles,
      title: "Celebrate a Win",
      description: "Big or small, share your victories",
      action: "Celebrate",
      gradient: "from-purple-500/10 to-pink-500/10"
    }
  ];

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10"></div>
      <CardContent className="p-6 relative">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold gradient-text">What's on your mind?</h3>
          <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-primary/20">
            Share Now
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {interactionPrompts.map((prompt, index) => {
            const IconComponent = prompt.icon;
            return (
              <div 
                key={index}
                className={`group cursor-pointer p-4 rounded-lg bg-gradient-to-br ${prompt.gradient} hover:scale-105 transition-all duration-200 border border-white/10 hover:border-primary/20`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-2 rounded-full bg-background/50 backdrop-blur-sm group-hover:bg-primary/10 transition-colors">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{prompt.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{prompt.description}</p>
                    <span className="text-xs font-medium text-primary group-hover:underline">
                      {prompt.action}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-center text-sm text-muted-foreground">
            Every story matters. Your experience could be exactly what someone else needs to hear.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunityPulse;