import { useEffect } from 'react';
import { useDashboardNavigation } from '@/contexts/DashboardNavigationContext';

export const useActiveSection = (sectionIds: string[]) => {
  const { setActiveSection } = useDashboardNavigation();

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -50% 0px', // Account for header and focus on top half
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sectionIds, setActiveSection]);
};
