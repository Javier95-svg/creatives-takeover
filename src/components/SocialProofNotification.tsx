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

// Route-relevant activities — what fires depends on where the visitor currently is.
// Copy focuses on what the user can GET, not just what someone did.
const routeActivities: Record<string, ActivityItem[]> = {
  "/bizmap-ai": [
    { initials: "KA", name: "Kwame", location: "Accra, Ghana", action: "turned a rough idea into a full business plan — one session, no consultant needed", avatarColor: "#6366f1" },
    { initials: "IS", name: "Isabela", location: "Curitiba, Brazil", action: "finally got clarity on who her real customer is. Said it took her 20 minutes", avatarColor: "#ec4899" },
    { initials: "DV", name: "Dev", location: "Pune, India", action: "built his entire go-to-market strategy without spending a cent on an agency", avatarColor: "#8b5cf6" },
  ],
  "/community": [
    { initials: "ZN", name: "Zara", location: "Nairobi, Kenya", action: "found the technical co-founder she'd been looking for — right here", avatarColor: "#8b5cf6" },
    { initials: "JV", name: "Jovan", location: "Novi Sad, Serbia", action: "got connected with a mentor who's already built in his exact space", avatarColor: "#10b981" },
    { initials: "CA", name: "Camila", location: "Medellín, Colombia", action: "met her accountability partner here. First check-in starts tomorrow", avatarColor: "#f59e0b" },
  ],
  "/insighta": [
    { initials: "TF", name: "Tunde", location: "Ibadan, Nigeria", action: "found 9 VCs actively writing checks in his industry — didn't know they existed", avatarColor: "#ef4444" },
    { initials: "NR", name: "Nadia", location: "Casablanca, Morocco", action: "identified the exact investors backing companies at her stage", avatarColor: "#10b981" },
    { initials: "LG", name: "Luca", location: "Rotterdam, Netherlands", action: "got shortlisted for an accelerator that fits his business to a T", avatarColor: "#6366f1" },
  ],
  "/pricing": [
    { initials: "FA", name: "Fatima", location: "Lahore, Pakistan", action: "went Pro after realizing the tools were saving her hours every week", avatarColor: "#f59e0b" },
    { initials: "SB", name: "Seb", location: "Ghent, Belgium", action: "unlocked the full AI suite — said it paid for itself within days", avatarColor: "#ec4899" },
  ],
  "/stories": [
    { initials: "AM", name: "Amir", location: "Tbilisi, Georgia", action: "used a founder's playbook from here to fix his pricing — doubled his close rate", avatarColor: "#8b5cf6" },
    { initials: "NL", name: "Nora", location: "Galway, Ireland", action: "landed her first paying client using a strategy she read about here", avatarColor: "#10b981" },
  ],
  "/prompt-library": [
    { initials: "YA", name: "Yaw", location: "Kumasi, Ghana", action: "wrote his entire investor pitch using 2 prompts from this library", avatarColor: "#6366f1" },
    { initials: "PT", name: "Preethi", location: "Hyderabad, India", action: "automated her outreach strategy using prompts she found here — 3x replies", avatarColor: "#10b981" },
  ],
  default: [
    { initials: "KA", name: "Kwame", location: "Accra, Ghana", action: "went from idea to a structured plan in his first week — for free", avatarColor: "#6366f1" },
    { initials: "CA", name: "Camila", location: "Medellín, Colombia", action: "stopped overthinking and started building. Said the first session changed everything", avatarColor: "#f59e0b" },
    { initials: "ZN", name: "Zara", location: "Nairobi, Kenya", action: "got the clarity she needed to finally take the leap", avatarColor: "#10b981" },
    { initials: "AM", name: "Amir", location: "Tbilisi, Georgia", action: "found the right people to build with — without cold messaging strangers", avatarColor: "#8b5cf6" },
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
