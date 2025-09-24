import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const MobileOptimization = () => {
  const isMobile = useIsMobile();

  useEffect(() => {
    // Add mobile-specific class to body for CSS targeting
    if (isMobile) {
      document.body.classList.add('mobile-device');
    } else {
      document.body.classList.remove('mobile-device');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('mobile-device');
    };
  }, [isMobile]);

  useEffect(() => {
    // Disable hover effects on mobile to prevent sticky states
    if (isMobile) {
      const style = document.createElement('style');
      style.textContent = `
        @media (hover: none) and (pointer: coarse) {
          .hover\\:scale-105:hover {
            transform: none !important;
          }
          .hover\\:shadow-xl:hover {
            box-shadow: none !important;
          }
          .btn-magnetic:hover {
            transform: none !important;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [isMobile]);

  return null;
};

export default MobileOptimization;