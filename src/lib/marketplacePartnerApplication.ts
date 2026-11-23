/**
 * The Marketplace partner application (/marketplace/join, 2026-11-23).
 *
 * A short one-question-per-screen quiz in the spirit of the /enterprise
 * qualifying Typeform: it greets the applicant by name, carries their company
 * name into later questions and shows services that match their focus. The
 * answers go to contact-form-submission, which emails admin@ and javier@, so
 * everything travels in the message body (see buildApplicationMessage).
 */

export type PartnerFocus = "tech_support" | "sales" | "marketing" | "ops" | "other";
export type DeckAnswer = "yes" | "not_yet" | "no";

export interface PartnerApplication {
  name: string;
  company: string;
  website: string;
  focus: PartnerFocus | "";
  focusOther: string;
  services: string[];
  servicesOther: string;
  stages: string[];
  startModel: string;
  startBudget: string;
  deck: DeckAnswer | "";
  deckUrl: string;
  email: string;
  note: string;
}

export const EMPTY_APPLICATION: PartnerApplication = {
  name: "",
  company: "",
  website: "",
  focus: "",
  focusOther: "",
  services: [],
  servicesOther: "",
  stages: [],
  startModel: "",
  startBudget: "",
  deck: "",
  deckUrl: "",
  email: "",
  note: "",
};

export type Option = { value: string; label: string; hint?: string };

export const FOCUS_OPTIONS: (Option & { value: PartnerFocus })[] = [
  { value: "tech_support", label: "Tech Support", hint: "Build, ship and run the product" },
  { value: "sales", label: "Sales", hint: "Leads, outreach and pipeline" },
  { value: "marketing", label: "Marketing", hint: "SEO, ads, content and brand" },
  { value: "ops", label: "Ops", hint: "Automation, internal tools and back office" },
  { value: "other", label: "Something else", hint: "Tell us in a few words" },
];

/** Services shown on the next question, matched to the focus picked before it. */
export const SERVICES_BY_FOCUS: Record<PartnerFocus, string[]> = {
  tech_support: [
    "MVP and product builds",
    "AI features and agents",
    "Web and mobile apps",
    "UI/UX design",
    "Cloud, DevOps and security",
    "QA and testing",
  ],
  sales: [
    "Lead generation",
    "Outbound campaigns",
    "CRM setup and automation",
    "Sales playbooks and coaching",
    "Partnerships and channel sales",
  ],
  marketing: [
    "SEO and GEO",
    "Paid ads",
    "Content and social",
    "LinkedIn growth",
    "Brand and positioning",
    "Launch campaigns",
  ],
  ops: [
    "Workflow automation",
    "Internal tools",
    "AI agents for operations",
    "Finance and admin",
    "Hiring and HR",
    "Process documentation",
  ],
  other: [],
};

export const STAGE_OPTIONS: Option[] = [
  { value: "idea", label: "Idea stage", hint: "Nothing built yet" },
  { value: "building", label: "Building an MVP", hint: "Working on a first version" },
  { value: "first_customers", label: "First customers", hint: "Early revenue, finding fit" },
  { value: "growing", label: "Growing", hint: "Raised a round or scaling sales" },
];

export const START_MODEL_OPTIONS: Option[] = [
  { value: "project", label: "Fixed-price project" },
  { value: "retainer", label: "Monthly retainer" },
  { value: "hourly", label: "Hourly or daily rate" },
  { value: "free_first", label: "Free first call or audit" },
];

export const START_BUDGET_OPTIONS: Option[] = [
  { value: "under_1k", label: "Under $1,000" },
  { value: "1k_5k", label: "$1,000 – $5,000" },
  { value: "5k_15k", label: "$5,000 – $15,000" },
  { value: "over_15k", label: "Over $15,000" },
];

export const DECK_OPTIONS: (Option & { value: DeckAnswer })[] = [
  { value: "yes", label: "Yes, here's the link" },
  { value: "not_yet", label: "Not yet, I can make one" },
  { value: "no", label: "No" },
];

export const STEP_IDS = ["name", "company", "focus", "services", "stages", "start", "deck", "email"] as const;
export type StepId = (typeof STEP_IDS)[number];

const EMAIL_PATTERN = /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[^\s@<>"'&]+$/;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** The company name for question copy, or a neutral stand-in before it is known. */
export const companyLabel = (company: string) => company.trim() || "your company";

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

/** Accepts "acme.com" as well as full links; empty is allowed where the field is optional. */
export function isValidLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** The reason a step cannot continue yet, or null when it can. */
export function stepError(step: StepId, answers: PartnerApplication): string | null {
  switch (step) {
    case "name":
      return answers.name.trim().length >= 2 ? null : "Add your name to continue.";
    case "company":
      if (answers.company.trim().length < 2) return "Add your company name to continue.";
      if (answers.website.trim() && !isValidLink(answers.website)) return "That website doesn't look right. Try something like acme.com.";
      return null;
    case "focus":
      if (!answers.focus) return "Pick the one that fits best.";
      if (answers.focus === "other" && answers.focusOther.trim().length < 3) return "Tell us in a few words what you do.";
      return null;
    case "services":
      return answers.services.length > 0 || answers.servicesOther.trim().length >= 3
        ? null
        : "Pick at least one, or describe what you deliver.";
    case "stages":
      return answers.stages.length > 0 ? null : "Pick at least one.";
    case "start":
      if (!answers.startModel) return "Pick how founders usually start.";
      if (!answers.startBudget) return "Pick a typical starting budget.";
      return null;
    case "deck":
      if (!answers.deck) return "Pick one to continue.";
      if (answers.deck === "yes" && !isValidLink(answers.deckUrl)) return "Paste a link to the deck (Google Drive, DocSend, a PDF link…).";
      return null;
    case "email":
      return isValidEmail(answers.email) ? null : "Add a valid email so we can reply.";
  }
}

const labelOf = (options: Option[], value: string) => options.find((option) => option.value === value)?.label ?? value;

/** The email body the team receives: every answer, labelled, one per line. */
export function buildApplicationMessage(answers: PartnerApplication, page: string) {
  const focus =
    answers.focus === "other"
      ? `Something else: ${answers.focusOther.trim()}`
      : labelOf(FOCUS_OPTIONS, answers.focus);
  const services = [...answers.services, ...(answers.servicesOther.trim() ? [`Other: ${answers.servicesOther.trim()}`] : [])];
  const deck =
    answers.deck === "yes"
      ? `Yes: ${answers.deckUrl.trim()}`
      : labelOf(DECK_OPTIONS, answers.deck);

  return [
    "MARKETPLACE PARTNER APPLICATION",
    "",
    `Company: ${answers.company.trim()}`,
    `Website: ${answers.website.trim() || "Not given"}`,
    `Main focus: ${focus}`,
    `Services: ${services.join(", ") || "Not given"}`,
    `Best-fit founders: ${answers.stages.map((stage) => labelOf(STAGE_OPTIONS, stage)).join(", ")}`,
    `How founders usually start: ${labelOf(START_MODEL_OPTIONS, answers.startModel)}`,
    `Typical starting budget: ${labelOf(START_BUDGET_OPTIONS, answers.startBudget)}`,
    `Pitch deck: ${deck}`,
    `Anything else: ${answers.note.trim() || "Nothing added"}`,
    "",
    `Sent from: ${page}`,
  ].join("\n");
}
