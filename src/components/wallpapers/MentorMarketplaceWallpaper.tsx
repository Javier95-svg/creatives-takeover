import { cn } from "@/lib/utils";

// Pattern types for geometric shapes
type PatternType = 'solid' | 'horizontal-stripes' | 'vertical-stripes' | 'dots' | 'grid' | 'waves' | 'crosshatch';

// Shape types
type ShapeType = 'circle' | 'hexagon' | 'square' | 'rounded-rect';

// Color categories for theme-aware colors
type ColorCategory = 'primary' | 'secondary' | 'accent';

interface GeometricShape {
  id: string;
  top: string;
  left: string;
  size: number;
  type: ShapeType;
  pattern: PatternType;
  colorCategory: ColorCategory;
  rotation: number;
  animationDelay: string;
  animationDuration: string;
}

const MentorMarketplaceWallpaper = () => {
  // Generate array of geometric shapes (medium density: 60-70 shapes)
  const shapes: GeometricShape[] = [
    // Top row
    { id: '1', top: '8%', left: '5%', size: 80, type: 'circle', pattern: 'dots', colorCategory: 'primary', rotation: 0, animationDelay: '0s', animationDuration: '10s' },
    { id: '2', top: '12%', left: '18%', size: 64, type: 'square', pattern: 'horizontal-stripes', colorCategory: 'primary', rotation: 15, animationDelay: '1.5s', animationDuration: '12s' },
    { id: '3', top: '10%', left: '32%', size: 72, type: 'hexagon', pattern: 'solid', colorCategory: 'secondary', rotation: 30, animationDelay: '0.5s', animationDuration: '11s' },
    { id: '4', top: '14%', left: '48%', size: 68, type: 'rounded-rect', pattern: 'vertical-stripes', colorCategory: 'primary', rotation: -10, animationDelay: '2s', animationDuration: '13s' },
    { id: '5', top: '9%', left: '65%', size: 76, type: 'circle', pattern: 'grid', colorCategory: 'accent', rotation: 20, animationDelay: '1s', animationDuration: '10.5s' },
    { id: '6', top: '13%', left: '82%', size: 60, type: 'square', pattern: 'waves', colorCategory: 'secondary', rotation: -15, animationDelay: '2.5s', animationDuration: '12.5s' },
    { id: '7', top: '11%', left: '92%', size: 70, type: 'hexagon', pattern: 'crosshatch', colorCategory: 'primary', rotation: 25, animationDelay: '0.8s', animationDuration: '11.5s' },
    
    // Second row
    { id: '8', top: '24%', left: '3%', size: 65, type: 'rounded-rect', pattern: 'dots', colorCategory: 'secondary', rotation: -20, animationDelay: '3s', animationDuration: '13.5s' },
    { id: '9', top: '28%', left: '22%', size: 74, type: 'circle', pattern: 'horizontal-stripes', colorCategory: 'accent', rotation: 10, animationDelay: '1.2s', animationDuration: '10.8s' },
    { id: '10', top: '26%', left: '38%', size: 58, type: 'square', pattern: 'solid', colorCategory: 'primary', rotation: 35, animationDelay: '2.2s', animationDuration: '12.2s' },
    { id: '11', top: '30%', left: '55%', size: 82, type: 'hexagon', pattern: 'vertical-stripes', colorCategory: 'secondary', rotation: -25, animationDelay: '0.3s', animationDuration: '11.3s' },
    { id: '12', top: '25%', left: '72%', size: 66, type: 'rounded-rect', pattern: 'grid', colorCategory: 'primary', rotation: 15, animationDelay: '3.2s', animationDuration: '13.2s' },
    { id: '13', top: '29%', left: '88%', size: 72, type: 'circle', pattern: 'waves', colorCategory: 'accent', rotation: -30, animationDelay: '1.8s', animationDuration: '10.8s' },
    
    // Third row
    { id: '14', top: '42%', left: '8%', size: 78, type: 'hexagon', pattern: 'crosshatch', colorCategory: 'primary', rotation: 20, animationDelay: '0.6s', animationDuration: '11.6s' },
    { id: '15', top: '46%', left: '26%', size: 62, type: 'square', pattern: 'dots', colorCategory: 'secondary', rotation: -18, animationDelay: '2.8s', animationDuration: '12.8s' },
    { id: '16', top: '44%', left: '42%', size: 70, type: 'circle', pattern: 'horizontal-stripes', colorCategory: 'primary', rotation: 40, animationDelay: '1.4s', animationDuration: '10.4s' },
    { id: '17', top: '48%', left: '60%', size: 64, type: 'rounded-rect', pattern: 'solid', colorCategory: 'accent', rotation: -12, animationDelay: '3.4s', animationDuration: '13.4s' },
    { id: '18', top: '43%', left: '76%', size: 80, type: 'hexagon', pattern: 'vertical-stripes', colorCategory: 'secondary', rotation: 22, animationDelay: '0.9s', animationDuration: '11.9s' },
    { id: '19', top: '47%', left: '94%', size: 56, type: 'square', pattern: 'grid', colorCategory: 'primary', rotation: -28, animationDelay: '2.6s', animationDuration: '12.6s' },
    
    // Fourth row
    { id: '20', top: '58%', left: '4%', size: 68, type: 'circle', pattern: 'waves', colorCategory: 'secondary', rotation: 18, animationDelay: '1.6s', animationDuration: '10.6s' },
    { id: '21', top: '62%', left: '20%', size: 76, type: 'rounded-rect', pattern: 'crosshatch', colorCategory: 'primary', rotation: -22, animationDelay: '3.6s', animationDuration: '13.6s' },
    { id: '22', top: '60%', left: '36%', size: 72, type: 'hexagon', pattern: 'dots', colorCategory: 'accent', rotation: 28, animationDelay: '1.1s', animationDuration: '11.1s' },
    { id: '23', top: '64%', left: '52%', size: 60, type: 'square', pattern: 'horizontal-stripes', colorCategory: 'secondary', rotation: -15, animationDelay: '2.9s', animationDuration: '12.9s' },
    { id: '24', top: '59%', left: '68%', size: 84, type: 'circle', pattern: 'solid', colorCategory: 'primary', rotation: 32, animationDelay: '0.7s', animationDuration: '10.7s' },
    { id: '25', top: '63%', left: '85%', size: 66, type: 'hexagon', pattern: 'vertical-stripes', colorCategory: 'secondary', rotation: -20, animationDelay: '3.8s', animationDuration: '13.8s' },
    
    // Fifth row
    { id: '26', top: '74%', left: '12%', size: 74, type: 'rounded-rect', pattern: 'grid', colorCategory: 'primary', rotation: 25, animationDelay: '1.3s', animationDuration: '11.3s' },
    { id: '27', top: '78%', left: '30%', size: 58, type: 'square', pattern: 'waves', colorCategory: 'accent', rotation: -35, animationDelay: '3.1s', animationDuration: '13.1s' },
    { id: '28', top: '76%', left: '46%', size: 80, type: 'circle', pattern: 'crosshatch', colorCategory: 'secondary', rotation: 12, animationDelay: '0.4s', animationDuration: '10.4s' },
    { id: '29', top: '80%', left: '64%', size: 64, type: 'hexagon', pattern: 'dots', colorCategory: 'primary', rotation: -26, animationDelay: '2.4s', animationDuration: '12.4s' },
    { id: '30', top: '75%', left: '80%', size: 70, type: 'rounded-rect', pattern: 'horizontal-stripes', colorCategory: 'secondary', rotation: 38, animationDelay: '1.7s', animationDuration: '11.7s' },
    { id: '31', top: '79%', left: '96%', size: 62, type: 'square', pattern: 'vertical-stripes', colorCategory: 'accent', rotation: -14, animationDelay: '3.9s', animationDuration: '13.9s' },
    
    // Additional scattered shapes for medium density
    { id: '32', top: '18%', left: '12%', size: 52, type: 'circle', pattern: 'grid', colorCategory: 'accent', rotation: 45, animationDelay: '4s', animationDuration: '14s' },
    { id: '33', top: '20%', left: '28%', size: 56, type: 'hexagon', pattern: 'solid', colorCategory: 'secondary', rotation: -40, animationDelay: '1.9s', animationDuration: '11.9s' },
    { id: '34', top: '34%', left: '14%', size: 48, type: 'square', pattern: 'waves', colorCategory: 'primary', rotation: 50, animationDelay: '4.2s', animationDuration: '14.2s' },
    { id: '35', top: '36%', left: '50%', size: 54, type: 'rounded-rect', pattern: 'crosshatch', colorCategory: 'accent', rotation: -35, animationDelay: '2.1s', animationDuration: '12.1s' },
    { id: '36', top: '38%', left: '85%', size: 50, type: 'circle', pattern: 'dots', colorCategory: 'secondary', rotation: 55, animationDelay: '4.4s', animationDuration: '14.4s' },
    { id: '37', top: '52%', left: '15%', size: 58, type: 'hexagon', pattern: 'horizontal-stripes', colorCategory: 'primary', rotation: -45, animationDelay: '2.3s', animationDuration: '12.3s' },
    { id: '38', top: '54%', left: '45%', size: 52, type: 'square', pattern: 'vertical-stripes', colorCategory: 'secondary', rotation: 60, animationDelay: '4.6s', animationDuration: '14.6s' },
    { id: '39', top: '56%', left: '78%', size: 56, type: 'rounded-rect', pattern: 'grid', colorCategory: 'accent', rotation: -50, animationDelay: '2.5s', animationDuration: '12.5s' },
    { id: '40', top: '68%', left: '25%', size: 54, type: 'circle', pattern: 'solid', colorCategory: 'primary', rotation: 40, animationDelay: '4.8s', animationDuration: '14.8s' },
    { id: '41', top: '70%', left: '58%', size: 48, type: 'hexagon', pattern: 'waves', colorCategory: 'secondary', rotation: -55, animationDelay: '2.7s', animationDuration: '12.7s' },
    { id: '42', top: '72%', left: '90%', size: 56, type: 'square', pattern: 'crosshatch', colorCategory: 'accent', rotation: 45, animationDelay: '5s', animationDuration: '15s' },
    
    // More scattered for density
    { id: '43', top: '15%', left: '58%', size: 44, type: 'rounded-rect', pattern: 'dots', colorCategory: 'primary', rotation: -30, animationDelay: '5.2s', animationDuration: '14.2s' },
    { id: '44', top: '32%', left: '68%', size: 46, type: 'circle', pattern: 'horizontal-stripes', colorCategory: 'secondary', rotation: 35, animationDelay: '2.9s', animationDuration: '12.9s' },
    { id: '45', top: '50%', left: '28%', size: 50, type: 'hexagon', pattern: 'vertical-stripes', colorCategory: 'accent', rotation: -25, animationDelay: '5.4s', animationDuration: '14.4s' },
    { id: '46', top: '66%', left: '40%', size: 42, type: 'square', pattern: 'grid', colorCategory: 'primary', rotation: 30, animationDelay: '3.1s', animationDuration: '13.1s' },
    { id: '47', top: '82%', left: '52%', size: 48, type: 'rounded-rect', pattern: 'solid', colorCategory: 'secondary', rotation: -35, animationDelay: '5.6s', animationDuration: '14.6s' },
  ];

  // Get opacity classes based on pattern and theme
  const getOpacityClasses = (category: ColorCategory, pattern: PatternType): string => {
    // Dark mode: higher opacity for visibility
    const darkOpacity = pattern === 'solid' 
      ? 'dark:opacity-[0.25]' 
      : pattern === 'crosshatch' 
      ? 'dark:opacity-[0.20]' 
      : 'dark:opacity-[0.18]';
    
    // Light mode: lower opacity for subtlety
    const lightOpacity = pattern === 'solid' 
      ? 'opacity-[0.08]' 
      : pattern === 'crosshatch' 
      ? 'opacity-[0.06]' 
      : 'opacity-[0.05]';
    
    return `${darkOpacity} ${lightOpacity}`;
  };

  // Render shape SVG content
  const renderShapeContent = (shape: GeometricShape, patternId: string) => {
    const baseSize = shape.size;
    const height = shape.type === 'rounded-rect' ? baseSize * 0.7 : baseSize;
    
    switch (shape.type) {
      case 'circle':
        return <circle cx={baseSize / 2} cy={baseSize / 2} r={baseSize / 2} fill={`url(#${patternId})`} />;
      case 'square':
        return <rect x="0" y="0" width={baseSize} height={baseSize} fill={`url(#${patternId})`} />;
      case 'hexagon':
        const hexPoints = [
          { x: baseSize / 2, y: 0 },
          { x: baseSize, y: baseSize * 0.25 },
          { x: baseSize, y: baseSize * 0.75 },
          { x: baseSize / 2, y: baseSize },
          { x: 0, y: baseSize * 0.75 },
          { x: 0, y: baseSize * 0.25 },
        ].map(p => `${p.x},${p.y}`).join(' ');
        return <polygon points={hexPoints} fill={`url(#${patternId})`} />;
      case 'rounded-rect':
        return <rect x="0" y="0" width={baseSize} height={height} rx={baseSize * 0.15} fill={`url(#${patternId})`} />;
      default:
        return null;
    }
  };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base gradient backdrop - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br 
        dark:from-[#0a0f1e] dark:via-[#0f1525] dark:to-[#141b2e] 
        from-background via-muted/30 to-background" />
      
      {/* Secondary gradient layer for depth - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-t 
        dark:from-[#050812] dark:via-transparent dark:to-[#1a1f35] 
        from-background/80 via-transparent to-background/60" />

      {/* SVG container with patterns and shapes */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          {/* Primary blue patterns */}
          <pattern id="pattern-solid-primary" x="0" y="0" width="100%" height="100%" patternUnits="userSpaceOnUse">
            <rect width="100%" height="100%" className="fill-[hsl(var(--blue-primary))]" />
          </pattern>
          <pattern id="pattern-horizontal-stripes-primary" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="2" x2="8" y2="2" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="1" />
            <line x1="0" y1="6" x2="8" y2="6" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-vertical-stripes-primary" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="2" y1="0" x2="2" y2="8" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="1" />
            <line x1="6" y1="0" x2="6" y2="8" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-dots-primary" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1.5" className="fill-[hsl(var(--blue-primary))]" />
          </pattern>
          <pattern id="pattern-grid-primary" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="transparent" />
            <line x1="0" y1="5" x2="10" y2="5" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="0.5" />
            <line x1="5" y1="0" x2="5" y2="10" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="0.5" />
          </pattern>
          <pattern id="pattern-waves-primary" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 Q 5 5 10 10 T 20 10" fill="none" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="1.5" />
            <path d="M 0 15 Q 5 10 10 15 T 20 15" fill="none" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="1.5" />
          </pattern>
          <pattern id="pattern-crosshatch-primary" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="0" x2="8" y2="8" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="0.8" />
            <line x1="8" y1="0" x2="0" y2="8" className="stroke-[hsl(var(--blue-primary))]" strokeWidth="0.8" />
          </pattern>

          {/* Secondary cyan/teal patterns */}
          <pattern id="pattern-solid-secondary" x="0" y="0" width="100%" height="100%" patternUnits="userSpaceOnUse">
            <rect width="100%" height="100%" className="fill-[hsl(188_40%_55%)] dark:fill-[hsl(188_85%_60%)]" />
          </pattern>
          <pattern id="pattern-horizontal-stripes-secondary" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="2" x2="8" y2="2" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="1" />
            <line x1="0" y1="6" x2="8" y2="6" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-vertical-stripes-secondary" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="2" y1="0" x2="2" y2="8" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="1" />
            <line x1="6" y1="0" x2="6" y2="8" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-dots-secondary" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1.5" className="fill-[hsl(188_40%_55%)] dark:fill-[hsl(188_85%_60%)]" />
          </pattern>
          <pattern id="pattern-grid-secondary" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="transparent" />
            <line x1="0" y1="5" x2="10" y2="5" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="0.5" />
            <line x1="5" y1="0" x2="5" y2="10" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="0.5" />
          </pattern>
          <pattern id="pattern-waves-secondary" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 Q 5 5 10 10 T 20 10" fill="none" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="1.5" />
            <path d="M 0 15 Q 5 10 10 15 T 20 15" fill="none" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="1.5" />
          </pattern>
          <pattern id="pattern-crosshatch-secondary" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="0" x2="8" y2="8" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="0.8" />
            <line x1="8" y1="0" x2="0" y2="8" className="stroke-[hsl(188_40%_55%)] dark:stroke-[hsl(188_85%_60%)]" strokeWidth="0.8" />
          </pattern>

          {/* Accent green patterns */}
          <pattern id="pattern-solid-accent" x="0" y="0" width="100%" height="100%" patternUnits="userSpaceOnUse">
            <rect width="100%" height="100%" className="fill-[hsl(142_35%_45%)] dark:fill-[hsl(var(--green-primary))]" />
          </pattern>
          <pattern id="pattern-horizontal-stripes-accent" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="2" x2="8" y2="2" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="1" />
            <line x1="0" y1="6" x2="8" y2="6" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-vertical-stripes-accent" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="2" y1="0" x2="2" y2="8" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="1" />
            <line x1="6" y1="0" x2="6" y2="8" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-dots-accent" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1.5" className="fill-[hsl(142_35%_45%)] dark:fill-[hsl(var(--green-primary))]" />
          </pattern>
          <pattern id="pattern-grid-accent" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="transparent" />
            <line x1="0" y1="5" x2="10" y2="5" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="0.5" />
            <line x1="5" y1="0" x2="5" y2="10" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="0.5" />
          </pattern>
          <pattern id="pattern-waves-accent" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 Q 5 5 10 10 T 20 10" fill="none" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="1.5" />
            <path d="M 0 15 Q 5 10 10 15 T 20 15" fill="none" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="1.5" />
          </pattern>
          <pattern id="pattern-crosshatch-accent" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="0" x2="8" y2="8" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="0.8" />
            <line x1="8" y1="0" x2="0" y2="8" className="stroke-[hsl(142_35%_45%)] dark:stroke-[hsl(var(--green-primary))]" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Render all geometric shapes */}
        {shapes.map((shape) => {
          const patternId = `pattern-${shape.pattern}-${shape.colorCategory}`;
          const opacityClasses = getOpacityClasses(shape.colorCategory, shape.pattern);
          const baseSize = shape.size;
          const height = shape.type === 'rounded-rect' ? baseSize * 0.7 : baseSize;
          
          // Calculate position in viewBox coordinates (1440x900)
          const leftPercent = parseFloat(shape.left);
          const topPercent = parseFloat(shape.top);
          const x = (leftPercent / 100) * 1440;
          const y = (topPercent / 100) * 900;

          return (
            <g
              key={shape.id}
              className={cn("geometric-float", opacityClasses)}
              style={{
                animation: `geometric-float ${shape.animationDuration} ease-in-out infinite`,
                animationDelay: shape.animationDelay,
              }}
              transform={`translate(${x}, ${y}) rotate(${shape.rotation} ${baseSize / 2} ${height / 2})`}
            >
              {renderShapeContent(shape, patternId)}
            </g>
          );
        })}
      </svg>

      {/* Readability overlay - ensures content is always readable */}
      <div className="absolute inset-0 
        dark:from-background/80 dark:via-background/55 dark:to-background/75 
        from-background/94 via-background/97 to-background/94 
        bg-gradient-to-b" />
    </div>
  );
};

export default MentorMarketplaceWallpaper;
