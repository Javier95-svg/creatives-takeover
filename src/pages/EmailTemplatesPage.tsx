import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import EmailTemplatesTab from "@/components/insighta/EmailTemplatesTab";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";
import { getPublicTabConfig } from "@/config/publicTabVisibility";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/email-templates');
  const { trackPageVisit } = useReadingAnalytics();
  const { hasAccess, upgradeTarget } = usePlanAccess('email_templates');

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
      "url": "https://creatives-takeover.com/email-templates",
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
      { name: 'Email Templates', url: '/email-templates' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Email Templates Library - Creatives Takeover"
        description="Copy-paste ready email templates for every stage of fundraising. Personalize the variables (like {{vc_name}} and {{company_name}}) and send."
        keywords="fundraising email templates, investor email, cold outreach, warm introduction, follow-up emails"
        url="/email-templates"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="relative overflow-hidden px-4 pt-28 pb-20 md:pt-32 lg:pt-36" data-section="email-templates">
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
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                Email Templates
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Copy-paste ready email templates for<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> every stage of fundraising.</span>
              </p>
            </div>

            {user ? (
              hasAccess ? (
                <EmailTemplatesTab />
              ) : (
                <BlurredToolPreview
                  featureName="Email Templates"
                  unlockCondition="Email Templates is available on the Starter plan and above."
                  requiredPlan={upgradeTarget}
                  locked
                >
                  <div />
                </BlurredToolPreview>
              )
            ) : (
              publicTab && (
                <PreviewModeWrapper
                  featureName={publicTab.featureName}
                  description={publicTab.description || ''}
                  showPricingCta={publicTab.showPricingCta}
                >
                  <EmailTemplatesTab />
                </PreviewModeWrapper>
              )
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
