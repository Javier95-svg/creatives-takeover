import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STAGES, type StageId } from "@/lib/stageDiagnostic";

interface StageBadgeProps {
  stage: number | null | undefined;
}

export const StageBadge = ({ stage }: StageBadgeProps) => {
  if (!stage || stage < 1 || stage > 7) return null;
  const meta = STAGES[stage as StageId];
  const shortcut = meta.topFocus[0];

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30">
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Your current stage
              </p>
              <p className="font-semibold text-base">
                Stage {meta.id} — {meta.name}
              </p>
            </div>
          </div>
          {shortcut && (
            <Button asChild size="sm" variant="outline" className="self-start sm:self-auto">
              <Link to={shortcut.href}>
                {shortcut.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StageBadge;
