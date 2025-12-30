import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FundraisingReadinessToolkitAll from "@/components/blog/FundraisingReadinessToolkitAll";

export default function InsightaTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Insighta Test - Fundraising Readiness Assessment | Creatives Takeover"
        description="Take our comprehensive self-assessment to evaluate your startup's fundraising readiness, identify gaps, and understand exactly what you need to improve before approaching investors."
        keywords="fundraising readiness, startup assessment, investor readiness, startup evaluation"
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden" data-section="insighta-test">
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
                Insighta Test
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Evaluate your startup's fundraising readiness and<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> identify what you need to improve.</span>
              </p>
            </div>

            <FundraisingReadinessToolkitAll />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
