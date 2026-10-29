import type { CSSProperties } from "react";

type GradientMeshProps = {
  /** Four HSL triplets ("218 89% 60%"), one per moving colour blob. */
  colors: [string, string, string, string];
  className?: string;
};

/**
 * Stripe-style moving colour field for homepage panels. Four soft radial
 * blobs drift on transform-only keyframes (no blur filter, no layout work),
 * and stand still for reduced motion. Purely decorative.
 */
const GradientMesh = ({ colors, className = "" }: GradientMeshProps) => {
  const style = {
    "--mesh-1": colors[0],
    "--mesh-2": colors[1],
    "--mesh-3": colors[2],
    "--mesh-4": colors[3],
  } as CSSProperties;

  return (
    <div className={`hx-mesh ${className}`} style={style} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
};

export default GradientMesh;
