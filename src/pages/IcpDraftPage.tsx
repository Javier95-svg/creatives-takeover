import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Download, Loader2, PencilLine, Share2, Sparkles } from "lucide-react";
import { IcpShareModal } from "@/components/icp/IcpShareModal";
import { toast } from "sonner";

import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent, trackICPUnlockedDraftOpened } from "@/lib/analytics";
import { normalizeStoredArtifact } from "@/lib/icpDraftArtifacts";
import { getIcpDraftPublicUrl, upsertIcpDraftShare } from "@/lib/icpDraftSharing";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

async function downloadDraftPdf(target: HTMLElement, fileName: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#f6f7fb",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}

export default function IcpDraftPage() {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const documentRef = useRef<HTMLDivElement>(null);
  const hasTrackedUnlockOpenRef = useRef(false);

  const [artifact, setArtifact] = useState<StoredIcpArtifact | null>(null);
  const [legacyAnalysis, setLegacyAnalysis] = useState<Record<string, unknown> | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalData, setShareModalData] = useState<{
    url: string;
    personaName: string;
    roleLine: string;
  } | null>(null);
  const isUnlockSource = searchParams.get("source") === "icp-unlock";

  useEffect(() => {
    const load = async () => {
      if (!user || !draftId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("icp_analysis_results")
          .select("id, analysis_data, target_audience, business_description, verdict")
          .eq("id", draftId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error || !data) {
          throw error || new Error("ICP Draft not found.");
        }

        const normalized = normalizeStoredArtifact(data);
        setArtifact(normalized.artifact);
        setLegacyAvailable(Boolean(normalized.legacyAvailable));
        setLegacyAnalysis(normalized.legacyAnalysis);
      } catch (error) {
        console.error("Failed to load ICP Draft", error);
        toast.error(error instanceof Error ? error.message : "Could not load the ICP Draft.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [draftId, user]);

  useEffect(() => {
    if (!artifact || !draftId || !isUnlockSource || hasTrackedUnlockOpenRef.current) return;

    hasTrackedUnlockOpenRef.current = true;
    trackICPUnlockedDraftOpened({
      draft_id: draftId,
      page_path: `/icp/draft/${draftId}`,
      source: "icp_unlock",
    });
  }, [artifact, draftId, isUnlockSource]);

  const handleUnlockedDashboardClick = () => {
    captureEvent("icp_unlocked_draft_dashboard_clicked", {
      draft_id: draftId,
      page_path: draftId ? `/icp/draft/${draftId}` : "/icp/draft",
      source: "unlock_success_banner",
    });
    navigate("/dashboard?from=icp_builder");
  };

  const dismissUnlockBanner = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("source");
    setSearchParams(nextParams, { replace: true });
  };

  const handleDownload = async () => {
    if (!artifact || !documentRef.current) return;
    setIsDownloading(true);
    try {
      await downloadDraftPdf(documentRef.current, `${artifact.draftDocument.customer.personaName}-icp-draft.pdf`);
    } catch (error) {
      console.error("Failed to download ICP Draft PDF", error);
      toast.error("Could not download the PDF right now.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!artifact || !user || !draftId) return;
    setIsSharing(true);
    try {
      const record = await upsertIcpDraftShare({
        userId: user.id,
        sourceId: draftId,
        artifact,
      });
      const shareUrl = getIcpDraftPublicUrl(record.slug);
      setShareModalData({
        url: shareUrl,
        personaName: artifact.draftDocument.customer.personaName,
        roleLine: artifact.draftDocument.customer.roleLine,
      });
    } catch (error) {
      console.error("Failed to create ICP share link", error);
      toast.error("Could not create a share link right now.");
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <IcpProgressBar progress={100} />
        <div className="flex min-h-screen items-center justify-center px-6">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center gap-3 px-6 py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading your ICP Draft...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user || !artifact) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <IcpProgressBar progress={100} />
        <div className="flex min-h-screen items-center justify-center px-6">
          <Card className="max-w-lg rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Draft unavailable</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">We couldn't open this ICP Draft.</h1>
              <p className="text-sm leading-6 text-slate-500">
                Sign in again or return to the builder to regenerate it.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/icp-builder">Open ICP Builder</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <IcpProgressBar progress={100} />

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        {isUnlockSource ? (
          <div className="mb-5 overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                    Unlocked
                  </p>
                  <h2 className="text-xl font-semibold text-slate-950 sm:text-2xl">
                    Your full ICP Draft is unlocked
                  </h2>
                  <p className="max-w-xl text-sm leading-6 text-slate-600">
                    You can read the complete draft now. When you&apos;re ready, open the dashboard to turn it into your next founder tasks.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  className="shrink-0 gap-2 bg-slate-950 text-white hover:bg-slate-800"
                  onClick={handleUnlockedDashboardClick}
                >
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="shrink-0"
                  onClick={dismissUnlockBanner}
                >
                  Stay on the draft
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.4)] sm:p-7">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#32b8c6]/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#7dd3fc] ring-1 ring-white/15">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7dd3fc]">Next step</p>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  You built your ICP. Now let’s get your first users.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-slate-300">
                  Turn this ICP into a live, founder-grade waitlist page — pre-filled with your persona, pain points, and value props.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="shrink-0 gap-2 bg-white text-slate-950 hover:bg-white/90"
              onClick={() => navigate(`/waitlist?icp=${draftId}`)}
            >
              <span>Build your waitlist</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <IcpFolioDocument
        draft={artifact.draftDocument}
        documentRef={documentRef}
        topBar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="ghost" className="gap-2 text-slate-600" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={() => navigate(`/icp-builder?edit=${draftId}`)}>
                <PencilLine className="h-4 w-4" />
                Edit
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => void handleDownload()} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => void handleShare()} disabled={isSharing}>
                {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Share
              </Button>
            </div>
          </div>
        }
        bottomBar={
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.3)]">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" className="sm:flex-1 gap-2" onClick={() => void handleDownload()} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button type="button" variant="outline" className="sm:flex-1 gap-2" onClick={() => void handleShare()} disabled={isSharing}>
                {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Share link
              </Button>
              <Button type="button" className="sm:flex-1" onClick={() => navigate("/dashboard")}>
                Start Stage 2 →
              </Button>
            </div>
          </div>
        }
      />

      {shareModalData ? (
        <IcpShareModal
          isOpen={Boolean(shareModalData)}
          onClose={() => setShareModalData(null)}
          shareUrl={shareModalData.url}
          personaName={shareModalData.personaName}
          roleLine={shareModalData.roleLine}
        />
      ) : null}

      {legacyAvailable ? (
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <Button type="button" variant="ghost" className="text-slate-600" onClick={() => setShowLegacy((value) => !value)}>
            {showLegacy ? "Hide legacy analysis" : "View legacy analysis"}
          </Button>
          {showLegacy && legacyAnalysis ? (
            <Card className="mt-4 rounded-[2rem] border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-4 p-6 text-sm leading-7 text-slate-600">
                <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-600">
                  {JSON.stringify(legacyAnalysis, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
