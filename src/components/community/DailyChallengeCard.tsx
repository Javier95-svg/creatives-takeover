import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  CheckCircle2, 
  MessageSquare, 
  Heart, 
  Users, 
  Share2,
  Sparkles,
  Trophy
} from "lucide-react";
import { useDailyChallenges } from "@/hooks/useDailyChallenges";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const getChallengeIcon = (type: string) => {
  switch (type) {
    case 'post': return <MessageSquare className="w-5 h-5" />;
    case 'comment': return <MessageSquare className="w-5 h-5" />;
    case 'feedback': return <Heart className="w-5 h-5" />;
    case 'connection': return <Users className="w-5 h-5" />;
    case 'share': return <Share2 className="w-5 h-5" />;
    default: return <Target className="w-5 h-5" />;
  }
};

const getChallengeColor = (type: string) => {
  switch (type) {
    case 'post': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'comment': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'feedback': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'connection': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'share': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
    default: return 'bg-primary/10 text-primary border-primary/20';
  }
};

const DailyChallengeCard = () => {
  const { user } = useAuth();
  const { todaysChallenge, isCompleted, isLoading } = useDailyChallenges(user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!todaysChallenge) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Challenge
          </CardTitle>
          <CardDescription>
            Check back tomorrow for a new challenge!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const participationRate = todaysChallenge.participants_count > 0
    ? (todaysChallenge.completion_count / todaysChallenge.participants_count) * 100
    : 0;

  return (
    <Card className={`border-2 transition-all ${
      isCompleted 
        ? 'border-green-500/50 bg-green-500/5' 
        : 'border-primary/30 hover:border-primary/50'
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${getChallengeColor(todaysChallenge.challenge_type)}`}>
                {getChallengeIcon(todaysChallenge.challenge_type)}
              </div>
              <span className="text-lg">Today's Challenge</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-foreground">
              {todaysChallenge.challenge_title}
            </CardDescription>
          </div>
          {isCompleted && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {todaysChallenge.challenge_description}
        </p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{todaysChallenge.reward_points} points</span>
          </div>
          <div className="text-muted-foreground">
            {todaysChallenge.completion_count} completed
          </div>
        </div>

        {todaysChallenge.participants_count > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Community Progress</span>
              <span>{Math.round(participationRate)}%</span>
            </div>
            <Progress value={participationRate} className="h-2" />
          </div>
        )}

        {!isCompleted && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>
              Complete this challenge to earn bonus points and keep your streak alive!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyChallengeCard;
