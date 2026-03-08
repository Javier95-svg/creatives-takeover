import { Link } from 'react-router-dom';
import { Users, Trophy, Zap, Handshake, ArrowRight, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useReputation } from '@/hooks/useReputation';
import { useDailyChallenges } from '@/hooks/useDailyChallenges';
import { useCommitments } from '@/hooks/useCommitments';
import { useCommunityPulse } from '@/hooks/useCommunityPulse';

export function CommunityActivityCard() {
  const { user } = useAuth();
  const { reputation, isLoading: repLoading } = useReputation(user?.id);
  const { todaysChallenge, isCompleted: challengeDone, completeChallenge } = useDailyChallenges(user?.id);
  const { userActiveCommitments } = useCommitments();
  const { todaysPulse } = useCommunityPulse();

  // XP progress to next level
  const currentLevelThreshold = reputation?.total_points ?? 0;
  const nextThreshold = reputation?.next_level_threshold ?? 100;
  const xpProgress = nextThreshold > 0 ? Math.min(Math.round((currentLevelThreshold / nextThreshold) * 100), 100) : 0;

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-purple-500" />
          Community Hub
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reputation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              {repLoading ? '…' : (reputation?.level_name ?? 'Newcomer')}
            </span>
            <span className="text-muted-foreground">
              {reputation?.total_points ?? 0} / {reputation?.next_level_threshold ?? 100} XP
            </span>
          </div>
          <Progress value={xpProgress} className="h-1.5" />
        </div>

        {/* Daily challenge */}
        {todaysChallenge && (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium flex items-center gap-1 mb-0.5">
                <Trophy className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                Today's Challenge
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">{todaysChallenge.challenge_title}</p>
              <p className="text-xs text-purple-600 mt-0.5">+{todaysChallenge.reward_points} pts</p>
            </div>
            {challengeDone ? (
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-xs shrink-0">
                Done ✓
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs shrink-0"
                onClick={() => completeChallenge(todaysChallenge.id)}
              >
                Complete
              </Button>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/40 p-2 text-center">
            <p className="text-base font-bold text-foreground">{userActiveCommitments.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
              <Handshake className="h-3 w-3" /> Active
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2 text-center">
            <p className="text-base font-bold text-foreground">
              {todaysPulse?.active_users ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
              <Zap className="h-3 w-3" /> Founders active
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link to="/community">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1">
            Open Community <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
