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
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Linkedin,
  Lock,
  MapPin,
  DollarSign,
  Building2,
  Send,
  UserPlus,
  Star,
  Twitter,
  BookOpen,
  Mail,
  Clock,
  TrendingUp,
  Globe,
  Wifi,
  Briefcase,
  CalendarDays,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const VCProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [vc, setVc] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackVCView, limit } = useVCViewTracking();
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{
    requiredTier?: 'creator' | 'professional';
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
        .from('investors')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching VC:', error);
        setLoading(false);
        return;
      }

      // Track the view
      if (data) {
        const result = await trackVCView(data.id);

        if (!result.success) {
          if (result.reason === 'limit_reached') {
            setUpgradePrompt({ requiredTier: result.requiredTier });
          } else if (result.reason === 'auth') {
            setRequiresAuth(true);
          }
        }
      }

      setVc(data as Investor);
      setLoading(false);
    };

    fetchVC();
  }, [slug, trackVCView, navigate]);

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
          <Button onClick={() => navigate('/insighta/vc-search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to VC Search
          </Button>
        </div>
      </div>
    );
  }

  const formatCheckSize = () => {
    if (!vc.typical_check_size_min || !vc.typical_check_size_max) return "Not disclosed";
    const min = (vc.typical_check_size_min / 1000000).toFixed(1);
    const max = (vc.typical_check_size_max / 1000000).toFixed(1);
    return `$${min}M - $${max}M`;
  };

  const primaryAction = vc.email
    ? {
        label: "Contact",
        href: `mailto:${vc.email}`,
      }
    : (vc.application_url || vc.firm_website)
      ? {
          label: vc.application_url ? "Apply Now" : "Visit Website",
          href: vc.application_url || vc.firm_website!,
        }
      : null;

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !vc) {
      toast.error("No file selected or VC missing");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, WebP, GIF, or SVG");
      event.target.value = '';
      return;
    }

    if (file.size > 5242880) {
      toast.error("File size exceeds 5MB. Please upload a smaller image");
      event.target.value = '';
      return;
    }

    try {
      setUploadingLogo(true);
      toast.loading("Uploading logo...", { id: "upload-logo" });

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${vc.id}/logo-${Date.now()}.${fileExt}`;

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
        .from('investors')
        .update({ logo_url: publicUrl })
        .eq('id', vc.id);

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
      event.target.value = '';
    }
  };

  const upgradeTierLabel = upgradePrompt?.requiredTier === 'professional' ? 'Pro' : 'Creator';
  const upgradeDetail = upgradePrompt?.requiredTier === 'professional'
    ? 'Unlock unlimited VC views this month.'
    : 'Unlock 25 VC views this month.';

  // Profile content (shared between blurred and normal views)
  const profileContent = (
    <>
      {/* Main Profile Card */}
      <Card className="mb-6 overflow-hidden">
        {/* Header Image Banner */}
        {vc.header_image_url && (
          <div className="w-full h-40 sm:h-52 bg-muted overflow-hidden">
            <img
              src={vc.header_image_url}
              alt={`${vc.firm_name} banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardHeader>
          <div className="flex items-start gap-6">
            {/* VC Logo */}
            <div className="shrink-0">
              <div className={`w-20 h-20 rounded-xl border-2 border-border bg-background flex items-center justify-center overflow-hidden shadow-sm ${vc.header_image_url ? '-mt-12 relative z-10' : ''}`}>
                {vc.logo_url ? (
                  <img
                    src={vc.logo_url}
                    alt={`${vc.firm_name} logo`}
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
                  <p className="text-xs text-muted-foreground">
                    Recommended: 500x500 PNG or JPG, max 5MB
                  </p>
                  {uploadingLogo && (
                    <p className="text-xs text-primary">Uploading logo...</p>
                  )}
                </div>
              )}
            </div>

            {/* Firm Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-3xl">{vc.firm_name}</CardTitle>
                    {vc.is_featured && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                        <Star className="h-3 w-3 mr-1 fill-amber-500" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl text-muted-foreground mb-2">{vc.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Investor Type Badge */}
                    <Badge variant="outline" className="capitalize">
                      {vc.investor_type.replace('_', ' ')}
                    </Badge>
                    {vc.remote_friendly && (
                      <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/5">
                        <Wifi className="h-3 w-3 mr-1" />
                        Remote Friendly
                      </Badge>
                    )}
                  </div>
                </div>
                {primaryAction && (
                  <Button asChild className="shrink-0">
                    <a href={primaryAction.href} target={primaryAction.href.startsWith('mailto:') ? undefined : "_blank"} rel={primaryAction.href.startsWith('mailto:') ? undefined : "noopener noreferrer"}>
                      {primaryAction.label}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
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
                <span className="text-right font-medium capitalize">{vc.investment_stages.join(', ').replaceAll('-', ' ')}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Sector</span>
                <span className="text-right font-medium">{vc.industries.slice(0, 4).join(', ')}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Ticket size</span>
                <span className="text-right font-medium">{formatCheckSize()}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Geography</span>
                <span className="text-right font-medium">{vc.geographic_focus.join(', ')}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">How to apply</span>
                <span className="text-right font-medium">
                  {vc.email ? vc.email : vc.application_url ? 'Direct application or contact page' : 'Website outreach'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background p-5">
            <h3 className="mb-3 text-base font-semibold">Best outreach path</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {vc.requires_warm_intro
                ? `${vc.firm_name} tends to prefer qualified introductions. If you do not have one, qualify fit first and use the firm website carefully.`
                : `${vc.firm_name} is a viable cold-outreach target if your stage, sector, and geography align with the profile above.`}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Primary CTA</span>
                <span className="font-medium">{primaryAction?.label || 'View profile details'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Warm intro</span>
                <span className="font-medium">{vc.requires_warm_intro ? 'Recommended' : 'Not required'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── At a Glance: key numbers ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-lg bg-muted/50 border text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1.5 text-primary" />
            <p className="text-lg font-bold leading-tight">{formatCheckSize()}</p>
            <p className="text-xs text-muted-foreground mt-1">Check Size</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border text-center">
            <Briefcase className="h-5 w-5 mx-auto mb-1.5 text-primary" />
            <p className="text-lg font-bold leading-tight">{vc.total_portfolio_count || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Portfolio Companies</p>
          </div>

          {vc.recent_investments_count > 0 ? (
            <div className="p-4 rounded-lg bg-muted/50 border text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1.5 text-green-500" />
              <p className="text-lg font-bold leading-tight">{vc.recent_investments_count}</p>
              <p className="text-xs text-muted-foreground mt-1">Recent Deals</p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border text-center">
              <MapPin className="h-5 w-5 mx-auto mb-1.5 text-primary" />
              <p className="text-lg font-bold leading-tight">{vc.geographic_focus[0] || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Primary Market</p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-muted/50 border text-center">
            <CalendarDays className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
            <p className="text-lg font-bold leading-tight">
              {vc.last_investment_date
                ? new Date(vc.last_investment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Last Investment</p>
          </div>
        </div>

        {/* ── Investment Thesis (highlighted) ── */}
        {vc.investment_thesis && (
          <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-5">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Investment Thesis
            </h3>
            <p className="text-muted-foreground leading-relaxed">{vc.investment_thesis}</p>
          </div>
        )}

        {/* ── What They Invest In ── */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">What They Invest In</h3>

          <div className="space-y-5">
            {/* Stages */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Funding Stages</p>
              <div className="flex flex-wrap gap-2">
                {vc.investment_stages.map((stage, idx) => (
                  <Badge key={idx} variant="outline" className="capitalize px-3 py-1 text-sm">
                    {stage}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Industries */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Industries & Sectors</p>
              <div className="flex flex-wrap gap-2">
                {vc.industries.map((industry, idx) => (
                  <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm">
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Geography */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Geographic Focus</p>
              <div className="flex flex-wrap gap-3">
                {vc.geographic_focus.map((geo, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {geo}
                  </span>
                ))}
              </div>
              {vc.locations && vc.locations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Offices:</span>
                  {vc.locations.map((loc, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      {loc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Portfolio Companies (expanded) ── */}
        {vc.portfolio_companies && vc.portfolio_companies.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-1">Portfolio</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {vc.total_portfolio_count > 0
                ? `${vc.total_portfolio_count} companies in their portfolio${vc.portfolio_companies.length < vc.total_portfolio_count ? `, ${vc.portfolio_companies.length} shown below` : ''}.`
                : `${vc.portfolio_companies.length} known portfolio companies.`}
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {vc.portfolio_companies.map((company, idx) => (
                <div key={idx} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{company.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {company.industry && (
                          <Badge variant="secondary" className="text-xs">{company.industry}</Badge>
                        )}
                        {company.stage && (
                          <Badge variant="outline" className="text-xs capitalize">{company.stage}</Badge>
                        )}
                      </div>
                      {company.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{company.description}</p>
                      )}
                    </div>
                    {company.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── How to Get Funded (actionable contact guide) ── */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-1">How to Get Funded</h3>
          <p className="text-sm text-muted-foreground mb-4">
            What you need to know before reaching out to {vc.firm_name}.
          </p>

          <div className="space-y-4">
            {/* Warm intro requirement — always shown */}
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
              {vc.requires_warm_intro ? (
                <AlertCircle className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {vc.requires_warm_intro ? 'Warm introduction required' : 'Cold outreach welcome'}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {vc.requires_warm_intro
                    ? `${vc.firm_name} typically requires an introduction from a mutual connection. Check LinkedIn for shared contacts or ask portfolio founders for a referral.`
                    : `${vc.firm_name} accepts cold outreach. You can reach them directly without a warm introduction.`}
                </p>
              </div>
            </div>

            {/* Contact preference */}
            {vc.contact_preference && (
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                <Mail className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Preferred contact: <span className="capitalize">{vc.contact_preference.replace(/-/g, ' ')}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {vc.contact_preference === 'email' && 'They prefer to receive pitches and introductions via email.'}
                    {vc.contact_preference === 'linkedin' && 'Reach out through LinkedIn for the best chance of getting noticed.'}
                    {vc.contact_preference === 'application' && 'Submit your pitch through their formal application process.'}
                    {vc.contact_preference === 'warm-intro-only' && 'They exclusively accept introductions through their network.'}
                  </p>
                </div>
              </div>
            )}

            {/* Response stats row */}
            {(vc.response_rate_percentage != null || vc.typical_timeline_days != null) && (
              <div className="grid sm:grid-cols-2 gap-3">
                {vc.response_rate_percentage != null && (
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <TrendingUp className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{vc.response_rate_percentage}% response rate</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {vc.response_rate_percentage >= 50
                          ? 'Above average — they review most inbound pitches.'
                          : vc.response_rate_percentage >= 20
                            ? 'Moderate — make sure your pitch is tightly aligned with their thesis.'
                            : 'Selective — your pitch needs to be highly targeted to their focus areas.'}
                      </p>
                    </div>
                  </div>
                )}
                {vc.typical_timeline_days != null && (
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <Clock className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">
                        {vc.typical_timeline_days < 7
                          ? `${vc.typical_timeline_days}-day response time`
                          : `${Math.round(vc.typical_timeline_days / 7)}-week response time`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Typical time from first contact to initial response.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direct contact actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              {vc.application_url && (
                <Button asChild>
                  <a href={vc.application_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apply Directly
                  </a>
                </Button>
              )}
              {vc.email && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${vc.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    {vc.email}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Links ── */}
        {(vc.firm_website || vc.linkedin_url || vc.crunchbase_url || vc.twitter_url) && (
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Links</h3>
            <div className="flex flex-wrap gap-2">
              {vc.firm_website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={vc.firm_website} target="_blank" rel="noopener noreferrer">
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />Website
                  </a>
                </Button>
              )}
              {vc.linkedin_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={vc.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-3.5 w-3.5 mr-1.5" />LinkedIn
                  </a>
                </Button>
              )}
              {vc.crunchbase_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={vc.crunchbase_url} target="_blank" rel="noopener noreferrer">
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />Crunchbase
                  </a>
                </Button>
              )}
              {vc.twitter_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={vc.twitter_url} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-3.5 w-3.5 mr-1.5" />X
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Generate Outreach CTA ── */}
        <div className="border-t pt-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <h4 className="font-semibold text-lg mb-2">Ready to Reach Out?</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a personalized pitch deck, cold email, or one-pager tailored
                  to {vc.firm_name}'s investment focus.
                </p>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  Generate Outreach Materials
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="relative overflow-hidden py-20 px-4">
        <VCWallpaper />

        <div className="container mx-auto max-w-4xl relative z-10">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/insighta/vc-search')}
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
                    You've used all {limit} VC profile views this month.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to {upgradeTierLabel} to keep exploring. {upgradeDetail}
                  </p>
                </div>
                <Button onClick={() => navigate('/pricing')} className="w-full sm:w-auto">
                  Upgrade to {upgradeTierLabel}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Blurred preview with sign-in overlay for unauthenticated users */}
          {requiresAuth ? (
            <div className="relative">
              {/* Blurred profile content */}
              <div className="select-none pointer-events-none blur-[6px]" aria-hidden="true">
                {profileContent}
              </div>

              {/* Sign-in overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
                <div className="text-center max-w-md px-6 py-10 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Sign in to view {vc.firm_name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    Create a free account to access full VC profiles, contact information,
                    portfolio companies, and generate personalized outreach materials.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Link to="/auth">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Sign Up Free
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link to="/auth">
                        Sign In
                      </Link>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Free plan includes 5 VC profile views per month
                  </p>
                </div>
              </div>
            </div>
          ) : (
            profileContent
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VCProfilePage;
