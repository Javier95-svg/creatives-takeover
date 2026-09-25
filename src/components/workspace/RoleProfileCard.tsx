import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { USER_TYPE_LABEL, type UserType } from '@/lib/accountTypes';
import { INVESTMENT_STAGES, missingRoleFields, sanitizeRoleProfile, storedRoleFields, type RoleProfile } from '@/lib/roleProfileSchema';
import { RoleProfileFields } from './RoleProfileFields';
import { trackRetentionEvent } from '@/lib/retentionSystem';
import { submitAccountApplication } from '@/lib/accountApplications';

/**
 * The fields this account type is asked for, and nothing another type is asked
 * for.
 *
 * Founders and builders render nothing here: what they are asked for is a
 * project, which the workspace already collects through ProjectSetupGate.
 */
export function RoleProfileCard({ userTypeOverride }: { userTypeOverride?: UserType } = {}) {
  const { user } = useAuth();
  const context = useAccountContext();
  const userType = userTypeOverride ?? context.userType;
  const { roleProfile, refresh } = context;
  const fields = storedRoleFields(userType);
  const [draft, setDraft] = useState<RoleProfile>({});
  const [visible, setVisible] = useState(false);
  const [fundingStage, setFundingStage] = useState('');
  useEffect(() => { setVisible(context.investorMatchVisible); setFundingStage(context.investmentStage ?? ''); }, [context.investorMatchVisible, context.investmentStage]);
  const visibilitySave = useMutation({
    mutationFn: async () => {
      if (visible && !fundingStage) throw new Error('Choose your funding stage.');
      const { error } = await supabase.from('profiles').update({ investor_match_visible: visible, investment_stage: fundingStage || null } as never).eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Investor visibility saved.'); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save visibility.'),
  });
  const resubmit = useMutation({
    mutationFn: async () => {
      if (userType !== 'mentor' && userType !== 'marketplace' && userType !== 'investor') return;
      await submitAccountApplication({ roleProfile: sanitizeRoleProfile(userType,draft), fullName: user?.user_metadata?.full_name });
    },
    onSuccess: () => { toast.success('Request sent for review.'); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not submit request.'),
  });

  // The saved answers arrive with the account context, one query later than the
  // first render, so the draft follows them until the person edits it.
  const saved = useMemo(() => roleProfile ?? {}, [roleProfile]);
  useEffect(() => { setDraft(saved); }, [saved]);

  const save = useMutation({
    mutationFn: async (next: RoleProfile) => {
      const clean = sanitizeRoleProfile(userType, next);
      // role_profile is newer than the generated types, so the update payload
      // is widened rather than the whole client being untyped.
      const { error } = await supabase.schema('public').from('profiles')
        .update({ role_profile: clean } as never).eq('id', user!.id);
      if (error) throw error;
      return clean;
    },
    onSuccess: () => { toast.success('Saved.'); void refresh(); void trackRetentionEvent('role_profile_saved', { user_id: user?.id, user_type: userType }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save your details.'),
  });

  if (!user || context.isLoading || context.isError) return null;
  if (fields.length === 0) return <Card><CardHeader><CardTitle>Investor visibility</CardTitle><CardDescription>Choose whether approved investors can find your project summary through matching.</CardDescription></CardHeader><CardContent className="space-y-4">
    <label className="flex gap-2"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Include my project in investor matches</label>
    <label className="block">Funding stage<select className="mt-2 block w-full rounded border bg-background p-2" value={fundingStage} onChange={(event) => setFundingStage(event.target.value)}><option value="">Choose a funding stage</option>{INVESTMENT_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
    <Button disabled={visibilitySave.isPending} onClick={() => visibilitySave.mutate()}>Save visibility</Button>
  </CardContent></Card>;
  const missing = missingRoleFields(userType, draft);

  return <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <UserCog className="h-5 w-5 text-primary" />
        {USER_TYPE_LABEL[userType]} details
        {missing.length > 0 && <Badge variant="outline" className="ml-1">{missing.length} to fill</Badge>}
      </CardTitle>
      <CardDescription>Complete these details progressively. Pending applications retain the answers originally submitted for review.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <RoleProfileFields userType={userType} value={draft} onChange={setDraft} />
      <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
        {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save details
      </Button>
      {context.approvalStatus === 'rejected' && <Button disabled={resubmit.isPending || missing.length > 0} onClick={() => resubmit.mutate()}>Submit updated request</Button>}
    </CardContent>
  </Card>;
}

export default RoleProfileCard;
