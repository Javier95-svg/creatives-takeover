import { useMemo } from 'react';
import { generatePromoImageDataURL } from '@/utils/generatePromoImage';
import { StoryArticle } from '@/hooks/useStories';

interface PromoImageGeneratorProps {
  article: StoryArticle;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Component that generates and displays a promotional preview image
 * Falls back to uploaded banner if available, otherwise generates one
 */
export const PromoImageGenerator = ({ 
  article, 
  width = 1200, 
  height = 675,
  className = '' 
}: PromoImageGeneratorProps) => {
  const promoImageUrl = useMemo(() => {
    // If banner exists, use it
    if (article.banner_image_url) {
      return article.banner_image_url;
    }

    // Otherwise generate promotional image
    return generatePromoImageDataURL({
      title: article.title,
      excerpt: article.excerpt || undefined,
      hashtags: article.hashtags || [],
      width,
      height,
    });
  }, [article.banner_image_url, article.title, article.excerpt, article.hashtags, width, height]);

  return (
    <img
      src={promoImageUrl}
      alt={article.title}
      className={className}
      loading="lazy"
    />
  );
};

