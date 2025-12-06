import { useEffect } from 'react';
import { useDeviceType } from '@/hooks/use-device-type';

const MobileOptimization = () => {
  const deviceType = useDeviceType();

  useEffect(() => {
    // Add device-specific classes to body for CSS targeting
    document.body.classList.remove('mobile-device', 'tablet-device', 'desktop-device');
    
    if (deviceType === 'mobile') {
      document.body.classList.add('mobile-device');
    } else if (deviceType === 'tablet') {
      document.body.classList.add('tablet-device');
    } else {
      document.body.classList.add('desktop-device');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('mobile-device', 'tablet-device', 'desktop-device');
    };
  }, [deviceType]);

  useEffect(() => {
    // Mobile-specific optimizations
    if (deviceType === 'mobile') {
      // Disable hover effects on mobile to prevent sticky states
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
          .hover\\:bg-accent:hover {
            background-color: transparent !important;
          }
        }
      `;
      document.head.appendChild(style);

      // Handle mobile viewport changes
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);

      // Handle mobile keyboard detection
      const handleKeyboard = () => {
        const initialHeight = window.innerHeight;
        
        const onResize = () => {
          const currentHeight = window.innerHeight;
          const heightDiff = initialHeight - currentHeight;
          
          if (heightDiff > 150) {
            document.body.classList.add('keyboard-open');
          } else {
            document.body.classList.remove('keyboard-open');
          }
        };

        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      };

      const cleanupKeyboard = handleKeyboard();

      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
        window.removeEventListener('resize', setViewportHeight);
        window.removeEventListener('orientationchange', setViewportHeight);
        cleanupKeyboard();
        document.body.classList.remove('keyboard-open');
      };
    }
  }, [deviceType]);

  return null;
};

export default MobileOptimization;