import { useState, useEffect, useRef, useCallback } from 'react';

export interface TriggerConfig {
  minTimeOnPage?: number; // Minimum seconds on page before showing trigger
  minScrollDepth?: number; // Minimum scroll percentage (0-100)
  minInteractions?: number; // Minimum number of interactions
  requireEngagement?: boolean; // Require active engagement
  exitIntent?: boolean; // Show on exit intent
  returnVisitor?: boolean; // Show for return visitors
}

export interface EngagementMetrics {
  timeOnPage: number;
  scrollDepth: number;
  interactions: number;
  engagementScore: number;
  isReturnVisitor: boolean;
}

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('engagement_session_id');
  if (!sessionId) {
    sessionId = `eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('engagement_session_id', sessionId);
  }
  return sessionId;
};

const checkReturnVisitor = (): boolean => {
  const lastVisit = localStorage.getItem('last_visit');
  const now = Date.now();
  
  if (lastVisit) {
    const daysSinceLastVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
    return daysSinceLastVisit < 30; // Return visitor if visited within 30 days
  }
  
  localStorage.setItem('last_visit', now.toString());
  return false;
};

export const useSmartTrigger = (config: TriggerConfig = {}) => {
  const [shouldShow, setShouldShow] = useState(false);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({
    timeOnPage: 0,
    scrollDepth: 0,
    interactions: 0,
    engagementScore: 0,
    isReturnVisitor: false,
  });

  const pageLoadTime = useRef(Date.now());
  const scrollDepth = useRef(0);
  const interactions = useRef(0);
  const maxScroll = useRef(0);
  const exitIntentDetected = useRef(false);
  const isReturnVisitor = useRef(checkReturnVisitor());

  // Calculate engagement score (0-100)
  const calculateEngagementScore = useCallback((): number => {
    const timeScore = Math.min(engagementMetrics.timeOnPage / 60, 1) * 30; // Max 30 points for time
    const scrollScore = (engagementMetrics.scrollDepth / 100) * 30; // Max 30 points for scroll
    const interactionScore = Math.min(engagementMetrics.interactions / 5, 1) * 20; // Max 20 points for interactions
    const returnVisitorScore = engagementMetrics.isReturnVisitor ? 20 : 0; // 20 points for return visitor

    return Math.round(timeScore + scrollScore + interactionScore + returnVisitorScore);
  }, [engagementMetrics]);

  // Track time on page
  useEffect(() => {
    const interval = setInterval(() => {
      const timeOnPage = Math.floor((Date.now() - pageLoadTime.current) / 1000);
      setEngagementMetrics(prev => ({
        ...prev,
        timeOnPage,
        engagementScore: calculateEngagementScore(),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateEngagementScore]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollableHeight = documentHeight - windowHeight;
      const currentScrollDepth = scrollableHeight > 0
        ? Math.round((scrollTop / scrollableHeight) * 100)
        : 0;

      if (currentScrollDepth > maxScroll.current) {
        maxScroll.current = currentScrollDepth;
        scrollDepth.current = currentScrollDepth;
        setEngagementMetrics(prev => ({
          ...prev,
          scrollDepth: currentScrollDepth,
          engagementScore: calculateEngagementScore(),
        }));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [calculateEngagementScore]);

  // Track interactions (clicks, form inputs, etc.)
  useEffect(() => {
    const handleInteraction = () => {
      interactions.current += 1;
      setEngagementMetrics(prev => ({
        ...prev,
        interactions: interactions.current,
        engagementScore: calculateEngagementScore(),
      }));
    };

    const events = ['click', 'input', 'focus', 'submit'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [calculateEngagementScore]);

  // Exit intent detection
  useEffect(() => {
    if (!config.exitIntent) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitIntentDetected.current) {
        exitIntentDetected.current = true;
        setShouldShow(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [config.exitIntent]);

  // Check if trigger conditions are met
  useEffect(() => {
    const checkConditions = () => {
      const conditions: boolean[] = [];

      // Time on page condition
      if (config.minTimeOnPage !== undefined) {
        conditions.push(engagementMetrics.timeOnPage >= config.minTimeOnPage);
      }

      // Scroll depth condition
      if (config.minScrollDepth !== undefined) {
        conditions.push(engagementMetrics.scrollDepth >= config.minScrollDepth);
      }

      // Interactions condition
      if (config.minInteractions !== undefined) {
        conditions.push(engagementMetrics.interactions >= config.minInteractions);
      }

      // Engagement score condition
      if (config.requireEngagement) {
        conditions.push(engagementMetrics.engagementScore >= 50);
      }

      // Return visitor condition
      if (config.returnVisitor) {
        conditions.push(engagementMetrics.isReturnVisitor);
      }

      // If no conditions specified, show after 30 seconds
      if (conditions.length === 0) {
        conditions.push(engagementMetrics.timeOnPage >= 30);
      }

      // Show if all conditions are met (or if exit intent detected)
      if (exitIntentDetected.current || conditions.every(c => c === true)) {
        setShouldShow(true);
      }
    };

    const interval = setInterval(checkConditions, 1000);
    return () => clearInterval(interval);
  }, [config, engagementMetrics]);

  // Update return visitor status
  useEffect(() => {
    setEngagementMetrics(prev => ({
      ...prev,
      isReturnVisitor: isReturnVisitor.current,
    }));
  }, []);

  return {
    shouldShow,
    engagementMetrics,
    reset: () => {
      setShouldShow(false);
      exitIntentDetected.current = false;
    },
  };
};

