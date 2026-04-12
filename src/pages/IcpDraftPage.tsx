import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Download, Loader2, PencilLine, Share2 } from "lucide-react";
import { toast } from "sonner";

import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  const { user } = useAuth();
  const documentRef = useRef<HTMLDivElement>(null);

  const [artifact, setArtifact] = useState<StoredIcpArtifact | null>(null);
  const [legacyAnalysis, setLegacyAnalysis] = useState<Record<string, unknown> | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

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
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied.");
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
