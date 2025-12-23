import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProfilePictureCropModal } from "@/components/ProfilePictureCropModal";

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
  };
  onSuccess: () => void;
}

export const EditProfileModal = ({ open, onClose, profile, onSuccess }: EditProfileModalProps) => {
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
        full_name: formData.full_name,
        bio: formData.bio,
        bio_html: formData.bio_html,
        creative_niche: formData.creative_niche,
        business_stage: formData.business_stage,
        website_url: formData.website_url,
        twitter_url: formData.twitter_url,
        linkedin_url: formData.linkedin_url,
        instagram_url: formData.instagram_url,
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

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Tabs value={bioMode} onValueChange={(v) => setBioMode(v as 'plain' | 'rich')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-2">
                    <TabsTrigger value="plain">Plain Text</TabsTrigger>
                    <TabsTrigger value="rich">Rich Text</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="plain">
                    <Textarea
                      id="bio"
                      ref={bioTextareaRef}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value, bio_html: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      maxLength={500}
                    />
                  </TabsContent>
                  
                  <TabsContent value="rich" className="space-y-2">
                    <div className="flex gap-1 mb-2 flex-wrap">
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting('bold')}>
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting('italic')}>
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting('list')}>
                        <List className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => insertFormatting('link')}>
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      ref={bioTextareaRef}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value, bio_html: e.target.value })}
                      placeholder="Use HTML tags for formatting: <strong>bold</strong>, <em>italic</em>, <a href='url'>link</a>"
                      rows={6}
                      maxLength={1000}
                      className="font-mono text-sm"
                    />
                    <div className="p-3 border rounded-md bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: formData.bio_html || formData.bio }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.bio.length}/{bioMode === 'rich' ? '1000' : '500'} characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creative_niche">Creative Niche</Label>
                  <Select 
                    value={formData.creative_niche} 
                    onValueChange={(value) => setFormData({ ...formData, creative_niche: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual-artist">Visual Artist</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="musician">Musician</SelectItem>
                      <SelectItem value="writer">Writer</SelectItem>
                      <SelectItem value="filmmaker">Filmmaker</SelectItem>
                      <SelectItem value="photographer">Photographer</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                      <SelectItem value="content-creator">Content Creator</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="business_stage">Project Stage</Label>
                  <Select 
                    value={formData.business_stage} 
                    onValueChange={(value) => setFormData({ ...formData, business_stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exploring">Exploring</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                      <SelectItem value="creating">Creating</SelectItem>
                      <SelectItem value="building">Building</SelectItem>
                      <SelectItem value="launched">Launched</SelectItem>
                      <SelectItem value="growing">Growing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h4 className="font-medium">Social Links</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter_url">Twitter</Label>
                  <Input
                    id="twitter_url"
                    type="url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/username"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/username"
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
