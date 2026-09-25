import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserType } from '@/lib/accountTypes';
import { storedRoleFields, type RoleField, type RoleProfile } from '@/lib/roleProfileSchema';

/**
 * The editor for whatever a type is asked for, with no opinion about where the
 * draft lives.
 *
 * Shared by the onboarding step, which submits the answers with the
 * application, and the account page, which saves them on their own. One
 * rendering means the two cannot present the same field differently.
 */

function labelFor(option: string) {
  return option.replace(/_/g, ' ').replace(/^./, (character) => character.toUpperCase());
}

function TagsInput({ id, field, value, onChange }: { id: string; field: RoleField; value: unknown; onChange: (next: unknown) => void }) {
  const canonical = Array.isArray(value) ? (value as string[]).join(', ') : '';
  const [text, setText] = useState(canonical);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(canonical); }, [canonical, focused]);
  return <Input id={id} value={text} placeholder={field.placeholder} maxLength={1200}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onChange={(event) => {
      setText(event.target.value);
      onChange(event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean));
    }} />;
}

function FieldEditor({ id, field, value, onChange }: { id: string; field: RoleField; value: unknown; onChange: (next: unknown) => void }) {
  if (field.type === 'tags') {
    return <TagsInput id={id} field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'number') {
    return <Input id={id}
      type="number" min={0} max={100}
      value={typeof value === 'number' ? String(value) : ''}
      onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
    />;
  }

  if (field.type === 'select') {
    return <div id={id} role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
      {(field.options ?? []).map((option) => (
        <Button key={option} type="button" size="sm" aria-pressed={value === option} variant={value === option ? 'default' : 'outline'} onClick={() => onChange(option)}>
          {labelFor(option)}
        </Button>
      ))}
    </div>;
  }

  if (field.type === 'multi') {
    const picked = Array.isArray(value) ? (value as string[]) : [];
    return <div id={id} role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
      {(field.options ?? []).map((option) => (
        <Button key={option} type="button" size="sm" aria-pressed={picked.includes(option)} variant={picked.includes(option) ? 'default' : 'outline'}
          onClick={() => onChange(picked.includes(option) ? picked.filter((item) => item !== option) : [...picked, option])}>
          {labelFor(option)}
        </Button>
      ))}
    </div>;
  }

  return <Input id={id} value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />;
}

export function RoleProfileFields({ userType, value, onChange }: {
  userType: UserType;
  value: RoleProfile;
  onChange: (next: RoleProfile) => void;
}) {
  const prefix = useId();
  const fields = storedRoleFields(userType);
  if (fields.length === 0) return null;

  return <div className="space-y-5">
    {fields.map((field) => (
      <div key={field.key} className="space-y-2">
        <Label id={`${prefix}-${field.key}-label`} htmlFor={`${prefix}-${field.key}`} className="text-sm font-medium">
          {field.label}{field.required && <span className="ml-1 text-muted-foreground">(required)</span>}
        </Label>
        <FieldEditor id={`${prefix}-${field.key}`} field={field} value={value[field.key]} onChange={(next) => onChange({ ...value, [field.key]: next })} />
        {field.type === 'tags' && <p className="text-xs text-muted-foreground">Separate with commas.</p>}
      </div>
    ))}
  </div>;
}

export default RoleProfileFields;
