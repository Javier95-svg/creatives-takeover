type EmailSequenceEvent = "signup_completed" | "onboarding_complete" | "credit_warning" | "credit_exhausted";

export async function triggerEmailSequenceEvent(event: EmailSequenceEvent, userId: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn("[email-sequences] Missing env vars; event skipped", { event, userId });
      return;
    }

    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/email-sequences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mode: "event",
        event,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn("[email-sequences] Event trigger failed", {
        event,
        userId,
        status: response.status,
        body,
      });
    }
  } catch (error) {
    console.warn("[email-sequences] Event trigger threw", { event, userId, error });
  }
}
