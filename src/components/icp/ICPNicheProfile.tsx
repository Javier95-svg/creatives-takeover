import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Globe, TrendingUp, Heart, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NicheProfile {
  nicheName: string;
  nicheDescription: string;
  demographics: {
    age: string;
    gender: string;
    location: string;
    income: string;
    education: string;
    occupation: string;
  };
  psychographics: {
    values: string[];
    interests: string[];
    behaviors: string[];
    lifestyle: string;
    attitudes: string;
  };
  buyingBehavior: {
    decisionProcess: string;
    budgetRange: string;
    purchaseFrequency: string;
    triggers: string[];
  };
  whereToFindThem: {
    onlineChannels: string[];
    offlineChannels: string[];
    communities: string[];
    influencers: string[];
  };
  nicheSize: string;
  growthTrend: string;
}

interface ICPNicheProfileProps {
  profile: NicheProfile;
}

const ICPNicheProfile: React.FC<ICPNicheProfileProps> = ({ profile }) => {
  return (
    <div className="space-y-6">
      {/* Niche Overview */}
      <Card className="border-2 border-primary/20 bg-primary/5 animate-fade-in-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {profile.nicheName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{profile.nicheDescription}</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-medium">Market Size:</span>
              <span className="text-muted-foreground">{profile.nicheSize}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-medium">Growth:</span>
              <span className="text-muted-foreground">{profile.growthTrend}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card className="hover-lift animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Demographics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(profile.demographics).map(([key, value]) => (
              <div key={key} className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground capitalize mb-1">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Psychographics */}
      <Card className="hover-lift animate-fade-in-up" style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            Psychographics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Values</p>
            <div className="flex flex-wrap gap-2">
              {profile.psychographics.values.map((value, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{value}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Interests</p>
            <div className="flex flex-wrap gap-2">
              {profile.psychographics.interests.map((interest, i) => (
                <Badge key={i} variant="outline" className="text-xs">{interest}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Key Behaviors</p>
            <ul className="space-y-1">
              {profile.psychographics.behaviors.map((behavior, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-1">•</span>
                  <span>{behavior}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Lifestyle</p>
              <p className="text-sm">{profile.psychographics.lifestyle}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Attitudes</p>
              <p className="text-sm">{profile.psychographics.attitudes}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buying Behavior */}
      <Card className="hover-lift animate-fade-in-up" style={{ animationDelay: '240ms', animationFillMode: 'both' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Buying Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Decision Process</p>
              <p className="text-sm">{profile.buyingBehavior.decisionProcess}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Budget Range</p>
              <p className="text-sm font-medium">{profile.buyingBehavior.budgetRange}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Purchase Frequency</p>
            <p className="text-sm">{profile.buyingBehavior.purchaseFrequency}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Purchase Triggers</p>
            <div className="flex flex-wrap gap-2">
              {profile.buyingBehavior.triggers.map((trigger, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {trigger}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Where to Find Them */}
      <Card className="hover-lift animate-fade-in-up" style={{ animationDelay: '320ms', animationFillMode: 'both' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Where to Find Them
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Online Channels</p>
              <ul className="space-y-1">
                {profile.whereToFindThem.onlineChannels.map((channel, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span>{channel}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Offline Channels</p>
              <ul className="space-y-1">
                {profile.whereToFindThem.offlineChannels.map((channel, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span>{channel}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Communities</p>
              <div className="flex flex-wrap gap-2">
                {profile.whereToFindThem.communities.map((community, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{community}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Key Influencers / Voices</p>
              <div className="flex flex-wrap gap-2">
                {profile.whereToFindThem.influencers.map((influencer, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{influencer}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ICPNicheProfile;
