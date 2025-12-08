/**
 * Utility functions for fetching LinkedIn post metadata
 * Used to get Open Graph images for proper social media previews
 */

import { logError } from '@/lib/logger';

/**
 * Fetch Open Graph image from a LinkedIn post URL
 * Uses LinkedIn's oEmbed-like API or fetches the page to extract og:image
 * 
 * @param linkedinUrl - The LinkedIn post URL
 * @returns Promise<string | null> - The og:image URL or null if not found
 */
export async function fetchLinkedInOgImage(linkedinUrl: string): Promise<string | null> {
  try {
    // LinkedIn posts typically have og:image in their meta tags
    // We can use a proxy service or fetch directly
    // For now, we'll construct a potential image URL pattern
    // LinkedIn uses specific image URLs for posts
    
    // Try to extract post ID from URL
    const postIdMatch = linkedinUrl.match(/activity-(\d+)/);
    if (postIdMatch) {
      // LinkedIn post images are typically available at specific endpoints
      // However, we need to fetch the actual page to get the og:image
      // This is best done server-side, but for client-side we can use a CORS proxy
      
      // Alternative: Use opengraph.io or similar service
      // For now, return null and let the component handle fallback
      return null;
    }
    
    return null;
  } catch (error) {
    logError('Error fetching LinkedIn OG image', error);
    return null;
  }
}

/**
 * Get LinkedIn post image using a CORS proxy
 * Note: This requires a CORS proxy service or server-side implementation
 */
export async function fetchLinkedInImageViaProxy(linkedinUrl: string): Promise<string | null> {
  try {
    // Use a CORS proxy to fetch the LinkedIn page
    // Example: https://api.allorigins.win/get?url=
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(linkedinUrl)}`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (data.contents) {
      // Parse HTML to find og:image
      const ogImageMatch = data.contents.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        return ogImageMatch[1];
      }
    }
    
    return null;
  } catch (error) {
    logError('Error fetching LinkedIn image via proxy', error);
    return null;
  }
}

/**
 * Generate a default OG image URL based on article metadata
 * This is a fallback when LinkedIn image cannot be fetched
 */
export function generateDefaultOgImage(title: string, excerpt?: string): string {
  // Use a service like og-image.vercel.app or similar
  // Or generate a default image URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com';
  const params = new URLSearchParams({
    title: title.substring(0, 60),
    description: excerpt ? excerpt.substring(0, 120) : '',
  });
  
  // Return a default OG image or use a service
  return `${baseUrl}/og-image.png`; // Fallback to default image
}

