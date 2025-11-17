import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPrimaryPromotion } from '@/config/promotions';
import { PromotionBanner } from './PromotionBanner';
import { X } from 'lucide-react';

interface FloatingUrgencyWidgetProps {
  pages?: string[];
  className?: string;
}

export const FloatingUrgencyWidget = ({
  pages = ['/', '/pricing', '/bizmap-ai', '/prompt-library', '/community'],
  className
}: FloatingUrgencyWidgetProps) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if widget should be visible on current page
    const shouldShow = pages.some(page => location.pathname === page || location.pathname.startsWith(page));
    
    if (!shouldShow) {
      setIsVisible(false);
      return;
    }

    // Check if widget was dismissed
    const storageKey = 'floating-urgency-widget-dismissed';
    const wasDismissed = localStorage.getItem(storageKey);
    if (wasDismissed) {
      setDismissed(true);
      setIsVisible(false);
      return;
    }

    // Show widget after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer);
  }, [location.pathname, pages]);

  const handleDismiss = () => {
    setDismissed(true);
    setIsVisible(false);
    localStorage.setItem('floating-urgency-widget-dismissed', 'true');
  };

  if (!isVisible || dismissed) {
    return null;
  }

  const userType = isAuthenticated ? 'existing' : 'new';
  const promotion = getPrimaryPromotion(location.pathname, userType);

  if (!promotion) {
    return null;
  }

  return (
    <div className={`fixed bottom-6 left-6 z-50 max-w-xs ${className}`}>
      <div className="glass-card border-2 border-primary/30 shadow-2xl rounded-lg p-4 animate-slide-up relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <PromotionBanner
          promotion={promotion}
          variant="floating"
          dismissible={false}
          className="!p-0 !border-0 !shadow-none"
        />
      </div>
    </div>
  );
};

