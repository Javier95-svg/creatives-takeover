import { cleanCopy, cleanFact } from "./email-voice.ts";
import type { ProjectFacts } from "./retention-project-facts.ts";

// Hand-written copy for every retention sequence, in the house voice
// (see email-voice.ts). Each email is a subject, an opening paragraph that
// carries the personal detail, and one or two short follow-up lines. The
// opening paragraph is the only part the AI personalizer may rewrite.
//
// Caller-supplied headlines are treated as data, never as copy: older callers
// pass marketing lines ("use it to unlock your next move") we do not want sent.

export type ActivationIntent = "save_mentor" | "send_message" | "book_call" | "run_icp" | "build_demo";
export type SequenceType =
  | "activation_day0"
  | "activation_day2"
  | "activation_day7"
  | "weekly_digest"
  | "weekly_scorecard"
  | "activation_nudge"
  | "progress_nudge"
  | "reengagement"
  | "reengagement_30d"
  | "reengagement_60d"
  | "milestone_celebration"
  | "profile_incomplete_nudge"
  | "routine_reminder"
  | "task_plan_digest"
  | "celebration";

export const SEQUENCE_TYPES: readonly SequenceType[] = [
  "activation_day0", "activation_day2", "activation_day7", "weekly_digest", "weekly_scorecard",
  "activation_nudge", "progress_nudge", "reengagement", "reengagement_30d", "reengagement_60d",
  "milestone_celebration", "profile_incomplete_nudge", "routine_reminder", "task_plan_digest", "celebration",
];

export interface SequenceHints {
  intent?: ActivationIntent;
  mentorName?: string | null;
  unreadMessageCount?: number;
  savedMentorCount?: number;
  headline?: string | null;
  weeklyCommitment?: string | null;
  weeklyOutcome?: string | null;
  weeklyOutcomeState?: "completed" | "missed" | "open";
  activeDaysLast14?: number;
  suggestedFocus?: string | null;
  /** A verified roadmap signal such as "You reached scope review in MVP Builder." */
  lastStep?: string | null;
}

