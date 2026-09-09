import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildBuyerInterviewScript } from '@/lib/gtmInterview';
import { toast } from 'sonner';

export default function ConceptRecruitment({ contextId, projectId, audience, problem }: {
  contextId: string; projectId: string | null; audience: string | null; problem: string | null;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  useEffect(() => {
    if (!user) return;
    let active = true;
    setReady(false);
    void (async () => {
      const { data, error } = await (supabase as any).from('prebuild_validation_contexts')
        .select('recruitment_draft').eq('id', contextId).eq('user_id', user.id).single();
      if (error) throw error;
      let url = '';
      if (projectId) {
        const result = await (supabase as any).from('demo_studio_projects').select('slug,launch_published')
          .eq('id', projectId).eq('validation_context_id', contextId).eq('owner_id', user.id).maybeSingle();
        if (result.error) throw result.error;
        if (result.data?.launch_published && result.data.slug) url = `${window.location.origin}/p/${encodeURIComponent(result.data.slug)}`;
      }
      if (!active) return;
      setPageUrl(url);
      setDraft(data.recruitment_draft || `Hi, I'm researching how ${audience || 'people in this role'} deal with ${problem || 'this problem'}. Could I ask about the last time you experienced it? I'm testing a concept, not selling a finished product.${url ? `\n\nIf you would like to review the concept: ${url}` : ''}`);
      setReady(true);
    })().catch(() => { if (active) toast.error('Could not load the saved outreach draft. Reopen this context to retry.'); });
    return () => { active = false; };
  }, [audience, contextId, problem, projectId, user]);
  return <section className="mb-6 space-y-4 rounded-2xl border p-5">
    <h2 className="text-xl font-semibold">Find people to test your concept</h2>
    <p>A prepared study is not a validation result. Start with conversations before scoring demand.</p>
    <ol className="list-decimal space-y-2 pl-5">
      <li>Choose a channel where your target customer already discusses the problem.</li>
      <li>Identify a small set of relevant people and review this message for each person.</li>
      <li>Send invitations yourself. Record actual responses and objections in the interview log.</li>
      <li>Collect at least three independent buyer signals before seeking a Build decision.</li>
    </ol>
    {pageUrl && <a className="underline" href={pageUrl} target="_blank" rel="noreferrer">Review the concept you are testing</a>}
    <label className="block space-y-2"><span>Editable invitation</span><Textarea disabled={!ready} value={draft} onChange={e => setDraft(e.target.value)} /></label>
    <Button disabled={!ready || saving} onClick={async () => {
      if (!user) return;
      setSaving(true);
      try {
        const { error } = await (supabase as any).from('prebuild_validation_contexts')
          .update({ recruitment_draft: draft }).eq('id', contextId).eq('user_id', user.id);
        if (error) throw error;
        toast.success('Invitation saved. Nothing has been sent.');
      } catch { toast.error('Could not save. Your invitation is still here; retry saving.'); }
      finally { setSaving(false); }
    }}>Save invitation</Button>
    <details><summary className="cursor-pointer">Buyer interview guide from GTM</summary><p className="mt-3 whitespace-pre-line">{buildBuyerInterviewScript(problem || 'this problem occurred', 'this concept')}</p></details>
  </section>;
}
