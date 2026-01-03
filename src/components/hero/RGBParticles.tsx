/**
 * RGBParticles Component
 * Interactive canvas-based particle system with mouse attraction
 * Particles float with sine wave motion and connect when nearby
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  amplitude: number;
  frequency: number;
}

export const RGBParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  // Initialize particles
  useEffect(() => {
    const colors = ['#3B82F6', '#EF4444', '#10B981']; // Blue, Red, Green
    const initialParticles: Particle[] = [];

    const particleCount = prefersReducedMotion ? 6 : 12;

    for (let i = 0; i < particleCount; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 4 + 2,
        color: colors[i % 3],
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        amplitude: Math.random() * 50 + 20,
        frequency: Math.random() * 0.02 + 0.01
      });
    }

    setParticles(initialParticles);
  }, [prefersReducedMotion]);

  // Track mouse position
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!prefersReducedMotion) {
        time += 0.016; // ~60fps
      }

      particles.forEach(particle => {
        if (!prefersReducedMotion) {
          // Sine wave motion
          const sineX = Math.sin(time * particle.frequency) * particle.amplitude;
          const sineY = Math.cos(time * particle.frequency * 0.7) * particle.amplitude;

          // Mouse attraction
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const attractionStrength = Math.max(0, 100 - distance) / 100;

          // Update position
          particle.x += particle.vx + sineX * 0.1 + dx * attractionStrength * 0.02;
          particle.y += particle.vy + sineY * 0.1 + dy * attractionStrength * 0.02;
        } else {
          // Simple drift for reduced motion
          particle.x += particle.vx;
          particle.y += particle.vy;
        }

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with radial gradient
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        );
        gradient.addColorStop(0, `${particle.color}80`); // 50% opacity
        gradient.addColorStop(1, `${particle.color}00`); // Transparent

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections between nearby particles
      if (!prefersReducedMotion) {
        particles.forEach((p1, i) => {
          particles.slice(i + 1).forEach(p2 => {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 200) {
              const opacity = (1 - distance / 200) * 0.3;
              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          });
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [particles, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
};
