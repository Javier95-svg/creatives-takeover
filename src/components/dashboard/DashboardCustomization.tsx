import { useState, useEffect, useCallback } from 'react';
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
  showICPBuilder: boolean;
  showWaitlistMaker: boolean;
  showPMFLab: boolean;
  showMVPBuilder: boolean;
  showTechStack: boolean;
  showGTMStrategist: boolean;
  showDirectories: boolean;
  showFindMentor: boolean;
  showFindCoFounder: boolean;
  showFindAngel: boolean;
  showVCSearch: boolean;
  showAcceleratorHunt: boolean;
  showEmailTemplates: boolean;
  showPitchDeckAnalyzer: boolean;
  showInsightaTest: boolean;
  showNewspaper: boolean;
  showPromptLibrary: boolean;
}

type LegacySidebarPreferences = Partial<SidebarPreferences> & {
  showCommunity?: boolean;
  showRead?: boolean;
};

const DEFAULT_PREFERENCES: SidebarPreferences = {
  showICPBuilder: true,
  showWaitlistMaker: true,
  showPMFLab: true,
  showMVPBuilder: true,
  showTechStack: true,
  showGTMStrategist: true,
  showDirectories: true,
  showFindMentor: true,
  showFindCoFounder: true,
  showFindAngel: true,
  showVCSearch: true,
  showAcceleratorHunt: true,
  showEmailTemplates: true,
  showPitchDeckAnalyzer: true,
  showInsightaTest: true,
  showNewspaper: true,
  showPromptLibrary: true,
};

const normalizePreferences = (raw: LegacySidebarPreferences | null | undefined): SidebarPreferences => {
  const merged: SidebarPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(raw || {}),
  };

  if (raw && typeof raw.showFindMentor === 'undefined' && typeof raw.showCommunity === 'boolean') {
    merged.showFindMentor = raw.showCommunity;
  }

  if (raw && typeof raw.showNewspaper === 'undefined' && typeof raw.showRead === 'boolean') {
    merged.showNewspaper = raw.showRead;
  }

  return merged;
};

interface ToggleItemProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

const ToggleItem = ({ id, title, description, checked, onToggle }: ToggleItemProps) => (
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label htmlFor={id} className="font-medium">{title}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onToggle} />
  </div>
);

export const DashboardCustomization = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<SidebarPreferences>(DEFAULT_PREFERENCES);

  const loadPreferences = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sidebar_preferences')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setPreferences(normalizePreferences(data?.sidebar_preferences as LegacySidebarPreferences));
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

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
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-xs">
          <Settings className="h-4 w-4 mr-2" />
          Customize your Experience
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BizMap AI</CardTitle>
                <CardDescription>Business planning and execution submenu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleItem
                  id="icp-builder"
                  title="ICP Builder"
                  description="Define your ideal customer profile"
                  checked={preferences.showICPBuilder}
                  onToggle={() => togglePreference('showICPBuilder')}
                />
                <ToggleItem
                  id="waitlist-maker"
                  title="Demo Studio"
                  description="Create and publish your waitlist page"
                  checked={preferences.showWaitlistMaker}
                  onToggle={() => togglePreference('showWaitlistMaker')}
                />
                <ToggleItem
                  id="pmf-lab"
                  title="PMF Lab"
                  description="Product-Market Fit validation"
                  checked={preferences.showPMFLab}
                  onToggle={() => togglePreference('showPMFLab')}
                />
                <ToggleItem
                  id="mvp-builder"
                  title="MVP Builder"
                  description="Define your MVP scope and plan"
                  checked={preferences.showMVPBuilder}
                  onToggle={() => togglePreference('showMVPBuilder')}
                />
                <ToggleItem
                  id="tech-stack"
                  title="Tech Stack"
                  description="Get technical stack recommendations"
                  checked={preferences.showTechStack}
                  onToggle={() => togglePreference('showTechStack')}
                />
                <ToggleItem
                  id="gtm-strategist"
                  title="GTM Strategist"
                  description="Build your go-to-market strategy"
                  checked={preferences.showGTMStrategist}
                  onToggle={() => togglePreference('showGTMStrategist')}
                />
                <ToggleItem
                  id="directories"
                  title="Directories"
                  description="Discover launch and distribution directories"
                  checked={preferences.showDirectories}
                  onToggle={() => togglePreference('showDirectories')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community</CardTitle>
                <CardDescription>Community submenu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleItem
                  id="find-mentor"
                  title="Find a Mentor"
                  description="Connect with experienced startup coaches."
                  checked={preferences.showFindMentor}
                  onToggle={() => togglePreference('showFindMentor')}
                />
                <ToggleItem
                  id="find-cofounder"
                  title="Find a Co-Founder"
                  description="Meet your business soulmate."
                  checked={preferences.showFindCoFounder}
                  onToggle={() => togglePreference('showFindCoFounder')}
                />
                <ToggleItem
                  id="find-angel"
                  title="Find your Angel"
                  description="Angel investor network."
                  checked={preferences.showFindAngel}
                  onToggle={() => togglePreference('showFindAngel')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Insighta</CardTitle>
                <CardDescription>Fundraising and investor intelligence submenu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleItem
                  id="vc-search"
                  title="VC Search"
                  description="Browse venture capital firms"
                  checked={preferences.showVCSearch}
                  onToggle={() => togglePreference('showVCSearch')}
                />
                <ToggleItem
                  id="accelerator-hunt"
                  title="Accelerator Hunt"
                  description="Find top accelerator programs"
                  checked={preferences.showAcceleratorHunt}
                  onToggle={() => togglePreference('showAcceleratorHunt')}
                />
                <ToggleItem
                  id="email-templates"
                  title="Email Templates"
                  description="Use outreach templates for fundraising"
                  checked={preferences.showEmailTemplates}
                  onToggle={() => togglePreference('showEmailTemplates')}
                />
                <ToggleItem
                  id="pitch-deck"
                  title="Pitch Deck Analyzer"
                  description="Get feedback on your pitch deck"
                  checked={preferences.showPitchDeckAnalyzer}
                  onToggle={() => togglePreference('showPitchDeckAnalyzer')}
                />
                <ToggleItem
                  id="insighta-test"
                  title="Insighta Test"
                  description="Measure fundraising readiness"
                  checked={preferences.showInsightaTest}
                  onToggle={() => togglePreference('showInsightaTest')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">More</CardTitle>
                <CardDescription>Resources and learning submenu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ToggleItem
                  id="newspaper"
                  title="Newspaper"
                  description="Read stories and founder insights"
                  checked={preferences.showNewspaper}
                  onToggle={() => togglePreference('showNewspaper')}
                />
                <ToggleItem
                  id="prompt-library"
                  title="Prompt Library"
                  description="Explore curated prompts and cases"
                  checked={preferences.showPromptLibrary}
                  onToggle={() => togglePreference('showPromptLibrary')}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={savePreferences} disabled={saving}>
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
