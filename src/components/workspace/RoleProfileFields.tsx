import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { UserType } from '@/lib/accountTypes';
import { optionLabel, storedRoleFields, type RoleField, type RoleProfile } from '@/lib/roleProfileSchema';

/**
 * The editor for whatever a type is asked for, with no opinion about where the
 * draft lives.
 *
 * Shared by the onboarding step, which submits the answers with the
 * application, and the account page, which saves them on their own. One
 * rendering means the two cannot present the same field differently.
 */

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
    return <Input id={id} className="max-w-[10rem]"
      type="number" min={0} max={100}
      value={typeof value === 'number' ? String(value) : ''}
      onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
    />;
  }

  if (field.type === 'select') {
    return <div id={id} role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
      {(field.options ?? []).map((option) => (
        <Button key={option} type="button" size="sm" aria-pressed={value === option} variant={value === option ? 'default' : 'outline'} onClick={() => onChange(option)}>
          {optionLabel(field, option)}
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
          {optionLabel(field, option)}
        </Button>
      ))}
    </div>;
  }

  if (field.type === 'textarea') {
    const text = typeof value === 'string' ? value : '';
    return <div>
      <Textarea id={id} value={text} placeholder={field.placeholder} maxLength={field.maxLength} rows={4} className="resize-none"
        aria-describedby={`${id}-count`} onChange={(event) => onChange(event.target.value)} />
      {field.maxLength ? <p id={`${id}-count`} className="mt-1 text-right text-xs text-muted-foreground">{text.length}/{field.maxLength}</p> : null}
    </div>;
  }

  return <Input id={id} type={field.type === 'url' ? 'url' : 'text'} inputMode={field.type === 'url' ? 'url' : undefined}
    value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} maxLength={field.maxLength}
    onChange={(event) => onChange(event.target.value)} />;
}

export function RoleProfileFields({ userType, value, onChange }: {
  userType: UserType;
  value: RoleProfile;
  onChange: (next: RoleProfile) => void;
}) {
  const prefix = useId();
  const fields = storedRoleFields(userType);
  if (fields.length === 0) return null;

  // Consecutive fields with the same group share one section heading.
  const sections: Array<{ group?: string; fields: RoleField[] }> = [];
  for (const field of fields) {
    const last = sections[sections.length - 1];
    if (last && last.group === field.group) last.fields.push(field);
    else sections.push({ group: field.group, fields: [field] });
  }

  return <div className="space-y-7">
    {sections.map((section, index) => (
      <section key={section.group ?? index} className="space-y-5" aria-labelledby={section.group ? `${prefix}-section-${index}` : undefined}>
        {section.group ? (
          <h3 id={`${prefix}-section-${index}`} className="border-b border-border/70 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {section.group}
          </h3>
        ) : null}
        {section.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label id={`${prefix}-${field.key}-label`} htmlFor={`${prefix}-${field.key}`} className="text-sm font-medium">
              {field.label}{field.required && <span className="ml-1 text-muted-foreground">(required)</span>}
            </Label>
            <FieldEditor id={`${prefix}-${field.key}`} field={field} value={value[field.key]} onChange={(next) => onChange({ ...value, [field.key]: next })} />
            {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
          </div>
        ))}
      </section>
    ))}
  </div>;
}

export default RoleProfileFields;
