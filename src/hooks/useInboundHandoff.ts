/**
 * Reads the pending-handoff inbox for one destination tool.
 *
 * Deliberately does NOT consume. Consumption stays bound to the destination
 * actually producing its artifact -- journey-outcome-service already flips
 * every pending handoff passed as `handoffId` on upsertJourneyOutcome. Marking
 * one consumed on arrival would make the cross-tool funnel report a completion
 * for a founder who only opened the page.
 */

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { getInboundHandoff, readHandoffPrefill, type JourneyHandoffPrefill } from "@/lib/journeyHandoffInbox";
import type { JourneyHandoff, JourneyTool } from "@/lib/journeyOutcomes";

export function useInboundHandoff(destinationTool: JourneyTool) {
  const { user } = useAuth();
  const [handoff, setHandoff] = useState<JourneyHandoff | null>(null);
  const [prefill, setPrefill] = useState<JourneyHandoffPrefill | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) {
      setHandoff(null);
      setPrefill(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getInboundHandoff(destinationTool)
      .then((row) => {
        if (cancelled) return;
        setHandoff(row);
        setPrefill(readHandoffPrefill(row));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [destinationTool, user]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { handoff, prefill, loading, dismissed, dismiss };
}
