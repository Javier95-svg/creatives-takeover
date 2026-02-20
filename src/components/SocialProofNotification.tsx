import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface ActivityItem {
  initials: string;
  name: string;
  location: string;
  action: string;
  avatarColor: string;
}

// Route-relevant activities — what fires depends on where the visitor currently is
const routeActivities: Record<string, ActivityItem[]> = {
  "/bizmap-ai": [
    { initials: "MR", name: "Marcus", location: "Austin", action: "just mapped out his business plan with BizMap AI", avatarColor: "#6366f1" },
    { initials: "AN", name: "Ana", location: "Lisbon", action: "validated her startup idea in under 10 minutes", avatarColor: "#ec4899" },
    { initials: "TD", name: "Tomas", location: "Berlin", action: "just built his ICP with the AI co-founder", avatarColor: "#8b5cf6" },
  ],
  "/community": [
    { initials: "SC", name: "Sofia", location: "Barcelona", action: "connected with a co-founder right here", avatarColor: "#8b5cf6" },
    { initials: "EL", name: "Elena", location: "Miami", action: "just found her accountability partner", avatarColor: "#f59e0b" },
    { initials: "OA", name: "Omar", location: "Dubai", action: "got matched with a mentor in the community", avatarColor: "#10b981" },
  ],
  "/insighta": [
    { initials: "JD", name: "James", location: "New York", action: "secured an intro with a top VC through Insighta", avatarColor: "#ef4444" },
    { initials: "RK", name: "Raj", location: "London", action: "found 12 relevant VCs for his seed round", avatarColor: "#10b981" },
    { initials: "LM", name: "Laura", location: "Toronto", action: "got accepted into a top accelerator program", avatarColor: "#6366f1" },
  ],
  "/pricing": [
    { initials: "CM", name: "Carlos", location: "Chicago", action: "just upgraded and unlocked all AI tools", avatarColor: "#f59e0b" },
    { initials: "PW", name: "Priya", location: "Singapore", action: "started her free plan a moment ago", avatarColor: "#ec4899" },
  ],
  "/stories": [
    { initials: "BT", name: "Bianca", location: "São Paulo", action: "just shared her founder story with the community", avatarColor: "#8b5cf6" },
    { initials: "KN", name: "Kevin", location: "Lagos", action: "applied a strategy from here to land his first client", avatarColor: "#10b981" },
  ],
  "/prompt-library": [
    { initials: "YS", name: "Yuna", location: "Seoul", action: "saved 3 prompts for her GTM strategy", avatarColor: "#6366f1" },
    { initials: "KN", name: "Kevin", location: "Lagos", action: "just used a prompt to write his pitch deck", avatarColor: "#10b981" },
  ],
  default: [
    { initials: "MR", name: "Marcus", location: "Austin", action: "just joined and started his business plan", avatarColor: "#6366f1" },
    { initials: "EL", name: "Elena", location: "Miami", action: "joined the community 2 minutes ago", avatarColor: "#f59e0b" },
    { initials: "RK", name: "Raj", location: "London", action: "validated his startup idea today", avatarColor: "#10b981" },
    { initials: "SC", name: "Sofia", location: "Barcelona", action: "connected with her co-founder here", avatarColor: "#8b5cf6" },
  ],
};

const EXCLUDED_PATHS = [
  "/login", "/signup", "/onboarding", "/auth", "/forgot-password", "/reset-password",
];

// Delay after landing on a page before the notification appears
const PAGE_TRIGGER_DELAY = 12000;
// How long the notification stays visible
const VISIBLE_DURATION = 5500;
// Max shown across the whole session
const MAX_PER_SESSION = 3;
const SESSION_DISMISSED_KEY = "sp-dismissed";
const SESSION_COUNT_KEY = "sp-count";

const getActivitiesForPath = (pathname: string): ActivityItem[] => {
  const match = Object.keys(routeActivities).find(
    (key) => key !== "default" && pathname.startsWith(key)
  );
  return routeActivities[match ?? "default"];
};

const SocialProofNotification = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [current, setCurrent] = useState<ActivityItem | null>(null);
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const sessionCount = () =>
    parseInt(sessionStorage.getItem(SESSION_COUNT_KEY) ?? "0", 10);

  const show = useCallback((item: ActivityItem) => {
    if (dismissedRef.current) return;
    setCurrent(item);
    setVisible(true);
    sessionStorage.setItem(SESSION_COUNT_KEY, String(sessionCount() + 1));

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, VISIBLE_DURATION);
  }, []);

  // Re-evaluate on every route change
  useEffect(() => {
    if (isAuthenticated) return;
    if (dismissedRef.current) return;
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY)) return;
    if (sessionCount() >= MAX_PER_SESSION) return;

    const isExcluded = EXCLUDED_PATHS.some((p) =>
      location.pathname.startsWith(p)
    );
    if (isExcluded) return;

    // Dismiss any currently visible card when navigating
    setVisible(false);
    clearTimers();

    const activities = getActivitiesForPath(location.pathname);
    const pick = activities[Math.floor(Math.random() * activities.length)];

    timerRef.current = setTimeout(() => {
      show(pick);
    }, PAGE_TRIGGER_DELAY);

    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isAuthenticated, show]);

  const dismiss = () => {
    dismissedRef.current = true;
    setVisible(false);
    clearTimers();
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
  };

  if (isAuthenticated || !current) return null;

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-24 left-4 z-50 w-72 transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-background border border-border/70 rounded-xl shadow-xl p-3 flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ backgroundColor: current.avatarColor }}
        >
          {current.initials}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <span className="font-semibold text-foreground">{current.name}</span>
            <span className="text-muted-foreground"> from {current.location} </span>
            <span className="text-foreground">{current.action}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">just now</p>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default SocialProofNotification;
