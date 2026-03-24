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

      // Try slug first, fall back to ID lookup
      let { data, error } = await supabase
        .from('funding_opportunities')
        .select('*')
        .eq('slug', slug)
        .eq('type', 'accelerator')
        .single();

      if (error || !data) {
        ({ data, error } = await supabase
          .from('funding_opportunities')
          .select('*')
          .eq('id', slug)
          .eq('type', 'accelerator')
          .single());
      }

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
  const primaryActionUrl = accelerator.application_url || websiteUrl;
  const primaryActionLabel = accelerator.application_url ? "Apply Now" : "Visit Website";
  const stageSummary = accelerator.focus_stage?.join(', ') || 'See program fit below';
  const sectorSummary = accelerator.focus_sectors?.join(', ') || accelerator.keywords.join(', ');
  const geographySummary = accelerator.cohort_geography?.join(', ') || accelerator.location.join(', ');
  const alumni = Array.isArray(accelerator.notable_alumni) ? accelerator.notable_alumni : [];

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
                        {accelerator.program_format && (
                          <Badge variant="outline">
                            {accelerator.program_format}
                          </Badge>
                        )}
                        {accelerator.funding_offered && (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {accelerator.funding_offered}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
                  <h3 className="mb-4 text-base font-semibold">Founder Fit Snapshot</h3>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Stage</span>
                      <span className="text-right font-medium capitalize">{stageSummary.replaceAll('-', ' ')}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Sector</span>
                      <span className="text-right font-medium">{sectorSummary || 'See profile'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Format</span>
                      <span className="text-right font-medium">{accelerator.program_format || 'See profile'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Funding</span>
                      <span className="text-right font-medium">{accelerator.funding_offered || accelerator.funding_amount || 'See profile'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">How to apply</span>
                      <span className="text-right font-medium">{accelerator.application_deadline_info || 'Use the application page'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background p-5">
                  <h3 className="mb-3 text-base font-semibold">Primary action</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Qualify the program on stage, sector, and geography first, then move directly to the application page.
                  </p>
                  {primaryActionUrl && (
                    <Button asChild className="mt-4 w-full">
                      <a href={primaryActionUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {primaryActionLabel}
                      </a>
                    </Button>
                  )}
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{accelerator.program_duration || 'See profile'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Equity</span>
                      <span className="font-medium">{accelerator.equity_taken || 'See profile'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* At a Glance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                  <p className="text-lg font-bold leading-tight">{accelerator.funding_offered || accelerator.funding_amount || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Funding</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <Rocket className="h-5 w-5 mx-auto mb-1.5 text-purple-500" />
                  <p className="text-lg font-bold leading-tight">{accelerator.program_format || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Format</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <Users className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
                  <p className="text-lg font-bold leading-tight">{accelerator.equity_taken || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Equity</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <Globe className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
                  <p className="text-lg font-bold leading-tight">
                    {accelerator.program_duration || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Duration</p>
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
              {(accelerator.focus_stage?.length || accelerator.focus_sectors?.length || accelerator.cohort_geography?.length || accelerator.keywords.length > 0) && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">What They Look For</h3>
                  <div className="space-y-5">
                    {accelerator.focus_stage && accelerator.focus_stage.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Best-fit Stage</p>
                        <div className="flex flex-wrap gap-2">
                          {accelerator.focus_stage.map((stage, idx) => (
                            <Badge key={idx} variant="outline" className="px-3 py-1 text-sm capitalize">
                              {stage}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Focus Areas & Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {(accelerator.focus_sectors && accelerator.focus_sectors.length > 0 ? accelerator.focus_sectors : accelerator.keywords).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm capitalize">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {(accelerator.cohort_geography?.length || accelerator.location.length > 0) && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Cohort Geography</p>
                        <div className="flex flex-wrap gap-3">
                          {(accelerator.cohort_geography && accelerator.cohort_geography.length > 0 ? accelerator.cohort_geography : accelerator.location).map((loc, idx) => (
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
                  {(accelerator.funding_offered || accelerator.funding_amount) && (
                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                      <DollarSign className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Funding: {accelerator.funding_offered || accelerator.funding_amount}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Founder-facing capital summary based on the current public program terms.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <Target className="h-5 w-5 mt-0.5 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Program Structure</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {accelerator.program_duration || 'Program-specific'} • {accelerator.program_format || 'Format varies by cohort'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <Users className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Cohort Geography</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {geographySummary || 'See application page for geography fit.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <CheckCircle className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Notable Alumni</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {alumni.length > 0 ? alumni.slice(0, 3).join(', ') : 'See program page for recent alumni examples.'}
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
                      <p className="text-sm font-semibold">{accelerator.application_deadline_info || 'Open application path'}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {accelerator.title} accepts applications directly through its public program page. Use the fit snapshot above before applying.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                  {primaryActionUrl && (
                    <Button asChild>
                      <a href={primaryActionUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {primaryActionLabel}
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
