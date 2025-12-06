import React, { useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className,
  disabled = false,
  threshold = 80,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = container.scrollTop || window.scrollY;
      isAtTop.current = scrollTop === 0;
      
      if (isAtTop.current) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop.current) return;

      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;

      if (distance > 0) {
        e.preventDefault();
        setIsPulling(true);
        setPullDistance(Math.min(distance, threshold * 1.5));
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && isPulling) {
        setIsRefreshing(true);
        setIsPulling(false);
        setPullDistance(0);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, disabled, threshold, pullDistance, isPulling]);

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldShowIndicator = isPulling || isRefreshing;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {shouldShowIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-opacity duration-200"
          style={{
            height: `${Math.max(pullDistance, 60)}px`,
            opacity: shouldShowIndicator ? 1 : 0,
            transform: `translateY(${isRefreshing ? 0 : -Math.max(pullDistance - 60, 0)}px)`,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {isRefreshing ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <div
                className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full transition-transform"
                style={{
                  transform: `rotate(${progress * 3.6}deg)`,
                }}
              />
            )}
            {pullDistance >= threshold && !isRefreshing && (
              <span className="text-xs text-muted-foreground">Release to refresh</span>
            )}
          </div>
        </div>
      )}
      <div
        style={{
          transform: shouldShowIndicator ? `translateY(${Math.max(pullDistance, 0)}px)` : "translateY(0)",
          transition: isRefreshing ? "transform 0.3s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

