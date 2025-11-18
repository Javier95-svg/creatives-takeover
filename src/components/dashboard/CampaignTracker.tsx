import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOutreachCampaigns, OutreachCampaign, OutreachActivity } from '@/hooks/useOutreachCampaigns';
import { Mail, MessageSquare, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CampaignTrackerProps {
  campaign: OutreachCampaign;
}

const channelIcons = {
  email: Mail,
  linkedin: MessageSquare,
  whatsapp: MessageSquare,
  sms: Send,
  twitter: MessageSquare,
  other: Send,
};

const statusColors = {
  draft: 'bg-gray-500',
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-500',
};

export const CampaignTracker = ({ campaign }: CampaignTrackerProps) => {
  const { getCampaignActivities, addActivity, updateActivity } = useOutreachCampaigns();
  const { data: activities = [], isLoading } = getCampaignActivities(campaign.id);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    contact_name: '',
    contact_info: '',
    contact_title: '',
    contact_company: '',
    activity_type: 'sent' as 'sent' | 'opened' | 'replied' | 'converted',
    notes: '',
  });

  const ChannelIcon = channelIcons[campaign.channel] || Send;

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    addActivity({
      campaign_id: campaign.id,
      activity_type: activityForm.activity_type,
      contact_name: activityForm.contact_name || null,
      contact_info: activityForm.contact_info,
      contact_title: activityForm.contact_title || null,
      contact_company: activityForm.contact_company || null,
      status: activityForm.activity_type === 'sent' ? 'sent' : 'pending',
      notes: activityForm.notes || null,
      metadata: {},
    });

    setActivityForm({
      contact_name: '',
      contact_info: '',
      contact_title: '',
      contact_company: '',
      activity_type: 'sent',
      notes: '',
    });
    setIsAddActivityOpen(false);
  };

  const recentActivities = activities.slice(0, 10);

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <ChannelIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{campaign.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[campaign.status]}>
            {campaign.status}
          </Badge>
          <Dialog open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add Activity</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Activity</DialogTitle>
                <DialogDescription>
                  Record an outreach activity for this campaign.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="activity_type">Activity Type</Label>
                  <Select
                    value={activityForm.activity_type}
                    onValueChange={(value) => setActivityForm(prev => ({ ...prev, activity_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="opened">Opened</SelectItem>
                      <SelectItem value="replied">Replied</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_info">Contact Info *</Label>
                  <Input
                    id="contact_info"
                    required
                    value={activityForm.contact_info}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, contact_info: e.target.value }))}
                    placeholder="email@example.com or phone number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Name</Label>
                    <Input
                      id="contact_name"
                      value={activityForm.contact_name}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_company">Company</Label>
                    <Input
                      id="contact_company"
                      value={activityForm.contact_company}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, contact_company: e.target.value }))}
                      placeholder="Company Name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={activityForm.notes}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">Add Activity</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {campaign.description && (
          <p className="text-sm text-muted-foreground mb-4">{campaign.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Channel</p>
            <p className="text-sm font-medium capitalize">{campaign.channel}</p>
          </div>
          {campaign.start_date && (
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="text-sm font-medium">
                {format(new Date(campaign.start_date), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activities yet. Add your first activity to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activities</p>
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {activity.activity_type}
                    </Badge>
                    {activity.contact_name && (
                      <span className="text-sm font-medium">{activity.contact_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activity.contact_info}
                    {activity.contact_company && ` • ${activity.contact_company}`}
                  </p>
                  {activity.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  )}
                </div>
                <div>
                  {activity.status === 'converted' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : activity.status === 'failed' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

