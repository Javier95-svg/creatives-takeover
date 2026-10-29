import { useEffect, useRef, useState, type ReactNode } from "react";

interface LoadWhenNearProps {
  /** Stable name for the section; once loaded it renders immediately on remount. */
  id: string;
  /** Shown until the section is near; use the same element as the Suspense fallback. */
  placeholder: ReactNode;
  children: ReactNode;
  rootMargin?: string;
}

// Sections already shown this page load. The homepage swaps its whole tree
// between the mobile and desktop layouts when the viewport crosses the
// breakpoint (rotating a tablet), and a remount must not put placeholders back.
const loaded = new Set<string>();

// A lazy() section requests its chunk as soon as it renders, so lazy sections far
// down a page still downloaded on first load. This renders them only once their
// placeholder is within rootMargin of the viewport. The swap happens off-screen,
// and the placeholder reserves the same height the Suspense fallback does.
export function LoadWhenNear({ id, placeholder, children, rootMargin = "800px 0px" }: LoadWhenNearProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => loaded.has(id) || typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (near || !ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loaded.add(id);
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [id, near, rootMargin]);

  if (near) return <>{children}</>;
  return <div ref={ref}>{placeholder}</div>;
}
