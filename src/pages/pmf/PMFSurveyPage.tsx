import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PublicSurvey {
  id: string;
  slug: string;
  product_name: string | null;
  audience: string | null;
  intro: string | null;
}

const SESSION_KEY = 'pmf_survey_session_id';
function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const ANSWERS = [
  { value: 'very', label: 'Very disappointed' },
  { value: 'somewhat', label: 'Somewhat disappointed' },
  { value: 'not', label: 'Not disappointed' },
];

export default function PMFSurveyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  const [answer, setAnswer] = useState('');
  const [mainBenefit, setMainBenefit] = useState('');
  const [wouldUseInstead, setWouldUseInstead] = useState('');
  const [role, setRole] = useState('');
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from('pmf_surveys' as never)
        .select('id, slug, product_name, audience, intro')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setState('missing');
        return;
      }
      setSurvey(data as unknown as PublicSurvey);
      setState('ready');
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const productName = survey?.product_name?.trim() || 'this product';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!survey || !answer) {
      toast.error('Please choose how you would feel.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('pmf-survey-respond', {
        body: {
          slug: survey.slug,
          seanEllisAnswer: answer,
          mainBenefit,
          wouldUseInstead,
          role,
          feedback,
          email: email || undefined,
          honeypot,
          sessionId: getSessionId(),
        },
      });
      if (error || !data?.success) {
        toast.error('Could not submit your response. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Survey not found</h1>
          <p className="text-sm text-muted-foreground">This survey link is invalid or no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-12">
      <SEO title={`Quick feedback on ${productName}`} description="Share 60 seconds of feedback." url={`/pmf-survey/${slug}`} noindex />
      <div className="mx-auto w-full max-w-xl">
        {submitted ? (
          <div className="rounded-3xl border border-border/60 bg-background/90 p-8 text-center shadow-sm space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h1 className="text-xl font-semibold text-foreground">Thank you!</h1>
            <p className="text-sm text-muted-foreground">
              Your feedback helps shape {productName}. We really appreciate it.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-3xl border border-border/60 bg-background/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">Quick feedback on {productName}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {survey?.intro?.trim() || 'A few quick questions — takes under a minute. Your answers are anonymous.'}
              </p>
            </div>

            {/* Sean Ellis question */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                How would you feel if you could no longer use {productName}?
              </Label>
              <div className="space-y-2">
                {ANSWERS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswer(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      answer === opt.value
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border/60 bg-background hover:border-primary/40',
                    )}
                  >
                    <span className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      answer === opt.value ? 'border-primary' : 'border-muted-foreground/40',
                    )}>
                      {answer === opt.value && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="benefit" className="text-xs">What's the main benefit you get from it?</Label>
              <Textarea id="benefit" value={mainBenefit} onChange={(e) => setMainBenefit(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instead" className="text-xs">What would you use instead if it went away?</Label>
              <Input id="instead" value={wouldUseInstead} onChange={(e) => setWouldUseInstead(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="feedback" className="text-xs">Anything else you'd change or want?</Label>
              <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs">Your role (optional)</Label>
                <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. freelance designer" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email (optional, for updates)</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
            </div>

            {/* Honeypot — hidden from humans */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
              <label>
                Leave this field empty
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !answer}>
              {submitting ? 'Submitting…' : 'Submit feedback'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
