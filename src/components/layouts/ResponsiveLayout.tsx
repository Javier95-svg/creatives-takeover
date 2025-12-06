import React from "react";
import { useDeviceType } from "@/hooks/use-device-type";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  children?: React.ReactNode;
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
}

/**
 * ResponsiveLayout component that renders different layouts based on device type
 * 
 * @example
 * <ResponsiveLayout
 *   mobile={<MobileLayout />}
 *   tablet={<TabletLayout />}
 *   desktop={<DesktopLayout />}
 * />
 * 
 * @example
 * <ResponsiveLayout className="container">
 *   <div>Content for all devices</div>
 * </ResponsiveLayout>
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  mobile,
  tablet,
  desktop,
  className,
  mobileClassName,
  tabletClassName,
  desktopClassName,
}) => {
  const deviceType = useDeviceType();

  // If specific layouts are provided, render based on device type
  if (mobile || tablet || desktop) {
    if (deviceType === 'mobile' && mobile) {
      return <div className={cn(className, mobileClassName)}>{mobile}</div>;
    }
    if (deviceType === 'tablet' && tablet) {
      return <div className={cn(className, tabletClassName)}>{tablet}</div>;
    }
    if (deviceType === 'desktop' && desktop) {
      return <div className={cn(className, desktopClassName)}>{desktop}</div>;
    }
    // Fallback: render desktop if available, then tablet, then mobile
    if (desktop) return <div className={cn(className, desktopClassName)}>{desktop}</div>;
    if (tablet) return <div className={cn(className, tabletClassName)}>{tablet}</div>;
    if (mobile) return <div className={cn(className, mobileClassName)}>{mobile}</div>;
  }

  // If only children provided, render with device-specific classes
  return (
    <div className={cn(
      className,
      deviceType === 'mobile' && mobileClassName,
      deviceType === 'tablet' && tabletClassName,
      deviceType === 'desktop' && desktopClassName
    )}>
      {children}
    </div>
  );
};

