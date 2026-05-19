import { ReactNode } from "react";

import { RevealGroup, ScrollReveal } from "@/components/animations/ScrollReveal";
import { cn } from "@/lib/utils";

interface HomeRevealSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: boolean;
}

const HomeRevealSection = ({
  children,
  className,
  delay = 0,
  staggerChildren = false,
}: HomeRevealSectionProps) => {
  if (staggerChildren) {
    return (
      <RevealGroup
        className={cn("home-reveal-section", className)}
        delayChildren={delay / 1000}
      >
        {children}
      </RevealGroup>
    );
  }

  return (
    <ScrollReveal className={cn("home-reveal-section", className)} delay={delay / 1000}>
      {children}
    </ScrollReveal>
  );
};

export default HomeRevealSection;
