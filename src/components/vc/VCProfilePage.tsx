import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Investor } from "@/types/investor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { VCWallpaper } from "@/components/vc-search/VCWallpaper";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Linkedin,
  MapPin,
  DollarSign,
  Building2,
  Send,
  Twitter,
  Facebook,
  Youtube,
  Instagram
} from "lucide-react";

const VCProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vc, setVc] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVC = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching VC:', error);
      } else {
        setVc(data as Investor);
      }
      setLoading(false);
    };

    fetchVC();
  }, [id]);

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

          {/* Main Profile Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start gap-6">
                {/* VC Logo */}
                <div className="shrink-0 w-20 h-20 rounded-xl border-2 border-border bg-background flex items-center justify-center overflow-hidden shadow-sm">
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

                {/* Firm Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-3xl mb-2">{vc.firm_name}</CardTitle>
                      <p className="text-xl text-muted-foreground mb-2">{vc.name}</p>
                      {/* Investor Type Badge */}
                      <Badge variant="outline" className="capitalize">
                        {vc.investor_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

          <CardContent className="space-y-6">
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

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Contact & Social Media</h3>
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
                {vc.email && (
                  <Button variant="outline" asChild className="justify-start">
                    <a href={`mailto:${vc.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
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
                {vc.twitter_url && (
                  <Button variant="outline" asChild className="justify-start">
                    <a href={vc.twitter_url} target="_blank" rel="noopener noreferrer">
                      <Twitter className="h-4 w-4 mr-2" />
                      X / Twitter
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
                {vc.crunchbase_url && (
                  <Button variant="outline" asChild className="justify-start">
                    <a href={vc.crunchbase_url} target="_blank" rel="noopener noreferrer">
                      <Building2 className="h-4 w-4 mr-2" />
                      Crunchbase
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </Button>
                )}
                {vc.angellist_url && (
                  <Button variant="outline" asChild className="justify-start">
                    <a href={vc.angellist_url} target="_blank" rel="noopener noreferrer">
                      <Building2 className="h-4 w-4 mr-2" />
                      AngelList
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </Button>
                )}
                {vc.medium_url && (
                  <Button variant="outline" asChild className="justify-start">
                    <a href={vc.medium_url} target="_blank" rel="noopener noreferrer">
                      <Building2 className="h-4 w-4 mr-2" />
                      Medium
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VCProfilePage;
