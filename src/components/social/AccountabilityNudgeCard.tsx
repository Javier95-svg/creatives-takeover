import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  MessageCircle,
  Clock,
  Zap,
  Target,
  X
} from 'lucide-react';
import { AccountabilityNudge, useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { formatDistanceToNow } from 'date-fns';

interface AccountabilityNudgeCardProps {
  nudge: AccountabilityNudge;
}

export const AccountabilityNudgeCard = ({ nudge }: AccountabilityNudgeCardProps) => {
  const { acknowledgeNudge } = useAccountabilityPartners();

  const getNudgeIcon = (type: string) => {
    switch (type) {
      case 'missed_checkin': return <Clock className="h-4 w-4" />;
      case 'encouragement': return <Zap className="h-4 w-4" />;
      case 'check_in': return <CheckCircle2 className="h-4 w-4" />;
      case 'milestone': return <Target className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getNudgeTitle = (type: string) => {
    switch (type) {
      case 'missed_checkin': return 'Missed Check-in Reminder';
      case 'encouragement': return 'Encouragement';
      case 'check_in': return 'Check-in Reminder';
      case 'milestone': return 'Milestone Reminder';
      default: return 'Nudge';
    }
  };

  const getNudgeColor = (type: string) => {
    switch (type) {
      case 'missed_checkin': return 'text-orange-500';
      case 'encouragement': return 'text-green-500';
      case 'check_in': return 'text-blue-500';
      case 'milestone': return 'text-purple-500';
      default: return 'text-primary';
    }
  };

  const handleAcknowledge = () => {
    acknowledgeNudge(nudge.id);
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={nudge.nudger_profile?.avatar_url || ''} />
            <AvatarFallback>
              {nudge.nudger_profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {nudge.nudger_profile?.full_name || 'Anonymous Partner'}
                </span>
                <Badge variant="outline" className="text-xs">
                  <span className={getNudgeColor(nudge.nudge_type)}>
                    {getNudgeIcon(nudge.nudge_type)}
                  </span>
                  <span className="ml-1">{getNudgeTitle(nudge.nudge_type)}</span>
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(nudge.created_at), { addSuffix: true })}
              </span>
            </div>

            {nudge.message && (
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                {nudge.message}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={handleAcknowledge}
                className="h-8"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Got it!
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Reply
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleAcknowledge}
                className="h-8 ml-auto"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};