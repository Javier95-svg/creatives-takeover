import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import DirectoriesTab from '@/components/launch/DirectoriesTab';

const GTM_TABLE = 'gtm_plans' as any;

interface GTMPlan {
  id: string;
  plan_title: string;
  plan_content: {
    channels?: string[];
    launchChecklist?: string[];
    metrics?: string[];
  };
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function GTMStrategistPage() {
  const { user } = useAuth();
  const { refreshProgress } = useBizMapProgress();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'gtm' | 'directories'>(
    searchParams.get('tab') === 'directories' ? 'directories' : 'gtm'
  );
  const [planId, setPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    channels: '',
    launchChecklist: '',
    metrics: '',
  });

  useEffect(() => {
    const loadPlan = async () => {
      if (!user) return;

      const { data } = await supabase
        .from(GTM_TABLE)
        .select('id, plan_title, plan_content')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const plan = data as GTMPlan;
      setPlanId(plan.id);
      setForm({
        title: plan.plan_title,
        channels: (plan.plan_content?.channels || []).join('\n'),
        launchChecklist: (plan.plan_content?.launchChecklist || []).join('\n'),
        metrics: (plan.plan_content?.metrics || []).join('\n'),
      });
    };

    loadPlan();
  }, [user]);

  const savePlan = async (status: 'draft' | 'saved' | 'exported') => {
    if (!user) {
      toast.error('Sign in to save your GTM plan.');
      return;
    }

    if (!form.title.trim()) {
      toast.error('Add a plan title first.');
      return;
    }

    setIsSaving(true);

    const payload = {
      user_id: user.id,
      plan_title: form.title.trim(),
      plan_content: {
        channels: splitLines(form.channels),
        launchChecklist: splitLines(form.launchChecklist),
        metrics: splitLines(form.metrics),
      },
      status,
      saved_at: status === 'saved' || status === 'exported' ? new Date().toISOString() : null,
      exported_at: status === 'exported' ? new Date().toISOString() : null,
    };

    const query = planId
      ? supabase.from(GTM_TABLE).update(payload).eq('id', planId).select('id').single()
      : supabase.from(GTM_TABLE).insert(payload).select('id').single();

    const { data, error } = await query;

    if (error) {
      console.error('Failed to save GTM plan:', error);
      toast.error('Unable to save GTM plan right now.');
      setIsSaving(false);
      return;
    }

    if (!planId) {
      setPlanId((data as { id: string })?.id ?? null);
    }

    if (status === 'draft') {
      toast.success('GTM draft saved.');
    } else if (status === 'saved') {
      toast.success('GTM plan saved.');
      await refreshProgress();
    } else {
      toast.success('GTM plan exported. Stage V marked complete.');
      await refreshProgress();
    }

    setIsSaving(false);
  };

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'GTM Strategist',
      description: 'Build and save your go-to-market plan to complete Stage V.',
      url: 'https://creatives-takeover.com/go-to-market',
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'GTM Strategist', url: '/go-to-market' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="GTM Strategist - Creatives Takeover"
        description="Define channels, launch checklist, and KPIs in one save/exportable GTM plan."
        keywords="go to market, gtm strategy, launch checklist"
        url="/go-to-market"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-5xl space-y-6">
          {/* Page header */}
          <div className="space-y-3 text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20">Stage V: LAUNCH</Badge>
            <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">Launch Tools</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Build your go-to-market plan and discover the best platforms to promote your launch.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'gtm' | 'directories')}>
            <TabsList className="w-full grid grid-cols-2 max-w-sm mx-auto">
              <TabsTrigger value="gtm">GTM Strategist</TabsTrigger>
              <TabsTrigger value="directories">Directories</TabsTrigger>
            </TabsList>

            {/* ── GTM Strategist tab ── */}
            <TabsContent value="gtm" className="mt-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>Go-to-Market Plan</CardTitle>
                  <CardDescription>
                    Define channels, launch checklist, and metrics. Saving or exporting marks Stage V complete.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gtm-title">Plan title</Label>
                    <Input
                      id="gtm-title"
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Example: Q2 launch plan for B2B waitlist conversion"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="gtm-channels">Channels (one per line)</Label>
                      <Textarea
                        id="gtm-channels"
                        value={form.channels}
                        onChange={(event) => setForm((prev) => ({ ...prev, channels: event.target.value }))}
                        placeholder="LinkedIn outreach&#10;Founder communities&#10;Email waitlist"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gtm-checklist">Launch checklist (one per line)</Label>
                      <Textarea
                        id="gtm-checklist"
                        value={form.launchChecklist}
                        onChange={(event) => setForm((prev) => ({ ...prev, launchChecklist: event.target.value }))}
                        placeholder="Finalize landing page&#10;Set onboarding emails&#10;Run beta cohort"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gtm-metrics">Metrics (one per line)</Label>
                      <Textarea
                        id="gtm-metrics"
                        value={form.metrics}
                        onChange={(event) => setForm((prev) => ({ ...prev, metrics: event.target.value }))}
                        placeholder="Waitlist conversion rate&#10;CAC&#10;Week-1 activation"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => savePlan('draft')} disabled={isSaving}>
                      Save Draft
                    </Button>
                    <Button onClick={() => savePlan('saved')} disabled={isSaving}>
                      Save GTM Plan
                    </Button>
                    <Button variant="secondary" onClick={() => savePlan('exported')} disabled={isSaving}>
                      Save & Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Directories tab ── */}
            <TabsContent value="directories" className="mt-6">
              <DirectoriesTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
