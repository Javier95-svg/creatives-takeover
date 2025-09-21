import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Users, 
  Calendar, 
  Target, 
  MessageCircle, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { AccountabilityPartnership, useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface AccountabilityPartnerCardProps {
  partnership: AccountabilityPartnership;
  variant?: 'active' | 'pending';
}

export const AccountabilityPartnerCard = ({ 
  partnership, 
  variant = 'active' 
}: AccountabilityPartnerCardProps) => {
  const { user } = useAuth();
  const { respondToPartnershipRequest, sendNudge, endPartnership } = useAccountabilityPartners();
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [showNudgeDialog, setShowNudgeDialog] = useState(false);
  const [nudging, setNudging] = useState(false);

  // Determine if current user is the requester or partner
  const isRequester = user?.id === partnership.requester_id;
  const currentPartner = isRequester ? partnership.partner_profile : partnership.requester_profile;
  const partnerId = isRequester ? partnership.partner_id : partnership.requester_id;

  const getPartnershipTypeLabel = (type: string) => {
    switch (type) {
      case 'sprint_buddy': return 'Sprint Buddy';
      case 'daily_accountability': return 'Daily Accountability';
      case 'goal_tracker': return 'Goal Tracker';
      default: return type;
    }
  };

  const getPartnershipIcon = (type: string) => {
    switch (type) {
      case 'sprint_buddy': return <Calendar className="h-4 w-4" />;
      case 'daily_accountability': return <Clock className="h-4 w-4" />;
      case 'goal_tracker': return <Target className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const handleNudge = async (nudgeType: 'missed_checkin' | 'encouragement' | 'check_in') => {
    setNudging(true);
    try {
      await sendNudge(
        partnership.id,
        partnerId,
        nudgeType,
        nudgeMessage || undefined
      );
      setNudgeMessage('');
      setShowNudgeDialog(false);
    } finally {
      setNudging(false);
    }
  };

  const handlePartnershipResponse = async (action: 'accept' | 'decline') => {
    await respondToPartnershipRequest(partnership.id, action);
  };

  const handleEndPartnership = async () => {
    await endPartnership(partnership.id);
  };

  if (!currentPartner) return null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={currentPartner.avatar_url || ''} />
              <AvatarFallback>
                {currentPartner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{currentPartner.full_name || 'Anonymous'}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getPartnershipIcon(partnership.partnership_type)}
                  <span className="ml-1">{getPartnershipTypeLabel(partnership.partnership_type)}</span>
                </Badge>
                {partnership.sprint && (
                  <Badge variant="outline" className="text-xs">
                    {partnership.sprint.title}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {variant === 'active' && (
            <Badge variant={partnership.status === 'active' ? 'default' : 'secondary'}>
              {partnership.status === 'active' ? 'Active' : partnership.status}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {currentPartner.bio && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {currentPartner.bio}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>
            Started {partnership.started_at 
              ? formatDistanceToNow(new Date(partnership.started_at), { addSuffix: true })
              : 'Recently'
            }
          </span>
          {partnership.sprint && (
            <span>
              Sprint ends {formatDistanceToNow(new Date(partnership.sprint.end_date), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {variant === 'pending' && !isRequester && (
            <>
              <Button 
                size="sm" 
                onClick={() => handlePartnershipResponse('accept')}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handlePartnershipResponse('decline')}
                className="flex-1"
              >
                Decline
              </Button>
            </>
          )}

          {variant === 'pending' && isRequester && (
            <Button size="sm" variant="outline" disabled className="flex-1">
              <Clock className="h-4 w-4 mr-1" />
              Pending Response
            </Button>
          )}

          {variant === 'active' && (
            <>
              <Button size="sm" variant="outline" className="flex-1">
                <MessageCircle className="h-4 w-4 mr-1" />
                Message
              </Button>
              
              <Dialog open={showNudgeDialog} onOpenChange={setShowNudgeDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1">
                    <Zap className="h-4 w-4 mr-1" />
                    Nudge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Accountability Nudge</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Optional message to motivate your partner..."
                      value={nudgeMessage}
                      onChange={(e) => setNudgeMessage(e.target.value)}
                      className="min-h-20"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleNudge('check_in')}
                        disabled={nudging}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Check-in Reminder
                      </Button>
                      <Button
                        onClick={() => handleNudge('encouragement')}
                        disabled={nudging}
                        variant="outline"
                        className="flex-1"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Encouragement
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNudgeDialog(false)}
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleEndPartnership}
                className="text-destructive hover:text-destructive"
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {partnership.partnership_settings?.request_message && variant === 'pending' && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              "{partnership.partnership_settings.request_message}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};