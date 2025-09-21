import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Handshake, 
  Users, 
  MessageCircle, 
  Zap,
  CheckCircle2,
  UserPlus
} from 'lucide-react';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { useAuth } from '@/contexts/AuthContext';
import { PartnerMatchingModal } from '@/components/social/PartnerMatchingModal';

interface AccountabilityPartnerIntegrationProps {
  sprintId: string;
  sprintTitle: string;
}

export const AccountabilityPartnerIntegration = ({ 
  sprintId, 
  sprintTitle 
}: AccountabilityPartnerIntegrationProps) => {
  const { user } = useAuth();
  const { partnerships, sendNudge } = useAccountabilityPartners();
  const [showMatching, setShowMatching] = useState(false);

  // Filter partnerships relevant to this sprint
  const sprintPartners = partnerships.filter(p => 
    p.sprint_id === sprintId || p.partnership_type === 'daily_accountability'
  );

  const handleSendMotivation = async (partnerId: string, partnershipId: string) => {
    await sendNudge(
      partnershipId,
      partnerId,
      'encouragement',
      `Keep going on "${sprintTitle}"! You've got this! 💪`
    );
  };

  if (!user) return null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Handshake className="h-5 w-5 text-primary" />
          Accountability Partners
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sprintPartners.length === 0 ? (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>No accountability partners for this sprint yet.</span>
              <Button 
                size="sm" 
                onClick={() => setShowMatching(true)}
                className="ml-4"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Find Partner
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {sprintPartners.map((partnership) => {
              const isRequester = user.id === partnership.requester_id;
              const partner = isRequester ? partnership.partner_profile : partnership.requester_profile;
              const partnerId = isRequester ? partnership.partner_id : partnership.requester_id;

              if (!partner) return null;

              return (
                <div key={partnership.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={partner.avatar_url || ''} />
                      <AvatarFallback>
                        {partner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{partner.full_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {partnership.partnership_type === 'sprint_buddy' ? 'Sprint Buddy' :
                           partnership.partnership_type === 'daily_accountability' ? 'Daily Partner' :
                           'Goal Tracker'}
                        </Badge>
                        <Badge variant={partnership.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {partnership.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Message
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleSendMotivation(partnerId, partnership.id)}
                      className="h-8"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Motivate
                    </Button>
                  </div>
                </div>
              );
            })}
            
            <Button 
              variant="outline" 
              onClick={() => setShowMatching(true)}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Another Partner
            </Button>
          </div>
        )}

        {/* Sprint-specific insights */}
        {sprintPartners.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              💡 Your accountability partners will be notified when you complete daily check-ins 
              and can send you motivational nudges to keep you on track.
            </p>
          </div>
        )}

        <PartnerMatchingModal 
          open={showMatching} 
          onOpenChange={setShowMatching} 
        />
      </CardContent>
    </Card>
  );
};