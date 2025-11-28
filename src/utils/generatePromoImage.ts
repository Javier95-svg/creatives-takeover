/**
 * Generate a promotional preview image for articles
 * Creates an SVG-based image with gradient background and title overlay
 * TechCrunch-inspired design
 */

export interface PromoImageOptions {
  title: string;
  excerpt?: string;
  hashtags?: string[];
  width?: number;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Generate gradient colors based on hashtags/categories
 */
function getGradientColors(hashtags?: string[]): { primary: string; secondary: string } {
  // Default brand colors
  const defaultGradients = [
    { primary: '#3b82f6', secondary: '#8b5cf6' }, // Blue to Purple
    { primary: '#10b981', secondary: '#3b82f6' }, // Green to Blue
    { primary: '#f59e0b', secondary: '#ef4444' }, // Orange to Red
    { primary: '#8b5cf6', secondary: '#ec4899' }, // Purple to Pink
    { primary: '#06b6d4', secondary: '#3b82f6' }, // Cyan to Blue
  ];

  if (!hashtags || hashtags.length === 0) {
    return defaultGradients[0];
  }

  // Hash the first hashtag to get consistent colors
  const hash = hashtags[0].split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const index = Math.abs(hash) % defaultGradients.length;
  return defaultGradients[index];
}

/**
 * Generate a data URL version (for immediate use)
 */
export function generatePromoImageDataURL(options: PromoImageOptions): string {
  const svg = generatePromoImageSVGString(options);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/**
 * Generate just the SVG string (for React components)
 */
export function generatePromoImageSVGString(options: PromoImageOptions): string {
  const {
    title,
    excerpt,
    hashtags = [],
    width = 1200,
    height = 675,
    primaryColor,
    secondaryColor,
  } = options;

  const colors = primaryColor && secondaryColor
    ? { primary: primaryColor, secondary: secondaryColor }
    : getGradientColors(hashtags);

  const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const category = hashtags.length > 0 ? hashtags[0].replace('#', '') : 'Article';
  const titleWords = displayTitle.split(' ');
  const firstLine = titleWords.slice(0, Math.ceil(titleWords.length / 2)).join(' ');
  const secondLine = titleWords.slice(Math.ceil(titleWords.length / 2)).join(' ');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#bgGradient)"/>
      
      <circle cx="${width * 0.85}" cy="${height * 0.15}" r="80" fill="white" opacity="0.1"/>
      <circle cx="${width * 0.15}" cy="${height * 0.85}" r="120" fill="white" opacity="0.08"/>
      
      <rect x="40" y="40" width="120" height="32" rx="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="100" y="62" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="white" text-anchor="middle" opacity="0.95">
        ${category.toUpperCase()}
      </text>
      
      <text x="${width / 2}" y="${height / 2 - 20}" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700" fill="white" text-anchor="middle" filter="url(#shadow)">
        ${firstLine}
      </text>
      ${secondLine ? `
      <text x="${width / 2}" y="${height / 2 + 40}" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700" fill="white" text-anchor="middle" filter="url(#shadow)">
        ${secondLine}
      </text>
      ` : ''}
      
      ${excerpt && excerpt.length < 80 ? `
      <text x="${width / 2}" y="${height / 2 + 100}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400" fill="rgba(255,255,255,0.9)" text-anchor="middle" opacity="0.9">
        ${excerpt}
      </text>
      ` : ''}
      
      <text x="${width - 200}" y="${height - 40}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="rgba(255,255,255,0.6)" text-anchor="end">
        Creatives Takeover
      </text>
    </svg>
  `.trim();
}

