import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { readIcpBuilderSession } from "@/lib/icpBuilderSession";

const ICPBuilder = lazy(() => import("@/components/icp/ICPBuilder"));

export default function ICPBuilderPage() {
  const navigate = useNavigate();

  const handleReturnToPlatform = () => {
    const session = readIcpBuilderSession();
    const hasProgress = Boolean(
      session &&
        (session.currentScreen !== "mode_select" ||
          session.fastDescription.trim() ||
          session.guided.seed?.trim() ||
          session.draftPreview),
    );

    if (hasProgress) {
      const confirmed = window.confirm("Your ICP Builder progress is saved. Leave the builder and return to the platform?");
      if (!confirmed) {
        return;
      }
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Build your ICP Draft | Creatives Takeover"
        description="Build a founder-specific ICP Draft in one guided flow and turn it into a usable customer document."
        url="/icp-builder"
      />

      <Navigation />

      <div className="fixed left-3 top-[92px] z-40 sm:left-6 sm:top-[100px] md:top-[108px] lg:left-8">
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-full border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground shadow-[0_12px_32px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl hover:bg-background"
          onClick={handleReturnToPlatform}
        >
          ← Platform
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-white pt-28 md:pt-32">
            <div className="flex items-center gap-3 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 text-slate-500 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-[#32b8c6]" />
              Loading ICP Builder...
            </div>
          </div>
        }
      >
        <ICPBuilder />
      </Suspense>
    </div>
  );
}
