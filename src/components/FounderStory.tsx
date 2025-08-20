import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Globe, Clock } from "lucide-react";

const FounderStory = () => {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <h3 className="font-semibold text-lg mb-1">Built by Startup Veterans</h3>
              <p className="text-sm text-muted-foreground">
                Hi! We're a team of startup founders and AI engineers who've helped launch 50+ businesses since 2019.
              </p>
            </div>
            
            <div className="space-y-3 mb-4">
              <p className="text-sm text-muted-foreground">
                After seeing founders waste months on 40-page business plans that never get executed, 
                we built BizMap AI to give you what actually matters: <strong>your next 3 actions</strong>.
              </p>
              
              <p className="text-sm text-muted-foreground">
                We've distilled insights from 1000+ successful launches into an AI that thinks like 
                an experienced co-founder - practical, action-focused, and globally aware.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>2,847+ plans generated</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-3 h-3" />
                <span>50+ countries</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>73% launch rate</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>5-min average</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/20">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  YC Alumni
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  500 Startups
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Featured in TechCrunch
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-primary/5 rounded-lg p-3">
          <p className="text-xs text-primary/80 italic">
            "We're not trying to replace business planning - we're making it actually useful. 
            Less theory, more action. That's how real businesses get built."
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FounderStory;