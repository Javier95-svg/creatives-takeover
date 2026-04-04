import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Handshake, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const COMMUNITY_SECTIONS = [
  {
    label: "Mentors",
    description: "Find a Mentor",
    href: "/community",
    icon: GraduationCap,
    isActive: (pathname: string) => pathname === "/community",
  },
  {
    label: "Angel Investors",
    description: "Find your Angel",
    href: "/community/angels",
    icon: Sparkles,
    isActive: (pathname: string) => pathname.startsWith("/community/angels"),
  },
  {
    label: "Co-Founder",
    description: "Find a Co-Founder",
    href: "/community/co-founders",
    icon: Handshake,
    isActive: (pathname: string) => pathname.startsWith("/community/co-founders"),
  },
];

const CommunitySectionTabs = () => {
  const { pathname } = useLocation();

  return (
    <div className="container mx-auto px-4 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur">
        <div className="mb-3 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Community
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch between mentors, angel investors, and co-founder matchmaking.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {COMMUNITY_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = section.isActive(pathname);

            return (
              <Link
                key={section.href}
                to={section.href}
                className={cn(
                  "rounded-2xl border px-4 py-4 transition-all duration-200",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-background/70 hover:border-primary/40 hover:bg-background",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "rounded-xl p-2",
                      isActive
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{section.label}</p>
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        isActive ? "text-primary-foreground/85" : "text-muted-foreground",
                      )}
                    >
                      {section.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommunitySectionTabs;
