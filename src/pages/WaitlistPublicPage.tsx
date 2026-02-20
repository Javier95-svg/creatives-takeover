import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import WaitlistPageTemplate, { WaitlistContent } from '@/components/waitlist/WaitlistPageTemplate';

interface WaitlistPage {
  id: string;
  product_name: string;
  ai_content: WaitlistContent;
}

export default function WaitlistPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<WaitlistPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await (supabase as any)
        .from('waitlist_pages')
        .select('id, product_name, ai_content')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      setLoading(false);

      if (error || !data || !data.ai_content) {
        setNotFound(true);
        return;
      }

      setPage({
        id: data.id,
        product_name: data.product_name ?? 'Product',
        ai_content: data.ai_content as WaitlistContent,
      });
    };

    load();
  }, [slug]);

  const handleEmailSubmit = async (email: string): Promise<boolean> => {
    if (!page) return false;

    const { error } = await (supabase as any)
      .from('waitlist_signups')
      .insert({ waitlist_page_id: page.id, email });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint — already signed up
        toast.info("You're already on this waitlist.");
        return true; // Show success state anyway
      }
      toast.error('Something went wrong. Please try again.');
      return false;
    }

    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground">This waitlist page doesn't exist or has been unpublished.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <WaitlistPageTemplate
        content={page.ai_content}
        productName={page.product_name}
        mode="public"
        onEmailSubmit={handleEmailSubmit}
      />
    </div>
  );
}
