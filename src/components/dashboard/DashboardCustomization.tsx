import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SidebarPreferences {
  showBizMapAI: boolean;
  showPMFLab: boolean;
  showTechStack: boolean;
  showAcceleratorHunt: boolean;
  showInsighta: boolean;
  showCommunity: boolean;
  showRead: boolean;
}

const DEFAULT_PREFERENCES: SidebarPreferences = {
  showBizMapAI: true,
  showPMFLab: false,
  showTechStack: false,
  showAcceleratorHunt: false,
  showInsighta: false,
  showCommunity: true,
  showRead: true,
};

export const DashboardCustomization = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<SidebarPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sidebar_preferences')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.sidebar_preferences) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.sidebar_preferences });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ sidebar_preferences: preferences })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Dashboard preferences saved!');

      // Reload the page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof SidebarPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Settings className="h-4 w-4 mr-2" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Your Dashboard</DialogTitle>
          <DialogDescription>
            Choose which tools and features appear in your sidebar navigation
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* BizMap AI Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BizMap AI Suite</CardTitle>
                <CardDescription>AI-powered business planning tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="bizmap-ai" className="font-medium">BizMap AI</Label>
                    <p className="text-sm text-muted-foreground">Main AI business advisor</p>
                  </div>
                  <Switch
                    id="bizmap-ai"
                    checked={preferences.showBizMapAI}
                    onCheckedChange={() => togglePreference('showBizMapAI')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pmf-lab" className="font-medium">PMF Lab</Label>
                    <p className="text-sm text-muted-foreground">Product-Market Fit analysis</p>
                  </div>
                  <Switch
                    id="pmf-lab"
                    checked={preferences.showPMFLab}
                    onCheckedChange={() => togglePreference('showPMFLab')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="tech-stack" className="font-medium">Tech Stack Builder</Label>
                    <p className="text-sm text-muted-foreground">AI-powered tech recommendations</p>
                  </div>
                  <Switch
                    id="tech-stack"
                    checked={preferences.showTechStack}
                    onCheckedChange={() => togglePreference('showTechStack')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Insighta Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Insighta Suite</CardTitle>
                <CardDescription>Market insights and investor matching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="accelerator-hunt" className="font-medium">Accelerator Hunt</Label>
                    <p className="text-sm text-muted-foreground">Find accelerators for your startup</p>
                  </div>
                  <Switch
                    id="accelerator-hunt"
                    checked={preferences.showAcceleratorHunt}
                    onCheckedChange={() => togglePreference('showAcceleratorHunt')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="insighta" className="font-medium">Investor Matchmaker</Label>
                    <p className="text-sm text-muted-foreground">Match with relevant investors</p>
                  </div>
                  <Switch
                    id="insighta"
                    checked={preferences.showInsighta}
                    onCheckedChange={() => togglePreference('showInsighta')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Community & Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community & Learning</CardTitle>
                <CardDescription>Connect with founders and learn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="community" className="font-medium">Find a Mentor</Label>
                    <p className="text-sm text-muted-foreground">Connect with experienced mentors</p>
                  </div>
                  <Switch
                    id="community"
                    checked={preferences.showCommunity}
                    onCheckedChange={() => togglePreference('showCommunity')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="read" className="font-medium">Read</Label>
                    <p className="text-sm text-muted-foreground">Stories, articles, and resources</p>
                  </div>
                  <Switch
                    id="read"
                    checked={preferences.showRead}
                    onCheckedChange={() => togglePreference('showRead')}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={savePreferences}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
