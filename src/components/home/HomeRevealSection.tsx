import { ReactNode } from "react";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
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
  const { ref, isVisible } = useScrollAnimation(delay);

  return (
    <div
      ref={ref}
      className={cn(
        "home-reveal-section",
        staggerChildren && "home-reveal-stagger",
        isVisible && "revealed",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default HomeRevealSection;
