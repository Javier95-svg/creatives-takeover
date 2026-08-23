import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Loader2, PencilLine, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import IcpEvidenceCheck from "@/components/icp/IcpEvidenceCheck";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent, trackICPUnlockedDraftOpened } from "@/lib/analytics";
import { normalizeStoredArtifact } from "@/lib/icpDraftArtifacts";
import { getIcpScorePublicUrl, upsertIcpScoreShare } from "@/lib/icpDraftSharing";
import { IcpScoreShareModal } from "@/components/icp/IcpScoreShareModal";
import { downloadIcpDraftDocx, downloadIcpDraftPdf } from "@/lib/icpDraftExport";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { trackActivationFunnelEvent } from "@/lib/activationEntry";
import { trackJourneyEvent } from "@/lib/journeyOutcomes";
import { buildIcpScoreCard } from "@/lib/icpScoreCard";
import { isFirstCustomerSprintKillSwitchEnabled } from "@/hooks/useFirstCustomerSprint";
import { useFeatureFlagEnabled } from "@/hooks/usePosthogFeatureFlag";

function slugifyFileName(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "icp-draft";
}

export default function IcpDraftPage() {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const documentRef = useRef<HTMLDivElement>(null);
  const hasTrackedUnlockOpenRef = useRef(false);
  // The flag alone, not the full sprint hook: this page only needs to know whether
  // the door exists, and the hook fires an RPC that every draft view would pay for.
  const sprintEnabled = isFirstCustomerSprintKillSwitchEnabled(useFeatureFlagEnabled('first-customer-sprint-v1'));

  const [artifact, setArtifact] = useState<StoredIcpArtifact | null>(null);
  const [legacyAnalysis, setLegacyAnalysis] = useState<Record<string, unknown> | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const isUnlockSource = searchParams.get("source") === "icp-unlock";
  // Built here rather than read back from a share row: the founder sees the
  // score long before any link exists, and the share copy has to name it either
  // way. upsertIcpScoreShare freezes this same card when a link is minted.
  const scoreCard = useMemo(
    () =>
      artifact
        ? buildIcpScoreCard(artifact.draftDocument, {
            idea: artifact.founderInputs.fastDescription,
            generatedAt: artifact.generatedAt,
          })
        : null,
    [artifact],
  );

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

  const handleDemoStudioClick = () => {
    captureEvent("icp_unlocked_draft_dashboard_clicked", {
      draft_id: draftId,
      page_path: draftId ? `/icp/draft/${draftId}` : "/icp/draft",
      source: "demo_studio_handoff",
    });
    trackActivationFunnelEvent("activation_step_completed", {
      entry_id: "icp_draft_unlock",
      tool: "icp_builder",
      source: "icp-draft-unlock",
      step: "second_meaningful_action",
      is_authenticated: true,
      artifact_type: "customer_decision_brief",
      artifact_id: draftId,
      action: "open_demo_studio",
    });
    trackJourneyEvent("journey_next_stage_started", {
      tool: "icp_builder",
      artifact_type: "customer_decision_brief",
      artifact_id: draftId,
      source: "icp-draft-unlock",
      action: "open_demo_studio",
    });
    // Send founders to the surface that actually records conversations. The dashboard
    // task list never read `from=icp_builder`, so the interview plan died there; the
    // PMF Lab interview logger opens seeded with these same five questions and every
    // logged interview counts toward the evidence grade.
    navigate(`/demo-studio?icp=${draftId ?? ""}`);
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
      const base = slugifyFileName(artifact.draftDocument.customer.personaName);
      await downloadIcpDraftPdf(documentRef.current, `${base}-icp-draft.pdf`);
    } catch (error) {
      console.error("Failed to download ICP Draft PDF", error);
      toast.error("Could not download the PDF right now.");
    } finally {
      setIsDownloading(false);
    }
  };

  /*
   * Mints a score-card link, not a draft link.
   *
   * The score is the shareable unit: it is what a stranger can react to, and
   * the draft is a working document that costs the account its value once it is
   * public. upsertIcpScoreShare stores only the card.
   */
  const handleShareScore = async (): Promise<string | null> => {
    if (!scoreCard || !user || !draftId) return null;
    try {
      const slug = await upsertIcpScoreShare({ userId: user.id, sourceId: draftId, card: scoreCard });
      return getIcpScorePublicUrl(slug);
    } catch {
      toast.error("Could not create a share link right now.");
      return null;
    }
  };

  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const handleSaveDocx = async () => {
    if (!artifact) return;
    setIsDownloadingDocx(true);
    try {
      const base = slugifyFileName(artifact.draftDocument.customer.personaName);
      await downloadIcpDraftDocx(artifact.draftDocument, `${base}-icp-draft.docx`);
      toast.success("DOCX downloaded.");
    } catch (error) {
      console.error("Failed to download ICP Draft DOCX", error);
      toast.error("Could not download the DOCX right now.");
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <IcpProgressBar progress={100} />
        <div className="flex min-h-screen items-center justify-center px-6">
          <Card className="rounded-5xl border-border bg-white shadow-sm">
            <CardContent className="flex items-center gap-3 px-6 py-8 text-muted-foreground">
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
          <Card className="max-w-lg rounded-5xl border-border bg-white shadow-sm">
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Draft unavailable</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">We couldn't open this ICP Draft.</h1>
              <p className="text-sm leading-6 text-muted-foreground">
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
          <div className="mb-5 overflow-hidden rounded-4xl border border-success bg-gradient-to-br from-success via-white to-info p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success ring-1 ring-success/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-label font-semibold uppercase tracking-[0.24em] text-success">
                    Unlocked
                  </p>
                  <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                    Your full ICP Draft is unlocked
                  </h2>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    Your brief is saved. Demo Studio will carry this exact draft forward so prospects can react before you make a build decision.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  className="shrink-0 gap-2 bg-slate-950 text-white hover:bg-slate-800"
                  onClick={handleDemoStudioClick}
                >
                  Create my prospect demo
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

        <div className="group relative overflow-hidden rounded-4xl border border-border bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] p-6 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.4)] sm:p-7">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent-teal/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#7dd3fc] ring-1 ring-white/15">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-label font-semibold uppercase tracking-[0.24em] text-[#7dd3fc]">Next step</p>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Give this customer something concrete to react to.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Demo Studio carries this exact ICP draft forward as an explicitly untested story. Publish it, collect reactions, then bring the scoped evidence into PMF Lab.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="shrink-0 gap-2 bg-white text-foreground hover:bg-white/90"
              onClick={handleDemoStudioClick}
            >
              <span>Create my prospect demo</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className={`relative mt-5 grid gap-3 border-t border-white/10 pt-5 ${sprintEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <Link
              to={`/demo-studio?icp=${draftId ?? ""}`}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white transition hover:bg-white/10"
            >
              <span className="font-semibold">Demo Studio, recommended next</span>
              <span className="mt-1 block text-white/60">Turn this exact draft into a shareable interactive demo.</span>
            </Link>
            <Link
              to={`/pmf-lab?icp=${draftId ?? ""}`}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white transition hover:bg-white/10"
            >
              <span className="font-semibold">I already have conversations</span>
              <span className="mt-1 block text-white/60">Log what you heard, then see whether interview and demand signals support build, narrow, pivot, or stop.</span>
            </Link>
            {/*
              * The third exit: a founder who wants buyers rather than another
              * artifact. Gated on the release flag only, not on enrolment: the
              * sprint page shows an application to a founder outside the cohort,
              * which is the intended path into the pilot rather than a dead end.
              */}
            {sprintEnabled ? (
              <Link
                to={`/first-customer-sprint?icp=${draftId ?? ""}`}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white transition hover:bg-white/10"
              >
                <span className="font-semibold">I want customers now</span>
                <span className="mt-1 block text-white/60">Carry this segment, offer, and pain straight into a 30-day first-customer sprint.</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <IcpFolioDocument
        draft={artifact.draftDocument}
        documentRef={documentRef}
        topBar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="ghost" className="gap-2 text-muted-foreground" onClick={() => navigate("/dashboard")}>
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
              <Button type="button" variant="outline" className="gap-2" onClick={() => void handleSaveDocx()} disabled={isDownloadingDocx}>
                {isDownloadingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Download DOCX
              </Button>
            </div>
          </div>
        }
        scoreAction={
          scoreCard ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="button" size="lg" className="gap-2" onClick={handleDemoStudioClick}>
                Create my demo
                <ArrowRight className="h-4 w-4" />
              </Button>
              <IcpScoreShareModal
                card={scoreCard}
                onResolveUrl={handleShareScore}
                autoOpenKey={draftId ?? null}
              />
            </div>
          ) : null
        }
      />

      {user ? (
        <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
          <IcpEvidenceCheck userId={user.id} />
        </div>
      ) : null}

      {legacyAvailable ? (
        <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => setShowLegacy((value) => !value)}>
            {showLegacy ? "Hide legacy analysis" : "View legacy analysis"}
          </Button>
          {showLegacy && legacyAnalysis ? (
            <Card className="mt-4 rounded-5xl border-border bg-white shadow-sm">
              <CardContent className="space-y-4 p-6 text-sm leading-7 text-muted-foreground">
                <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
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
