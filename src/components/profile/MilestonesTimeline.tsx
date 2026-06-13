import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  Users,
  DollarSign,
  Rocket,
  Handshake,
  TrendingUp,
  Plus,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeAccountabilityPreferences } from "@/lib/accountabilityPreferences";

interface Milestone {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  milestone_type: string;
  achieved_at: string;
  is_pinned: boolean;
  created_at: string;
}

interface MilestonesTimelineProps {
  userId: string;
  isOwnProfile: boolean;
}

const milestoneIcons: Record<string, React.ElementType> = {
  'idea-validated': Lightbulb,
  'waitlist-launched': Users,
  'first-user': CheckCircle2,
  'first-revenue': DollarSign,
  'funding': TrendingUp,
  'launch': Rocket,
  'partnership': Handshake,
  'custom': CheckCircle2,
};

const milestoneColors: Record<string, string> = {
  'idea-validated': 'bg-warning',
  'waitlist-launched': 'bg-info',
  'first-user': 'bg-success',
  'first-revenue': 'bg-success',
  'funding': 'bg-purple-500',
  'launch': 'bg-warning',
  'partnership': 'bg-pink-500',
  'custom': 'bg-gray-500',
};

export const MilestonesTimeline = ({ userId, isOwnProfile }: MilestonesTimelineProps) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, unknown> | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    description: "",
    milestone_type: "custom",
  });

  const loadMilestones = useCallback(async () => {
    try {
      const profileQuery = isOwnProfile
        ? supabase
            .from('profiles')
            .select('full_name, user_preferences')
            .eq('id', userId)
            .maybeSingle()
        : supabase
            .from('public_profiles')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle();

      const [milestonesResult, profileResult] = await Promise.all([
        supabase
          .from('founder_milestones')
          .select('*')
          .eq('user_id', userId)
          .order('achieved_at', { ascending: false }),
        profileQuery,
      ]);

      if (milestonesResult.error) throw milestonesResult.error;
      if (profileResult.error) throw profileResult.error;
      const profileData = profileResult.data as {
        full_name?: string | null;
        user_preferences?: Record<string, unknown> | null;
      } | null;
      setMilestones(milestonesResult.data || []);
      setProfilePreferences(profileData?.user_preferences ?? null);
      setProfileName(profileData?.full_name ?? null);
    } catch (error) {
      console.error('Error loading milestones:', error);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, userId]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) {
      toast.error("Milestone title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('founder_milestones')
        .insert({
          user_id: userId,
          title: newMilestone.title.trim(),
          description: newMilestone.description.trim() || null,
          milestone_type: newMilestone.milestone_type,
          achieved_at: new Date().toISOString(),
          is_pinned: false,
        });

      if (error) throw error;

      const preferences = normalizeAccountabilityPreferences(profilePreferences);
      if (preferences.auto_share_milestones) {
        const { error: shareError } = await supabase
          .from('community_posts')
          .insert({
            user_id: userId,
            title: `${newMilestone.title.trim()}`,
            content: `${profileName || 'A founder'} just completed a milestone: ${newMilestone.title.trim()}${newMilestone.description.trim() ? `. ${newMilestone.description.trim()}` : '.'}`,
            tags: ['milestone', 'progress', newMilestone.milestone_type],
          });

        if (shareError) {
          console.error('Failed to auto-share milestone', shareError);
          toast.error('Milestone saved, but community sharing failed.');
        }
      }

      toast.success("Milestone added");
      setNewMilestone({
        title: "",
        description: "",
        milestone_type: "custom",
      });
      setIsDialogOpen(false);
      await loadMilestones();
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast.error('Failed to add milestone');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <>
        <Card className="p-8 text-center">
          <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Milestones Yet</h3>
          <p className="text-muted-foreground mb-4">
            {isOwnProfile
              ? "Start tracking your startup journey by adding your first milestone!"
              : "This founder hasn't added any milestones yet."}
          </p>
          {isOwnProfile && (
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Milestone
            </Button>
          )}
        </Card>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Record the milestone that moved your startup forward. If auto-share is enabled, this can also become a simple community progress post.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="milestone_title_empty">Title</Label>
                <Input
                  id="milestone_title_empty"
                  value={newMilestone.title}
                  onChange={(event) => setNewMilestone((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Shipped the waitlist page"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone_type_empty">Type</Label>
                <Select
                  value={newMilestone.milestone_type}
                  onValueChange={(value) => setNewMilestone((current) => ({ ...current, milestone_type: value }))}
                >
                  <SelectTrigger id="milestone_type_empty">
                    <SelectValue placeholder="Select milestone type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea-validated">Idea Validated</SelectItem>
                    <SelectItem value="waitlist-launched">Waitlist Launched</SelectItem>
                    <SelectItem value="first-user">First User</SelectItem>
                    <SelectItem value="first-revenue">First Revenue</SelectItem>
                    <SelectItem value="funding">Funding</SelectItem>
                    <SelectItem value="launch">Launch</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone_description_empty">What happened?</Label>
                <Textarea
                  id="milestone_description_empty"
                  value={newMilestone.description}
                  onChange={(event) => setNewMilestone((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What changed, what did you ship, or what did you learn?"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddMilestone} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Milestone'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Milestone Timeline</h3>
        {isOwnProfile && (
          <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Milestones */}
        <div className="space-y-6">
          {milestones.map((milestone) => {
            const Icon = milestoneIcons[milestone.milestone_type] || CheckCircle2;
            const colorClass = milestoneColors[milestone.milestone_type] || 'bg-gray-500';

            return (
              <div key={milestone.id} className="relative pl-14">
                {/* Icon */}
                <div className={`absolute left-0 p-2 rounded-full ${colorClass} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <Card className={`p-4 ${milestone.is_pinned ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{milestone.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(milestone.achieved_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {milestone.is_pinned && (
                      <Badge variant="secondary" className="text-xs">
                        Pinned
                      </Badge>
                    )}
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>
              Record the milestone that moved your startup forward. If auto-share is enabled, this can also become a simple community progress post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="milestone_title">Title</Label>
              <Input
                id="milestone_title"
                value={newMilestone.title}
                onChange={(event) => setNewMilestone((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Shipped the waitlist page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone_type">Type</Label>
              <Select
                value={newMilestone.milestone_type}
                onValueChange={(value) => setNewMilestone((current) => ({ ...current, milestone_type: value }))}
              >
                <SelectTrigger id="milestone_type">
                  <SelectValue placeholder="Select milestone type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea-validated">Idea Validated</SelectItem>
                  <SelectItem value="waitlist-launched">Waitlist Launched</SelectItem>
                  <SelectItem value="first-user">First User</SelectItem>
                  <SelectItem value="first-revenue">First Revenue</SelectItem>
                  <SelectItem value="funding">Funding</SelectItem>
                  <SelectItem value="launch">Launch</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone_description">What happened?</Label>
              <Textarea
                id="milestone_description"
                value={newMilestone.description}
                onChange={(event) => setNewMilestone((current) => ({ ...current, description: event.target.value }))}
                placeholder="What changed, what did you ship, or what did you learn?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddMilestone} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Milestone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
