import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const StickySectionNav: React.FC = () => {
  const location = useLocation();
  const [active, setActive] = useState<string>("overview");

  const inPageItems = useMemo(
    () => [
      { id: "overview", label: "Overview", href: "#overview" },
      { id: "how-it-works", label: "How It Works", href: "#how-it-works" },
      { id: "benefits", label: "Benefits", href: "#benefits" },
      { id: "get-started", label: "Get Started", href: "#get-started" },
    ],
    []
  );

  useEffect(() => {
    const ids = inPageItems.map((i) => i.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -40% 0px", threshold: 0.6 }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [inPageItems]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return; // allow normal navigation for routes
    e.preventDefault();
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
      // Update hash without jumping
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <nav aria-label="Section navigation" className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-3">
          {inPageItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors hover:bg-accent/30 hover:text-foreground/90 story-link ${
                active === item.id ? "bg-accent/40 text-primary border border-primary/30" : "border border-transparent"
              }`}
            >
              {item.label}
            </a>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/pricing"
              className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors hover:bg-accent/30 hover:text-foreground/90 story-link ${
                location.pathname === "/pricing" ? "bg-accent/40 text-primary border border-primary/30" : "border border-transparent"
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/contact"
              className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors hover:bg-accent/30 hover:text-foreground/90 story-link ${
                location.pathname === "/contact" ? "bg-accent/40 text-primary border border-primary/30" : "border border-transparent"
              }`}
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StickySectionNav;
