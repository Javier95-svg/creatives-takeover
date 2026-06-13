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
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';

const MVP_ARTIFACTS_TABLE = 'mvp_builder_artifacts' as any;

interface MvpArtifact {
  id: string;
  scope_title: string;
  scope_summary: string;
  status: 'draft' | 'saved';
  saved_at: string | null;
  updated_at: string;
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

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export default function MVPBuilderBetaPage() {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { refreshProgress, stageState } = useBizMapProgress();

  const mvpAccess = checkFeatureAccess('mvp_builder');

  // Gate access for unauthenticated or insufficient-tier users
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 px-6">
            <h2 className="text-2xl font-bold">Sign in to access MVP Builder</h2>
            <p className="text-muted-foreground">Create an account to scope and save your MVP.</p>
            <Button asChild><Link to="/signup?source=mvp-scope&return=/mvp-scope">Get Started</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!mvpAccess.isLoading && !mvpAccess.hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 px-6">
            <h2 className="text-2xl font-bold">MVP Builder requires Rising or higher</h2>
            <p className="text-muted-foreground">{mvpAccess.message || 'Upgrade to access this tool.'}</p>
            <Button onClick={() => openUpgradePrompt({ reason: 'feature', featureName: 'MVP Builder', requiredTier: 'rising' })}>
              Upgrade Plan
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [artifactStatus, setArtifactStatus] = useState<'draft' | 'saved' | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
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
      if (!user) {
        setArtifactId(null);
        setArtifactStatus(null);
        setLastSavedAt(null);
        setForm({
          scopeTitle: '',
          scopeSummary: '',
          mustHaveFeatures: '',
          outOfScope: '',
          deliveryTimeline: '',
        });
        return;
      }

      setIsLoadingArtifact(true);

      const { data, error } = await supabase
        .from(MVP_ARTIFACTS_TABLE)
        .select('id, scope_title, scope_summary, status, saved_at, updated_at, spec_json')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to load MVP artifact:', error);
        toast.error('Unable to load your last MVP scope right now.');
        setIsLoadingArtifact(false);
        return;
      }

      if (data) {
        const artifact = data as MvpArtifact;
        setArtifactId(artifact.id);
        setArtifactStatus(artifact.status);
        setLastSavedAt(artifact.saved_at ?? artifact.updated_at ?? null);
        setForm({
          scopeTitle: artifact.scope_title,
          scopeSummary: artifact.scope_summary,
          mustHaveFeatures: (artifact.spec_json?.mustHaveFeatures || []).join('\n'),
          outOfScope: (artifact.spec_json?.outOfScope || []).join('\n'),
          deliveryTimeline: artifact.spec_json?.deliveryTimeline || '',
        });
      }

      setIsLoadingArtifact(false);
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
    setArtifactStatus(status);
    setLastSavedAt(payload.saved_at ?? new Date().toISOString());

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

  const stageIvComplete = stageState.BUILDING.completed;
  const lastSavedLabel = formatDateTime(lastSavedAt);
  const formDisabled = !user || isLoadingArtifact || isSaving;

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

          <Card className="border-border/60 bg-muted/20">
            <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={stageIvComplete ? 'default' : 'secondary'}>
                    {stageIvComplete ? 'Stage IV complete' : 'Stage IV in progress'}
                  </Badge>
                  <Badge variant="outline">
                    {artifactStatus === 'saved' ? 'MVP spec saved' : artifactStatus === 'draft' ? 'Draft only' : 'No MVP scope saved yet'}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Save your MVP scope here, then save your Tech Stack selection to complete Stage IV.
                  </p>
                  {lastSavedLabel && <p>Last saved: {lastSavedLabel}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!user && (
                  <>
                    <Button asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/signup">Create Account</Link>
                    </Button>
                  </>
                )}
                <Button asChild variant="outline">
                  <Link to="/tech-stack">
                    Open Tech Stack
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Scope Spec</CardTitle>
              <CardDescription>
                Completion criteria: saved scope/spec + saved Tech Stack selection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingArtifact ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your latest MVP scope...
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {artifactStatus === 'saved' ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <CircleDashed className="h-4 w-4" />
                  )}
                  <span>
                    {artifactStatus === 'saved'
                      ? 'This MVP scope is saved and counts toward Stage IV.'
                      : artifactStatus === 'draft'
                        ? 'You have a draft. Save the MVP spec when it is ready to count toward Stage IV.'
                        : 'No MVP scope has been saved yet.'}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="scope-title">Scope title</Label>
                <Input
                  id="scope-title"
                  value={form.scopeTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, scopeTitle: event.target.value }))}
                  placeholder="Example: MVP for creator invoicing workflow"
                  disabled={formDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-summary">Scope summary</Label>
                <Textarea
                  id="scope-summary"
                  value={form.scopeSummary}
                  onChange={(event) => setForm((prev) => ({ ...prev, scopeSummary: event.target.value }))}
                  placeholder="What this MVP includes, for who, and the expected business outcome."
                  disabled={formDisabled}
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
                    disabled={formDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="out-of-scope">Out of scope (one per line)</Label>
                  <Textarea
                    id="out-of-scope"
                    value={form.outOfScope}
                    onChange={(event) => setForm((prev) => ({ ...prev, outOfScope: event.target.value }))}
                    placeholder="Advanced admin panel\nComplex integrations"
                    disabled={formDisabled}
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
                  disabled={formDisabled}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => saveArtifact('draft')} disabled={formDisabled}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Draft'
                  )}
                </Button>
                <Button onClick={() => saveArtifact('saved')} disabled={formDisabled}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save MVP Spec'
                  )}
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
