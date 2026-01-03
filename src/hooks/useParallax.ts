import { useEffect, useRef, useState } from 'react';

/**
 * Hook for creating parallax scrolling effects
 * @param speed - Parallax speed multiplier (0.5 = slower than scroll, 1.5 = faster than scroll)
 * @returns ref and offset value for transform
 */
export const useParallax = (speed = 0.5) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distance = elementCenter - viewportCenter;

      setOffset(distance * speed);
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offset };
};
