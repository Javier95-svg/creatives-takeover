import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { IcpDraftShareBar } from "@/components/icp/IcpDraftShareBar";
import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getIcpDraftShareBySlug, isIcpDraftSharedSnapshot } from "@/lib/icpDraftSharing";
import { normalizeIcpDraftDocument } from "@/lib/icpDraftArtifacts";
import { downloadIcpDraftDocx, downloadIcpDraftPdf } from "@/lib/icpDraftExport";
import { buildArtifactReferralPath, trackArtifactReferralClicked } from "@/lib/artifactReferral";
import type { IcpDraftDocument } from "@/lib/icpBuilderSession";
import { isIcpScoreCard, type IcpScoreCard } from "@/lib/icpScoreCard";

function slugifyFileName(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "icp-draft";
}

export default function IcpPublicDraftPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const [draft, setDraft] = useState<IcpDraftDocument | null>(null);
  const [scoreCard, setScoreCard] = useState<IcpScoreCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

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
          const card = (record.snapshot as { scoreCard?: unknown }).scoreCard;
          if (isIcpScoreCard(card)) setScoreCard(card);
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
          <Card className="rounded-5xl border-border bg-white shadow-sm">
            <CardContent className="flex items-center gap-3 px-6 py-8 text-muted-foreground">
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
          <Card className="max-w-lg rounded-5xl border-border bg-white shadow-sm">
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Share link unavailable</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">This ICP Draft is no longer public.</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                The founder may have disabled the share link or replaced it with a newer one.
              </p>
              <Button asChild>
                <Link
                  to={buildArtifactReferralPath("icp")}
                  onClick={() => trackArtifactReferralClicked("icp", "missing_state")}
                >
                  Build yours free
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pageTitle = scoreCard
    ? `This startup idea scored ${scoreCard.displayScore}/100`
    : `${draft.customer.personaName} — ICP Draft`;
  const pageDescription = scoreCard
    ? `${scoreCard.idea ?? draft.customer.roleLine} · ${scoreCard.verdictLabel}. ${scoreCard.summary}`.slice(0, 155)
    : `${draft.customer.roleLine}. ${draft.build.valueProposition}`.slice(0, 155);
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
        frozenScoreCard={scoreCard}
        documentRef={documentRef}
        footer={
          <div className="space-y-6 pb-4">
            <IcpDraftShareBar
              scoreCard={scoreCard}
              shareUrl={typeof window !== "undefined" ? window.location.href : ""}
              returnPath={`/icp/${draftId ?? ""}/public`}
              isSaving={isSaving}
              onSavePdf={async () => {
                if (!documentRef.current) return;
                setIsSaving(true);
                try {
                  await downloadIcpDraftPdf(documentRef.current, `${slugifyFileName(draft.customer.personaName)}-icp-draft.pdf`);
                } catch {
                  toast.error("Could not download the PDF right now.");
                } finally {
                  setIsSaving(false);
                }
              }}
              onSaveDocx={async () => {
                setIsSaving(true);
                try {
                  await downloadIcpDraftDocx(draft, `${slugifyFileName(draft.customer.personaName)}-icp-draft.docx`);
                  toast.success("DOCX downloaded.");
                } catch {
                  toast.error("Could not download the DOCX right now.");
                } finally {
                  setIsSaving(false);
                }
              }}
            />
            <div className="pb-6 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Built with{" "}
                <a
                  href={buildArtifactReferralPath("icp")}
                  className="font-medium text-[#0f5b64] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Creatives Takeover
                </a>
                {" "}— the platform for first-time founders.
              </p>
              <Link
                to={buildArtifactReferralPath("icp")}
                onClick={() => trackArtifactReferralClicked("icp", "footer")}
                className="inline-flex items-center gap-2 rounded-full bg-[#0f5b64] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(15,91,100,0.55)] transition-opacity hover:opacity-90"
              >
                Build yours free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        }
      />
    </div>
  );
}
