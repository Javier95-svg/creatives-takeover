import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { USER_TYPE_LABEL, type UserType } from '@/lib/accountTypes';
import {
  missingRoleFields, sanitizeRoleProfile, storedRoleFields,
  type RoleField, type RoleProfile,
} from '@/lib/roleProfileSchema';

function labelFor(option: string) {
  return option.replace(/_/g, ' ').replace(/^./, (character) => character.toUpperCase());
}

function FieldEditor({ field, value, onChange }: { field: RoleField; value: unknown; onChange: (next: unknown) => void }) {
  if (field.type === 'tags') {
    const tags = Array.isArray(value) ? (value as string[]) : [];
    return <Input
      value={tags.join(', ')}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))}
    />;
  }

  if (field.type === 'number') {
    return <Input
      type="number" min={0} max={100}
      value={typeof value === 'number' ? String(value) : ''}
      onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
    />;
  }

  if (field.type === 'select') {
    return <div className="flex flex-wrap gap-2">
      {(field.options ?? []).map((option) => (
        <Button key={option} type="button" size="sm" variant={value === option ? 'default' : 'outline'} onClick={() => onChange(option)}>
          {labelFor(option)}
        </Button>
      ))}
    </div>;
  }

  if (field.type === 'multi') {
    const picked = Array.isArray(value) ? (value as string[]) : [];
    return <div className="flex flex-wrap gap-2">
      {(field.options ?? []).map((option) => (
        <Button key={option} type="button" size="sm" variant={picked.includes(option) ? 'default' : 'outline'}
          onClick={() => onChange(picked.includes(option) ? picked.filter((item) => item !== option) : [...picked, option])}>
          {labelFor(option)}
        </Button>
      ))}
    </div>;
  }

  return <Input value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />;
}

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
  // The onboarding flow passes the type the person just chose. Reading it from
  // the cached account context there would show founder fields, because that
  // query answered before the application was submitted.
  const userType = userTypeOverride ?? context.userType;
  const { roleProfile, refresh } = context;
  const fields = storedRoleFields(userType);
  const [draft, setDraft] = useState<RoleProfile>({});

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
    onSuccess: () => { toast.success('Saved.'); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save your details.'),
  });

  if (fields.length === 0 || !user) return null;
  const missing = missingRoleFields(userType, draft);

  return <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <UserCog className="h-5 w-5 text-primary" />
        {USER_TYPE_LABEL[userType]} details
        {missing.length > 0 && <Badge variant="outline" className="ml-1">{missing.length} to fill</Badge>}
      </CardTitle>
      <CardDescription>What people see when they find you, and what we match you on.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium">
            {field.label}{field.required && <span className="ml-1 text-muted-foreground">(required)</span>}
          </Label>
          <FieldEditor field={field} value={draft[field.key]} onChange={(next) => setDraft((current) => ({ ...current, [field.key]: next }))} />
          {field.type === 'tags' && <p className="text-xs text-muted-foreground">Separate with commas.</p>}
        </div>
      ))}
      <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
        {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save details
      </Button>
    </CardContent>
  </Card>;
}

export default RoleProfileCard;
