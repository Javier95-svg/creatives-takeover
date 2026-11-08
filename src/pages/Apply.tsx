import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { BriefcaseBusiness, CheckCircle2, GraduationCap, Send } from "lucide-react";

import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/lib/analytics";
import { WHO_IS_THIS_FOR_ACCOUNT_TYPES } from "@/components/whoIsThisForProfiles";

// Application form for the invitation-only account types (Mentor and
// Marketplace), reached from their "Apply here" buttons. It reuses the
// contact-form-submission edge function, which stores the row in
// contact_submissions and emails the team, so the application details travel
// in the message rather than in new columns.

const FALLBACK_EMAIL = "javier@creatives-takeover.com";

const ROLES = {
  mentor: {
    icon: GraduationCap,
    title: "Mentor",
    applicant: "Mentor applicant",
    reason: "Mentor application",
    focusLabel: "What do you advise on? *",
    focusPlaceholder: "Fundraising, B2B sales, product design...",
  },
  marketplace: {
    icon: BriefcaseBusiness,
    title: "Service provider",
    applicant: "Service provider applicant",
    reason: "Marketplace application",
    focusLabel: "What services do you offer? *",
    focusPlaceholder: "Branding, paid ads, web development...",
  },
} as const;

type RoleId = keyof typeof ROLES;
type Status = "idle" | "sending" | "sent" | "error";

const isRole = (value: string | null): value is RoleId => value === "mentor" || value === "marketplace";

const Apply = () => {
  const [params] = useSearchParams();
  const asParam = params.get("as");
  const [role, setRole] = useState<RoleId>(isRole(asParam) ? asParam : "mentor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [focus, setFocus] = useState("");
  const [experience, setExperience] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const current = ROLES[role];
  // The account type's own line, as on the homepage card.
  const promise = WHO_IS_THIS_FOR_ACCOUNT_TYPES.find((account) => account.id === role)?.next;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");

    try {
      const { error } = await supabase.functions.invoke("contact-form-submission", {
        body: {
          name: name.trim(),
          email: email.trim(),
          role: current.applicant,
          reason: current.reason,
          message: [
            `Applying as: ${current.title}`,
            `LinkedIn or website: ${link.trim()}`,
            `${role === "mentor" ? "Advises on" : "Services"}: ${focus.trim()}`,
            "",
            experience.trim(),
          ].join("\n"),
        },
      });
      if (error) throw error;
      captureEvent("account_application_submitted", { account_type: role });
      setStatus("sent");
    } catch (error) {
      console.error("Application form failed:", error);
      setStatus("error");
    }
  };

  return (
    <>
      <SEO
        title="Apply as a Mentor or Service Provider | Creatives Takeover"
        description="Mentor and Marketplace accounts on Creatives Takeover open by invitation. Tell us about your experience and we will reply by email."
        url="/apply"
        canonical="https://creatives-takeover.com/apply"
        noindex
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto max-w-2xl px-4 pb-24 pt-32 sm:px-6">
          <header className="mb-8">
            <h1 className="font-space-grotesk text-3xl font-semibold md:text-4xl">Apply to join Creatives Takeover</h1>
            <p className="mt-4 text-muted-foreground">
              Mentor and Marketplace accounts open by invitation. Tell us about your experience and we’ll reply by email
              within 1–2 business days.
            </p>
          </header>

          {status === "sent" ? (
            <div className="surface-panel trust-outline rounded-3xl p-8 text-center" role="status">
              <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-success" aria-hidden="true" />
              <h2 className="mb-2 text-xl font-semibold">Thanks, we’ve got your application.</h2>
              <p className="text-muted-foreground">We’ll reply to {email} with next steps.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="surface-panel trust-outline space-y-5 rounded-3xl p-6 sm:p-8">
              <fieldset>
                <legend className="mb-2 text-sm font-medium">I’m applying as *</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(ROLES) as RoleId[]).map((id) => {
                    const Icon = ROLES[id].icon;
                    const selected = id === role;
                    return (
                      <label
                        key={id}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${
                          selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <input type="radio" name="role" value={id} checked={selected} onChange={() => setRole(id)} className="sr-only" />
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                        <span className="text-sm font-semibold">{ROLES[id].title}</span>
                      </label>
                    );
                  })}
                </div>
                {promise ? <p className="mt-2 text-sm text-muted-foreground">{promise}</p> : null}
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apply-name">Your name *</Label>
                  <Input id="apply-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apply-email">Email *</Label>
                  <Input id="apply-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apply-link">LinkedIn or website *</Label>
                <Input id="apply-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} required placeholder="https://" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apply-focus">{current.focusLabel}</Label>
                <Input id="apply-focus" value={focus} onChange={(e) => setFocus(e.target.value)} required placeholder={current.focusPlaceholder} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apply-experience">Your experience *</Label>
                <Textarea
                  id="apply-experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  required
                  rows={5}
                  className="resize-none"
                  placeholder="What you have built, who you have worked with, and how you would help founders here."
                />
              </div>

              {status === "error" ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                  We couldn’t send the form. Please email us at{" "}
                  <a href={`mailto:${FALLBACK_EMAIL}`} className="font-medium underline">{FALLBACK_EMAIL}</a>.
                </p>
              ) : null}

              <Button type="submit" disabled={status === "sending"} className="h-12 w-full gap-2 text-base font-semibold">
                <Send className="h-4 w-4" aria-hidden="true" />
                {status === "sending" ? "Sending..." : "Send application"}
              </Button>
            </form>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Apply;
