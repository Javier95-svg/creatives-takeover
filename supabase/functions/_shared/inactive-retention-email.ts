export const INACTIVE_CAMPAIGN_KEY = "inactive_return";
export const INACTIVE_TEMPLATE_VERSION = 1;

export const INACTIVE_SEQUENCES = [
  "routine_reminder",
  "activation_day7",
  "weekly_digest",
  "reengagement",
  "reengagement_30d",
  "reengagement_60d",
] as const;

export type InactiveSequence = typeof INACTIVE_SEQUENCES[number];
export type InactiveTouchIndex = 1 | 2 | 3 | 4;
export type ReturnAnchorKind = "routine" | "messages" | "artifact" | "mentor" | "call" | "capability";

export interface InactiveUserContext {
  sequence: string;
  routineGoal?: string | null;
  routineDaysSinceCheckin?: number | null;
  unreadMessageCount?: number | null;
  artifactLabel?: string | null;
  artifactPath?: string | null;
  savedMentorName?: string | null;
  hasDiscoveryCall?: boolean;
  activationIntent?: string | null;
}

export interface ReturnAnchor {
  kind: ReturnAnchorKind;
  label: string;
  path: string;
  resumeLine: string;
  smallStep: string;
  ctaLabel: string;
}

export interface BuiltInactiveEmail {
  subject: string;
  preheader: string;
  text: string;
  html: string;
  ctaLabel: string;
  ctaUrl: string;
  templateKey: string;
  templateVersion: number;
}

const clean = (value: string | null | undefined, fallback: string, maxLength = 80) => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, maxLength);
};

const firstNameOnly = (value: string | null | undefined) => {
  const normalized = clean(value, "there", 60);
  return normalized.split(/\s+/)[0] || "there";
};

const humanize = (value: string | null | undefined, fallback: string) =>
  clean(value, fallback, 70).replace(/[_-]+/g, " ").toLowerCase();

const safeInternalPath = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  try {
    const parsed = new URL(value, "https://creatives-takeover.com");
    if (parsed.origin !== "https://creatives-takeover.com") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};

const capabilityForIntent = (intent: string | null | undefined): ReturnAnchor => {
  switch (intent) {
    case "run_icp":
      return {
        kind: "capability",
        label: "ICP Builder",
        path: "/icp-builder",
        resumeLine: "If your customer still feels too broad, ICP Builder is the cleanest place to restart.",
        smallStep: "Answer the first prompt and leave with one sharper customer definition.",
        ctaLabel: "Open ICP Builder",
      };
    case "build_demo":
      return {
        kind: "capability",
        label: "Demo Studio",
        path: "/demo-studio",
        resumeLine: "If you need something concrete to show, Demo Studio is the simplest place to restart.",
        smallStep: "Open a project and turn one product idea into a link you can share.",
        ctaLabel: "Open Demo Studio",
      };
    case "save_mentor":
    case "send_message":
    case "book_call":
    case "find_mentor":
      return {
        kind: "capability",
        label: "Mentor Network",
        path: "/mentorship",
        resumeLine: "If a second opinion would help, the mentor network is the simplest place to restart.",
        smallStep: "Choose one person and bring them one specific question.",
        ctaLabel: "Find a mentor",
      };
    default:
      return {
        kind: "capability",
        label: "Command Center",
        path: "/dashboard",
        resumeLine: "Your Command Center can give you one next step without making you rebuild your plan.",
        smallStep: "Open it, choose the smallest useful action, and ignore the rest for today.",
        ctaLabel: "Open Command Center",
      };
  }
};

export function isInactiveSequence(sequence: string): sequence is InactiveSequence {
  return (INACTIVE_SEQUENCES as readonly string[]).includes(sequence);
}

export function selectReturnAnchor(context: InactiveUserContext): ReturnAnchor {
  if (context.sequence === "routine_reminder") {
    const goal = humanize(context.routineGoal, "your founder goal");
    const days = Math.max(0, Math.floor(context.routineDaysSinceCheckin ?? 0));
    return {
      kind: "routine",
      label: "Founder routine",
      path: "/dashboard/routine",
      resumeLine: days > 0
        ? `Your routine for ${goal} is still set up. Your last check-in was ${days} day${days === 1 ? "" : "s"} ago.`
        : `Your routine for ${goal} is set up, but it has not had its first check-in yet.`,
      smallStep: "Check off the easiest habit. One honest check-in is enough for today.",
      ctaLabel: "Open my routine",
    };
  }

  const unreadCount = Math.max(0, Math.floor(context.unreadMessageCount ?? 0));
  if (unreadCount > 0) {
    return {
      kind: "messages",
      label: "Messages",
      path: "/messages",
      resumeLine: `You have ${unreadCount} unread message${unreadCount === 1 ? "" : "s"} in a conversation you already started.`,
      smallStep: "Read the latest reply and answer only the most useful thread.",
      ctaLabel: "Open Messages",
    };
  }

  if (context.artifactPath) {
    const label = clean(context.artifactLabel, "saved project", 64);
    return {
      kind: "artifact",
      label,
      path: safeInternalPath(context.artifactPath, "/dashboard"),
      resumeLine: `${label} is saved exactly where you left it.`,
      smallStep: "Reopen it and improve one section. You do not need to finish everything today.",
      ctaLabel: `Continue ${label}`.slice(0, 48),
    };
  }

  if (context.savedMentorName) {
    const mentor = clean(context.savedMentorName, "your saved mentor", 60);
    return {
      kind: "mentor",
      label: mentor,
      path: "/saved-mentors",
      resumeLine: `${mentor} is still in your saved mentors.`,
      smallStep: "Review the profile and decide whether one focused message would help.",
      ctaLabel: "Open Saved Mentors",
    };
  }

  if (context.hasDiscoveryCall) {
    return {
      kind: "call",
      label: "Mentor conversations",
      path: "/mentorship/my-bookings",
      resumeLine: "Your mentor conversation path is still available in your account.",
      smallStep: "Bring one decision you want to pressure-test instead of restarting your whole plan.",
      ctaLabel: "Review my conversations",
    };
  }

  return capabilityForIntent(context.activationIntent);
}

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const truncateSubject = (value: string) => value.length <= 55
  ? value
  : `${value.slice(0, 54).trimEnd()}…`;

