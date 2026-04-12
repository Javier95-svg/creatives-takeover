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
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <SEO
        title="Build your ICP Draft | Creatives Takeover"
        description="Build a founder-specific ICP Draft in one guided flow and turn it into a usable customer document."
        url="/icp-builder"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.12),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.98))]" />
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.8) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.02))",
          }}
        />
        <div
          className="absolute -right-48 -top-40 h-[55rem] w-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.35), transparent 55%)",
            animationDuration: "28s",
          }}
        />
        <div
          className="absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle at center, rgba(249, 115, 22, 0.12), transparent 62%)",
          }}
        />
      </div>

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

      <main className="relative z-10">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-transparent px-4 pt-28 md:pt-32">
              <div className="flex items-center gap-3 rounded-[2rem] border border-border/60 bg-white/80 px-6 py-5 text-muted-foreground shadow-sm backdrop-blur dark:bg-slate-950/70">
                <Loader2 className="h-5 w-5 animate-spin text-[#32b8c6]" />
                Loading ICP Builder...
              </div>
            </div>
          }
        >
          <ICPBuilder />
        </Suspense>
      </main>
    </div>
  );
}
