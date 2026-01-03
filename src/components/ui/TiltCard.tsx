/**
 * TiltCard Component
 * Card that responds to mouse position with 3D tilt effect
 * Creates depth and tangible feel
 */

import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: React.ReactNode;
  tiltStrength?: number;
  className?: string;
  glowColor?: string;
}

export const TiltCard = ({
  children,
  tiltStrength = 10,
  className,
  glowColor = 'rgba(255, 255, 255, 0.8)'
}: TiltCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const prefersReducedMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / rect.height) * tiltStrength;
    const rotateY = -(mouseX / rect.width) * tiltStrength;

    setRotation({ x: rotateX, y: rotateY });

    // Calculate shine position
    const shineX = ((e.clientX - rect.left) / rect.width) * 100;
    const shineY = ((e.clientY - rect.top) / rect.height) * 100;
    setShine({ x: shineX, y: shineY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setShine({ x: 50, y: 50 });
  };

  return (
    <div className="relative" style={{ perspective: '1000px' }}>
      <Card
        ref={cardRef}
        className={cn("relative transition-transform duration-100 ease-out", className)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: prefersReducedMotion
            ? 'none'
            : `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        {/* Shine overlay */}
        {!prefersReducedMotion && (
          <div
            className="absolute inset-0 pointer-events-none rounded-card opacity-0 hover:opacity-20 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, ${glowColor}, transparent 50%)`
            }}
          />
        )}

        {children}
      </Card>
    </div>
  );
};
