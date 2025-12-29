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
        <section className="py-20 px-4 relative overflow-hidden" data-section="email-templates">
          {/* Background styling */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            <EmailTemplatesTab />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