function copyForTouch(firstName: string, touchIndex: InactiveTouchIndex, anchor: ReturnAnchor) {
  if (touchIndex === 1) {
    return {
      angle: "resume",
      subject: anchor.kind === "routine"
        ? `${firstName}, one routine check-in is enough`
        : anchor.kind === "messages"
          ? `${firstName}, one conversation is waiting`
          : anchor.kind === "artifact"
            ? `Pick up ${anchor.label}`
            : `${firstName}, pick up where you left off`,
      preheader: anchor.resumeLine,
      paragraphs: [anchor.resumeLine, anchor.smallStep],
    };
  }

  if (touchIndex === 2) {
    return {
      angle: "smaller_step",
      subject: "Make the next step smaller",
      preheader: `A smaller way back into ${anchor.label}.`,
      paragraphs: [
        `If ${anchor.label} still matters, do not turn the return into a big project.`,
        anchor.smallStep,
      ],
    };
  }

  if (touchIndex === 3) {
    return {
      angle: "graceful_pause",
      subject: "I’ll pause these reminders",
      preheader: "One last link before the reminders go quiet for 60 days.",
      paragraphs: [
        "I do not want these emails to become background noise, so this is the last reminder for a while.",
        `${anchor.resumeLine} If it is still useful, it will be ready when you open it. Otherwise, I’ll pause these notes for 60 days.`,
      ],
    };
  }

  return {
    angle: "long_dormant",
    subject: `Still building, ${firstName}?`,
    preheader: `One final way back into ${anchor.label}.`,
    paragraphs: [
      "It has been quiet for a while, so I wanted to leave you one useful way back in.",
      `${anchor.resumeLine} This is the final automatic win-back note until you use the platform again.`,
    ],
  };
}

export function buildInactiveEmail(args: {
  firstName?: string | null;
  touchIndex: InactiveTouchIndex;
  anchor: ReturnAnchor;
  ctaUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
}): BuiltInactiveEmail {
  const name = firstNameOnly(args.firstName);
  const copy = copyForTouch(name, args.touchIndex, args.anchor);
  const subject = truncateSubject(copy.subject);
  const templateKey = `inactive_${copy.angle}_${args.anchor.kind}`;
  const greeting = `Hi ${name},`;
  const signature = "Javier\nFounder, Creatives Takeover";
  const text = [greeting, ...copy.paragraphs, signature].join("\n\n");
  const paragraphs = copy.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;color:#334155;">${escapeHtml(paragraph)}</p>`)
    .join("");

  const html = `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(copy.preheader)}</div>
    <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.65;color:#0f172a;max-width:560px;margin:0 auto;padding:8px 0;">
      <p style="margin:0 0 16px;color:#0f172a;">${escapeHtml(greeting)}</p>
      ${paragraphs}
      <div style="margin:24px 0;">
        <a href="${escapeHtml(args.ctaUrl)}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${escapeHtml(args.anchor.ctaLabel)}</a>
      </div>
      <p style="margin:0;color:#475569;white-space:pre-line;">${escapeHtml(signature).replace("\n", "<br />")}</p>
      <hr style="margin:28px 0 16px;border:none;border-top:1px solid #e2e8f0;" />
      <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0;">
        You are receiving this because you created a Creatives Takeover account.
        <a href="${escapeHtml(args.preferencesUrl)}" style="color:#64748b;">Manage preferences</a>
        or <a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#64748b;">unsubscribe</a>.
      </p>
    </div>
  `;

  return {
    subject,
    preheader: copy.preheader,
    text,
    html,
    ctaLabel: args.anchor.ctaLabel,
    ctaUrl: args.ctaUrl,
    templateKey,
    templateVersion: INACTIVE_TEMPLATE_VERSION,
  };
}

export function buildAuthenticatedReturnUrl(args: {
  appUrl: string;
  targetPath: string;
  logId: string;
  templateKey: string;
}) {
  const app = new URL(args.appUrl);
  const safePath = safeInternalPath(args.targetPath, "/dashboard");
  const destination = new URL(safePath, app);
  destination.searchParams.set("retention_email_id", args.logId);
  destination.searchParams.set("utm_source", "retention_email");
  destination.searchParams.set("utm_medium", "email");
  destination.searchParams.set("utm_campaign", INACTIVE_CAMPAIGN_KEY);
  destination.searchParams.set("utm_content", args.templateKey);

  const returnPath = `${destination.pathname}${destination.search}${destination.hash}`;
  const login = new URL("/login", app);
  login.searchParams.set("return", returnPath);
  return login.toString();
}
