import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FundingOpportunity } from "@/types/funding";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const AdminAcceleratorManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accelerators, setAccelerators] = useState<FundingOpportunity[]>([]);
  const [selected, setSelected] = useState<FundingOpportunity | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
      void fetchAccelerators();
    };

    void checkAdmin();
  }, [navigate]);

  const fetchAccelerators = async () => {
    try {
      const { data, error } = await supabase
        .from('funding_opportunities')
        .select('*')
        .eq('type', 'accelerator')
        .eq('is_active', true)
        .order('title', { ascending: true });

      if (error) throw error;
      setAccelerators(data as FundingOpportunity[]);
    } catch (error: any) {
      toast.error("Failed to load accelerators: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) {
      toast.error("No file selected or no accelerator selected");
      return;
    }

    try {
      setUploadingLogo(true);
      toast.loading("Uploading logo...", { id: "upload-logo" });

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPG, PNG, WebP, GIF, or SVG", { id: "upload-logo" });
        return;
      }

      if (file.size > 5242880) {
        toast.error("File size exceeds 5MB. Please upload a smaller image", { id: "upload-logo" });
        return;
      }

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `accelerators/${selected.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`, { id: "upload-logo" });
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('funding_opportunities')
        .update({ logo_url: publicUrl })
        .eq('id', selected.id);

      if (updateError) {
        toast.error(`Failed to save: ${updateError.message}`, { id: "upload-logo" });
        throw updateError;
      }

      setSelected({ ...selected, logo_url: publicUrl });
      void fetchAccelerators();

      toast.success("Logo uploaded and saved!", { id: "upload-logo" });
    } catch (error: any) {
      console.error('Upload error:', error);
    } finally {
      setUploadingLogo(false);
      if (event.target) {
        event.target.value = '';
      }
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
            <h1 className="text-4xl font-bold mb-2">Accelerator Management</h1>
            <p className="text-muted-foreground">Upload logos and manage accelerator profiles</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Accelerator List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Accelerators ({accelerators.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {accelerators.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelected(acc)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selected?.id === acc.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-10 h-10 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                        {acc.logo_url ? (
                          <img
                            src={acc.logo_url}
                            alt={acc.title}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{acc.title}</p>
                        <div className="flex gap-1 mt-1">
                          {acc.logo_url && <Badge variant="secondary" className="text-xs">Logo</Badge>}
                          {acc.is_featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Accelerator Details & Upload */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selected ? selected.title : "Select an accelerator to manage"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selected ? (
                  <div className="space-y-6">
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <Label>Logo</Label>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-24 h-24 rounded-xl border-2 border-border bg-background flex items-center justify-center overflow-hidden">
                          {selected.logo_url ? (
                            <img
                              src={selected.logo_url}
                              alt={selected.title}
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
                            onChange={handleLogoUpload}
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

                    {/* Current Info */}
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-semibold">Current Information</h3>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Type</Label>
                          <Badge variant="outline" className="capitalize">
                            {selected.type}
                          </Badge>
                        </div>
                        {selected.funding_amount && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Funding Amount</Label>
                            <p className="text-sm">{selected.funding_amount}</p>
                          </div>
                        )}
                        {selected.location && selected.location.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Location</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selected.location.map((loc, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {loc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-sm text-muted-foreground">{selected.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="border-t pt-6">
                      <Button
                        onClick={() => navigate(`/insighta/accelerator/${selected.id}`)}
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
                    <p>Select an accelerator from the list to manage its profile</p>
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

export default AdminAcceleratorManagement;
