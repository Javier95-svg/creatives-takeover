import { useEffect, useState } from 'react';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';

const WAITLIST_TABLE = 'waitlist_pages' as any;

interface WaitlistDraft {
  id: string;
  title: string;
  value_proposition: string;
  target_audience: string | null;
  cta_label: string;
  published_url: string | null;
  status: 'draft' | 'published' | 'exported';
}

export default function WaitlistMakerPage() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    valueProposition: '',
    targetAudience: '',
    ctaLabel: 'Join the waitlist',
    publishedUrl: '',
  });

  useEffect(() => {
    const loadLatestDraft = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from(WAITLIST_TABLE)
        .select('id, title, value_proposition, target_audience, cta_label, published_url, status')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      const draft = data as WaitlistDraft;
      setDraftId(draft.id);
      setForm({
        title: draft.title,
        valueProposition: draft.value_proposition,
        targetAudience: draft.target_audience ?? '',
        ctaLabel: draft.cta_label,
        publishedUrl: draft.published_url ?? '',
      });
    };

    loadLatestDraft();
  }, [user]);

  const saveDraft = async (status: 'draft' | 'published' | 'exported') => {
    if (!user) {
      toast.error('Sign in to save your waitlist draft.');
      return;
    }

    if (!form.title.trim() || !form.valueProposition.trim()) {
      toast.error('Add a title and value proposition first.');
      return;
    }

    setIsSaving(true);

    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      value_proposition: form.valueProposition.trim(),
      target_audience: form.targetAudience.trim() || null,
      cta_label: form.ctaLabel.trim() || 'Join the waitlist',
      published_url: form.publishedUrl.trim() || null,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      exported_at: status === 'exported' ? new Date().toISOString() : null,
    };

    const query = draftId
      ? supabase.from(WAITLIST_TABLE).update(payload).eq('id', draftId).select('id').single()
      : supabase.from(WAITLIST_TABLE).insert(payload).select('id').single();

    const { data, error } = await query;

    if (error) {
      console.error('Failed to save waitlist draft:', error);
      toast.error('Unable to save waitlist draft right now.');
      setIsSaving(false);
      return;
    }

    if (!draftId) {
      setDraftId((data as { id: string })?.id ?? null);
    }

    if (status === 'draft') {
      toast.success('Waitlist draft saved.');
    } else if (status === 'published') {
      toast.success('Waitlist published. Stage II completion updated.');
      await refreshProgress();
    } else {
      toast.success('Waitlist exported. Stage II completion updated.');
      await refreshProgress();
    }

    setIsSaving(false);
  };

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Waitlist Maker',
      description: 'Create and publish your waitlist page to validate demand before building.',
      url: 'https://creatives-takeover.com/waitlist',
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'Waitlist Maker', url: '/waitlist' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Waitlist Maker - Creatives Takeover"
        description="Build your Stage II waitlist page and capture demand signals before development."
        keywords="waitlist page, demand validation, startup prototype"
        url="/waitlist"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="space-y-3 text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20">Stage II: PROTOTYPE</Badge>
            <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">Waitlist Maker</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Build a lightweight landing page proposition and publish it to collect intent before writing production code.
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Waitlist Page Draft</CardTitle>
              <CardDescription>
                Publishing or exporting this draft marks Stage II as complete and unlocks Stage III.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waitlist-title">Page title</Label>
                <Input
                  id="waitlist-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Example: Join the early access waitlist"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-value">Value proposition</Label>
                <Textarea
                  id="waitlist-value"
                  value={form.valueProposition}
                  onChange={(event) => setForm((prev) => ({ ...prev, valueProposition: event.target.value }))}
                  placeholder="Who is this for and what outcome do they get?"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="waitlist-audience">Target audience</Label>
                  <Input
                    id="waitlist-audience"
                    value={form.targetAudience}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetAudience: event.target.value }))}
                    placeholder="Example: B2B founders pre-seed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-cta">CTA label</Label>
                  <Input
                    id="waitlist-cta"
                    value={form.ctaLabel}
                    onChange={(event) => setForm((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                    placeholder="Join the waitlist"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlist-url">Published URL (optional)</Label>
                <Input
                  id="waitlist-url"
                  value={form.publishedUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, publishedUrl: event.target.value }))}
                  placeholder="https://your-waitlist-url.com"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => saveDraft('draft')} disabled={isSaving}>
                  Save Draft
                </Button>
                <Button onClick={() => saveDraft('published')} disabled={isSaving}>
                  Publish Waitlist
                </Button>
                <Button variant="secondary" onClick={() => saveDraft('exported')} disabled={isSaving}>
                  Export Waitlist Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
