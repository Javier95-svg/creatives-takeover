/**
 * MagneticButton Component
 * Button that subtly follows the cursor when nearby
 * Creates a playful, engaging interaction
 */

import { useRef, useState, useEffect } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export const MagneticButton = ({
  children,
  magneticStrength = 0.3,
  className,
  ...props
}: ButtonProps & { magneticStrength?: number }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const button = buttonRef.current;
    if (!button) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const magneticRadius = rect.width * 1.5;

      if (distance < magneticRadius) {
        const strength = (1 - distance / magneticRadius) * magneticStrength;
        setPosition({
          x: deltaX * strength,
          y: deltaY * strength
        });
      } else {
        setPosition({ x: 0, y: 0 });
      }
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    const handleClick = () => {
      // Reset position on click
      setPosition({ x: 0, y: 0 });
    };

    button.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);
    button.addEventListener('click', handleClick);

    return () => {
      button.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
      button.removeEventListener('click', handleClick);
    };
  }, [magneticStrength, prefersReducedMotion]);

  return (
    <Button
      ref={buttonRef}
      className={className}
      {...props}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        ...props.style
      }}
    >
      {children}
    </Button>
  );
};
