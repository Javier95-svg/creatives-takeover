import { motion, type Variants } from "framer-motion";
import { Children, type ReactNode } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

type RevealVariant = "default" | "card" | "scale" | "fade" | "slide-left" | "slide-right";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const revealVariants: Record<RevealVariant, Variants> = {
  default: {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  card: {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  scale: {
    hidden: { opacity: 0, y: 14, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: 32 },
    visible: { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: -32 },
    visible: { opacity: 1, x: 0 },
  },
};

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
}

export const ScrollReveal = ({
  children,
  className,
  variant = "default",
  delay = 0,
  duration = 0.65,
  once = true,
  amount = 0.18,
}: ScrollRevealProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
      variants={revealVariants[variant]}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
};

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
  amount?: number;
}

export const RevealGroup = ({
  children,
  className,
  variant = "card",
  stagger = 0.08,
  delayChildren = 0,
  once = true,
  amount = 0.18,
}: RevealGroupProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren,
          },
        },
      }}
    >
      {Children.toArray(children).map((child, index) => (
        <motion.div
          key={index}
          variants={revealVariants[variant]}
          transition={{ duration: 0.65, ease: EASE_OUT }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};
