import { useState, useEffect } from 'react';
import { X, Gift, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from './CountdownTimer';
import { Promotion } from '@/config/promotions';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PromotionBannerProps {
  promotion: Promotion;
  variant?: 'top' | 'floating' | 'inline';
  dismissible?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export const PromotionBanner = ({
  promotion,
  variant = 'inline',
  dismissible = true,
  className,
  onDismiss
}: PromotionBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const storageKey = `promo-dismissed-${promotion.id}`;
    const wasDismissed = localStorage.getItem(storageKey);
    if (wasDismissed) {
      setDismissed(true);
    }

    // Check if promotion expired
    const endDate = new Date(promotion.endDate);
    if (endDate <= new Date()) {
      setExpired(true);
    }
  }, [promotion.id, promotion.endDate]);

  const handleDismiss = () => {
    setDismissed(true);
    const storageKey = `promo-dismissed-${promotion.id}`;
    localStorage.setItem(storageKey, 'true');
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleExpire = () => {
    setExpired(true);
  };

  const getIcon = () => {
    switch (promotion.type) {
      case 'bonus_credits':
        return <Sparkles className="w-4 h-4" />;
      case 'discount':
        return <Gift className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getValueDisplay = () => {
    switch (promotion.type) {
      case 'bonus_credits':
        return `+${promotion.value} Credits`;
      case 'discount':
        return `${promotion.value}% Off`;
      case 'free_trial_extension':
        return `+${promotion.value} Days`;
      default:
        return '';
    }
  };

  const getCTALink = () => {
    if (promotion.targetAudience === 'new_users') {
      return '/signup';
    }
    if (promotion.type === 'discount') {
      return '/pricing';
    }
    return '/signup';
  };

  if (dismissed || expired || !promotion.active) {
    return null;
  }

  if (variant === 'top') {
    return (
      <div className={cn('w-full bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-b border-primary/20', className)}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-primary">{getIcon()}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{promotion.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getValueDisplay()}
                  </Badge>
                  {promotion.showCountdown && (
                    <CountdownTimer
                      endDate={promotion.endDate}
                      variant="compact"
                      showIcon={false}
                      onExpire={handleExpire}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{promotion.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" asChild>
                <Link to={getCTALink()}>Claim Now</Link>
              </Button>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div className={cn('fixed bottom-6 right-6 z-50 max-w-sm', className)}>
        <div className="glass-card border-2 border-primary/30 shadow-2xl rounded-lg p-4 animate-slide-up">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="text-primary">{getIcon()}</div>
              <Badge variant="secondary" className="text-xs">
                {getValueDisplay()}
              </Badge>
            </div>
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-muted rounded-md transition-colors -mt-1 -mr-1"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <h3 className="font-semibold text-sm mb-1">{promotion.title}</h3>
          <p className="text-xs text-muted-foreground mb-3">{promotion.description}</p>
          {promotion.showCountdown && (
            <div className="mb-3">
              <CountdownTimer
                endDate={promotion.endDate}
                variant="badge"
                onExpire={handleExpire}
              />
            </div>
          )}
          <Button size="sm" className="w-full" asChild>
            <Link to={getCTALink()}>Claim Offer</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={cn('glass-card border-2 border-primary/20 rounded-lg p-4 md:p-6', className)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-lg">{promotion.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {getValueDisplay()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{promotion.description}</p>
          </div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-muted rounded-md transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {promotion.showCountdown && (
        <div className="mb-4 flex items-center justify-center">
          <CountdownTimer
            endDate={promotion.endDate}
            variant="full"
            onExpire={handleExpire}
          />
        </div>
      )}
      <div className="flex gap-3">
        <Button className="flex-1" asChild>
          <Link to={getCTALink()}>Claim Offer Now</Link>
        </Button>
      </div>
    </div>
  );
};

