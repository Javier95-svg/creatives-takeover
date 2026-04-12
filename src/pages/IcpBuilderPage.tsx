import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import SEO from "@/components/SEO";

const ICPBuilder = lazy(() => import("@/components/icp/ICPBuilder"));

export default function ICPBuilderPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Build your ICP Draft | Creatives Takeover"
        description="Build a founder-specific ICP Draft in one guided flow and turn it into a usable customer document."
        url="/icp-builder"
      />

      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-white">
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
