import { CheckCircle2 } from "lucide-react";

export default function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <span className="text-muted-foreground">Free to start</span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <span className="text-muted-foreground">2,847 launched this year</span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <span className="text-muted-foreground">Avg. $3.2K first month</span>
      </div>
    </div>
  );
}
