import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    const isDashboardInternalNavigation =
      previousPath.startsWith('/dashboard') && pathname.startsWith('/dashboard');

    if (isDashboardInternalNavigation) return;

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
