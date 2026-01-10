/**
 * Image Optimization Utilities
 *
 * Performance-focused utilities for optimizing image loading
 * without affecting visual design or user experience.
 */

/**
 * Preconnect to a domain to reduce DNS/TCP/TLS overhead
 * Call this early in the page lifecycle for critical image domains
 */
export const preconnectToDomain = (url: string) => {
  try {
    const domain = new URL(url).origin;

    // Check if preconnect already exists
    if (document.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
      return;
    }

    // Add preconnect link
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Also add dns-prefetch as fallback for older browsers
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = domain;
    document.head.appendChild(dnsPrefetch);
  } catch (e) {
    console.warn('Could not preconnect to domain:', e);
  }
};

/**
 * Create an intersection observer for lazy loading images
 * Returns a cleanup function to disconnect the observer
 */
export const createLazyLoadObserver = (
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) => {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px', // Start loading 50px before element enters viewport
    threshold: 0.01,
    ...options
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
        observer.unobserve(entry.target);
      }
    });
  }, defaultOptions);

  return observer;
};

/**
 * Prefetch an image to prime the browser cache
 * Useful for critical images that should load immediately
 */
export const prefetchImage = (url: string, priority: 'high' | 'low' = 'low'): HTMLLinkElement | null => {
  try {
    const linkId = `prefetch-${btoa(url).substring(0, 20)}`;

    // Check if already prefetched
    if (document.getElementById(linkId)) {
      return null;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = url;

    if (priority === 'high') {
      link.setAttribute('fetchpriority', 'high');
    }

    document.head.appendChild(link);
    return link;
  } catch (e) {
    console.warn('Could not prefetch image:', e);
    return null;
  }
};

/**
 * Remove prefetch link from DOM
 */
export const removePrefetchLink = (link: HTMLLinkElement | null) => {
  if (link && link.parentNode) {
    link.parentNode.removeChild(link);
  }
};

/**
 * Generate a tiny placeholder for blur-up effect
 * This creates a data URI that can be used as a low-quality placeholder
 */
export const generatePlaceholder = (width: number = 40, height: number = 40): string => {
  // Create a minimal SVG placeholder
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Check if an image is already cached in the browser
 */
export const isImageCached = (url: string): boolean => {
  const img = new Image();
  img.src = url;
  return img.complete && img.naturalHeight !== 0;
};

/**
 * Decode image asynchronously to avoid blocking main thread
 */
export const decodeImageAsync = async (img: HTMLImageElement): Promise<void> => {
  if ('decode' in img) {
    try {
      await img.decode();
    } catch (e) {
      // Fallback: image will decode synchronously on paint
      console.warn('Image decode failed:', e);
    }
  }
};
