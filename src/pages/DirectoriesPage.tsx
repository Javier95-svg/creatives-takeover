import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { LockedPageOverlay } from "@/components/ui/LockedPageOverlay";
import ComingSoonPage from "@/pages/ComingSoonPage";

export default function DirectoriesPage() {
  const { hasAccess, isProgressiveLock } = usePlanAccess('directories');

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Directories - Creatives Takeover"
          description="Get your startup listed where founders get found. Startup directories, product launch platforms, and investor databases."
        />
        <Navigation />
        <main>
          <LockedPageOverlay
            requiredPlan="rising"
            featureName="Directories"
            description={
              isProgressiveLock
                ? "Complete the earlier stages to unlock Directories, or upgrade to Rising to access all tools right away."
                : "Directories is available on the Rising plan and above."
            }
            benefits={[
              "List your startup on 50+ directories automatically",
              "Product Hunt, BetaList, Hacker News — all in one place",
              "Track your listings and inbound traffic",
            ]}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <ComingSoonPage
      title="Directories"
      description="Get your startup listed where founders get found. Startup directories, product launch platforms, and investor databases."
      highlights={[
        "Submit to 50+ startup directories in one click",
        "Optimized listings for each platform",
        "Track submissions and inbound traffic from each source",
        "Reminders for re-submissions and updates",
      ]}
    />
  );
}
