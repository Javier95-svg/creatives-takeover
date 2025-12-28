import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FundingOpportunity } from "@/types/funding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  DollarSign,
  Building2,
  Calendar,
  Mail
} from "lucide-react";

const AcceleratorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [accelerator, setAccelerator] = useState<FundingOpportunity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccelerator = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('funding_opportunities')
        .select('*')
        .eq('id', id)
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
  }, [id]);

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
          <Button onClick={() => navigate('/insighta')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Insighta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/insighta')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Accelerator Hunt
        </Button>

        {/* Main Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{accelerator.title}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {accelerator.type}
                </Badge>
              </div>
              {accelerator.is_featured && (
                <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  ⭐ Featured
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{accelerator.description}</p>
            </div>

            {/* Key Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {accelerator.funding_amount && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Funding Amount</h4>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{accelerator.funding_amount}</span>
                  </div>
                </div>
              )}

              {accelerator.location && accelerator.location.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Location</h4>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{accelerator.location.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Keywords/Focus Areas */}
            {accelerator.keywords && accelerator.keywords.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {accelerator.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Application Link */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Apply</h3>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href={accelerator.url} target="_blank" rel="noopener noreferrer">
                  <Building2 className="h-4 w-4 mr-2" />
                  Visit Program Website
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>

            {/* Related Resources */}
            <div className="border-t pt-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h4 className="font-semibold text-lg mb-2">Need Help with Your Application?</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use our email templates to craft a compelling application and follow-up emails.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate('/insighta');
                        // Could add state to switch to email templates tab
                      }}
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
      </main>

      <Footer />
    </div>
  );
};

export default AcceleratorProfilePage;
