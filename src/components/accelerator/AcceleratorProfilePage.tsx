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
  ArrowUpRight,
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  Star,
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

      let { data, error } = await supabase
        .from("funding_opportunities")
        .select("*")
        .eq("slug", slug)
        .eq("type", "accelerator")
        .single();

      if (error || !data) {
        ({ data, error } = await supabase
          .from("funding_opportunities")
          .select("*")
          .eq("id", slug)
          .eq("type", "accelerator")
          .single());
      }

      if (error) {
        console.error("Error fetching accelerator:", error);
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

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, WebP, GIF, or SVG");
      event.target.value = "";
      return;
    }

    if (file.size > 5242880) {
      toast.error("File size exceeds 5MB");
      event.target.value = "";
      return;
    }

    try {
      setUploadingLogo(true);
      toast.loading("Uploading logo...", { id: "upload-logo" });

      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `accelerators/${accelerator.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: true, contentType: file.type });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`, { id: "upload-logo" });
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("public-assets")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("funding_opportunities")
        .update({ logo_url: publicUrl })
        .eq("id", accelerator.id);

      if (updateError) {
        toast.error(`Failed to save: ${updateError.message}`, { id: "upload-logo" });
        throw updateError;
      }

      setAccelerator((current) => (current ? { ...current, logo_url: publicUrl } : current));
      toast.success("Logo uploaded!", { id: "upload-logo" });
    } catch (error) {
      console.error("Logo upload error:", error);
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
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
          <Button onClick={() => navigate("/insighta/accelerator-hunt")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accelerator Hunt
          </Button>
        </div>
      </div>
    );
  }

  const websiteUrl = accelerator.website_url || accelerator.url;
  const hasDedicatedApplication = Boolean(accelerator.application_url && accelerator.application_url !== websiteUrl);
  const primaryActionUrl = hasDedicatedApplication ? accelerator.application_url : websiteUrl || accelerator.application_url;
  const primaryActionLabel = hasDedicatedApplication ? "Apply Now" : "Visit Website";
  const stageSummary = accelerator.focus_stage?.length
    ? accelerator.focus_stage.map((stage) => stage.replaceAll("-", " ")).join(", ")
    : "Not disclosed";
  const sectorSummary = accelerator.focus_sectors?.length
    ? accelerator.focus_sectors.join(", ")
    : accelerator.keywords.length > 0
      ? accelerator.keywords.join(", ")
      : "Not disclosed";
  const geographySummary = accelerator.cohort_geography?.length
    ? accelerator.cohort_geography.join(", ")
    : accelerator.location.length > 0
      ? accelerator.location.join(", ")
      : "Not disclosed";
  const alumni = Array.isArray(accelerator.notable_alumni) ? accelerator.notable_alumni.slice(0, 6) : [];
  const snapshotItems = [
    { label: "Stage", value: stageSummary },
    { label: "Sector", value: sectorSummary },
    { label: "Format", value: accelerator.program_format || "Not disclosed" },
    { label: "Duration", value: accelerator.program_duration || "Not disclosed" },
    { label: "Funding", value: accelerator.funding_offered || accelerator.funding_amount || "Not disclosed" },
    { label: "Equity", value: accelerator.equity_taken || "Not disclosed" },
    { label: "Geography", value: geographySummary },
    { label: "How to apply", value: accelerator.application_deadline_info || "Use the primary application page" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
          <div
            className="absolute -top-40 -right-48 h-[55rem] w-[55rem] rounded-full opacity-50 blur-3xl animate-[spin_28s_linear_infinite]"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.2), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.25), transparent 55%)",
            }}
          />
        </div>

        <div className="container mx-auto max-w-4xl relative z-10">
          <Button
            variant="ghost"
            onClick={() => navigate("/insighta/accelerator-hunt")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accelerator Hunt
          </Button>

          <Card className="overflow-hidden border border-border/60 bg-background/95 shadow-sm">
            <CardHeader className="space-y-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                      {accelerator.logo_url ? (
                        <img
                          src={accelerator.logo_url}
                          alt={`${accelerator.title} logo`}
                          className="h-full w-full object-contain p-2"
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
                        {uploadingLogo && <p className="text-xs text-primary">Uploading...</p>}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {accelerator.is_featured && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                          <Star className="h-3 w-3 mr-1 fill-amber-500" />
                          Featured
                        </Badge>
                      )}
                      {accelerator.program_format && (
                        <Badge variant="outline">{accelerator.program_format}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-3xl tracking-tight">{accelerator.title}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {accelerator.description}
                    </p>
                  </div>
                </div>

                {primaryActionUrl && (
                  <Button asChild className="w-full sm:w-auto shrink-0">
                    <a href={primaryActionUrl} target="_blank" rel="noopener noreferrer">
                      {primaryActionLabel}
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
                  <h3 className="mb-4 text-base font-semibold">At a glance</h3>
                  <div className="grid gap-3 text-sm">
                    {snapshotItems.map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-4">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="max-w-[16rem] text-right font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background p-5">
                  <h3 className="mb-3 text-base font-semibold">Program fit</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Use stage, sector, format, and equity first. If those align, go straight to the application page.
                  </p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Primary CTA</span>
                      <span className="max-w-[11rem] text-right font-medium">{primaryActionLabel}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Website</span>
                      <span className="max-w-[11rem] text-right font-medium">{websiteUrl ? "Available" : "Not listed"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Application window</span>
                      <span className="max-w-[11rem] text-right font-medium">
                        {accelerator.application_deadline_info || "See program page"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
                <div className="rounded-xl border border-border/60 bg-background p-5">
                  <h3 className="mb-3 text-base font-semibold">Program summary</h3>
                  <div className="flex flex-wrap gap-2">
                    {(accelerator.focus_stage || []).map((stage) => (
                      <Badge key={stage} variant="outline" className="capitalize">
                        {stage.replaceAll("-", " ")}
                      </Badge>
                    ))}
                    {(accelerator.focus_sectors && accelerator.focus_sectors.length > 0
                      ? accelerator.focus_sectors
                      : accelerator.keywords
                    ).slice(0, 8).map((sector) => (
                      <Badge key={sector} variant="secondary">
                        {sector}
                      </Badge>
                    ))}
                    {(accelerator.cohort_geography && accelerator.cohort_geography.length > 0
                      ? accelerator.cohort_geography
                      : accelerator.location
                    ).slice(0, 4).map((geo) => (
                      <Badge key={geo} variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {geo}
                      </Badge>
                    ))}
                  </div>

                  {alumni.length > 0 && (
                    <div className="mt-5">
                      <h4 className="mb-3 text-sm font-semibold">Notable alumni</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {alumni.map((company) => (
                          <div key={company} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm font-medium">
                            {company}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/60 bg-background p-5">
                  <h3 className="mb-3 text-base font-semibold">Quick links</h3>
                  <div className="flex flex-wrap gap-2">
                    {websiteUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-3.5 w-3.5 mr-1.5" />
                          Website
                        </a>
                      </Button>
                    )}
                    {accelerator.application_url && accelerator.application_url !== websiteUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={accelerator.application_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Application
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{accelerator.program_duration || "Program timing varies by cohort"}</span>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{geographySummary}</span>
                    </div>
                  </div>
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

export default AcceleratorProfilePage;
