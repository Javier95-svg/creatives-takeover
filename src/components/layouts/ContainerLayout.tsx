import React from "react";
import { useDeviceType } from "@/hooks/use-device-type";
import { cn } from "@/lib/utils";

interface ContainerLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

const maxWidthMap = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

const paddingMap = {
  none: "px-0",
  sm: "px-3 md:px-4 lg:px-6",
  md: "px-4 md:px-6 lg:px-8",
  lg: "px-6 md:px-8 lg:px-12",
};

/**
 * ContainerLayout component that provides device-specific container widths and padding
 * 
 * Mobile: full width, 1rem padding
 * Tablet: max-width, 1.5rem padding
 * Desktop: max-width, 2rem padding
 * 
 * @example
 * <ContainerLayout maxWidth="xl" padding="md">
 *   <div>Content</div>
 * </ContainerLayout>
 */
export const ContainerLayout: React.FC<ContainerLayoutProps> = ({
  children,
  className,
  maxWidth = "xl",
  padding = "md",
}) => {
  const deviceType = useDeviceType();

  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthMap[maxWidth],
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