export interface SequenceCopy {
  subject: string;
  opener: string;
  followUp: string[];
  defaultCtaLabel: string;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const quote = (value: string) => `"${value}"`;

/** Task digests arrive as "Start here: <task>"; keep only the task. */
export function taskFromHeadline(headline: string | null | undefined): string | null {
  const task = cleanFact(headline?.replace(/^\s*start here:\s*/i, ""), 90);
  return task && !/^open today'?s founder plan$/i.test(task) ? task : null;
}

export function buildSequenceCopy(sequence: SequenceType, facts: ProjectFacts, hints: SequenceHints = {}): SequenceCopy {
  const project = facts.projectTitle;
  const forProject = project ? ` for ${project}` : "";
  const onProject = project ? ` on ${project}` : "";
  const mentor = cleanFact(hints.mentorName, 50);
  const unread = Math.max(0, Math.floor(hints.unreadMessageCount ?? 0));
  const saved = Math.max(0, Math.floor(hints.savedMentorCount ?? 0));
  const days = facts.daysAway;

  switch (sequence) {
    case "routine_reminder": {
      const goal = facts.routineGoal ? ` to ${facts.routineGoal}` : "";
      return {
        subject: project ? `Your routine for ${project}` : "Your founder routine",
        opener: facts.routineHabit
          ? `Your routine${goal} is set up, and the first habit on today's list is ${quote(facts.routineHabit)}.`
          : `Your routine${goal} is set up, but it has not had a check-in for a while.`,
        followUp: ["Ticking off one habit takes a few seconds. That is all today needs."],
        defaultCtaLabel: "Open my routine",
      };
    }

    case "task_plan_digest": {
      const task = facts.todayTask ?? taskFromHeadline(hints.headline);
      return {
        subject: task ? `Today: ${cleanFact(task, 50)}` : "Your plan for today",
        opener: task
          ? `The first thing on today's plan${forProject} is ${quote(task)}.`
          : `Your plan for today${forProject} is ready.`,
        followUp: ["Start there. If it no longer fits, swap or snooze it and the plan adjusts."],
        defaultCtaLabel: "Open today's plan",
      };
    }

    case "weekly_scorecard": {
      const commitment = cleanFact(hints.weeklyCommitment, 140);
      const outcome = cleanFact(hints.weeklyOutcome, 60) ?? "still open";
      const active = Math.max(0, Math.min(Math.floor(hints.activeDaysLast14 ?? 0), 14));
      const focus = cleanFact(hints.suggestedFocus, 140) ?? "Set one smaller commitment and finish it early in the week.";
      const state = hints.weeklyOutcomeState ?? "open";
      return {
        subject: state === "completed"
          ? "You did what you said you would this week"
          : state === "missed" ? "Your weekly scorecard" : "Time to close out your week",
        opener: commitment
          ? `This week you committed to ${quote(commitment)}. Result: ${outcome}.`
          : `You did not set a commitment this week. Result: ${outcome}.`,
        followUp: [
          `You were active on ${active} of the last 14 days.`,
          `For next week: ${focus}`,
        ],
        defaultCtaLabel: "Open my scorecard",
      };
    }

    case "activation_day0":
      switch (hints.intent) {
        case "save_mentor":
          return {
            subject: mentor ? `You saved ${mentor}` : "You saved a mentor",
            opener: `You saved ${mentor ?? "a mentor"} to your shortlist${project ? ` while working on ${project}` : ""}.`,
            followUp: ["A short message about the one thing you are stuck on is a good way to start."],
            defaultCtaLabel: "Open Saved Mentors",
          };
        case "send_message":
          return {
            subject: "Your conversation is open",
            opener: `You started a conversation${mentor ? ` with ${mentor}` : ""}. Replies show up in Messages.`,
            followUp: ["It is worth checking back tomorrow so the thread does not go quiet."],
            defaultCtaLabel: "Open Messages",
          };
        case "run_icp":
          return {
            subject: project ? `Your customer profile for ${project}` : "Your customer profile is saved",
            opener: facts.customer
              ? `Your customer profile is saved. You described your first customer as ${facts.customer}.`
              : "Your customer profile is saved.",
            followUp: ["The next step is to test it. Pick three people who fit and ask how they handle the problem today."],
            defaultCtaLabel: "Open my customer profile",
          };
        case "build_demo":
          return {
            subject: "Your demo is saved",
            opener: `Your demo${forProject} is saved.`,
            followUp: ["Publishing it gives you a link you can send to the first people you want feedback from."],
            defaultCtaLabel: "Open my demo",
          };
        default:
          return {
            subject: "Your call is booked",
            opener: `You booked a discovery call${mentor ? ` with ${mentor}` : ""}.`,
            followUp: ["Write down the one decision you want help with. It keeps the call focused."],
            defaultCtaLabel: "Review my call",
          };
      }

    case "activation_day2":
      switch (hints.intent) {
        case "send_message":
          return {
            subject: unread > 0 ? `You have ${plural(unread, "unread reply", "unread replies")}` : "Your conversation is still open",
            opener: unread > 0
              ? `You have ${plural(unread, "unread reply", "unread replies")} in Messages.`
              : `Your conversation${mentor ? ` with ${mentor}` : ""} is still open.`,
            followUp: ["Answering the most useful thread is enough for today."],
            defaultCtaLabel: "Open Messages",
          };
        case "save_mentor":
          return {
            subject: mentor ? `${mentor} is still on your shortlist` : "Your mentor shortlist",
            opener: `You saved ${mentor ?? "a mentor"} a couple of days ago but have not reached out yet.`,
            followUp: [`One short message is enough. Say what you are building${project ? ` (${project})` : ""} and the one question you have.`],
            defaultCtaLabel: "Open Saved Mentors",
          };
        case "run_icp":
          return {
            subject: project ? `Next step for ${project}` : "Your customer profile is waiting",
            opener: facts.customer
              ? `Your customer profile says your first customer is ${facts.customer}.`
              : "Your customer profile is saved and ready to use.",
            followUp: ["Before building more, open it and pick the first three people you could talk to."],
            defaultCtaLabel: "Open my customer profile",
          };
        case "build_demo":
          return {
            subject: "Your demo is one step from a link",
            opener: `Your demo${forProject} is saved but not published yet.`,
            followUp: ["Publish it and send the link to one person whose opinion you trust."],
            defaultCtaLabel: "Open my demo",
          };
        default:
          return {
            subject: "Getting ready for your call",
            opener: `Your discovery call${mentor ? ` with ${mentor}` : ""} is coming up.`,
            followUp: ["Bring one question you need answered. That is the best use of the time."],
            defaultCtaLabel: "Review my call",
          };
      }

    case "activation_day7": {
      const step = hints.intent === "send_message"
        ? "Open Messages and move one conversation forward."
        : hints.intent === "save_mentor"
          ? `Look at ${mentor ?? "your saved mentors"} again and decide who is worth one message.`
          : hints.intent === "run_icp"
            ? "Reopen your customer profile and pick one person to talk to this week."
            : hints.intent === "build_demo"
              ? "Reopen your demo and publish it to a link."
              : "Use your next call to settle one decision.";
      return {
        subject: project ? `A week on ${project}` : "One week in",
        opener: project
          ? `It has been a week since you started working on ${project} here.`
          : "It has been a week since you started on Creatives Takeover.",
        followUp: [step, "One focused session is enough. There is no need to start over."],
        defaultCtaLabel: "Pick up where I left off",
      };
    }

    case "weekly_digest": {
      const parts = [
        saved > 0 ? plural(saved, "saved mentor", "saved mentors") : null,
        unread > 0 ? plural(unread, "unread message", "unread messages") : null,
      ].filter(Boolean);
      return {
        subject: project ? `This week on ${project}` : "Your week on Creatives Takeover",
        opener: parts.length
          ? `You have ${parts.join(" and ")} waiting in your account.`
          : `Your work${onProject} is where you left it.`,
        followUp: ["Pick one thing to move forward this week, like a reply or your next roadmap step."],
        defaultCtaLabel: "Open my dashboard",
      };
    }

    case "activation_nudge":
      return {
        subject: project ? `Your first step on ${project}` : "Your first step",
        opener: project
          ? `You added ${project}. The first tool to open is the ICP Builder, which helps you decide who to build for first.`
          : "The first tool to open is the ICP Builder. It helps you decide who to build for first.",
        followUp: ["Start with what you already know. You can change your answers later."],
        defaultCtaLabel: "Open ICP Builder",
      };

    case "progress_nudge":
      return {
        subject: project ? `Picking up ${project}` : "Pick up where you left off",
        opener: cleanFact(hints.lastStep, 120) ?? `You made a start${onProject} last time.`,
        followUp: ["The next step is saved where you left it."],
        defaultCtaLabel: "Continue",
      };

    case "reengagement":
      return {
        subject: project ? `Back to ${project}?` : "Back to your project?",
        opener: days !== null && days >= 2
          ? `It has been ${days} days since you last opened Creatives Takeover.`
          : "It has been a little while since your last visit.",
        followUp: [`Your work${onProject} is saved where you left it. Open it and check whether the next step still makes sense.`],
        defaultCtaLabel: "Open my dashboard",
      };

    case "reengagement_30d":
      return {
        subject: project ? `${project} is still saved` : "Your work is still saved",
        opener: `It has been about a month since your last visit${project ? `, and ${project} is saved where you left it` : ""}.`,
        followUp: [
          ...(saved > 0 ? [`You still have ${plural(saved, "saved mentor", "saved mentors")}.`] : []),
          ...(unread > 0 ? [`You have ${plural(unread, "unread message", "unread messages")}.`] : []),
          "If your plans have changed, reply and tell me. Replies come straight to me.",
        ],
        defaultCtaLabel: "Open my dashboard",
      };

    case "reengagement_60d":
      return {
        subject: project ? `Still building ${project}?` : "Still building?",
        opener: "It has been two months. Your account and everything you saved are still here.",
        followUp: ["If you have moved on, you can unsubscribe below and these reminders stop."],
        defaultCtaLabel: "Open my dashboard",
      };

    case "milestone_celebration":
      return {
        subject: project ? `A milestone for ${project}` : "You reached a milestone",
        opener: cleanFact(hints.headline, 140) ?? `You just reached a milestone${onProject}.`,
        followUp: ["Nice work. Your next step is on your dashboard."],
        defaultCtaLabel: "Open my dashboard",
      };

    case "profile_incomplete_nudge":
      return {
        subject: "Your profile is missing a few details",
        opener: "Your profile does not show your stage or niche yet.",
        followUp: ["Adding them helps mentors and cofounders find you, and it takes about two minutes."],
        defaultCtaLabel: "Finish my profile",
      };

    case "celebration":
      return {
        subject: project ? `Good progress on ${project}` : "Good progress",
        opener: `You just finished a step${onProject}.`,
        followUp: ["When you are ready, your next step is on your dashboard."],
        defaultCtaLabel: "Open my dashboard",
      };
  }
}

/** Cleans every user-visible string so nothing reaches Resend unformatted. */
export function finalizeCopy(copy: SequenceCopy): SequenceCopy {
  return {
    subject: cleanCopy(copy.subject),
    opener: cleanCopy(copy.opener),
    followUp: copy.followUp.map(cleanCopy).filter(Boolean),
    defaultCtaLabel: cleanCopy(copy.defaultCtaLabel),
  };
}
