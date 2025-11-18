import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useOutreachCampaigns } from '@/hooks/useOutreachCampaigns';
import { CampaignTracker } from './CampaignTracker';
import { OutreachMetrics } from './OutreachMetrics';
import { CustomerFunnel } from './CustomerFunnel';
import { Mail, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

export const OutreachHub = () => {
  const { campaigns, isLoading, createCampaign, generateTemplate, isGeneratingTemplate } = useOutreachCampaigns();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'email' as 'email' | 'linkedin' | 'whatsapp' | 'sms' | 'twitter' | 'other',
    start_date: new Date().toISOString().split('T')[0],
    target_contacts: '',
    budget: '',
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    createCampaign({
      name: formData.name,
      description: formData.description || null,
      channel: formData.channel,
      status: 'draft',
      start_date: formData.start_date || null,
      end_date: null,
      budget: parseFloat(formData.budget) || 0,
      target_contacts: parseInt(formData.target_contacts) || 0,
      session_id: null,
    });

    setFormData({
      name: '',
      description: '',
      channel: 'email',
      start_date: new Date().toISOString().split('T')[0],
      target_contacts: '',
      budget: '',
    });
    setIsDialogOpen(false);
  };

  const handleGenerateTemplate = async () => {
    // This would integrate with BizMap AI to generate outreach templates
    // For now, we'll just show a placeholder
    generateTemplate({
      business_idea: 'Your business idea',
      channel: formData.channel,
    });
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5 text-primary" />
          Outreach Strategy
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Outreach Campaign</DialogTitle>
              <DialogDescription>
                Set up a new customer acquisition campaign.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Q1 Email Campaign"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Campaign description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, channel: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_contacts">Target Contacts</Label>
                  <Input
                    id="target_contacts"
                    type="number"
                    value={formData.target_contacts}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_contacts: e.target.value }))}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateTemplate}
                  disabled={isGeneratingTemplate}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGeneratingTemplate ? 'Generating...' : 'Generate Template'}
                </Button>
                <Button type="submit" className="flex-1">
                  Create Campaign
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first outreach campaign to start tracking customer acquisition
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              Create First Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Campaign List */}
            <div>
              <p className="text-sm font-medium mb-3">Your Campaigns</p>
              <div className="space-y-3">
                {campaigns.slice(0, 3).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCampaign(selectedCampaign === campaign.id ? null : campaign.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{campaign.name}</p>
                          <Badge variant="outline" className="capitalize">
                            {campaign.channel}
                          </Badge>
                          <Badge className={campaign.status === 'active' ? 'bg-green-500' : ''}>
                            {campaign.status}
                          </Badge>
                        </div>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground">{campaign.description}</p>
                        )}
                        {campaign.start_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Started {format(new Date(campaign.start_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Campaign Details */}
            {selectedCampaignData && (
              <div className="border-t pt-6">
                <Tabs defaultValue="tracker" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tracker">Tracker</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="funnel">Funnel</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tracker" className="mt-4">
                    <CampaignTracker campaign={selectedCampaignData} />
                  </TabsContent>
                  <TabsContent value="metrics" className="mt-4">
                    <OutreachMetrics campaignId={selectedCampaignData.id} />
                  </TabsContent>
                  <TabsContent value="funnel" className="mt-4">
                    <CustomerFunnel campaignId={selectedCampaignData.id} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

