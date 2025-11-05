import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Target, 
  Coins, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Users,
  ThumbsUp,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { SprintCommitment } from '@/hooks/useCommitments';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CommitmentCardProps {
  commitment: SprintCommitment;
  onVerify?: (commitmentId: string, notes: string) => void;
  onResolve?: (commitmentId: string, status: 'achieved' | 'failed', notes?: string) => void;
  onCancel?: (commitmentId: string) => void;
}

const CommitmentCard = React.memo<CommitmentCardProps>(({
  commitment,
  onVerify,
  onResolve,
  onCancel
}) => {
  const { user } = useAuth();
  const [achievementNotes, setAchievementNotes] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  const isOwner = user?.id === commitment.user_id;
  const isExpired = isPast(new Date(commitment.target_date));
  const canCancel = isOwner && commitment.status === 'active' && 
    (Date.now() - new Date(commitment.created_at).getTime()) < 24 * 60 * 60 * 1000;

  const statusConfig = {
    active: { color: 'bg-blue-500', icon: Target, text: 'Active' },
    achieved: { color: 'bg-green-500', icon: CheckCircle2, text: 'Achieved' },
    failed: { color: 'bg-red-500', icon: XCircle, text: 'Failed' },
    cancelled: { color: 'bg-gray-500', icon: AlertCircle, text: 'Cancelled' }
  };

  const config = statusConfig[commitment.status];

  const verificationConfig = {
    self_report: 'Self-Report',
    peer_verified: 'Peer-Verified',
    checkin_based: 'Check-in Based'
  };

  const handleVerify = () => {
    if (!onVerify) return;
    onVerify(commitment.id, achievementNotes);
    setShowVerification(false);
  };

  const handleAchieved = () => {
    if (!onResolve) return;
    onResolve(commitment.id, 'achieved', achievementNotes);
    setShowVerification(false);
  };

  const handleFailed = () => {
    if (!onResolve) return;
    if (confirm('Are you sure you want to mark this as failed? You will forfeit your staked credits.')) {
      onResolve(commitment.id, 'failed');
    }
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-lg",
      commitment.status === 'active' && "border-primary/30"
    )}>
      {/* Status Bar */}
      <div className={cn("h-1", config.color)} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="w-10 h-10">
              <AvatarImage src={commitment.user?.avatar_url} />
              <AvatarFallback>{commitment.user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {commitment.user?.full_name || 'Anonymous'}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(commitment.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <config.icon className="w-3 h-3" />
              {config.text}
            </Badge>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10">
              <Coins className="w-4 h-4 text-primary" />
              <span className="font-bold">{commitment.credits_staked}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Commitment Text */}
        <div className="prose prose-sm max-w-none">
          <p className="text-foreground leading-relaxed">{commitment.commitment_text}</p>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Target: {format(new Date(commitment.target_date), 'MMM dd, yyyy')}</span>
            {isExpired && commitment.status === 'active' && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">Overdue</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{verificationConfig[commitment.verification_method]}</span>
          </div>
        </div>

        {/* Peer Verification Progress */}
        {commitment.verification_method === 'peer_verified' && commitment.status === 'active' && (
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Peer Verifications</span>
              <span className="font-semibold">{commitment.verified_by?.length || 0} / 3</span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${((commitment.verified_by?.length || 0) / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Achievement Notes */}
        {commitment.achievement_notes && commitment.status !== 'active' && (
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs font-semibold mb-1 text-muted-foreground">Achievement Notes</div>
            <p className="text-sm">{commitment.achievement_notes}</p>
          </div>
        )}

        {/* Verification Form */}
        {showVerification && (
          <div className="space-y-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <Textarea
              placeholder="Add achievement notes (optional)..."
              value={achievementNotes}
              onChange={(e) => setAchievementNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAchieved} className="flex-1">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Mark as Achieved
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowVerification(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex-wrap gap-2">
        {/* Owner Actions - Active */}
        {isOwner && commitment.status === 'active' && (
          <>
            <Button size="sm" onClick={() => setShowVerification(true)} className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Complete Goal
            </Button>
            <Button size="sm" variant="destructive" onClick={handleFailed} className="flex-1">
              <XCircle className="w-4 h-4 mr-1" />
              Mark Failed
            </Button>
            {canCancel && onCancel && (
              <Button size="sm" variant="outline" onClick={() => onCancel(commitment.id)}>
                Cancel (-50%)
              </Button>
            )}
          </>
        )}

        {/* Peer Verification Button */}
        {!isOwner && 
         commitment.status === 'active' && 
         commitment.verification_method === 'peer_verified' &&
         !commitment.verified_by?.includes(user?.id || '') &&
         onVerify && (
          <Button size="sm" onClick={() => onVerify(commitment.id, '')} className="flex-1">
            <Users className="w-4 h-4 mr-1" />
            Verify Achievement
          </Button>
        )}

        {/* Community Reactions */}
        <div className="flex gap-2 w-full">
          <Button size="sm" variant="ghost" className="flex-1">
            <ThumbsUp className="w-4 h-4 mr-1" />
            Support ({commitment.community_reactions?.likes || 0})
          </Button>
          <Button size="sm" variant="ghost" className="flex-1">
            <MessageCircle className="w-4 h-4 mr-1" />
            Comment
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Only re-render if commitment data changes
  return prevProps.commitment.id === nextProps.commitment.id &&
         prevProps.commitment.status === nextProps.commitment.status &&
         prevProps.commitment.verified_by?.length === nextProps.commitment.verified_by?.length;
});

export default CommitmentCard;