import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useAssignedStage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setStage(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("assigned_stage")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("Failed to load assigned_stage", error);
        return;
      }
      const raw = (data as { assigned_stage?: number | null } | null)?.assigned_stage;
      setStage(typeof raw === "number" ? raw : null);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return stage;
}
