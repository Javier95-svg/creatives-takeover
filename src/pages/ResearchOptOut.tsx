import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

/** Public page where a company asks to be left out of customer research. */
export default function ResearchOptOut() {
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [trap, setTrap] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('sending');
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('gtm-research-optout', {
      body: { website, email, reason, company_fax: trap },
    });
    if (invokeError || data?.error) {
      let message = data?.error as string | undefined;
      const context = (invokeError as { context?: Response } | null)?.context;
      if (!message && context && typeof context.json === 'function') message = (await context.json().catch(() => null))?.error;
      setError(message ?? 'Something went wrong. Email admin@creatives-takeover.com instead.');
      setState('idle');
      return;
    }
    setState('done');
  };

  return (
    <>
      <Helmet>
        <title>Opt out of customer research | Creatives Takeover</title>
        <meta name="description" content="Ask Creatives Takeover to leave your company out of the customer research founders run on the platform." />
        <link rel="canonical" href="/research-opt-out" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto max-w-2xl px-4 py-24 sm:px-6">
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Opt out of customer research</h1>
          <p className="mt-4 text-muted-foreground">
            Founders on Creatives Takeover can ask our research tool to find companies that might need their product. It reads public pages of those companies and shows the founder why each one might fit. We never contact the companies found; founders decide whether to.
          </p>
          <p className="mt-3 text-muted-foreground">
            Use this form to leave your company out of all future research, for every founder. We also delete any named contact we hold at your company and the copies of your public pages we keep for research.
          </p>

          {state === 'done' ? (
            <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6" role="status">
              <p className="font-semibold text-foreground">Done. Your company is excluded from future research.</p>
              <p className="mt-2 text-sm text-muted-foreground">We'll confirm by email. Questions: admin@creatives-takeover.com.</p>
            </div>
          ) : (
            <form className="mt-8 space-y-5 rounded-2xl border border-border/60 bg-card p-6" onSubmit={(event) => void submit(event)}>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Your company's website</span>
                <Input className="mt-1.5" required inputMode="url" placeholder="yourcompany.com" value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={300} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Your email, to confirm</span>
                <Input className="mt-1.5" required type="email" placeholder="you@yourcompany.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={200} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Anything else (optional)</span>
                <Textarea className="mt-1.5" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
              </label>
              <label className="sr-only" aria-hidden="true">
                Fax
                <input tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
              </label>
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
              <Button type="submit" disabled={state === 'sending'}>
                {state === 'sending' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}Leave my company out
              </Button>
              <p className="text-xs text-muted-foreground">See section 1.5 of our <a href="/privacy-policy" className="underline underline-offset-4">privacy policy</a>.</p>
            </form>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
