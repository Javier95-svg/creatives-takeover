import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { LockedPageOverlay } from "@/components/ui/LockedPageOverlay";
import ComingSoonPage from "@/pages/ComingSoonPage";

export default function WaitlistMakerPage() {
  const { hasAccess, isProgressiveLock } = usePlanAccess('waitlist_maker');

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Waitlist Maker - Creatives Takeover"
          description="Build demand before you launch. Create a waitlist and validate interest before writing a single line of code."
        />
        <Navigation />
        <main>
          <LockedPageOverlay
            requiredPlan="rising"
            featureName="Waitlist Maker"
            description={
              isProgressiveLock
                ? "Complete the ICP Builder (Stage 1) to unlock the Waitlist Maker, or upgrade to Rising to access all tools right away."
                : "Waitlist Maker is available on the Rising plan and above."
            }
            benefits={[
              "Launch a waitlist page in minutes",
              "Capture emails before you build",
              "Validate demand with real sign-ups",
            ]}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <ComingSoonPage
      title="Waitlist Maker"
      description="Build demand before you launch. Create a waitlist and validate interest before writing a single line of code."
      highlights={[
        "Customizable waitlist landing page in minutes",
        "Automated email capture and confirmation",
        "Referral mechanics to grow your list virally",
        "Integration with your ICP insights from Stage 1",
      ]}
    />
  );
}
