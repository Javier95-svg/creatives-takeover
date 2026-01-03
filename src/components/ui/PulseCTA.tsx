/**
 * PulseCTA Component
 * Call-to-action button with subtle pulse rings
 * Draws attention without being distracting
 */

import { ButtonProps } from '@/components/ui/button';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export const PulseCTA = ({
  children,
  pulseColor = 'hsl(var(--primary))',
  className,
  ...props
}: ButtonProps & { pulseColor?: string }) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // No pulse animation for reduced motion preference
    return (
      <MagneticButton magneticStrength={0} className={className} {...props}>
        {children}
      </MagneticButton>
    );
  }

  return (
    <div className="relative inline-flex">
      {/* Pulse ring 1 - Ping effect */}
      <span
        className="absolute inset-0 rounded-button animate-ping opacity-20"
        style={{ backgroundColor: pulseColor }}
      />

      {/* Pulse ring 2 - Slower pulse */}
      <span
        className="absolute inset-0 rounded-button animate-pulse opacity-30"
        style={{ backgroundColor: pulseColor }}
      />

      {/* Button */}
      <MagneticButton className={className} {...props}>
        {children}
      </MagneticButton>
    </div>
  );
};
