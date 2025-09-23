import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Users, 
  MessageCircle, 
  Heart, 
  ArrowRight,
  CheckCircle,
  Target,
  Trophy
} from "lucide-react";
import { Link } from "react-router-dom";

interface WelcomeNewUserProps {
  onDismiss: () => void;
}

const WelcomeNewUser: React.FC<WelcomeNewUserProps> = ({ onDismiss }) => {
  return (
    <Card className="mb-6 bg-gradient-to-br from-primary/5 via-secondary/5 to-background border-primary/20 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Welcome to the Community! 🎉</h3>
              <p className="text-muted-foreground">You're part of something amazing</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
            ×
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-primary/10">
            <Users className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">Connect</div>
              <div className="text-xs text-muted-foreground">Meet fellow entrepreneurs</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-secondary/10">
            <MessageCircle className="h-5 w-5 text-secondary flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">Share</div>
              <div className="text-xs text-muted-foreground">Tell your unique story</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-green-500/10">
            <Trophy className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">Grow</div>
              <div className="text-xs text-muted-foreground">Learn and succeed together</div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Quick Start Guide
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Complete your profile</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 rounded-full border-2 border-primary/30"></div>
              <span className="text-muted-foreground">Share your first entrepreneurial story</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 rounded-full border-2 border-primary/30"></div>
              <span className="text-muted-foreground">Engage with 3 other entrepreneurs</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/login" className="flex-1">
            <Button className="w-full group bg-gradient-to-r from-primary to-primary/80">
              <Heart className="h-4 w-4 mr-2 group-hover:animate-pulse" />
              Share Your First Story
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Button variant="outline" onClick={onDismiss} className="flex-1 border-primary/20">
            <Users className="h-4 w-4 mr-2" />
            Explore Stories
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border/50">
          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
            💡 Pro Tip
          </Badge>
          <span className="text-xs text-muted-foreground">
            Share authentic experiences to get the most engagement
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeNewUser;