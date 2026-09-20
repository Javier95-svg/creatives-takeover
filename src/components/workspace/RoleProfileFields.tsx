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

export function RoleProfileFields({ userType, value, onChange }: {
  userType: UserType;
  value: RoleProfile;
  onChange: (next: RoleProfile) => void;
}) {
  const fields = storedRoleFields(userType);
  if (fields.length === 0) return null;

  return <div className="space-y-5">
    {fields.map((field) => (
      <div key={field.key} className="space-y-2">
        <Label className="text-sm font-medium">
          {field.label}{field.required && <span className="ml-1 text-muted-foreground">(required)</span>}
        </Label>
        <FieldEditor field={field} value={value[field.key]} onChange={(next) => onChange({ ...value, [field.key]: next })} />
        {field.type === 'tags' && <p className="text-xs text-muted-foreground">Separate with commas.</p>}
      </div>
    ))}
  </div>;
}

export default RoleProfileFields;
