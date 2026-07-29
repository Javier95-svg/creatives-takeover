import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { captureEvent } from "@/lib/analytics";
import { getActivationPreferenceState } from "@/lib/activationState";
import { getUserPreferencesRecord } from "@/lib/guidedOnboarding";

const DISMISSED_AT_KEY = "founder_stage_prompt_dismissed_at";
const COMPLETED_AT_KEY = "founder_stage_prompt_completed_at";

const STAGE_OPTIONS = [
  { value: "idea", label: "Still an idea" },
  { value: "building-mvp", label: "Building an MVP" },
  { value: "mvp-ready", label: "MVP ready to launch" },
  { value: "early-users", label: "Working with early users" },
  { value: "growth", label: "Growing repeatable demand" },
];

export function ProgressiveFounderStagePrompt() {
  const { user } = useAuth();
  const trackedShownRef = useRef(false);
  const [stage, setStage] = useState("");
  const [preferences, setPreferences] = useState<Record<string, unknown> | null>(null);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState<"save" | "skip" | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("quiz_current_stage, user_preferences")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const nextPreferences = getUserPreferencesRecord(data.user_preferences);
      const activation = getActivationPreferenceState(nextPreferences);
      const shouldShow = Boolean(
        activation.firstArtifactType &&
        !data.quiz_current_stage &&
        !nextPreferences[DISMISSED_AT_KEY],
      );

      setPreferences(nextPreferences);
      setStage(data.quiz_current_stage || "");
      setVisible(shouldShow);

      if (shouldShow && !trackedShownRef.current) {
        trackedShownRef.current = true;
        captureEvent("progressive_founder_stage_prompt_shown", {
          source: "tasks_after_activation",
          artifact_type: activation.firstArtifactType,
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const persist = async (mode: "save" | "skip") => {
    if (!user || !preferences) return;
    if (mode === "save" && !stage) {
      toast.error("Choose the stage that best matches where you are now.");
      return;
    }

    setSaving(mode);
    const timestamp = new Date().toISOString();
    const nextPreferences = {
      ...preferences,
      [mode === "save" ? COMPLETED_AT_KEY : DISMISSED_AT_KEY]: timestamp,
    };
    const patch = mode === "save"
      ? {
          quiz_current_stage: stage,
          business_stage: stage,
          user_preferences: nextPreferences as Json,
        }
      : {
          user_preferences: nextPreferences as Json,
        };

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setSaving(null);

    if (error) {
      toast.error("Could not update your profile right now.");
      return;
    }

    captureEvent(
      mode === "save"
        ? "progressive_founder_stage_prompt_completed"
        : "progressive_founder_stage_prompt_skipped",
      { source: "tasks_after_activation" },
    );
    setPreferences(nextPreferences);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.04] shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Tailor your next tasks</p>
              <p className="text-sm text-muted-foreground">
                One optional question helps us prioritize the right work. You can skip it.
              </p>
            </div>
          </div>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="progressive-founder-stage">What stage are you at?</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger id="progressive-founder-stage">
                <SelectValue placeholder="Choose your current stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void persist("save")} disabled={saving !== null}>
            {saving === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save stage
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void persist("skip")}
            disabled={saving !== null}
          >
            {saving === "skip" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
