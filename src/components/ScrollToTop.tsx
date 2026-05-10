import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, hash, state } = useLocation();
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    const isDashboardInternalNavigation =
      previousPath.startsWith('/dashboard') && pathname.startsWith('/dashboard');

    if (isDashboardInternalNavigation) return;

    const stateScrollTarget =
      state &&
      typeof state === 'object' &&
      'scrollToSection' in state &&
      typeof state.scrollToSection === 'string'
        ? state.scrollToSection
        : null;

    const targetId = hash ? decodeURIComponent(hash.slice(1)) : stateScrollTarget;

    if (targetId) {
      let attempts = 0;

      const scrollToTarget = () => {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('[id]'));
        const target =
          candidates.find((element) => {
            if (element.id !== targetId) return false;
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
          }) ?? document.getElementById(targetId);

        if (!target) {
          attempts += 1;
          if (attempts <= 10) {
            window.setTimeout(scrollToTarget, 50);
          }
          return;
        }

        const bannerHeight =
          parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--banner-height'), 10) || 0;
        const navOffset = bannerHeight + 96;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navOffset;

        window.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: 'smooth',
        });
      };

      window.setTimeout(scrollToTarget, 0);
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash, state]);

  return null;
};

export default ScrollToTop;
