import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileFormOptimizerProps {
  children: React.ReactNode;
  className?: string;
}

const MobileFormOptimizer = ({ children, className = '' }: MobileFormOptimizerProps) => {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // Prevent zoom on form inputs for iOS
      const preventZoom = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          target.setAttribute('data-mobile-optimized', 'true');
        }
      };

      document.addEventListener('focusin', preventZoom);
      return () => document.removeEventListener('focusin', preventZoom);
    }
  }, [isMobile]);

  const mobileClasses = isMobile 
    ? 'mobile-form-container touch-manipulation' 
    : '';

  return (
    <div className={`${mobileClasses} ${className}`}>
      {children}
    </div>
  );
};

export default MobileFormOptimizer;