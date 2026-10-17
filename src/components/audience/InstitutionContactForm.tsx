import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/lib/analytics";
import {
  INSTITUTION_ORG_TYPES,
  INSTITUTION_SIZES,
  type InstitutionOrgType,
} from "@/data/audiencePages";

const FALLBACK_EMAIL = "javier@creatives-takeover.com";

type InstitutionContactFormProps = {
  /** Which page the lead came from, for analytics (founders, investors, enterprise). */
  audience: string;
  defaultOrgType: InstitutionOrgType;
  submitLabel: string;
  /** plain: no card of its own and no email line, for pages that frame the form themselves. */
  variant?: "card" | "plain";
  /**
   * Sent as the contact reason. The edge function prints unknown reasons as
   * they are, so "Sales request" shows in the admin email subject.
   */
  reason?: string;
};

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Lead form for programs and investors. It reuses the contact-form-submission
 * edge function (stores the row in contact_submissions and emails the team),
 * so the organization details travel in the message header rather than in new
 * columns.
 */
function buildInstitutionMessage(fields: {
  organization: string;
  orgTypeLabel: string;
  size: string;
  page: string;
  message: string;
}) {
  return [
    `Organization: ${fields.organization}`,
    `Type: ${fields.orgTypeLabel}`,
    `Cohort or portfolio size: ${fields.size || "Not given"}`,
    `Page: ${fields.page}`,
    "",
    fields.message.trim() || "No message.",
  ].join("\n");
}

const InstitutionContactForm = ({
  audience,
  defaultOrgType,
  submitLabel,
  variant = "card",
  reason = "partnership",
}: InstitutionContactFormProps) => {
  const framed = variant === "card";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [orgType, setOrgType] = useState<InstitutionOrgType>(defaultOrgType);
  const [size, setSize] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");

    const type = INSTITUTION_ORG_TYPES.find((option) => option.value === orgType) ?? INSTITUTION_ORG_TYPES[0];

    try {
      const { error } = await supabase.functions.invoke("contact-form-submission", {
        body: {
          name: name.trim(),
          email: email.trim(),
          role: type.role,
          reason,
          message: buildInstitutionMessage({
            organization: organization.trim(),
            orgTypeLabel: type.label,
            size,
            page: window.location.pathname,
            message,
          }),
        },
      });

      if (error) throw error;

      captureEvent("b2b_lead_submitted", { audience, org_type: orgType, size: size || "not_given" });
      setStatus("sent");
    } catch (error) {
      console.error("Institution contact form failed:", error);
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className={framed ? "surface-panel trust-outline rounded-3xl p-8 text-center" : "py-10 text-center"} role="status">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-success" aria-hidden="true" />
        <h3 className="audience-card__title mb-2">Thanks, we’ve got it.</h3>
        <p className="audience-card__body">
          We’ll reply to {email} with next steps. A copy of your message is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={framed ? "surface-panel trust-outline space-y-5 rounded-3xl p-6 sm:p-8" : "space-y-5"}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="institution-name">Your name *</Label>
          <Input id="institution-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="institution-email">Work email *</Label>
          <Input
            id="institution-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="institution-organization">Organization *</Label>
        <Input
          id="institution-organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          required
          autoComplete="organization"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="institution-type">Type *</Label>
          <Select value={orgType} onValueChange={(value) => setOrgType(value as InstitutionOrgType)}>
            <SelectTrigger id="institution-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTITUTION_ORG_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="institution-size">Cohort or portfolio size</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger id="institution-size">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {INSTITUTION_SIZES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="institution-message">Anything we should know?</Label>
        <Textarea
          id="institution-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="resize-none"
          placeholder="Program dates, focus area, what you want to see from your teams..."
        />
      </div>

      {status === "error" ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          We couldn’t send the form. Please email us at{" "}
          <a href={`mailto:${FALLBACK_EMAIL}`} className="font-medium underline">
            {FALLBACK_EMAIL}
          </a>
          .
        </p>
      ) : null}

      <Button type="submit" disabled={status === "sending"} className="h-12 w-full gap-2 bg-gradient-unified text-base font-semibold text-primary-foreground hover:opacity-90">
        {status === "sending" ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitLabel}
          </>
        )}
      </Button>

      {framed ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" aria-hidden="true" />
          Prefer email?{" "}
          <a href={`mailto:${FALLBACK_EMAIL}?subject=Programs%20and%20partnerships`} className="font-medium text-primary hover:underline">
            {FALLBACK_EMAIL}
          </a>
        </p>
      ) : null}
    </form>
  );
};

export default InstitutionContactForm;
