import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FundingOpportunity } from "@/types/funding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  DollarSign,
  Building2,
  Star,
  BookOpen,
  Mail,
  Globe,
  Rocket,
  Users,
  Target,
  CheckCircle
} from "lucide-react";

const AcceleratorProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [accelerator, setAccelerator] = useState<FundingOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(user?.email?.toLowerCase() === "admin@creatives-takeover.com");
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchAccelerator = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from('funding_opportunities')
        .select('*')
        .eq('slug', slug)
        .eq('type', 'accelerator')
        .single();

      if (error) {
        console.error('Error fetching accelerator:', error);
      } else {
        setAccelerator(data as FundingOpportunity);
      }
      setLoading(false);
    };

    fetchAccelerator();
  }, [slug]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !accelerator) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, WebP, GIF, or SVG");
      event.target.value = '';
      return;
    }

    if (file.size > 5242880) {
      toast.error("File size exceeds 5MB");
      event.target.value = '';
      return;
    }

    try {
      setUploadingLogo(true);
      toast.loading("Uploading logo...", { id: "upload-logo" });

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `accelerators/${accelerator.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: true, contentType: file.type });

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
        .eq('id', accelerator.id);

      if (updateError) {
        toast.error(`Failed to save: ${updateError.message}`, { id: "upload-logo" });
        throw updateError;
      }

      setAccelerator((c) => (c ? { ...c, logo_url: publicUrl } : c));
      toast.success("Logo uploaded!", { id: "upload-logo" });
    } catch (error) {
      console.error("Logo upload error:", error);
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading accelerator...</p>
        </div>
      </div>
    );
  }

  if (!accelerator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Accelerator Not Found</h2>
          <p className="text-muted-foreground mb-6">The accelerator you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/insighta/accelerator-hunt')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accelerator Hunt
          </Button>
        </div>
      </div>
    );
  }

  const websiteUrl = accelerator.website_url || accelerator.url;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="relative overflow-hidden py-20 px-4">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          <div
            className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-50 blur-3xl animate-[spin_28s_linear_infinite]"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.2), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.25), transparent 55%)'
            }}
          />
        </div>

        <div className="container mx-auto max-w-4xl relative z-10">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/insighta/accelerator-hunt')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accelerator Hunt
          </Button>

          {/* Main Profile Card */}
          <Card className="mb-6 overflow-hidden">
            <CardHeader>
              <div className="flex items-start gap-6">
                {/* Logo */}
                <div className="shrink-0">
                  <div className="w-20 h-20 rounded-xl border-2 border-border bg-background flex items-center justify-center overflow-hidden shadow-sm">
                    {accelerator.logo_url ? (
                      <img
                        src={accelerator.logo_url}
                        alt={`${accelerator.title} logo`}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Building2 className="h-10 w-10 text-muted-foreground/50" />
                    )}
                  </div>
                  {isAdmin && (
                    <div className="mt-3 w-48 space-y-2">
                      <Label className="text-xs text-muted-foreground">Admin: update logo</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="text-xs"
                      />
                      {uploadingLogo && (
                        <p className="text-xs text-primary">Uploading...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-3xl">{accelerator.title}</CardTitle>
                        {accelerator.is_featured && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                            <Star className="h-3 w-3 mr-1 fill-amber-500" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize bg-purple-500/10 text-purple-600 border-purple-500/20">
                          Accelerator
                        </Badge>
                        {accelerator.funding_amount && (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {accelerator.funding_amount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* At a Glance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                  <p className="text-lg font-bold leading-tight">{accelerator.funding_amount || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Investment</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <MapPin className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                  <p className="text-lg font-bold leading-tight">
                    {accelerator.location && accelerator.location.length > 0 ? accelerator.location[0] : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Location</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <Rocket className="h-5 w-5 mx-auto mb-1.5 text-purple-500" />
                  <p className="text-lg font-bold leading-tight">Accelerator</p>
                  <p className="text-xs text-muted-foreground mt-1">Program Type</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <Globe className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
                  <p className="text-lg font-bold leading-tight">
                    {accelerator.location && accelerator.location.includes('Global') ? 'Yes' : 'Regional'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Global Reach</p>
                </div>
              </div>

              {/* About - highlighted */}
              <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-5">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  About the Program
                </h3>
                <p className="text-muted-foreground leading-relaxed">{accelerator.description}</p>
              </div>

              {/* What They Look For */}
              {accelerator.keywords && accelerator.keywords.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">What They Look For</h3>
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Focus Areas & Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {accelerator.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm capitalize">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {accelerator.location && accelerator.location.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Geographic Focus</p>
                        <div className="flex flex-wrap gap-3">
                          {accelerator.location.map((loc, idx) => (
                            <span key={idx} className="flex items-center gap-1.5 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* What You Get */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4">What You Get</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {accelerator.funding_amount && (
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                      <DollarSign className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Funding: {accelerator.funding_amount}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Direct investment upon acceptance into the program.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <Users className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Mentorship & Network</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Access to experienced mentors, investors, and a global alumni network.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <Target className="h-5 w-5 mt-0.5 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Structured Program</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Intensive curriculum designed to accelerate product-market fit and growth.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <CheckCircle className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Demo Day & Investor Access</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Present to hundreds of investors at the program's culminating event.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Apply */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-1">How to Apply</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Everything you need to submit your application to {accelerator.title}.
                </p>

                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30 mb-4">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Open Application</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {accelerator.title} accepts applications directly through their website. No warm introduction required.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {(accelerator.application_url || accelerator.url) && (
                    <Button asChild>
                      <a href={accelerator.application_url || accelerator.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Apply Now
                      </a>
                    </Button>
                  )}
                  {websiteUrl && (
                    <Button variant="outline" asChild>
                      <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        Visit Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Links */}
              {websiteUrl && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-3">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                        <Building2 className="h-3.5 w-3.5 mr-1.5" />Website
                      </a>
                    </Button>
                    {accelerator.application_url && accelerator.application_url !== websiteUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={accelerator.application_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Application
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="border-t pt-6">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <h4 className="font-semibold text-lg mb-2">Need Help with Your Application?</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use our email templates to craft a compelling application and follow-up emails
                        tailored to {accelerator.title}'s focus areas.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/insighta/email-templates')}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Browse Email Templates
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AcceleratorProfilePage;
