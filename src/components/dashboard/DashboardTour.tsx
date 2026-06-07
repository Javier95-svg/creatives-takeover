import { useEffect, useState } from "react";
import {
  Home,
  Repeat2,
  CheckSquare,
  FolderOpen,
  Bot,
  Users,
  Bell,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getSafeLocalStorage } from "@/lib/safeStorage";

interface TourStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: "Welcome to your founder cockpit",
    body: "A quick 30-second tour of where everything lives, so you know exactly how to use your dashboard.",
  },
  {
    icon: Home,
    title: "Home — your daily command center",
    body: "Start here every day. The top of Home shows today's habits, what's due, anything overdue, and your streak. Knock those out first.",
  },
  {
    icon: Repeat2,
    title: "Your Routine",
    body: "Build the founder habits that move your startup forward and check them off daily. Each day you complete grows your streak.",
  },
  {
    icon: CheckSquare,
    title: "Your Tasks",
    body: "Every task across BizMap, daily goals, and commitments — with deadlines — in one place so nothing slips.",
  },
  {
    icon: FolderOpen,
    title: "My Files",
    body: "Your ICP draft, uploads, and every document the platform generates for you, kept together.",
  },
  {
    icon: Bot,
    title: "BizMap AI tools",
    body: "Validate, build, and launch with guided tools — ICP Builder, MVP Builder, GTM Strategist and more. Locked tools show how to unlock them.",
  },
  {
    icon: Users,
    title: "Community & mentors",
    body: "Find a mentor and book a discovery call, meet a co-founder, or connect with angels. Mentor calls are the fastest way to unblock yourself.",
  },
  {
    icon: Bell,
    title: "Stay on track",
    body: "Turn on reminders so we nudge you when your routine is waiting or a task is due — that's how you keep your streak and your momentum.",
  },
];

const tourKey = (userId: string) => `ct_dashboard_tour_done_${userId}`;

export function DashboardTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const done = getSafeLocalStorage().getItem(tourKey(user.id));
      if (!done) {
        // Small delay so the dashboard renders behind the tour first.
        const timer = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const finish = () => {
    if (user?.id) {
      try {
        getSafeLocalStorage().setItem(tourKey(user.id), "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  const isLast = index === STEPS.length - 1;
  const stepData = STEPS[index];
  const Icon = stepData.icon;

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : finish())}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="font-space-grotesk text-xl font-semibold tracking-tight text-foreground">
            {stepData.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{stepData.body}</p>

          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")
                }
              />
            ))}
          </div>

          <div className="mt-6 flex w-full items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={finish}>
              Skip
            </Button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button variant="outline" size="sm" onClick={() => setIndex((i) => i - 1)}>
                  Back
                </Button>
              )}
              {isLast ? (
                <Button size="sm" onClick={finish}>
                  Let's go
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DashboardTour;
