import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProfilePictureCropModal } from "@/components/ProfilePictureCropModal";
import {
  mergeAccountabilityPreferences,
  normalizeAccountabilityPreferences,
} from "@/lib/accountabilityPreferences";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: {
    id: string;
    full_name: string | null;
    bio: string | null;
    bio_html: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    creative_niche: string | null;
    business_stage: string | null;
    website_url: string | null;
    twitter_url: string | null;
    linkedin_url: string | null;
    instagram_url: string | null;
    github_url: string | null;
    role: string | null;

    // Founder fields
    founder_role: string | null;
    location: string | null;
    positioning_line: string | null;

    // Startup fields
    startup_name: string | null;
    startup_tagline: string | null;
    startup_stage: string | null;
    startup_industry: string[] | null;
    startup_description: string | null;
    current_focus: string | null;
    looking_for: string[] | null;
    startup_links: any | null;
    user_preferences?: Record<string, unknown> | null;
  };
  onSuccess: () => void;
}

export const EditProfileModal = ({ open, onClose, profile, onSuccess }: EditProfileModalProps) => {
  const accountabilityPreferences = normalizeAccountabilityPreferences(profile.user_preferences);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    bio: profile.bio || "",
    bio_html: profile.bio_html || "",
    creative_niche: profile.creative_niche || "",
    business_stage: profile.business_stage || "",
    website_url: profile.website_url || "",
    twitter_url: profile.twitter_url || "",
    linkedin_url: profile.linkedin_url || "",
    instagram_url: profile.instagram_url || "",
    github_url: profile.github_url || "",
    role: profile.role || "",

    // Founder fields
    founder_role: profile.founder_role || "",
    location: profile.location || "",
    positioning_line: profile.positioning_line || "",

    // Startup fields
    startup_name: profile.startup_name || "",
    startup_tagline: profile.startup_tagline || "",
    startup_stage: profile.startup_stage || "",
    startup_industry: profile.startup_industry || [],
    startup_description: profile.startup_description || "",
    current_focus: profile.current_focus || "",
    looking_for: profile.looking_for || [],

    // Startup links
    pitch_deck_url: profile.startup_links?.pitchDeck || "",
    waitlist_url: profile.startup_links?.waitlist || "",
    demo_url: profile.startup_links?.demo || "",
    loom_url: profile.startup_links?.loom || "",
    weekly_checkin_day: accountabilityPreferences.weekly_checkin_day,
    weekly_scorecard_local_hour: String(accountabilityPreferences.weekly_scorecard_local_hour),
    public_stage_visible: accountabilityPreferences.public_stage_visible,
    auto_share_milestones: accountabilityPreferences.auto_share_milestones,
    timezone: accountabilityPreferences.timezone,
  });
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [bioMode, setBioMode] = useState<'plain' | 'rich'>('plain');
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarFile(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const insertFormatting = (tag: string) => {
    const textarea = bioTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.bio.substring(start, end);
    
    let formattedText = '';
    switch (tag) {
      case 'bold':
        formattedText = `<strong>${selectedText || 'bold text'}</strong>`;
        break;
      case 'italic':
        formattedText = `<em>${selectedText || 'italic text'}</em>`;
        break;
      case 'list':
        formattedText = `<ul><li>${selectedText || 'list item'}</li></ul>`;
        break;
      case 'link':
        formattedText = `<a href="url">${selectedText || 'link text'}</a>`;
        break;
    }

    const newBio = formData.bio.substring(0, start) + formattedText + formData.bio.substring(end);
    setFormData({ ...formData, bio: newBio, bio_html: newBio });
  };

  const handleCropComplete = async (blob: Blob) => {
    try {
      const fileName = `${profile.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      toast.success("Profile picture updated!");
      setShowCropModal(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || "Failed to update profile picture");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        user_preferences: mergeAccountabilityPreferences(profile.user_preferences, {
          weekly_checkin_day: formData.weekly_checkin_day,
          weekly_scorecard_local_hour: Number(formData.weekly_scorecard_local_hour),
          public_stage_visible: formData.public_stage_visible,
          auto_share_milestones: formData.auto_share_milestones,
          timezone: formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          stage_last_updated_at:
            formData.business_stage !== (profile.business_stage || '')
              ? new Date().toISOString()
              : accountabilityPreferences.stage_last_updated_at,
        }),
        full_name: formData.full_name,
        bio: formData.bio,
        bio_html: formData.bio_html,
        creative_niche: formData.creative_niche,
        business_stage: formData.business_stage,
        website_url: formData.website_url,
        twitter_url: formData.twitter_url,
        linkedin_url: formData.linkedin_url,
        instagram_url: formData.instagram_url,
        github_url: formData.github_url,
        role: formData.role || null,

        // Founder fields
        founder_role: formData.founder_role || null,
        location: formData.location || null,
        positioning_line: formData.positioning_line || null,

        // Startup fields
        startup_name: formData.startup_name || null,
        startup_tagline: formData.startup_tagline || null,
        startup_stage: formData.startup_stage || null,
        startup_industry: formData.startup_industry.length > 0 ? formData.startup_industry : null,
        startup_description: formData.startup_description || null,
        current_focus: formData.current_focus || null,
        looking_for: formData.looking_for.length > 0 ? formData.looking_for : null,

        // Startup links as JSONB
        startup_links: {
          pitchDeck: formData.pitch_deck_url || undefined,
          waitlist: formData.waitlist_url || undefined,
          demo: formData.demo_url || undefined,
          loom: formData.loom_url || undefined,
        },
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {formData.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Change Picture
                    </span>
                  </Button>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
            </div>

            {/* Founder Information */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Founder Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="founder_role">Startup Role</Label>
                  <Select
                    value={formData.founder_role}
                    onValueChange={(value) => setFormData({ ...formData, founder_role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="founder">Founder</SelectItem>
                      <SelectItem value="co-founder">Co-Founder</SelectItem>
                      <SelectItem value="cto">Chief Technology Officer (CTO)</SelectItem>
                      <SelectItem value="cmo">Chief Marketing Officer (CMO)</SelectItem>
                      <SelectItem value="investor">Investor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="positioning_line">One-Line Positioning</Label>
                <Input
                  id="positioning_line"
                  value={formData.positioning_line}
                  onChange={(e) => setFormData({ ...formData, positioning_line: e.target.value })}
                  placeholder="e.g., Building AI tools for creators"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A brief tagline about what you're building
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Accountability Preferences</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weekly_checkin_day">Weekly Commitment Day</Label>
                  <Select
                    value={formData.weekly_checkin_day}
                    onValueChange={(value) => setFormData({ ...formData, weekly_checkin_day: value })}
                  >
                    <SelectTrigger id="weekly_checkin_day">
                      <SelectValue placeholder="Choose a day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="weekly_scorecard_local_hour">Weekly Scorecard Hour</Label>
                  <Select
                    value={formData.weekly_scorecard_local_hour}
                    onValueChange={(value) => setFormData({ ...formData, weekly_scorecard_local_hour: value })}
                  >
                    <SelectTrigger id="weekly_scorecard_local_hour">
                      <SelectValue placeholder="Choose an hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {hour.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                Local timezone for scorecards: <span className="font-medium text-foreground">{formData.timezone}</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Show stage on public profile</p>
                    <p className="text-xs text-muted-foreground">Off by default. Enable only if you want stage progress visible to the community.</p>
                  </div>
                  <Switch
                    checked={formData.public_stage_visible}
                    onCheckedChange={(checked) => setFormData({ ...formData, public_stage_visible: checked })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Auto-share meaningful milestones</p>
                    <p className="text-xs text-muted-foreground">When you add a milestone, create a simple progress post in the community feed automatically.</p>
                  </div>
                  <Switch
                    checked={formData.auto_share_milestones}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_share_milestones: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Startup Information */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Startup Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startup_name">Startup Name</Label>
                  <Input
                    id="startup_name"
                    value={formData.startup_name}
                    onChange={(e) => setFormData({ ...formData, startup_name: e.target.value })}
                    placeholder="Your startup name"
                  />
                </div>

                <div>
                  <Label htmlFor="startup_stage">Startup Stage</Label>
                  <Select
                    value={formData.startup_stage}
                    onValueChange={(value) => setFormData({ ...formData, startup_stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="prototype">Prototype</SelectItem>
                      <SelectItem value="mvp">MVP</SelectItem>
                      <SelectItem value="launch">Launch</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="startup_tagline">Tagline</Label>
                <Input
                  id="startup_tagline"
                  value={formData.startup_tagline}
                  onChange={(e) => setFormData({ ...formData, startup_tagline: e.target.value })}
                  placeholder="One sentence about your startup"
                  maxLength={120}
                />
              </div>

              <div>
                <Label htmlFor="startup_description">Description</Label>
                <Textarea
                  id="startup_description"
                  value={formData.startup_description}
                  onChange={(e) => setFormData({ ...formData, startup_description: e.target.value })}
                  placeholder="Describe your startup, the problem you're solving, and your solution..."
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div>
                <Label htmlFor="current_focus">What Inspires You?</Label>
                <Input
                  id="current_focus"
                  value={formData.current_focus}
                  onChange={(e) => setFormData({ ...formData, current_focus: e.target.value })}
                  placeholder="Share what drives and motivates you..."
                  maxLength={150}
                />
              </div>
            </div>

            {/* Startup Links */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Startup Links</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pitch_deck_url">Pitch Deck</Label>
                  <Input
                    id="pitch_deck_url"
                    type="url"
                    value={formData.pitch_deck_url}
                    onChange={(e) => setFormData({ ...formData, pitch_deck_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="waitlist_url">Crunchbase</Label>
                  <Input
                    id="waitlist_url"
                    type="url"
                    value={formData.waitlist_url}
                    onChange={(e) => setFormData({ ...formData, waitlist_url: e.target.value })}
                    placeholder="https://crunchbase.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="demo_url">Website</Label>
                  <Input
                    id="demo_url"
                    type="url"
                    value={formData.demo_url}
                    onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="loom_url">Loom Presentation</Label>
                  <Input
                    id="loom_url"
                    type="url"
                    value={formData.loom_url}
                    onChange={(e) => setFormData({ ...formData, loom_url: e.target.value })}
                    placeholder="https://loom.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Social Links</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="github_url">GitHub</Label>
                  <Input
                    id="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="twitter_url">X</Label>
                  <Input
                    id="twitter_url"
                    type="url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    placeholder="https://x.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {avatarFile && (
        <ProfilePictureCropModal
          open={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setAvatarFile(null);
          }}
          imageUrl={avatarFile}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};
