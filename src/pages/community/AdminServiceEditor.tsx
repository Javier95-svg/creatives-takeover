import { type ChangeEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Image, Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { supabase } from "@/integrations/supabase/client";
import type { CreateServiceInput, MarketplaceService, ServiceCategory } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import {
  generateServiceSlug,
  getDeckTypeFromFile,
  getServiceProfilePath,
  resolveServiceMessageUserIdFromEmail,
} from "@/utils/serviceMarketplace";

const BANNER_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const MAX_DECK_BYTES = 20 * 1024 * 1024;
const DEFAULT_IMAGE_FOCAL = 50;

const getImagePosition = (x?: number | null, y?: number | null) =>
  `${x ?? DEFAULT_IMAGE_FOCAL}% ${y ?? DEFAULT_IMAGE_FOCAL}%`;

const initialForm: CreateServiceInput = {
  name: "",
  slug: "",
  category: "sales",
  description: "",
  delivered_by_name: null,
  delivered_by_picture_url: null,
  delivered_by_picture_focal_x: DEFAULT_IMAGE_FOCAL,
  delivered_by_picture_focal_y: DEFAULT_IMAGE_FOCAL,
  delivered_by_user_id: null,
  delivered_by_email: null,
  banner_url: null,
  banner_focal_x: DEFAULT_IMAGE_FOCAL,
  banner_focal_y: DEFAULT_IMAGE_FOCAL,
  pitch_deck_url: null,
  pitch_deck_type: null,
  is_active: true,
  is_featured: false,
};

const AdminServiceEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { fetchServiceById, createService, updateService, deleteService, loading } = useServices();
  const [service, setService] = useState<MarketplaceService | null>(null);
  const [formData, setFormData] = useState<CreateServiceInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingByPicture, setUploadingByPicture] = useState(false);
  const [uploadingDeck, setUploadingDeck] = useState(false);

  useEffect(() => {
    if (authLoading || adminLoading) return;

    if (!isAdmin) {
      toast.error("Only admins can access this page");
      navigate("/marketplace", { replace: true });
      return;
    }

    if (id && id !== "new") {
      void loadService(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: admin editor should load only when id/auth state settles
  }, [adminLoading, authLoading, id, isAdmin, navigate]);

  const loadService = async (serviceId: string) => {
    const found = await fetchServiceById(serviceId);
    if (!found) return;

    setService(found);
    setFormData({
      name: found.name,
      slug: found.slug,
      category: found.category,
      description: found.description,
      delivered_by_name: found.delivered_by_name,
      delivered_by_picture_url: found.delivered_by_picture_url,
      delivered_by_picture_focal_x: found.delivered_by_picture_focal_x ?? DEFAULT_IMAGE_FOCAL,
      delivered_by_picture_focal_y: found.delivered_by_picture_focal_y ?? DEFAULT_IMAGE_FOCAL,
      delivered_by_user_id: found.delivered_by_user_id,
      delivered_by_email: found.delivered_by_email,
      banner_url: found.banner_url,
      banner_focal_x: found.banner_focal_x ?? DEFAULT_IMAGE_FOCAL,
      banner_focal_y: found.banner_focal_y ?? DEFAULT_IMAGE_FOCAL,
      pitch_deck_url: found.pitch_deck_url,
      pitch_deck_type: found.pitch_deck_type,
      is_active: found.is_active,
      is_featured: found.is_featured,
    });
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: service ? prev.slug : generateServiceSlug(value),
    }));
  };

  const resolveMessageUserIdFromEmail = async (email: string) => {
    const trimmedEmail = email.trim();
    const existingUserIdForSameEmail =
      service?.delivered_by_email?.trim().toLowerCase() === trimmedEmail.toLowerCase()
        ? service.delivered_by_user_id
        : null;

    if (!trimmedEmail) return null;

    const knownUserId = resolveServiceMessageUserIdFromEmail(trimmedEmail);
    if (knownUserId) return knownUserId;

    try {
      const { data, error } = await supabase.rpc("get_user_id_by_email", {
        user_email: trimmedEmail,
      });

      if (error) {
        console.warn("Could not resolve service message user from email:", error);
        return existingUserIdForSameEmail;
      }

      return typeof data === "string" && data.trim() ? data.trim() : existingUserIdForSameEmail;
    } catch (error) {
      console.warn("Could not resolve service message user from email:", error);
      return existingUserIdForSameEmail;
    }
  };

  const uploadFile = async (bucket: string, file: File, folder: string) => {
    const extension = file.name.split(".").pop() || "bin";
    const fileName = `${folder}/${Date.now()}.${extension.toLowerCase()}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  };

  const handleBannerUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!BANNER_TYPES.includes(file.type)) {
      toast.error("Upload a JPEG, PNG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BANNER_BYTES) {
      toast.error("Banner image must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingBanner(true);
      toast.loading("Uploading banner...", { id: "service-banner-upload" });
      const publicUrl = await uploadFile("service-banners", file, service?.id || "drafts");
      setFormData((prev) => ({
        ...prev,
        banner_url: publicUrl,
        banner_focal_x: DEFAULT_IMAGE_FOCAL,
        banner_focal_y: DEFAULT_IMAGE_FOCAL,
      }));
      toast.success("Banner uploaded", { id: "service-banner-upload" });
    } catch (error: any) {
      console.error("Service banner upload failed:", error);
      toast.error(error?.message || "Failed to upload banner", { id: "service-banner-upload" });
    } finally {
      setUploadingBanner(false);
      event.target.value = "";
    }
  };

  const handleByPictureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!BANNER_TYPES.includes(file.type)) {
      toast.error("Upload a JPEG, PNG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BANNER_BYTES) {
      toast.error("By picture must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingByPicture(true);
      toast.loading("Uploading by picture...", { id: "service-by-picture-upload" });
      const publicUrl = await uploadFile("service-banners", file, `delivered-by/${service?.id || "drafts"}`);
      setFormData((prev) => ({
        ...prev,
        delivered_by_picture_url: publicUrl,
        delivered_by_picture_focal_x: DEFAULT_IMAGE_FOCAL,
        delivered_by_picture_focal_y: DEFAULT_IMAGE_FOCAL,
      }));
      toast.success("By picture uploaded", { id: "service-by-picture-upload" });
    } catch (error: any) {
      console.error("Service by picture upload failed:", error);
      toast.error(error?.message || "Failed to upload by picture", { id: "service-by-picture-upload" });
    } finally {
      setUploadingByPicture(false);
      event.target.value = "";
    }
  };

  const handleDeckUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const deckType = getDeckTypeFromFile(file);
    if (!deckType) {
      toast.error("Upload a PDF or PPTX pitch deck.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_DECK_BYTES) {
      toast.error("Pitch deck must be 20MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingDeck(true);
      toast.loading("Uploading pitch deck...", { id: "service-deck-upload" });
      const publicUrl = await uploadFile("service-pitch-decks", file, service?.id || "drafts");
      setFormData((prev) => ({
        ...prev,
        pitch_deck_url: publicUrl,
        pitch_deck_type: deckType,
      }));
      toast.success("Pitch deck uploaded", { id: "service-deck-upload" });
    } catch (error: any) {
      console.error("Service pitch deck upload failed:", error);
      toast.error(error?.message || "Failed to upload pitch deck", { id: "service-deck-upload" });
    } finally {
      setUploadingDeck(false);
      event.target.value = "";
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Service name is required");
      return false;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return false;
    }

    if (!formData.delivered_by_email?.trim()) {
      toast.error("Email is required");
      return false;
    }

    if (!formData.banner_url?.trim()) {
      toast.error("Banner image is required");
      return false;
    }

    if (!formData.pitch_deck_url?.trim() || !formData.pitch_deck_type) {
      toast.error("Pitch deck is required");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const resolvedMessageUserId = await resolveMessageUserIdFromEmail(formData.delivered_by_email || "");
      const saveData: CreateServiceInput = {
        name: formData.name.trim(),
        slug: generateServiceSlug(formData.slug || formData.name),
        category: formData.category,
        description: formData.description.trim(),
        delivered_by_name: formData.delivered_by_name?.trim() || null,
        delivered_by_picture_url: formData.delivered_by_picture_url || null,
        delivered_by_picture_focal_x: formData.delivered_by_picture_focal_x ?? DEFAULT_IMAGE_FOCAL,
        delivered_by_picture_focal_y: formData.delivered_by_picture_focal_y ?? DEFAULT_IMAGE_FOCAL,
        delivered_by_user_id: resolvedMessageUserId,
        delivered_by_email: formData.delivered_by_email?.trim() || null,
        banner_url: formData.banner_url || null,
        banner_focal_x: formData.banner_focal_x ?? DEFAULT_IMAGE_FOCAL,
        banner_focal_y: formData.banner_focal_y ?? DEFAULT_IMAGE_FOCAL,
        pitch_deck_url: formData.pitch_deck_url || null,
        pitch_deck_type: formData.pitch_deck_type || null,
        is_active: formData.is_active !== false,
        is_featured: formData.is_featured === true,
      };

      const result = service
        ? await updateService(service.id, saveData)
        : await createService(saveData);

      if (result) {
        navigate(getServiceProfilePath(result));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    if (!confirm(`Delete ${service.name}? This removes the service profile.`)) {
      return;
    }

    const success = await deleteService(service.id);
    if (success) {
      navigate("/marketplace");
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-lg border border-border/60 bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Checking admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Service editing is restricted to admins.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-header-offset pb-16">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/marketplace">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{service ? "Edit Service" : "Create Service"}</h1>
                <p className="mt-1 text-muted-foreground">
                  {service ? `Editing: ${service.name}` : "Add a founder-ready marketplace service"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {service && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading || saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={loading || saving || uploadingBanner || uploadingByPicture || uploadingDeck}>
                {saving || loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Sales Automation Sprint"
                  className="mt-1"
                />
              </div>

              <div className="rounded-lg border border-border/60 p-4">
                <div className="mb-4">
                  <Label>By</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Show who is delivering this service. Use a square image, ideally 400 x 400 px.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="delivered_by_name">Name</Label>
                      <Input
                        id="delivered_by_name"
                        value={formData.delivered_by_name || ""}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, delivered_by_name: event.target.value || null }))
                        }
                        placeholder="Jane Doe or CT Ops Team"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivered_by_email">Email *</Label>
                      <Input
                        id="delivered_by_email"
                        type="email"
                        value={formData.delivered_by_email || ""}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, delivered_by_email: event.target.value || null }))
                        }
                        placeholder="provider@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivered_by_picture_upload">Picture</Label>
                      <Input
                        id="delivered_by_picture_upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleByPictureUpload}
                        disabled={uploadingByPicture}
                        className="mt-1"
                      />
                    </div>
                    {formData.delivered_by_picture_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            delivered_by_picture_url: null,
                            delivered_by_picture_focal_x: DEFAULT_IMAGE_FOCAL,
                            delivered_by_picture_focal_y: DEFAULT_IMAGE_FOCAL,
                          }))
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Picture
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {formData.delivered_by_picture_url ? (
                        <img
                          src={formData.delivered_by_picture_url}
                          alt={formData.delivered_by_name || "Service delivery preview"}
                          className="aspect-square w-full rounded-md object-cover"
                          style={{
                            objectPosition: getImagePosition(
                              formData.delivered_by_picture_focal_x,
                              formData.delivered_by_picture_focal_y,
                            ),
                          }}
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center">
                          <Image className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {formData.delivered_by_picture_url && (
                      <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">Frame picture</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                delivered_by_picture_focal_x: DEFAULT_IMAGE_FOCAL,
                                delivered_by_picture_focal_y: DEFAULT_IMAGE_FOCAL,
                              }))
                            }
                          >
                            Center
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Horizontal</span>
                            <span>{formData.delivered_by_picture_focal_x ?? DEFAULT_IMAGE_FOCAL}%</span>
                          </div>
                          <Slider
                            value={[formData.delivered_by_picture_focal_x ?? DEFAULT_IMAGE_FOCAL]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([value]) =>
                              setFormData((prev) => ({ ...prev, delivered_by_picture_focal_x: value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Vertical</span>
                            <span>{formData.delivered_by_picture_focal_y ?? DEFAULT_IMAGE_FOCAL}%</span>
                          </div>
                          <Slider
                            value={[formData.delivered_by_picture_focal_y ?? DEFAULT_IMAGE_FOCAL]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([value]) =>
                              setFormData((prev) => ({ ...prev, delivered_by_picture_focal_y: value }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value as ServiceCategory }))
                    }
                  >
                    <SelectTrigger id="category" className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {SERVICE_CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  rows={7}
                  placeholder="Describe the service, outcomes, scope, and who it is best for."
                  className="mt-1"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <Label>Banner Image *</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use a wide banner image, ideally 1584 x 396 px for LinkedIn-style framing.
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border bg-muted">
                    {formData.banner_url ? (
                      <img
                        src={formData.banner_url}
                        alt="Service banner preview"
                        className="aspect-[4/1] w-full object-cover"
                        style={{
                          objectPosition: getImagePosition(formData.banner_focal_x, formData.banner_focal_y),
                        }}
                      />
                    ) : (
                      <div className="flex aspect-[4/1] items-center justify-center">
                        <Image className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                  />
                  {formData.banner_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          banner_url: null,
                          banner_focal_x: DEFAULT_IMAGE_FOCAL,
                          banner_focal_y: DEFAULT_IMAGE_FOCAL,
                        }))
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Banner
                    </Button>
                  )}
                  {formData.banner_url && (
                    <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Frame banner</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              banner_focal_x: DEFAULT_IMAGE_FOCAL,
                              banner_focal_y: DEFAULT_IMAGE_FOCAL,
                            }))
                          }
                        >
                          Center
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Horizontal</span>
                          <span>{formData.banner_focal_x ?? DEFAULT_IMAGE_FOCAL}%</span>
                        </div>
                        <Slider
                          value={[formData.banner_focal_x ?? DEFAULT_IMAGE_FOCAL]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) =>
                            setFormData((prev) => ({ ...prev, banner_focal_x: value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Vertical</span>
                          <span>{formData.banner_focal_y ?? DEFAULT_IMAGE_FOCAL}%</span>
                        </div>
                        <Slider
                          value={[formData.banner_focal_y ?? DEFAULT_IMAGE_FOCAL]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) =>
                            setFormData((prev) => ({ ...prev, banner_focal_y: value }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Pitch Deck *</Label>
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">
                          {formData.pitch_deck_url ? "Deck uploaded" : "No deck uploaded"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formData.pitch_deck_type ? formData.pitch_deck_type.toUpperCase() : "PDF or PPTX, max 20MB"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Input
                    type="file"
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pdf,.pptx"
                    onChange={handleDeckUpload}
                    disabled={uploadingDeck}
                  />
                  {formData.pitch_deck_url && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={formData.pitch_deck_url} target="_blank" rel="noopener noreferrer">
                          <Upload className="mr-2 h-4 w-4" />
                          Open Deck
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            pitch_deck_url: null,
                            pitch_deck_type: null,
                          }))
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Deck
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-xs text-muted-foreground">Active services are visible in the marketplace.</p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active !== false}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="is_featured">Featured</Label>
                    <p className="text-xs text-muted-foreground">Featured services appear first by default.</p>
                  </div>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured === true}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
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

export default AdminServiceEditor;
