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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { supabase } from "@/integrations/supabase/client";
import type { CreateServiceInput, MarketplaceService, ServiceBookingProvider, ServiceCategory } from "@/types/serviceMarketplace";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/types/serviceMarketplace";
import { generateServiceSlug, getDeckTypeFromFile, getServiceProfilePath, inferServiceBookingProvider } from "@/utils/serviceMarketplace";

const BANNER_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const MAX_DECK_BYTES = 20 * 1024 * 1024;

const initialForm: CreateServiceInput = {
  name: "",
  slug: "",
  category: "sales",
  description: "",
  banner_url: null,
  pitch_deck_url: null,
  pitch_deck_type: null,
  booking_url: null,
  booking_provider: "calendly",
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
      banner_url: found.banner_url,
      pitch_deck_url: found.pitch_deck_url,
      pitch_deck_type: found.pitch_deck_type,
      booking_url: found.booking_url,
      booking_provider: found.booking_provider,
      is_active: found.is_active,
      is_featured: found.is_featured,
    });
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: prev.slug ? prev.slug : generateServiceSlug(value),
    }));
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
      setFormData((prev) => ({ ...prev, banner_url: publicUrl }));
      toast.success("Banner uploaded", { id: "service-banner-upload" });
    } catch (error: any) {
      console.error("Service banner upload failed:", error);
      toast.error(error?.message || "Failed to upload banner", { id: "service-banner-upload" });
    } finally {
      setUploadingBanner(false);
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

    if (!formData.slug?.trim()) {
      toast.error("Service slug is required");
      return false;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return false;
    }

    if (!formData.booking_url?.trim()) {
      toast.error("Booking URL is required");
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
      const saveData: CreateServiceInput = {
        name: formData.name.trim(),
        slug: generateServiceSlug(formData.slug || formData.name),
        category: formData.category,
        description: formData.description.trim(),
        banner_url: formData.banner_url || null,
        pitch_deck_url: formData.pitch_deck_url || null,
        pitch_deck_type: formData.pitch_deck_type || null,
        booking_url: formData.booking_url || null,
        booking_provider: inferServiceBookingProvider(formData.booking_url, formData.booking_provider),
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
              <Button size="sm" onClick={handleSave} disabled={loading || saving || uploadingBanner || uploadingDeck}>
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
              <div className="grid gap-4 md:grid-cols-2">
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
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug || ""}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, slug: generateServiceSlug(event.target.value) }))
                    }
                    placeholder="sales-automation-sprint"
                    className="mt-1"
                  />
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
                <div>
                  <Label htmlFor="booking_provider">Booking Provider *</Label>
                  <Select
                    value={formData.booking_provider || "calendly"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, booking_provider: value as ServiceBookingProvider }))
                    }
                  >
                    <SelectTrigger id="booking_provider" className="mt-1">
                      <SelectValue placeholder="Select booking provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calendly">Calendly</SelectItem>
                      <SelectItem value="koalendar">Koalendar</SelectItem>
                      <SelectItem value="other">Other booking tool</SelectItem>
                      <SelectItem value="manual">Manual confirmation only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="booking_url">Booking URL *</Label>
                <Input
                  id="booking_url"
                  type="url"
                  value={formData.booking_url || ""}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      booking_url: event.target.value || null,
                      booking_provider: inferServiceBookingProvider(event.target.value, prev.booking_provider),
                    }))
                  }
                  placeholder="https://calendly.com/team/service-discovery"
                  className="mt-1"
                />
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
                  <Label>Banner Image *</Label>
                  <div className="overflow-hidden rounded-lg border border-border bg-muted">
                    {formData.banner_url ? (
                      <img src={formData.banner_url} alt="Service banner preview" className="aspect-[16/9] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center">
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
                      onClick={() => setFormData((prev) => ({ ...prev, banner_url: null }))}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Banner
                    </Button>
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
