import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Portal = { role: string; mentorName: string; scheduledFor: string | null; durationMinutes: number; submitted: boolean; resolved: boolean };
const choices = [
  ['happened', 'Call happened'],
  ['other_no_show', 'The other person did not join'],
  ['self_no_show', 'I did not join'],
  ['technical_issue', 'Technical problem or other'],
] as const;

export default function DiscoveryCallAttendanceResponsePage() {
  const token = new URLSearchParams(useLocation().search).get('token') ?? '';
  const [portal, setPortal] = useState<Portal | null>(null);
  const [message, setMessage] = useState('');
  const [choice, setChoice] = useState<typeof choices[number][0] | ''>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('discovery-call-attendance-response', { body: { token, ...body } });
    if (error) throw new Error(error.message);
    return data as Record<string, unknown>;
  }, [token]);
  useEffect(() => { void (async () => {
    try {
      const result = await invoke({ action: 'load' });
      if (!result.success) throw new Error(result.errorCode === 'TOKEN_EXPIRED' ? 'This confirmation link has expired.' : 'This confirmation link is invalid.');
      setPortal(result.confirmation as Portal);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to open this confirmation link.'); }
    finally { setLoading(false); }
  })(); }, [invoke]);
  const submit = async () => {
    if (!choice) return;
    setSubmitting(true); setMessage('');
    try {
      const result = await invoke({ action: 'submit', response: choice });
      if (!result.success) throw new Error('Your response could not be saved.');
      setMessage(result.manualReview ? 'Thanks. The responses need an admin review.' : result.resolved ? 'Thanks. The call outcome has been resolved.' : 'Thanks. We will ask the other participant to confirm too.');
      setPortal((current) => current ? { ...current, submitted: true } : current);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save your response.'); }
    finally { setSubmitting(false); }
  };
  return <><Helmet><title>Confirm Discovery Call | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet><Navigation /><main className="container mx-auto min-h-screen max-w-2xl px-4 pb-16 pt-header-offset">
    <Card><CardHeader><CardTitle>Confirm what happened</CardTitle></CardHeader><CardContent className="space-y-5">
      {loading ? <Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertDescription>Opening secure confirmation…</AlertDescription></Alert> : message && !portal ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : portal && <>
        <p className="text-muted-foreground">Please confirm the Discovery Call with {portal.mentorName}{portal.scheduledFor ? ` scheduled for ${new Date(portal.scheduledFor).toLocaleString()}` : ''}. This link only records your response; it does not change the outcome when opened.</p>
        {portal.submitted || portal.resolved ? <Alert><AlertDescription>{message || 'Your response has already been recorded.'}</AlertDescription></Alert> : <div className="space-y-3">{choices.map(([value, label]) => <label key={value} className="flex cursor-pointer gap-3 rounded-lg border p-3"><input type="radio" name="attendance" value={value} checked={choice === value} onChange={() => setChoice(value)} /><span>{label}</span></label>)}<Button disabled={!choice || submitting} onClick={() => void submit()}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit confirmation</Button>{message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}</div>}
      </>}
    </CardContent></Card>
  </main><Footer /></>;
}
