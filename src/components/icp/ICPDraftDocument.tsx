import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { AlertTriangle, CheckCircle2, Compass, LockKeyhole, ShieldCheck, Sparkles, Target, Users, Wrench } from "lucide-react";

interface ICPDraftDocumentProps {
  artifact: StoredIcpArtifact;
  locked?: boolean;
  onUnlock?: () => void;
  onViewLegacy?: () => void;
  showLegacyFallback?: boolean;
}

function sectionClass(locked: boolean | undefined) {
  return locked ? "blur-sm select-none pointer-events-none" : "";
}

export function ICPDraftDocument({
  artifact,
  locked = false,
  onUnlock,
  onViewLegacy,
  showLegacyFallback = false,
}: ICPDraftDocumentProps) {
  const confidenceTone =
    artifact.draftDocument.confidence.level === "high"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : artifact.draftDocument.confidence.level === "medium"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
        : "bg-rose-500/10 text-rose-700 border-rose-500/20";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-background to-background">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">ICP Draft</Badge>
            <Badge className={confidenceTone}>
              Confidence: {artifact.draftDocument.confidence.level}
            </Badge>
            {locked ? (
              <Badge variant="outline" className="gap-1">
                <LockKeyhole className="h-3.5 w-3.5" />
                Locked
              </Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl">A sharper first customer direction</CardTitle>
            <CardDescription className="max-w-3xl text-sm sm:text-base">
              {locked
                ? "Your ICP Draft is ready. Create a free account to unlock the full document and put it to work in your dashboard."
                : artifact.dashboardContext.message}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Who
            </CardTitle>
          </CardHeader>
          <CardContent className={sectionClass(locked)}>
            <p className="text-base font-medium leading-7">{artifact.draftDocument.who.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {artifact.draftDocument.who.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Primary pain point
            </CardTitle>
          </CardHeader>
          <CardContent className={sectionClass(locked)}>
            <p className="text-base font-medium leading-7">{artifact.draftDocument.painPoint.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Severity: {artifact.draftDocument.painPoint.severity}</Badge>
              <Badge variant="outline">Frequency: {artifact.draftDocument.painPoint.frequency}</Badge>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {artifact.draftDocument.painPoint.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-primary" />
              What to build first
            </CardTitle>
          </CardHeader>
          <CardContent className={sectionClass(locked)}>
            <p className="text-base font-medium leading-7">{artifact.draftDocument.buildRecommendation.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {artifact.draftDocument.buildRecommendation.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Moat
            </CardTitle>
          </CardHeader>
          <CardContent className={sectionClass(locked)}>
            <p className="text-base font-medium leading-7">{artifact.draftDocument.moat.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {artifact.draftDocument.moat.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
            {artifact.draftDocument.moat.weakClaims.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Claims to pressure-test</p>
                <ul className="space-y-2">
                  {artifact.draftDocument.moat.weakClaims.map((claim) => (
                    <li key={claim}>• {claim}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Compass className="h-5 w-5 text-primary" />
              Confidence and missing signals
            </CardTitle>
          </CardHeader>
          <CardContent className={sectionClass(locked)}>
            <p className="text-base font-medium leading-7">{artifact.draftDocument.confidence.summary}</p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {artifact.draftDocument.confidence.missingSignals.map((signal) => (
                <p key={signal}>• {signal}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              What to do next
            </CardTitle>
          </CardHeader>
          <CardContent className={sectionClass(locked)}>
            <div className="space-y-3">
              {artifact.draftDocument.nextActions.map((action) => (
                <div key={`${action.route}-${action.title}`} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <p className="font-medium text-foreground">{action.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {locked ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Your ICP Draft is ready</p>
              <p className="text-sm text-muted-foreground">
                Create a free account to unlock the full document and get the right next steps in your dashboard.
              </p>
            </div>
            <Button type="button" size="lg" onClick={onUnlock}>
              <Sparkles className="mr-2 h-4 w-4" />
              Unlock my ICP Draft
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showLegacyFallback ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
          <div className="text-sm text-muted-foreground">
            This draft was mapped from an older saved ICP analysis. You can still inspect the legacy breakdown if needed.
          </div>
          <Button type="button" variant="outline" onClick={onViewLegacy}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            View legacy analysis
          </Button>
        </div>
      ) : null}
    </div>
  );
}
