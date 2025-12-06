import React from "react";
import { useDeviceType } from "@/hooks/use-device-type";
import { cn } from "@/lib/utils";

interface GridLayoutProps {
  children: React.ReactNode;
  mobileColumns?: 1 | 2;
  tabletColumns?: 2 | 3;
  desktopColumns?: 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
  masonry?: boolean;
}

const gapMap = {
  sm: "gap-2 md:gap-3 lg:gap-4",
  md: "gap-4 md:gap-6 lg:gap-8",
  lg: "gap-6 md:gap-8 lg:gap-10",
};

/**
 * GridLayout component that provides device-aware grid systems
 * 
 * @example
 * <GridLayout mobileColumns={1} tabletColumns={2} desktopColumns={3}>
 *   {items.map(item => <Card key={item.id}>{item.content}</Card>)}
 * </GridLayout>
 */
export const GridLayout: React.FC<GridLayoutProps> = ({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = "md",
  className,
  masonry = false,
}) => {
  const deviceType = useDeviceType();

  const getGridClasses = () => {
    const baseClasses = "grid";
    const gapClass = gapMap[gap];
    
    // Mobile: 1 column (default)
    let gridCols = "grid-cols-1";
    
    // Tablet: 2 columns
    if (tabletColumns === 2) {
      gridCols += " md:grid-cols-2";
    } else if (tabletColumns === 3) {
      gridCols += " md:grid-cols-3";
    }
    
    // Desktop: 3+ columns
    if (desktopColumns === 3) {
      gridCols += " lg:grid-cols-3";
    } else if (desktopColumns === 4) {
      gridCols += " lg:grid-cols-4";
    } else if (desktopColumns === 5) {
      gridCols += " lg:grid-cols-5";
    } else if (desktopColumns === 6) {
      gridCols += " lg:grid-cols-6";
    }

    if (masonry) {
      gridCols += " auto-rows-min";
    }

    return cn(baseClasses, gridCols, gapClass, className);
  };

  return (
    <div className={getGridClasses()}>
      {children}
    </div>
  );
};

