import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Investor } from "@/types/investor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { VCWallpaper } from "@/components/vc-search/VCWallpaper";
import { useVCViewTracking } from "@/hooks/useVCViewTracking";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_SUMMARIES, type Plan } from "@/config/planPermissions";
import { normalizePlanId, trackUpgradeClicked } from "@/lib/analytics";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  ExternalLink,
  Linkedin,
  Star,
  Twitter,
  UserPlus,
  Wifi,
} from "lucide-react";

const VCProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { subscriptionData } = useSubscription();
  const [vc, setVc] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackVCView, limit } = useVCViewTracking();
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{
    requiredTier?: Plan;
  } | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(user?.email?.toLowerCase() === "admin@creatives-takeover.com");
    };

    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchVC = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Error fetching VC:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const result = await trackVCView(data.id);

        if (!result.success) {
          if (result.reason === "limit_reached") {
            setUpgradePrompt({ requiredTier: result.requiredTier });
          } else if (result.reason === "auth") {
            setRequiresAuth(true);
          }
        }
      }

      setVc(data as Investor);
      setLoading(false);
    };

    fetchVC();
  }, [slug, trackVCView, navigate]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !vc) {
      toast.error("No file selected or VC missing");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, WebP, GIF, or SVG");
      event.target.value = "";
      return;
    }

    if (file.size > 5242880) {
      toast.error("File size exceeds 5MB. Please upload a smaller image");
      event.target.value = "";
      return;
    }

    try {
      setUploadingLogo(true);
      toast.loading("Uploading logo...", { id: "upload-logo" });

      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${vc.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`, { id: "upload-logo" });
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("public-assets")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("investors")
        .update({ logo_url: publicUrl })
        .eq("id", vc.id);

      if (updateError) {
        toast.error(`Failed to save: ${updateError.message}`, { id: "upload-logo" });
        throw updateError;
      }

      setVc((current) => (current ? { ...current, logo_url: publicUrl } : current));
      toast.success("Logo uploaded and saved successfully!", { id: "upload-logo" });
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
          <p className="mt-4 text-muted-foreground">Loading VC profile...</p>
        </div>
      </div>
    );
  }

  if (!vc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">VC Not Found</h2>
          <p className="text-muted-foreground mb-6">The VC profile you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/vc-search")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to VC Search
          </Button>
        </div>
      </div>
    );
  }

  const formatCheckSize = () => {
    if (!vc.typical_check_size_min || !vc.typical_check_size_max) return "Not disclosed";

    if (vc.typical_check_size_max >= 1000000) {
      const min = (vc.typical_check_size_min / 1000000).toFixed(vc.typical_check_size_min >= 1000000 ? 1 : 0);
      const max = (vc.typical_check_size_max / 1000000).toFixed(1);
      return `$${min}M - $${max}M`;
    }

    const min = Math.round(vc.typical_check_size_min / 1000);
    const max = Math.round(vc.typical_check_size_max / 1000);
    return `$${min}K - $${max}K`;
  };

  const stageSummary = vc.investment_stages.length > 0
    ? vc.investment_stages.map((stage) => stage.replaceAll("-", " ")).join(", ")
    : "Not disclosed";
  const sectorSummary = vc.industries.length > 0 ? vc.industries.join(", ") : "Not disclosed";
  const geographySummary = vc.geographic_focus.length > 0 ? vc.geographic_focus.join(", ") : "Not disclosed";
  const locationSummary = vc.locations.length > 0 ? vc.locations.join(", ") : "No office locations listed";
  const outreachSummary = vc.email
    ? vc.email
    : vc.application_url
      ? "Direct application or contact page"
      : vc.firm_website
        ? "Firm website"
        : "Not disclosed";
  const primaryAction = vc.email
    ? { label: "Contact", href: `mailto:${vc.email}` }
    : vc.application_url
      ? { label: "Apply Now", href: vc.application_url }
      : vc.firm_website
        ? { label: "Visit Website", href: vc.firm_website }
        : null;
  const upgradePlan = upgradePrompt?.requiredTier ? PLAN_SUMMARIES[upgradePrompt.requiredTier] : null;
  const upgradeTier = upgradePrompt?.requiredTier ?? "rising";
  const upgradeTierLabel = upgradePlan?.name ?? "Rising";
  const upgradeDetail = !upgradePlan || upgradePlan.vcViewLimit === Infinity
    ? "Unlock unlimited VC views this billing cycle."
    : `Unlock ${upgradePlan.vcViewLimit} VC profile views this billing cycle.`;
  const portfolioHighlights = vc.portfolio_companies.slice(0, 6);
  const links = [
    vc.firm_website ? { label: "Website", href: vc.firm_website, icon: Building2 } : null,
    vc.linkedin_url ? { label: "LinkedIn", href: vc.linkedin_url, icon: Linkedin } : null,
    vc.twitter_url ? { label: "X", href: vc.twitter_url, icon: Twitter } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: typeof Building2 }>;

  const snapshotItems = [
    { label: "Stage", value: stageSummary },
    { label: "Sector", value: sectorSummary },
    { label: "Ticket size", value: formatCheckSize() },
    { label: "Geography", value: geographySummary },
    { label: "How to apply", value: outreachSummary },
    { label: "Warm intro", value: vc.requires_warm_intro ? "Recommended" : "Not required" },
  ];
  const isProfileLocked = requiresAuth || Boolean(upgradePrompt);

  const profileContent = (
    <Card className="overflow-hidden border border-border/60 bg-background/95 shadow-sm">
      {vc.header_image_url && (
        <div className="h-36 w-full overflow-hidden bg-muted sm:h-44">
          <img
            src={vc.header_image_url}
            alt={`${vc.firm_name} banner`}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm ${vc.header_image_url ? "-mt-14 relative z-10" : ""}`}>
                {vc.logo_url ? (
                  <img
                    src={vc.logo_url}
                    alt={`${vc.firm_name} logo`}
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
                  <p className="text-xs text-muted-foreground">Recommended: 500x500 PNG or JPG, max 5MB</p>
                  {uploadingLogo && <p className="text-xs text-primary">Uploading logo...</p>}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {vc.is_featured && (
                  <Badge className="bg-warning/10 text-warning border-warning/30 hover:bg-warning/20">
                    <Star className="h-3 w-3 mr-1 fill-warning" />
                    Featured
                  </Badge>
                )}
                {vc.remote_friendly && (
                  <Badge variant="outline" className="text-success border-success/30 bg-success/5">
                    <Wifi className="h-3 w-3 mr-1" />
                    Remote friendly
                  </Badge>
                )}
              </div>
              <CardTitle className="text-3xl tracking-tight">{vc.firm_name}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {vc.investment_thesis || `${vc.firm_name} invests across ${stageSummary} in ${sectorSummary}.`}
              </p>
              <div className="mt-4 space-y-2">
                {vc.investment_stages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {vc.investment_stages.map((stage) => (
                      <Badge
                        key={stage}
                        variant="outline"
                        className="border-info/30 bg-info/10 text-info capitalize"
                      >
                        {stage.replaceAll("-", " ")}
                      </Badge>
                    ))}
                  </div>
                )}
                {vc.industries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {vc.industries.slice(0, 8).map((industry) => (
                      <Badge
                        key={industry}
                        variant="outline"
                        className="border-violet-500/30 bg-violet-500/10 text-violet-700"
                      >
                        {industry}
                      </Badge>
                    ))}
                  </div>
                )}
                {vc.geographic_focus.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {vc.geographic_focus.slice(0, 6).map((geo) => (
                      <Badge
                        key={geo}
                        variant="outline"
                        className="border-success/30 bg-success/10 text-success"
                      >
                        {geo}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {primaryAction && (
            <Button asChild className="w-full sm:w-auto shrink-0">
              <a
                href={primaryAction.href}
                target={primaryAction.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={primaryAction.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              >
                {primaryAction.label}
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
            <h3 className="mb-4 text-base font-semibold">At a glance</h3>
            <div className="grid gap-3 text-sm">
              {snapshotItems.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="max-w-[16rem] text-right font-medium capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background p-5">
            <h3 className="mb-3 text-base font-semibold">Best outreach path</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {vc.requires_warm_intro
                ? `${vc.firm_name} looks like a stronger fit for warm introductions than blind cold outreach.`
                : `${vc.firm_name} is viable for direct outreach if your stage and sector align.`}
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Preferred path</span>
                <span className="max-w-[11rem] text-right font-medium capitalize">
                  {vc.contact_preference?.replaceAll("-", " ") || "Website or profile CTA"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Office locations</span>
                <span className="max-w-[11rem] text-right font-medium">{locationSummary}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {portfolioHighlights.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-background p-5">
              <h3 className="mb-3 text-base font-semibold">Portfolio highlights</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {portfolioHighlights.map((company, index) => (
                  <div key={`${company.name}-${index}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{company.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[company.industry, company.stage].filter(Boolean).join(" • ") || "Portfolio company"}
                        </p>
                      </div>
                      {company.website && (
                        <a
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-background p-5">
            <h3 className="mb-3 text-base font-semibold">Quick links</h3>
            <div className="flex flex-wrap gap-2">
              {links.length > 0 ? (
                links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button key={link.label} variant="outline" size="sm" asChild>
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                        {link.label}
                      </a>
                    </Button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No external links listed for this firm yet.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const vcProfilePath = `/insighta/vc/${vc.slug || vc.id}`;
  const vcSignupPath = `/signup?source=vc_profile&return=${encodeURIComponent(vcProfilePath)}`;
  const vcLoginPath = `/login?return=${encodeURIComponent(vcProfilePath)}`;

  const lockedProfileContent = (
    <Card className="overflow-hidden border border-border/60 bg-background/95 shadow-sm">
      <CardHeader className="space-y-4">
        <CardTitle className="text-3xl tracking-tight">{vc.firm_name}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {requiresAuth
            ? `Sign in to unlock the full ${vc.firm_name} profile, warm-intro guidance, and outbound links.`
            : `Upgrade to ${upgradeTierLabel} to unlock the full ${vc.firm_name} profile, warm-intro guidance, and outbound links.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {snapshotItems.slice(0, 4).map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-medium">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* FIX(dead-click): /insighta/vc/[slug] — auth and view-limit gating now render a static summary card instead of a blurred interactive profile underneath. */}
          {requiresAuth ? (
            <>
              <Button asChild className="w-full sm:w-auto">
                <Link to={vcSignupPath}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up Free
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={vcLoginPath}>Sign In</Link>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                trackUpgradeClicked({
                  from_plan: normalizePlanId(subscriptionData?.subscription_tier),
                  to_plan: normalizePlanId(upgradeTier),
                  location: "feature_gate",
                });
                navigate("/pricing");
              }}
              className="w-full sm:w-auto"
            >
              Upgrade to {upgradeTierLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="relative overflow-hidden py-20 px-4">
        <VCWallpaper />

        <div className="container mx-auto max-w-4xl relative z-10">
          <Button
            variant="ghost"
            onClick={() => navigate("/vc-search")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to VC Search
          </Button>

          {upgradePrompt && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="pt-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    You've used all {limit} VC profile views this billing cycle.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to {upgradeTierLabel} to keep exploring. {upgradeDetail}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    trackUpgradeClicked({
                      from_plan: normalizePlanId(subscriptionData?.subscription_tier),
                      to_plan: normalizePlanId(upgradeTier),
                      location: "feature_gate",
                    });
                    navigate("/pricing");
                  }}
                  className="w-full sm:w-auto"
                >
                  Upgrade to {upgradeTierLabel}
                </Button>
              </CardContent>
            </Card>
          )}

          {isProfileLocked ? lockedProfileContent : profileContent}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VCProfilePage;
