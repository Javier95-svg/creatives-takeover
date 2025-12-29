import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import EmailTemplatesTab from "@/components/insighta/EmailTemplatesTab";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";

export default function EmailTemplatesPage() {
  const { trackPageVisit } = useReadingAnalytics();

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Email Templates');
  }, [trackPageVisit]);

  // Structured data for Email Templates page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Email Templates Library - Fundraising Email Templates",
      "description": "Copy-paste ready email templates for every stage of fundraising. Personalize the variables and send.",
      "url": "https://creatives-takeover.com/insighta/email-templates",
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
      { name: 'Insighta', url: '/insighta' },
      { name: 'Email Templates', url: '/insighta/email-templates' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Email Templates Library - Creatives Takeover"
        description="Copy-paste ready email templates for every stage of fundraising. Personalize the variables (like {{vc_name}} and {{company_name}}) and send."
        keywords="fundraising email templates, investor email, cold outreach, warm introduction, follow-up emails"
        url="/insighta/email-templates"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="container mx-auto px-4 py-12">
          <EmailTemplatesTab />
        </section>
      </main>

      <Footer />
    </div>
  );
}
