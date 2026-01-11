import React from 'react';

/**
 * Consistent wallpaper background for VC Search and VC Profile pages
 * Uses animated gradients with blue and purple tones
 */
export const VCWallpaper: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div
        className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
          animationDuration: '28s'
        }}
      />
    </div>
  );
};
