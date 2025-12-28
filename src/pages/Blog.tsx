import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BlogStickyNav from "@/components/blog/BlogStickyNav";
import FundingOpportunitiesSection from "@/components/blog/FundingOpportunitiesSection";
import FundraisingReadinessToolkit from "@/components/blog/FundraisingReadinessToolkit";
import VCSearchTab from "@/components/insighta/VCSearchTab";
import EmailTemplatesTab from "@/components/insighta/EmailTemplatesTab";
import AcceleratorHuntTab from "@/components/insighta/AcceleratorHuntTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Mail, Rocket } from "lucide-react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState } from "react";
import { FundingFilters } from "@/types/funding";
import { useSearchParams } from "react-router-dom";

// Insighta: VC Search, Email Templates, Accelerator Hunt - v1.0
interface BlogProps {
  defaultTab?: 'vc-search' | 'email-templates' | 'accelerator-hunt';
}

const Blog = ({ defaultTab = 'vc-search' }: BlogProps) => {
  const { trackPageVisit } = useReadingAnalytics();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [fundingFilters, setFundingFilters] = useState<FundingFilters>({});

  // Get tab from URL query parameter or use defaultTab prop
  const tabFromUrl = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  // Update active tab when URL changes or defaultTab changes
  useEffect(() => {
    const tab = searchParams.get('tab') || defaultTab;
    if (['vc-search', 'email-templates', 'accelerator-hunt'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, defaultTab]);

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Insighta Blog');
  }, [trackPageVisit]);

  // Structured data for blog page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Creatives Takeover Insighta Blog",
      "description": "Expert insights on creative business trends, AI opportunities, and entrepreneurship strategies",
      "url": "https://creatives-takeover.com/insighta",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/lovable-uploads/new-favicon.png"
        }
      }
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'News', url: '/insighta' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Creatives Takeover"
        description="Discover AI-powered insights on creative business trends, funding opportunities, and entrepreneurship strategies. Stay ahead with daily curated content for creative entrepreneurs."
        keywords="creative business trends, AI opportunities, entrepreneurship news, startup funding, business insights, creative entrepreneur"
        url="/insighta"
        structuredData={structuredData}
      />
      <Navigation />
      
      <main>
        <FundraisingReadinessToolkit />

        {/* Fundraising Resources Tabbed Section */}
        <section className="container mx-auto px-4 py-12">
          {/* DEBUG: Build timestamp - 2025-12-28 10:45 AM */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold gradient-text mb-4">
              Fundraising Resources
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to connect with investors and raise capital
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="vc-search" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>VC Search</span>
              </TabsTrigger>
              <TabsTrigger value="email-templates" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Email Templates</span>
              </TabsTrigger>
              <TabsTrigger value="accelerator-hunt" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                <span>Accelerator Hunt</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vc-search">
              <VCSearchTab />
            </TabsContent>

            <TabsContent value="email-templates">
              <EmailTemplatesTab />
            </TabsContent>

            <TabsContent value="accelerator-hunt">
              <AcceleratorHuntTab />
            </TabsContent>
          </Tabs>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;