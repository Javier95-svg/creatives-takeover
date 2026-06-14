import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Investor } from "@/types/investor";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Upload, Save, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const AdminVCManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vcs, setVcs] = useState<Investor[]>([]);
  const [selectedVC, setSelectedVC] = useState<Investor | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to access admin panel");
        navigate("/");
        return;
      }

      if (user.email !== "admin@creatives-takeover.com") {
        toast.error("Access denied. Admin only.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      void fetchVCs();
    };

    void checkAdmin();
  }, [navigate]);

  const fetchVCs = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .eq('investor_type', 'vc')
        .order('firm_name', { ascending: true });

      if (error) throw error;
      setVcs(data as Investor[]);
    } catch (error: any) {
      toast.error("Failed to load VCs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'header') => {
    const file = event.target.files?.[0];
    if (!file || !selectedVC) {
      toast.error("No file selected or no VC selected");
      return;
    }

    try {
      if (type === 'logo') {
        setUploadingLogo(true);
      } else {
        setUploadingHeader(true);
      }

      toast.loading(`Uploading ${type}...`, { id: `upload-${type}` });

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPG, PNG, WebP, GIF, or SVG", { id: `upload-${type}` });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5242880) {
        toast.error("File size exceeds 5MB. Please upload a smaller image", { id: `upload-${type}` });
        return;
      }

      // Create unique filename using mentor pattern: vcId/type-timestamp.ext
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${selectedVC.id}/${type}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage (same pattern as mentor pictures)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwrite
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Upload failed: ${uploadError.message}`, { id: `upload-${type}` });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      // Save to database immediately
      const updateField = type === 'logo' ? 'logo_url' : 'header_image_url';
      const { error: updateError } = await supabase
        .from('investors')
        .update({ [updateField]: publicUrl })
        .eq('id', selectedVC.id);

      if (updateError) {
        console.error('Database error:', updateError);
        toast.error(`Failed to save: ${updateError.message}`, { id: `upload-${type}` });
        throw updateError;
      }

      // Update local state
      setSelectedVC({ ...selectedVC, [updateField]: publicUrl });

      // Refresh VCs list to show updated logo badge
      void fetchVCs();

      toast.success(`${type === 'logo' ? 'Logo' : 'Header image'} uploaded and saved successfully!`, { id: `upload-${type}` });
    } catch (error: any) {
      console.error('Upload error:', error);
    } finally {
      if (type === 'logo') {
        setUploadingLogo(false);
      } else {
        setUploadingHeader(false);
      }
      // Clear file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleSocialMediaUpdate = async (vcId: string, field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('investors')
        .update({ [field]: value })
        .eq('id', vcId);

      if (error) throw error;

      toast.success("Social media link updated!");
      void fetchVCs();
    } catch (error: any) {
      toast.error("Update failed: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading admin panel...</p>
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

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">VC Management</h1>
            <p className="text-muted-foreground">Upload logos and manage VC profiles</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* VC List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>VC Firms ({vcs.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {vcs.map((vc) => (
                  <button
                    key={vc.id}
                    onClick={() => setSelectedVC(vc)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedVC?.id === vc.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-10 h-10 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                        {vc.logo_url ? (
                          <img
                            src={vc.logo_url}
                            alt={vc.firm_name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{vc.firm_name}</p>
                        <div className="flex gap-1 mt-1">
                          {vc.logo_url && <Badge variant="secondary" className="text-xs">Logo</Badge>}
                          {vc.header_image_url && <Badge variant="secondary" className="text-xs">Header</Badge>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* VC Details & Upload */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedVC ? selectedVC.firm_name : "Select a VC to manage"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedVC ? (
                  <div className="space-y-6">
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <Label>Logo</Label>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-24 h-24 rounded-xl border-2 border-border bg-background flex items-center justify-center overflow-hidden">
                          {selectedVC.logo_url ? (
                            <img
                              src={selectedVC.logo_url}
                              alt={selectedVC.firm_name}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Building2 className="h-12 w-12 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, 'logo')}
                            disabled={uploadingLogo}
                          />
                          <p className="text-xs text-muted-foreground">
                            Recommended: Square image (500x500px or larger), PNG or JPG, max 5MB
                          </p>
                          {uploadingLogo && (
                            <p className="text-sm text-primary">Uploading logo...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Header Image Upload */}
                    <div className="space-y-3">
                      <Label>Header Image (Optional)</Label>
                      <div className="space-y-2">
                        {selectedVC.header_image_url && (
                          <div className="w-full h-32 rounded-lg border overflow-hidden">
                            <img
                              src={selectedVC.header_image_url}
                              alt={`${selectedVC.firm_name} header`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'header')}
                          disabled={uploadingHeader}
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: Wide image (1200x400px), PNG or JPG, max 5MB
                        </p>
                        {uploadingHeader && (
                          <p className="text-sm text-primary">Uploading header...</p>
                        )}
                      </div>
                    </div>

                    {/* Current Info */}
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-semibold">Current Information</h3>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
                          <p className="text-sm">/insighta/vc/{selectedVC.slug}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Investor Type</Label>
                          <Badge variant="outline" className="capitalize">
                            {selectedVC.investor_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Investment Stages</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedVC.investment_stages.map((stage, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs capitalize">
                                {stage}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="border-t pt-6">
                      <Button
                        onClick={() => navigate(`/insighta/vc/${selectedVC.slug}`)}
                        variant="outline"
                        className="w-full"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Preview Profile Page
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a VC firm from the list to manage its profile</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminVCManagement;
