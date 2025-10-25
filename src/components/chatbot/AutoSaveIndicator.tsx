import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
}

export const AutoSaveIndicator = ({ isSaving, lastSaved }: AutoSaveIndicatorProps) => {
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (!isSaving && lastSaved) {
      setShowCheckmark(true);
      const timeout = setTimeout(() => setShowCheckmark(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isSaving, lastSaved]);

  if (!isSaving && !showCheckmark) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
      {isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving progress...</span>
        </>
      ) : showCheckmark ? (
        <>
          <Check className="h-3 w-3 text-green-500 animate-scale-in" />
          <span className="text-green-600 dark:text-green-400">
            Your progress is being saved automatically
          </span>
        </>
      ) : null}
    </div>
  );
};
