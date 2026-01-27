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
  Facebook,
  Youtube,
  Instagram,
  BookOpen,
  Mail,
  Clock,
  TrendingUp,
  Globe,
  Wifi,
  Briefcase,
  CalendarDays,
  Users,
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
              </div>
            </div>
          </div>
        </CardHeader>

      <CardContent className="space-y-6">
        {/* Investment Activity Stats */}
        {(vc.total_portfolio_count > 0 || vc.recent_investments_count > 0 || vc.last_investment_date) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {vc.total_portfolio_count > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border text-center">
                <Briefcase className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{vc.total_portfolio_count}</p>
                <p className="text-xs text-muted-foreground">Portfolio Companies</p>
              </div>
            )}
            {vc.recent_investments_count > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{vc.recent_investments_count}</p>
                <p className="text-xs text-muted-foreground">Recent Investments</p>
              </div>
            )}
            {vc.last_investment_date && (
              <div className="p-4 rounded-lg bg-muted/50 border text-center">
                <CalendarDays className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{new Date(vc.last_investment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                <p className="text-xs text-muted-foreground">Last Investment</p>
              </div>
            )}
          </div>
        )}

        {/* Investment Thesis */}
        {vc.investment_thesis && (
          <div>
            <h3 className="font-semibold mb-2">Investment Thesis</h3>
            <p className="text-muted-foreground">{vc.investment_thesis}</p>
          </div>
        )}

        {/* Key Details Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Investment Stages</h4>
            <div className="flex flex-wrap gap-1">
              {vc.investment_stages.map((stage, idx) => (
                <Badge key={idx} variant="outline" className="capitalize">
                  {stage}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Check Size</h4>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{formatCheckSize()}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Industries</h4>
            <div className="flex flex-wrap gap-1">
              {vc.industries.map((industry, idx) => (
                <Badge key={idx} variant="secondary">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Geographic Focus</h4>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{vc.geographic_focus.join(', ')}</span>
            </div>
          </div>

          {vc.locations && vc.locations.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Office Locations</h4>
              <div className="flex flex-wrap gap-2">
                {vc.locations.map((location, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Companies */}
        {vc.portfolio_companies && vc.portfolio_companies.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Portfolio Companies</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {vc.portfolio_companies.slice(0, 6).map((company, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <p className="font-medium text-sm">{company.name}</p>
                  {company.industry && (
                    <p className="text-xs text-muted-foreground">{company.industry}</p>
                  )}
                </div>
              ))}
            </div>
            {vc.portfolio_companies.length > 6 && (
              <p className="text-sm text-muted-foreground mt-2">
                +{vc.portfolio_companies.length - 6} more companies
              </p>
            )}
          </div>
        )}

        {/* Contact Process */}
        {(vc.contact_preference || vc.requires_warm_intro || vc.application_url || vc.response_rate_percentage || vc.typical_timeline_days || vc.email) && (
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Contact Process</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {vc.contact_preference && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Preferred Contact</p>
                    <p className="text-sm text-muted-foreground capitalize">{vc.contact_preference.replace('-', ' ')}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                {vc.requires_warm_intro ? (
                  <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Warm Intro</p>
                  <p className="text-sm text-muted-foreground">
                    {vc.requires_warm_intro ? 'Required' : 'Not required — cold outreach welcome'}
                  </p>
                </div>
              </div>

              {vc.response_rate_percentage != null && (
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Response Rate</p>
                    <p className="text-sm text-muted-foreground">{vc.response_rate_percentage}%</p>
                  </div>
                </div>
              )}

              {vc.typical_timeline_days != null && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Typical Response Time</p>
                    <p className="text-sm text-muted-foreground">
                      {vc.typical_timeline_days < 7
                        ? `${vc.typical_timeline_days} days`
                        : `${Math.round(vc.typical_timeline_days / 7)} weeks`}
                    </p>
                  </div>
                </div>
              )}

              {vc.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a href={`mailto:${vc.email}`} className="text-sm text-primary hover:underline">
                      {vc.email}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {vc.application_url && (
              <Button asChild className="mt-4 w-full sm:w-auto">
                <a href={vc.application_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply Directly
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Contact & Social Media */}
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Links & Social Media</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {vc.firm_website && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.firm_website} target="_blank" rel="noopener noreferrer">
                  <Building2 className="h-4 w-4 mr-2" />
                  Firm Website
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.linkedin_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.crunchbase_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.crunchbase_url} target="_blank" rel="noopener noreferrer">
                  <Building2 className="h-4 w-4 mr-2" />
                  Crunchbase
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.twitter_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.twitter_url} target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter / X
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.facebook_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.facebook_url} target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.youtube_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.youtube_url} target="_blank" rel="noopener noreferrer">
                  <Youtube className="h-4 w-4 mr-2" />
                  YouTube
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.instagram_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.instagram_url} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4 mr-2" />
                  Instagram
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.medium_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.medium_url} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Medium
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
            {vc.angellist_url && (
              <Button variant="outline" asChild className="justify-start">
                <a href={vc.angellist_url} target="_blank" rel="noopener noreferrer">
                  <Users className="h-4 w-4 mr-2" />
                  AngelList
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Generate Outreach CTA */}
        <div className="border-t pt-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <h4 className="font-semibold text-lg mb-2">Ready to Reach Out?</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a personalized pitch deck, cold email, or one-pager tailored
                  to {vc.firm_name}'s investment focus.
                </p>
                <Button size="lg" className="w-full sm:w-auto">
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
