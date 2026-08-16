import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Target } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useFirstCustomerSprint } from '@/hooks/useFirstCustomerSprint';
import { useFirstCustomerSprintApplication } from '@/hooks/useFirstCustomerSprintApplication';
import { trackFirstCustomerSprint } from '@/lib/analytics';
import type {
  FirstCustomerAcquisitionSource,
  FirstCustomerApplicationBlocker,
  FirstCustomerRecentOutreach,
} from '@/types/firstCustomerSprint';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveSource = (params: URLSearchParams): FirstCustomerAcquisitionSource => {
  const source = params.get('source');
  if (source === 'mentor' || source === 'mentor_referral') return 'mentor_referral';
  if (source === 'homepage') return 'homepage';
  if (source === 'current_user') return 'current_user';
  if (source === 'direct') return 'direct';
  return 'other';
};

export default function FirstCustomerSprintApplicationPage() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const sprintApi = useFirstCustomerSprint();
  const applicationApi = useFirstCustomerSprintApplication();
  const viewedRef = useRef(false);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const source = resolveSource(params);
  const mentorId = UUID_PATTERN.test(params.get('mentorId') ?? '') ? params.get('mentorId') : null;
  const referralCode = params.get('ref');
  const [form, setForm] = useState({
    businessModel: 'b2b_saas' as 'b2b_saas' | 'service' | 'other',
    founderOwnsSales: true,
    hasSellableProduct: true,
    customerCount: '0',
    estimatedAnnualCustomerValueUsd: '1000',
    weeklyCapacityHours: '3',
    canNameTenProspects: true,
    recentOutreach: 'last_30_days' as FirstCustomerRecentOutreach,
    primaryBlocker: 'messaging' as FirstCustomerApplicationBlocker,
    productUrl: '',
    productSummary: '',
  });

  useEffect(() => {
    if (!sprintApi.enabled || viewedRef.current) return;
    viewedRef.current = true;
    trackFirstCustomerSprint('first_customer_sprint_application_viewed', { acquisition_source: source });
  }, [source, sprintApi.enabled]);

  useEffect(() => {
    const application = applicationApi.application;
    if (!application || application.status !== 'declined') return;
    setForm({
      businessModel: application.business_model,
      founderOwnsSales: application.founder_owns_sales,
      hasSellableProduct: application.has_sellable_product,
      customerCount: String(application.customer_count),
      estimatedAnnualCustomerValueUsd: String(application.estimated_annual_customer_value_usd),
      weeklyCapacityHours: String(application.weekly_capacity_hours),
      canNameTenProspects: application.can_name_ten_prospects,
      recentOutreach: application.recent_outreach,
      primaryBlocker: application.primary_blocker,
      productUrl: application.product_url ?? '',
      productSummary: application.product_summary,
    });
  }, [applicationApi.application]);

  const submit = async () => {
    if (form.productSummary.trim().length < 10) {
      toast.error('Describe the product and buyer in at least 10 characters.');
      return;
    }
    try {
      const application = await applicationApi.submit({
        businessModel: form.businessModel,
        founderOwnsSales: form.founderOwnsSales,
        hasSellableProduct: form.hasSellableProduct,
        customerCount: Number(form.customerCount),
        estimatedAnnualCustomerValueUsd: Number(form.estimatedAnnualCustomerValueUsd),
        weeklyCapacityHours: Number(form.weeklyCapacityHours),
        canNameTenProspects: form.canNameTenProspects,
        recentOutreach: form.recentOutreach,
        primaryBlocker: form.primaryBlocker,
        productUrl: form.productUrl,
        productSummary: form.productSummary,
        acquisitionSource: source,
        referringMentorId: mentorId,
        referralCode,
      });
      trackFirstCustomerSprint('first_customer_sprint_application_submitted', {
        application_id: application.id,
        acquisition_source: application.acquisition_source,
        business_model: application.business_model,
        customer_count: application.customer_count,
        qualified: application.qualified,
      });
      toast.success('Application submitted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Application could not be submitted.');
    }
  };

  const returnPath = `${location.pathname}${location.search}`;
  const application = applicationApi.application;
  const loading = authLoading || (Boolean(user) && applicationApi.isLoading);

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Apply for the First Customer Sprint</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <Navigation />
      <main className="container mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-28">
        <header className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
          <Badge variant="outline">Invite-only mixed cohort</Badge>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold">Get to three qualified buyer conversations in 30 days.</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">For B2B SaaS founders with a working product and 0–3 customers. You perform the outreach; Creatives Takeover keeps the target list, messages, evidence, and one GTM mentor decision checkpoint focused.</p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border bg-background/70 p-3"><strong>20</strong><p className="text-muted-foreground">real prospects attached</p></div>
            <div className="rounded-lg border bg-background/70 p-3"><strong>10</strong><p className="text-muted-foreground">messages sent manually</p></div>
            <div className="rounded-lg border bg-background/70 p-3"><strong>3</strong><p className="text-muted-foreground">qualified conversations</p></div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">This is not automated outreach and does not guarantee a sale. It is an execution and evidence system for founders who personally own sales.</p>
        </header>

        {!sprintApi.enabled ? (
          <Card><CardHeader><CardTitle>Applications are currently closed</CardTitle><CardDescription>The pilot remains behind its release switch.</CardDescription></CardHeader></Card>
        ) : loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : !user ? (
          <Card><CardHeader><CardTitle>Apply with a founder account</CardTitle><CardDescription>Signing in connects the application to the founder who will execute the sprint and prevents anonymous submissions.</CardDescription></CardHeader><CardContent><Button asChild><Link to={`/signup?source=first-customer-sprint-application&return=${encodeURIComponent(returnPath)}`}>Create account to apply <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>
        ) : application?.status === 'invited' || sprintApi.enrolled ? (
          <Card className="border-success/30 bg-success/5"><CardHeader><CheckCircle2 className="mb-2 h-7 w-7 text-success" /><CardTitle>Your invitation is ready</CardTitle><CardDescription>Your application was accepted. Define the offer and begin the first 30-day sprint.</CardDescription></CardHeader><CardContent><Button asChild><Link to="/first-customer-sprint">Start the sprint <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>
        ) : application?.status === 'submitted' ? (
          <Card><CardHeader><Target className="mb-2 h-7 w-7 text-primary" /><CardTitle>Application received</CardTitle><CardDescription>We are selecting 8–10 founders across mentor referrals and public applicants. The same qualification rules apply to both groups.</CardDescription></CardHeader><CardContent className="space-y-3"><Badge variant={application.qualified ? 'default' : 'secondary'}>{application.qualified ? 'Core cohort fit' : 'Manual review required'}</Badge>{application.qualification_reasons.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{application.qualification_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}</CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>{application?.status === 'declined' ? 'Update your application' : 'Check the cohort fit'}</CardTitle><CardDescription>Applications are intentionally narrow so the cohort measures one consistent founder-led sales motion.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm"><span>Business model *</span><select className="h-10 w-full rounded-md border bg-background px-3" value={form.businessModel} onChange={(event) => setForm((current) => ({ ...current, businessModel: event.target.value as typeof form.businessModel }))}><option value="b2b_saas">B2B SaaS</option><option value="service">B2B service</option><option value="other">Other</option></select></label>
                <label className="space-y-1 text-sm"><span>Current paying customers *</span><Input type="number" min="0" value={form.customerCount} onChange={(event) => setForm((current) => ({ ...current, customerCount: event.target.value }))} /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm"><span>Expected annual value per customer (USD) *</span><Input type="number" min="1" value={form.estimatedAnnualCustomerValueUsd} onChange={(event) => setForm((current) => ({ ...current, estimatedAnnualCustomerValueUsd: event.target.value }))} /></label>
                <label className="space-y-1 text-sm"><span>Weekly execution capacity *</span><Input type="number" min="0" max="168" value={form.weeklyCapacityHours} onChange={(event) => setForm((current) => ({ ...current, weeklyCapacityHours: event.target.value }))} /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm"><span>Last customer outreach *</span><select className="h-10 w-full rounded-md border bg-background px-3" value={form.recentOutreach} onChange={(event) => setForm((current) => ({ ...current, recentOutreach: event.target.value as FirstCustomerRecentOutreach }))}><option value="last_30_days">Within the last 30 days</option><option value="older">More than 30 days ago</option><option value="never">I have not tried yet</option></select></label>
                <label className="space-y-1 text-sm"><span>Primary blocker *</span><select className="h-10 w-full rounded-md border bg-background px-3" value={form.primaryBlocker} onChange={(event) => setForm((current) => ({ ...current, primaryBlocker: event.target.value as FirstCustomerApplicationBlocker }))}><option value="prospect_list">Building the prospect list</option><option value="messaging">Writing a credible message</option><option value="confidence">Confidence sending it</option><option value="accountability">Staying accountable</option><option value="replies">Getting replies</option><option value="conversion">Converting conversations</option><option value="time">Finding the time</option></select></label>
              </div>
              <label className="block space-y-1 text-sm"><span>Product URL</span><Input type="url" value={form.productUrl} onChange={(event) => setForm((current) => ({ ...current, productUrl: event.target.value }))} placeholder="https://" /></label>
              <label className="block space-y-1 text-sm"><span>What is working today, and who is the buyer? *</span><Textarea className="min-h-28" maxLength={1500} value={form.productSummary} onChange={(event) => setForm((current) => ({ ...current, productSummary: event.target.value }))} /></label>
              <div className="space-y-3 rounded-xl border p-4">
                <label className="flex items-start gap-3 text-sm"><Checkbox checked={form.founderOwnsSales} onCheckedChange={(checked) => setForm((current) => ({ ...current, founderOwnsSales: checked === true }))} /><span>I personally own prospecting and sales decisions.</span></label>
                <label className="flex items-start gap-3 text-sm"><Checkbox checked={form.hasSellableProduct} onCheckedChange={(checked) => setForm((current) => ({ ...current, hasSellableProduct: checked === true }))} /><span>I have a working or demonstrable product that a buyer can evaluate.</span></label>
                <label className="flex items-start gap-3 text-sm"><Checkbox checked={form.canNameTenProspects} onCheckedChange={(checked) => setForm((current) => ({ ...current, canNameTenProspects: checked === true }))} /><span>I can identify at least ten real companies or buyers to contact.</span></label>
              </div>
              <Button size="lg" disabled={applicationApi.isSaving} onClick={submit}>{applicationApi.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{application ? 'Resubmit application' : 'Submit application'}</Button>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
