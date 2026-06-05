import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";

import { IcpDraftShareBar } from "@/components/icp/IcpDraftShareBar";
import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getIcpDraftShareBySlug, isIcpDraftSharedSnapshot } from "@/lib/icpDraftSharing";
import { normalizeIcpDraftDocument } from "@/lib/icpDraftArtifacts";
import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

export default function IcpPublicDraftPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const [draft, setDraft] = useState<IcpDraftDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!draftId) {
        setLoading(false);
        return;
      }

      try {
        const record = await getIcpDraftShareBySlug(draftId);
        if (record && isIcpDraftSharedSnapshot(record.snapshot)) {
          setDraft(normalizeIcpDraftDocument(record.snapshot.draftDocument));
        }
      } catch (error) {
        console.error("Failed to load public ICP Draft", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [draftId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <IcpProgressBar progress={100} />
        <div className="flex min-h-screen items-center justify-center px-6">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center gap-3 px-6 py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading shared ICP Draft...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <IcpProgressBar progress={100} />
        <div className="flex min-h-screen items-center justify-center px-6">
          <Card className="max-w-lg rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Share link unavailable</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">This ICP Draft is no longer public.</h1>
              <p className="text-sm leading-6 text-slate-500">
                The founder may have disabled the share link or replaced it with a newer one.
              </p>
              <Button asChild>
                <Link to="/icp-builder">Build your own</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pageTitle = `${draft.customer.personaName} — ICP Draft`;
  const pageDescription = `${draft.customer.roleLine}. ${draft.build.valueProposition}`.slice(0, 155);
  const ogImageUrl = `https://creatives-takeover.com/api/og-icp?slug=${draftId ?? ""}`;

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <SEO
        title={`${pageTitle} | Creatives Takeover`}
        description={pageDescription}
        image={ogImageUrl}
        url={`/icp/${draftId ?? ""}/public`}
        type="article"
      />
      <IcpProgressBar progress={100} />
      <IcpFolioDocument
        draft={draft}
        footer={
          <div className="space-y-6 pb-4">
            <IcpDraftShareBar
              shareUrl={typeof window !== "undefined" ? window.location.href : ""}
              returnPath={`/icp/${draftId ?? ""}/public`}
            />
            <div className="pb-6 text-center">
              <p className="mb-4 text-sm text-slate-500">
                Built with{" "}
                <a
                  href="https://creatives-takeover.com"
                  className="font-medium text-[#0f5b64] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Creatives Takeover
                </a>
                {" "}— the platform for first-time founders.
              </p>
              <Link
                to="/icp-builder?mode=fast"
                className="inline-flex items-center gap-2 rounded-full bg-[#0f5b64] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(15,91,100,0.55)] transition-opacity hover:opacity-90"
              >
                Build your ICP free — 60 seconds
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        }
      />
    </div>
  );
}
