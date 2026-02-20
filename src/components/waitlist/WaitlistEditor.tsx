import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Globe, Copy, ArrowLeft, Loader2, Users } from 'lucide-react';
import WaitlistPageTemplate, { WaitlistContent } from './WaitlistPageTemplate';

type EditorPhase = 'input' | 'preview' | 'published';

const WAITLIST_TABLE = 'waitlist_pages' as any;
const SIGNUPS_TABLE = 'waitlist_signups' as any;

interface PublishedPage {
  id: string;
  slug: string;
  product_name: string;
  ai_content: WaitlistContent;
}

function generateSlug(productName: string): string {
  const base = productName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30);
  const random = Math.random().toString(36).slice(2, 7);
  return `${base}-${random}`;
}

const BASE_URL = 'https://creatives-takeover.com';

export default function WaitlistEditor() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();

  const [phase, setPhase] = useState<EditorPhase>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Input form
  const [productName, setProductName] = useState('');
  const [pitch, setPitch] = useState('');
  const [audience, setAudience] = useState('');

  // Generated content (editable after AI generation)
  const [content, setContent] = useState<WaitlistContent | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Published state
  const [publishedPage, setPublishedPage] = useState<PublishedPage | null>(null);
  const [signupCount, setSignupCount] = useState(0);

  // Load latest page on mount
  useEffect(() => {
    const loadExisting = async () => {
      if (!user) return;
      const { data } = await supabase
        .from(WAITLIST_TABLE)
        .select('id, slug, product_name, ai_content, status, title, value_proposition, cta_label')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      setDraftId(data.id);
      if (data.product_name) setProductName(data.product_name);

      if (data.status === 'published' && data.slug && data.ai_content) {
        const page: PublishedPage = {
          id: data.id,
          slug: data.slug,
          product_name: data.product_name,
          ai_content: data.ai_content as WaitlistContent,
        };
        setPublishedPage(page);
        setContent(data.ai_content as WaitlistContent);
        setPhase('published');
        fetchSignupCount(data.id);
      } else if (data.ai_content) {
        setContent(data.ai_content as WaitlistContent);
        if (data.product_name) setProductName(data.product_name);
        setPhase('preview');
      }
    };
    loadExisting();
  }, [user]);

  const fetchSignupCount = async (pageId: string) => {
    const { count } = await supabase
      .from(SIGNUPS_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('waitlist_page_id', pageId);
    setSignupCount(count ?? 0);
  };

  const handleGenerate = async () => {
    if (!user) { toast.error('Sign in to generate your page.'); return; }
    if (!productName.trim() || !pitch.trim()) {
      toast.error('Add a product name and pitch first.');
      return;
    }

    setIsGenerating(true);

    const { data, error } = await supabase.functions.invoke('waitlist-generator', {
      body: { productName: productName.trim(), pitch: pitch.trim(), audience: audience.trim() },
    });

    setIsGenerating(false);

    if (error || !data?.success) {
      if (data?.creditError) {
        toast.error(`Not enough credits. This costs 3 credits.`);
      } else {
        toast.error('Generation failed. Please try again.');
      }
      return;
    }

    const generated = data.content as WaitlistContent;
    setContent(generated);

    // Auto-save as draft
    const payload = {
      user_id: user.id,
      product_name: productName.trim(),
      title: generated.headline,
      value_proposition: generated.subheadline,
      cta_label: generated.ctaText,
      ai_content: generated,
      status: 'draft',
    };

    const query = draftId
      ? supabase.from(WAITLIST_TABLE).update(payload).eq('id', draftId).select('id').single()
      : supabase.from(WAITLIST_TABLE).insert(payload).select('id').single();

    const { data: saved } = await query;
    if (saved && !draftId) setDraftId((saved as { id: string }).id);

    setPhase('preview');
    toast.success('Page generated! Edit any text by clicking on it.');
  };

  const handleContentChange = useCallback((field: string, value: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      if (field.startsWith('benefit_')) {
        const idx = parseInt(field.split('_')[1], 10);
        const benefits = [...prev.benefits] as [string, string, string];
        benefits[idx] = value;
        return { ...prev, benefits };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const handlePublish = async () => {
    if (!user || !content) return;

    setIsPublishing(true);
    const slug = generateSlug(productName);

    const payload = {
      user_id: user.id,
      product_name: productName.trim(),
      title: content.headline,
      value_proposition: content.subheadline,
      cta_label: content.ctaText,
      ai_content: content,
      slug,
      status: 'published',
      published_at: new Date().toISOString(),
    };

    const query = draftId
      ? supabase.from(WAITLIST_TABLE).update(payload).eq('id', draftId).select('id').single()
      : supabase.from(WAITLIST_TABLE).insert(payload).select('id').single();

    const { data, error } = await query;

    setIsPublishing(false);

    if (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish. Please try again.');
      return;
    }

    const pageId = draftId || (data as { id: string })?.id;
    if (!draftId && data) setDraftId((data as { id: string }).id);

    const page: PublishedPage = { id: pageId!, slug, product_name: productName.trim(), ai_content: content };
    setPublishedPage(page);
    setPhase('published');
    setSignupCount(0);

    await refreshProgress();
    toast.success('Waitlist is live!');
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  // ─────────────────────── INPUT PHASE ───────────────────────
  if (phase === 'input') {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Your Waitlist Page
          </CardTitle>
          <CardDescription>
            Fill in 3 quick fields — AI builds your landing page copy instantly. Costs 3 credits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wl-name">Product name</Label>
            <Input
              id="wl-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. LaunchDesk"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wl-pitch">One-line pitch</Label>
            <Input
              id="wl-pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="What it does for whom — e.g. 'Helps solo founders close enterprise deals without a sales team'"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wl-audience">Target audience <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="wl-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. B2B SaaS founders pre-seed"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !productName.trim() || !pitch.trim()}
            className="w-full sm:w-auto"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating your page…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate My Page (3 credits)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────── PREVIEW PHASE ───────────────────────
  if (phase === 'preview' && content) {
    return (
      <div className="space-y-4">
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Preview — click any text to edit it</p>
                <p className="text-xs text-muted-foreground">Your page looks exactly like this when published</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setContent(null); setPhase('input'); }}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Regenerate
                </Button>
                <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Publishing…</>
                  ) : (
                    <><Globe className="w-4 h-4 mr-1" /> Publish Waitlist</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl overflow-hidden border border-border shadow-lg">
          <WaitlistPageTemplate
            content={content}
            productName={productName}
            mode="preview"
            onContentChange={handleContentChange}
          />
        </div>
      </div>
    );
  }

  // ─────────────────────── PUBLISHED PHASE ───────────────────────
  if (phase === 'published' && publishedPage) {
    const liveUrl = `${BASE_URL}/w/${publishedPage.slug}`;

    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-900">Your waitlist is live!</p>
                <p className="text-sm text-green-700 mt-0.5">Share this link with your audience to start collecting signups.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 truncate flex-1">{liveUrl}</span>
              <button
                onClick={() => copyUrl(liveUrl)}
                className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 transition-colors"
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4 mr-1" /> View page
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPhase('preview');
                }}
              >
                Edit page
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setContent(null);
                  setDraftId(null);
                  setPublishedPage(null);
                  setProductName('');
                  setPitch('');
                  setAudience('');
                  setPhase('input');
                }}
              >
                Create new page
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-indigo-700">{signupCount}</p>
                <p className="text-sm text-muted-foreground">
                  {signupCount === 1 ? 'person has' : 'people have'} signed up
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => publishedPage && fetchSignupCount(publishedPage.id)}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview (read-only) */}
        {content && (
          <div className="rounded-xl overflow-hidden border border-border shadow-lg">
            <WaitlistPageTemplate
              content={content}
              productName={publishedPage.product_name}
              mode="preview"
              onContentChange={handleContentChange}
              signupCount={signupCount}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
