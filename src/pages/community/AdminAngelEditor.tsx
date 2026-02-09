import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAngels } from "@/hooks/useAngels";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Loader2, ArrowLeft, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AngelInvestor, CreateAngelInput } from "@/types/angel";

const INVESTMENT_STAGE_OPTIONS = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
];

const AdminAngelEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === "admin@creatives-takeover.com";
  const {
    fetchAngelById,
    createAngel,
    updateAngel,
    deleteAngel,
    loading,
  } = useAngels();

  const [angel, setAngel] = useState<AngelInvestor | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateAngelInput>({
    name: "",
    picture: null,
    firm_name: "",
    investment_stages: [],
    website_url: null,
    linkedin_url: null,
    is_active: true,
  });

  // Wait for auth to load before checking admin status
  useEffect(() => {
    if (authLoading) return; // Wait for auth to settle

    if (!isAdmin) {
      toast.error("Only admins can access this page");
      navigate("/community/angels");
      return;
    }

    if (id && id !== "new") {
      loadAngel(id);
    }
  }, [id, isAdmin, authLoading, navigate]);

  const loadAngel = async (angelId: string) => {
    const found = await fetchAngelById(angelId);

    if (found) {
      setAngel(found);
      setFormData({
        name: found.name,
        picture: found.picture || null,
        firm_name: found.firm_name,
        investment_stages: found.investment_stages || [],
        website_url: found.website_url || null,
        linkedin_url: found.linkedin_url || null,
        is_active: found.is_active !== false,
      });
      if (found.picture) {
        setPicturePreview(found.picture);
      }
    }
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('No file selected');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    const maxSize = 5242880; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    try {
      setUploadingPicture(true);
      toast.loading('Uploading picture...', { id: 'upload-picture' });

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileId = angel?.id || 'temp';
      const fileName = `${fileId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('angel-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message || 'Storage error'}`, { id: 'upload-picture' });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('angel-pictures')
        .getPublicUrl(fileName);

      setFormData((prev) => ({
        ...prev,
        picture: publicUrl,
      }));
      setPicturePreview(publicUrl);

      // Save picture immediately if angel exists
      if (angel?.id) {
        toast.loading('Saving to database...', { id: 'save-picture' });
        const { error: dbError } = await (supabase as any)
          .from('angel_investors')
          .update({ picture: publicUrl })
          .eq('id', angel.id);

        if (dbError) {
          toast.error(`Failed to save picture: ${dbError.message}`, { id: 'save-picture' });
          throw dbError;
        }

        setAngel({ ...angel, picture: publicUrl });
        toast.success('Picture uploaded and saved successfully!', { id: 'save-picture' });
      } else {
        toast.success('Picture uploaded! It will be saved when you create the profile.', { id: 'upload-picture' });
      }
    } catch (error: any) {
      console.error('Error uploading picture:', error);
      toast.error(`Failed to upload picture: ${error?.message || 'Unknown error'}`, { id: 'upload-picture' });

      if (angel?.picture) {
        setPicturePreview(angel.picture);
      } else {
        setPicturePreview(null);
      }
    } finally {
      setUploadingPicture(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemovePicture = () => {
    setFormData((prev) => ({ ...prev, picture: null }));
    setPicturePreview(null);
    toast.success('Picture removed');
  };

  const toggleStage = (stage: string) => {
    setFormData((prev) => {
      const current = prev.investment_stages || [];
      const newStages = current.includes(stage)
        ? current.filter((s) => s !== stage)
        : [...current, stage];
      return { ...prev, investment_stages: newStages };
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.firm_name) {
      toast.error("Please fill in name and venture capital firm");
      return;
    }

    if (!formData.investment_stages || formData.investment_stages.length === 0) {
      toast.error("Please select at least one investment stage");
      return;
    }

    try {
      setSaving(true);

      const saveData: CreateAngelInput = {
        name: formData.name,
        picture: formData.picture || null,
        firm_name: formData.firm_name,
        investment_stages: formData.investment_stages || [],
        website_url: formData.website_url || null,
        linkedin_url: formData.linkedin_url || null,
        is_active: formData.is_active !== undefined ? formData.is_active : true,
      };

      console.log('Saving angel investor:', saveData);

      let result: AngelInvestor | null = null;
      if (angel) {
        result = await updateAngel(angel.id, saveData);
      } else {
        result = await createAngel(saveData);
      }

      if (result) {
        toast.success(angel ? "Angel investor updated!" : "Angel investor created!");
        navigate("/community/angels");
      } else {
        toast.error("Failed to save. Please check the browser console for details.");
      }
    } catch (error: any) {
      console.error('Error saving angel investor:', error);
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!angel) return;

    if (confirm("Are you sure you want to delete this angel investor?")) {
      const success = await deleteAngel(angel.id);
      if (success) {
        navigate("/community/angels");
      }
    }
  };

  // Show loading while auth is settling
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/community/angels">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  {angel ? "Edit Angel Investor" : "Create New Angel Investor"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {angel ? `Editing: ${angel.name}` : "Create a new angel investor profile"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {angel && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading || saving || uploadingPicture}
              >
                {(loading || saving) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Angel Investor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Picture Upload */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={picturePreview || formData.picture || undefined}
                    alt={formData.name || 'Angel Investor'}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl">
                    {formData.name ? formData.name[0].toUpperCase() : <User className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePictureUpload}
                      disabled={uploadingPicture}
                      className="cursor-pointer"
                    />
                    {(picturePreview || formData.picture) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemovePicture}
                        disabled={uploadingPicture}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a profile picture (max 5MB). Supported: JPEG, PNG, WebP, GIF.
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter investor's full name"
                  className="mt-1"
                />
              </div>

              {/* Venture Capital Firm */}
              <div>
                <Label htmlFor="firm_name">Venture Capital Firm *</Label>
                <Input
                  id="firm_name"
                  value={formData.firm_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, firm_name: e.target.value }))
                  }
                  placeholder="Enter VC firm name (e.g., Andreessen Horowitz)"
                  className="mt-1"
                />
              </div>

              {/* Investment Stages (Multi-select toggle buttons) */}
              <div>
                <Label>Investment Stages *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {INVESTMENT_STAGE_OPTIONS.map((stage) => {
                    const isSelected = formData.investment_stages?.includes(stage) || false;
                    return (
                      <Button
                        key={stage}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleStage(stage)}
                      >
                        {stage}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select all investment stages this investor focuses on.
                </p>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website_url: e.target.value || null }))
                    }
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Firm or personal website URL
                  </p>
                </div>
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, linkedin_url: e.target.value || null }))
                    }
                    placeholder="https://linkedin.com/in/username"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    LinkedIn profile URL
                  </p>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Profile is visible to users
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminAngelEditor;
