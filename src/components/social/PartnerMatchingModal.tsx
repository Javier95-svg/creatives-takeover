import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Users, 
  Calendar, 
  Target, 
  Clock,
  UserPlus,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { useSprints } from '@/hooks/useSprints';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  friends_count: number;
}

interface PartnerMatchingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PartnerMatchingModal = ({ open, onOpenChange }: PartnerMatchingModalProps) => {
  const { user } = useAuth();
  const { sendPartnershipRequest } = useAccountabilityPartners();
  const { sprints } = useSprints();
  const [searchQuery, setSearchQuery] = useState('');
  const [potentialPartners, setPotentialPartners] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [partnershipType, setPartnershipType] = useState<'sprint_buddy' | 'daily_accountability' | 'goal_tracker'>('sprint_buddy');
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<Profile | null>(null);

  const fetchPotentialPartners = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get profiles excluding current user and existing partners
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, followers_count, following_count, friends_count')
        .neq('id', user.id)
        .not('id', 'in', `(SELECT partner_id FROM accountability_partnerships WHERE requester_id = '${user.id}' AND status IN ('pending', 'active'))`)
        .not('id', 'in', `(SELECT requester_id FROM accountability_partnerships WHERE partner_id = '${user.id}' AND status IN ('pending', 'active'))`)
        .ilike('full_name', `%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setPotentialPartners(data as Profile[] || []);
    } catch (error) {
      console.error('Error fetching potential partners:', error);
      toast.error('Failed to load potential partners');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedPartner) return;

    const sprintId = partnershipType === 'sprint_buddy' ? selectedSprint : undefined;
    
    const { error } = await sendPartnershipRequest(
      selectedPartner.id,
      partnershipType,
      sprintId,
      requestMessage
    );

    if (!error) {
      onOpenChange(false);
      setSelectedPartner(null);
      setRequestMessage('');
      setSelectedSprint('');
    }
  };

  useEffect(() => {
    if (open) {
      fetchPotentialPartners();
    }
  }, [open, searchQuery, user]);

  const getPartnershipIcon = (type: string) => {
    switch (type) {
      case 'sprint_buddy': return <Calendar className="h-4 w-4" />;
      case 'daily_accountability': return <Clock className="h-4 w-4" />;
      case 'goal_tracker': return <Target className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const activeSprints = sprints.filter(s => s.status === 'planning' || s.status === 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Find Your Accountability Partner
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Partners</TabsTrigger>
            <TabsTrigger value="request">Send Request</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Partners</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label>Partnership Type</Label>
                  <Select value={partnershipType} onValueChange={(value: any) => setPartnershipType(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sprint_buddy">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Sprint Buddy
                        </div>
                      </SelectItem>
                      <SelectItem value="daily_accountability">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Daily Accountability
                        </div>
                      </SelectItem>
                      <SelectItem value="goal_tracker">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Goal Tracker
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-3 bg-muted rounded"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : potentialPartners.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No potential partners found. Try adjusting your search.
                  </div>
                ) : (
                  potentialPartners.map((partner) => (
                    <Card 
                      key={partner.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedPartner?.id === partner.id 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPartner(partner)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={partner.avatar_url || ''} />
                            <AvatarFallback>
                              {partner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {partner.full_name || 'Anonymous'}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {partner.bio || 'No bio available'}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {partner.friends_count} friends
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {partner.followers_count} followers
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="request" className="space-y-4">
            {!selectedPartner ? (
              <div className="text-center py-8 text-muted-foreground">
                Select a partner from the Browse tab to send a request.
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedPartner.avatar_url || ''} />
                        <AvatarFallback>
                          {selectedPartner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{selectedPartner.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{selectedPartner.bio}</p>
                        <Badge variant="outline" className="mt-1">
                          {getPartnershipIcon(partnershipType)}
                          <span className="ml-1">
                            {partnershipType === 'sprint_buddy' ? 'Sprint Buddy' : 
                             partnershipType === 'daily_accountability' ? 'Daily Accountability' : 
                             'Goal Tracker'}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {partnershipType === 'sprint_buddy' && (
                  <div>
                    <Label htmlFor="sprint">Select Sprint (Optional)</Label>
                    <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a sprint to collaborate on" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSprints.map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>
                            {sprint.title} ({sprint.start_date} - {sprint.end_date})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="message">Request Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Introduce yourself and explain why you'd like to be accountability partners..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    className="min-h-24"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedPartner && (
            <Button onClick={handleSendRequest}>
              <UserPlus className="h-4 w-4 mr-2" />
              Send Partnership Request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};