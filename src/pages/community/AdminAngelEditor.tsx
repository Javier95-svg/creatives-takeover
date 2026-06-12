import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAngels } from "@/hooks/useAngels";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Save, Loader2, ArrowLeft, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AngelInvestor, CreateAngelInput } from "@/types/angel";
import { ANGEL_SECTOR_OPTIONS } from "@/data/angelSectors";

const INVESTMENT_STAGE_OPTIONS = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
];

const ANGEL_PICTURES_BUCKET = 'angel-pictures';

const normalizeImageMimeType = (file: File) => {
  if (file.type === 'image/jpg') {
    return 'image/jpeg';
  }

  return file.type;
};

const AdminAngelEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const unauthorizedRedirectHandled = useRef(false);
  const initialFormRef = useRef<string>("");
  const [formData, setFormData] = useState<CreateAngelInput>({
    name: "",
    picture: null,
    firm_name: "",
    investment_stages: [],
    sectors: [],
    email: null,
    website_url: null,
    linkedin_url: null,
    twitter_x_url: null,
    is_active: true,
  });

  const loadAngel = useCallback(async (angelId: string) => {
    const found = await fetchAngelById(angelId);

    if (found) {
      setAngel(found);
      const loadedForm: CreateAngelInput = {
        name: found.name,
        picture: found.picture || null,
        firm_name: found.firm_name,
        investment_stages: found.investment_stages || [],
        sectors: found.sectors || [],
        email: found.email || null,
        website_url: found.website_url || null,
        linkedin_url: found.linkedin_url || null,
        twitter_x_url: found.twitter_x_url || null,
        is_active: found.is_active !== false,
      };
      setFormData(loadedForm);
      initialFormRef.current = JSON.stringify(loadedForm);
      setIsDirty(false);
      if (found.picture) {
        setPicturePreview(found.picture);
      }
    }
  }, [fetchAngelById]);

  // Track dirty state by comparing current form to initial snapshot
  useEffect(() => {
    if (initialFormRef.current) {
      setIsDirty(JSON.stringify(formData) !== initialFormRef.current);
    } else if (formData.name || formData.firm_name) {
      // New angel: dirty as soon as any content is entered
      setIsDirty(true);
    }
  }, [formData]);

  // Warn before closing/refreshing with unsaved changes (fix 5a)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('No file selected');
      return;
    }

    // image/jpg is non-standard but commonly reported by Windows/Edge for JPEG files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
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

      const normalizedContentType = normalizeImageMimeType(file);

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileId = angel?.id || 'temp';
      const fileName = `${fileId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(ANGEL_PICTURES_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: normalizedContentType,
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message || 'Storage error'}`, { id: 'upload-picture' });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(ANGEL_PICTURES_BUCKET)
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
          // Upload succeeded — the file is in Storage and the URL is in formData.
          // Auto-save failed (schema/RLS issue). Don't throw and don't reset the
          // preview — the user can still persist the picture by clicking Save.
          console.error('Picture uploaded but auto-save to angel_investors failed:', {
            message: dbError.message,
            code: dbError.code,
            details: dbError.details,
            hint: dbError.hint,
          });
          toast.warning(
            `Picture uploaded but could not auto-save: ${dbError.message}. Click Save to persist.`,
            { id: 'save-picture' }
          );
        } else {
          setAngel({ ...angel, picture: publicUrl });
          toast.success('Picture uploaded and saved successfully!', { id: 'save-picture' });
        }
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

  // Wait for auth to load before checking admin status
  useEffect(() => {
    if (authLoading || adminLoading) return; // Wait for auth and role checks to settle

    if (!isAdmin) {
      if (unauthorizedRedirectHandled.current) return;

      unauthorizedRedirectHandled.current = true;
      toast.error("Only admins can access this page");
      navigate("/investors", { replace: true });
      return;
    }

    if (id && id !== "new") {
      loadAngel(id);
    }
  }, [adminLoading, authLoading, id, isAdmin, loadAngel, navigate]);

  const toggleSector = (sector: string) => {
    setFormData((prev) => {
      const current = prev.sectors || [];
      const newSectors = current.includes(sector)
        ? current.filter((value) => value !== sector)
        : [...current, sector];
      return { ...prev, sectors: newSectors };
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
        sectors: formData.sectors || [],
        email: formData.email || null,
        website_url: formData.website_url || null,
        linkedin_url: formData.linkedin_url || null,
        twitter_x_url: formData.twitter_x_url || null,
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
        setIsDirty(false); // Clear dirty flag before navigating
        toast.success(angel ? "Angel investor updated!" : "Angel investor created!");
        navigate("/investors");
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

    const success = await deleteAngel(angel.id);
    if (success) {
      setIsDirty(false); // Prevent beforeunload warning after delete
      navigate("/investors");
    }
  };

  // Show loading while auth is settling
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        {/* FIX(dead-click): /investors/admin/edit/[id] — unauthorized users now see a non-interactive redirect state instead of briefly rendering the editor shell. */}
        <div className="max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Redirecting to Find your Angel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin editing is restricted, so this page is redirecting you back to the angel marketplace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-header-offset pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/investors">
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
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={loading}>
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
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handlePictureUpload}
                      disabled={uploadingPicture}
                      className={uploadingPicture ? "pointer-events-none cursor-not-allowed opacity-50" : "cursor-pointer"}
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
                        disabled={loading || saving || uploadingPicture}
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

              <div>
                <Label>Sectors</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ANGEL_SECTOR_OPTIONS.map((sector) => {
                    const isSelected = formData.sectors?.includes(sector) || false;
                    return (
                      <Button
                        key={sector}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSector(sector)}
                        disabled={loading || saving || uploadingPicture}
                      >
                        {sector}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tag this investor with one or more sectors they invest in.
                </p>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value || null }))
                    }
                    placeholder="investor@example.com"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact email
                  </p>
                </div>
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
                <div>
                  <Label htmlFor="twitter_x_url">X Profile URL</Label>
                  <Input
                    id="twitter_x_url"
                    type="url"
                    value={formData.twitter_x_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, twitter_x_url: e.target.value || null }))
                    }
                    placeholder="https://x.com/username"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    X (Twitter) profile URL
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

      {/* Delete Confirmation Dialog (fix 5b: styled AlertDialog) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Angel Investor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{angel?.name}</strong>? This action cannot be undone and will permanently remove their profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAngelEditor;
