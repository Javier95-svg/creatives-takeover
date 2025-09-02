import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseArticleImageProps {
  title: string;
  description?: string;
  category?: string;
  articleId: string; // Unique identifier to cache images
}

interface ImageState {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useArticleImage = ({ title, description, category, articleId }: UseArticleImageProps) => {
  const [imageState, setImageState] = useState<ImageState>({
    imageUrl: null,
    isLoading: false,
    error: null
  });

  // Cache key for localStorage
  const cacheKey = `article-image-${articleId}`;

  useEffect(() => {
    let isMounted = true;

    // Check if image is already cached in localStorage
    const cachedImageUrl = localStorage.getItem(cacheKey);
    if (cachedImageUrl) {
      setImageState({
        imageUrl: cachedImageUrl,
        isLoading: false,
        error: null
      });
      return;
    }

    const generateImage = async () => {
      try {
        setImageState(prev => ({ ...prev, isLoading: true, error: null }));

        console.log('Generating image for article:', title);

        const { data, error } = await supabase.functions.invoke('generate-article-image', {
          body: {
            title: title.substring(0, 100), // Limit title length for API
            description: description?.substring(0, 200), // Limit description length
            category
          }
        });

        if (error) {
          throw error;
        }

        if (!isMounted) return;

        if (data?.success && data?.imageUrl) {
          // Cache the generated image URL
          localStorage.setItem(cacheKey, data.imageUrl);
          
          setImageState({
            imageUrl: data.imageUrl,
            isLoading: false,
            error: null
          });
        } else {
          throw new Error(data?.error || 'Failed to generate image');
        }
      } catch (error: any) {
        console.error('Error generating article image:', error);
        
        if (!isMounted) return;
        
        setImageState({
          imageUrl: null,
          isLoading: false,
          error: error.message || 'Failed to generate image'
        });
      }
    };

    // Only generate if we have a title and no cached image
    if (title && title.trim()) {
      generateImage();
    }

    return () => {
      isMounted = false;
    };
  }, [title, description, category, articleId, cacheKey]);

  return imageState;
};