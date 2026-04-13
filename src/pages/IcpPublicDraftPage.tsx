import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
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

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <IcpProgressBar progress={100} />
      <IcpFolioDocument
        draft={draft}
        footer={
          <div className="pb-6 text-center text-sm text-slate-500">
            Built with Creatives Takeover — the platform for first-time founders.
          </div>
        }
      />
    </div>
  );
}
