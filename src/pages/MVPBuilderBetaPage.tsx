import { useEffect, useState } from 'react';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';

const MVP_ARTIFACTS_TABLE = 'mvp_builder_artifacts' as any;

interface MvpArtifact {
  id: string;
  scope_title: string;
  scope_summary: string;
  spec_json: {
    mustHaveFeatures?: string[];
    outOfScope?: string[];
    deliveryTimeline?: string;
  };
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MVPBuilderBetaPage() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    scopeTitle: '',
    scopeSummary: '',
    mustHaveFeatures: '',
    outOfScope: '',
    deliveryTimeline: '',
  });

  useEffect(() => {
    const loadLatestArtifact = async () => {
      if (!user) return;

      const { data } = await supabase
        .from(MVP_ARTIFACTS_TABLE)
        .select('id, scope_title, scope_summary, spec_json')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const artifact = data as MvpArtifact;
      setArtifactId(artifact.id);
      setForm({
        scopeTitle: artifact.scope_title,
        scopeSummary: artifact.scope_summary,
        mustHaveFeatures: (artifact.spec_json?.mustHaveFeatures || []).join('\n'),
        outOfScope: (artifact.spec_json?.outOfScope || []).join('\n'),
        deliveryTimeline: artifact.spec_json?.deliveryTimeline || '',
      });
    };

    loadLatestArtifact();
  }, [user]);

  const saveArtifact = async (status: 'draft' | 'saved') => {
    if (!user) {
      toast.error('Sign in to save your MVP scope.');
      return;
    }

    if (!form.scopeTitle.trim() || !form.scopeSummary.trim()) {
      toast.error('Add scope title and scope summary first.');
      return;
    }

    setIsSaving(true);

    const payload = {
      user_id: user.id,
      scope_title: form.scopeTitle.trim(),
      scope_summary: form.scopeSummary.trim(),
      spec_json: {
        mustHaveFeatures: splitLines(form.mustHaveFeatures),
        outOfScope: splitLines(form.outOfScope),
        deliveryTimeline: form.deliveryTimeline.trim(),
      },
      status,
      saved_at: status === 'saved' ? new Date().toISOString() : null,
    };

    const query = artifactId
      ? supabase.from(MVP_ARTIFACTS_TABLE).update(payload).eq('id', artifactId).select('id').single()
      : supabase.from(MVP_ARTIFACTS_TABLE).insert(payload).select('id').single();

    const { data, error } = await query;

    if (error) {
      console.error('Failed to save MVP artifact:', error);
      toast.error('Unable to save MVP scope right now.');
      setIsSaving(false);
      return;
    }

    if (!artifactId) {
      setArtifactId((data as { id: string })?.id ?? null);
    }

    if (status === 'saved') {
      toast.success('MVP scope saved. Stage IV completion check updated.');
      await refreshProgress();
    } else {
      toast.success('MVP draft saved.');
    }

    setIsSaving(false);
  };

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'MVP Builder (Beta mode)',
      description: 'Save MVP scope and spec to move through Stage IV of BizMap AI.',
      url: 'https://creatives-takeover.com/mvp-scope',
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'MVP Builder', url: '/mvp-scope' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="MVP Builder (Beta mode) - Creatives Takeover"
        description="Scope your MVP and save your build spec to progress through Stage IV."
        keywords="mvp builder, product scope, build plan"
        url="/mvp-scope"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="space-y-3 text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20">Stage IV: BUILDING</Badge>
            <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">MVP Builder</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Beta mode: save your MVP scope/spec so Stage IV can be completed once Tech Stack is also saved.
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Scope Spec</CardTitle>
              <CardDescription>
                Completion criteria: saved scope/spec + saved Tech Stack selection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scope-title">Scope title</Label>
                <Input
                  id="scope-title"
                  value={form.scopeTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, scopeTitle: event.target.value }))}
                  placeholder="Example: MVP for creator invoicing workflow"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-summary">Scope summary</Label>
                <Textarea
                  id="scope-summary"
                  value={form.scopeSummary}
                  onChange={(event) => setForm((prev) => ({ ...prev, scopeSummary: event.target.value }))}
                  placeholder="What this MVP includes, for who, and the expected business outcome."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="must-have">Must-have features (one per line)</Label>
                  <Textarea
                    id="must-have"
                    value={form.mustHaveFeatures}
                    onChange={(event) => setForm((prev) => ({ ...prev, mustHaveFeatures: event.target.value }))}
                    placeholder="Signup\nCore workflow\nBasic analytics"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="out-of-scope">Out of scope (one per line)</Label>
                  <Textarea
                    id="out-of-scope"
                    value={form.outOfScope}
                    onChange={(event) => setForm((prev) => ({ ...prev, outOfScope: event.target.value }))}
                    placeholder="Advanced admin panel\nComplex integrations"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Delivery timeline</Label>
                <Input
                  id="timeline"
                  value={form.deliveryTimeline}
                  onChange={(event) => setForm((prev) => ({ ...prev, deliveryTimeline: event.target.value }))}
                  placeholder="Example: 3 weeks with 2 engineers"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => saveArtifact('draft')} disabled={isSaving}>
                  Save Draft
                </Button>
                <Button onClick={() => saveArtifact('saved')} disabled={isSaving}>
                  Save MVP Spec
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
