import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FundraisingReadinessToolkitAll from "@/components/blog/FundraisingReadinessToolkitAll";

export default function InsightaTestPage() {
  return (
    <>
      <SEO
        title="Insighta Test - Fundraising Readiness Assessment | Creatives Takeover"
        description="Take our comprehensive self-assessment to evaluate your startup's fundraising readiness, identify gaps, and understand exactly what you need to improve before approaching investors."
        keywords="fundraising readiness, startup assessment, investor readiness, startup evaluation"
      />
      <Navigation />
      <main className="min-h-screen">
        <FundraisingReadinessToolkitAll />
      </main>
      <Footer />
    </>
  );
}
