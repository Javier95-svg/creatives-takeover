import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAnalyticsSessionId, trackPageAnalyticsEvent } from '@/lib/pageAnalytics';

const DEAD_CLICK_DELAY_MS = 700;
const RAGE_CLICK_WINDOW_MS = 1500;
const RAGE_CLICK_THRESHOLD = 3;

type ClickHistoryEntry = {
  signature: string;
  timestamp: number;
};

type ElementSnapshot = {
  className: string;
  dataState: string | null;
  ariaExpanded: string | null;
  disabled: boolean;
  rect: DOMRect;
};

const getTrackableElement = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  return (
    target.closest<HTMLElement>(
      'button, a, summary, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [data-track-click], [data-telemetry-id]',
    ) || null
  );
};

const normalizeText = (value: string | null | undefined) =>
  (value || '').replace(/\s+/g, ' ').trim().slice(0, 80);

const getElementSignature = (element: HTMLElement) => {
  const telemetryId = element.dataset.telemetryId || element.dataset.trackClick;
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList).slice(0, 3).join('.');
  const text = normalizeText(element.textContent);

  return telemetryId || [element.tagName.toLowerCase(), id, classes, text].filter(Boolean).join('|');
};

const getElementMetadata = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  return {
    tag_name: element.tagName.toLowerCase(),
    element_id: element.id || null,
    telemetry_id: element.dataset.telemetryId || element.dataset.trackClick || null,
    class_name: typeof element.className === 'string' ? element.className.slice(0, 240) : null,
    text_label: normalizeText(element.textContent) || null,
    href: element instanceof HTMLAnchorElement ? element.href : null,
    role: element.getAttribute('role'),
    rect: {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
};

const getOpenOverlayCount = () =>
  document.querySelectorAll('[role="dialog"], [aria-modal="true"], [data-state="open"]').length;

const takeSnapshot = (element: HTMLElement): ElementSnapshot => ({
  className: typeof element.className === 'string' ? element.className : '',
  dataState: element.getAttribute('data-state'),
  ariaExpanded: element.getAttribute('aria-expanded'),
  disabled: element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.disabled : false,
  rect: element.getBoundingClientRect(),
});

const didElementVisuallyChange = (element: HTMLElement, snapshot: ElementSnapshot) => {
  const rect = element.getBoundingClientRect();

  return (
    snapshot.className !== (typeof element.className === 'string' ? element.className : '') ||
    snapshot.dataState !== element.getAttribute('data-state') ||
    snapshot.ariaExpanded !== element.getAttribute('aria-expanded') ||
    snapshot.disabled !==
      (element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.disabled : false) ||
    Math.round(snapshot.rect.width) !== Math.round(rect.width) ||
    Math.round(snapshot.rect.height) !== Math.round(rect.height)
  );
};

export const useInteractionTelemetry = () => {
  const { user } = useAuth();
  const location = useLocation();
  const sessionIdRef = useRef(getAnalyticsSessionId());
  const clickHistoryRef = useRef<ClickHistoryEntry[]>([]);
  const lastRageEventRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = getTrackableElement(event.target);
      if (!element) {
        return;
      }

      const signature = getElementSignature(element);
      const metadata = getElementMetadata(element);
      const now = Date.now();
      const pagePath = `${location.pathname}${location.search}${location.hash}`;

      clickHistoryRef.current = clickHistoryRef.current.filter(
        (entry) => now - entry.timestamp <= RAGE_CLICK_WINDOW_MS,
      );
      clickHistoryRef.current.push({ signature, timestamp: now });

      const rageClickCount = clickHistoryRef.current.filter((entry) => entry.signature === signature).length;
      const lastRageTimestamp = lastRageEventRef.current[signature] ?? 0;

      if (rageClickCount >= RAGE_CLICK_THRESHOLD && now - lastRageTimestamp > RAGE_CLICK_WINDOW_MS) {
        lastRageEventRef.current[signature] = now;
        void trackPageAnalyticsEvent({
          eventType: 'click',
          userId: user?.id || null,
          sessionId: sessionIdRef.current,
          pagePath,
          pageTitle: document.title,
          eventData: {
            telemetry_type: 'rage_click',
            click_count: rageClickCount,
            ...metadata,
          },
        });
      }

      const snapshot = takeSnapshot(element);
      const routeBefore = pagePath;
      const overlayCountBefore = getOpenOverlayCount();
      let relevantMutationDetected = false;

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const target = mutation.target;

          if (
            target === element ||
            (target instanceof Node && (element.contains(target) || target.contains(element))) ||
            Array.from(mutation.addedNodes).some(
              (node) =>
                node instanceof HTMLElement &&
                (node.matches('[role="dialog"], [aria-modal="true"], [data-state="open"]') ||
                  !!node.querySelector?.('[role="dialog"], [aria-modal="true"], [data-state="open"]')),
            )
          ) {
            relevantMutationDetected = true;
            break;
          }
        }
      });

      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-state', 'aria-expanded', 'hidden'],
      });

      window.setTimeout(() => {
        observer.disconnect();

        const routeAfter = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const overlayCountAfter = getOpenOverlayCount();
        const elementChanged = didElementVisuallyChange(element, snapshot);

        const isDeadClick =
          routeBefore === routeAfter &&
          overlayCountAfter <= overlayCountBefore &&
          !relevantMutationDetected &&
          !elementChanged;

        if (!isDeadClick) {
          return;
        }

        void trackPageAnalyticsEvent({
          eventType: 'click',
          userId: user?.id || null,
          sessionId: sessionIdRef.current,
          pagePath,
          pageTitle: document.title,
          eventData: {
            telemetry_type: 'dead_click',
            ...metadata,
          },
        });
      }, DEAD_CLICK_DELAY_MS);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [location.hash, location.pathname, location.search, user?.id]);
};
