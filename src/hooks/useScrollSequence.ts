import { useEffect, useState, useRef } from 'react';

/**
 * Hook for creating sequential scroll-triggered animations
 * Items appear one after another with a stagger delay
 * @param itemCount - Number of items to animate
 * @param staggerDelay - Delay between each item in milliseconds
 */
export const useScrollSequence = (itemCount: number, staggerDelay = 100) => {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleItems.size === 0) {
          // Trigger sequence
          for (let i = 0; i < itemCount; i++) {
            const timeout = setTimeout(() => {
              setVisibleItems(prev => new Set(prev).add(i));
            }, i * staggerDelay);

            timeoutsRef.current.push(timeout);
          }
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      observer.disconnect();
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [itemCount, staggerDelay, visibleItems.size]);

  return { ref, visibleItems };
};
