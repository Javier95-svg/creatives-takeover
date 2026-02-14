import type { ReactNode } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  background?: ReactNode;
  className?: string;
  contentClassName?: string;
  mainClassName?: string;
  showNavigation?: boolean;
  showFooter?: boolean;
}

export const PageShell = ({
  children,
  background,
  className,
  contentClassName,
  mainClassName,
  showNavigation = true,
  showFooter = true,
}: PageShellProps) => {
  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {background}
      <div className={cn("relative z-10 flex min-h-screen flex-col", contentClassName)}>
        {showNavigation && <Navigation />}
        <main className={cn("flex-1", mainClassName)}>{children}</main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
};

export default PageShell;
