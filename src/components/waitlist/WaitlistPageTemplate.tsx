import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  WAITLIST_SECTION_ORDER,
  WaitlistContent,
  WaitlistSignupPayload,
  WaitlistCustomField,
  WaitlistSectionId,
  getAccentHex,
  normalizeWaitlistContent,
  type WaitlistVariant,
} from '@/lib/waitlist';
import { SortableList } from '@/components/ui/sortable-list';
import { getWaitlistTemplateRenderConfig } from '@/lib/waitlistTemplateRender';

export type { WaitlistContent } from '@/lib/waitlist';
export type SignupData = WaitlistSignupPayload;

interface WaitlistFormState {
  email: string;
  firstName: string;
  consent: boolean;
  honeypot: string;
  fieldValues: Record<string, string>;
  submitted: boolean;
  duplicate: boolean;
  errorMessage: string;
  loading: boolean;
  resolvedReferralMessage: string;
}

interface WaitlistPageTemplateProps {
  content: WaitlistContent;
  productName: string;
  mode: 'preview' | 'public';
  onContentChange?: (field: string, value: string) => void;
  onEmailSubmit?: (data: SignupData) => Promise<{ ok: boolean; duplicate?: boolean; referralMessage?: string }>;
  signupCount?: number;
  publicUrl?: string;
  activeVariant?: WaitlistVariant;
  onImageUpload?: (file: File) => Promise<void> | void;
  onSectionOrderChange?: (order: WaitlistSectionId[]) => void;
}

function EditableField({
  value,
  onChange,
  multiline = false,
  className = '',
  placeholder = '',
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const commit = () => {
    setEditing(false);
    const normalized = draft.trim();
    if (normalized) {
      onChange(normalized);
    } else {
      setDraft(value);
    }
  };

  if (editing) {
    const sharedProps = {
      ref: inputRef as any,
      value: draft,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !multiline) {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          setEditing(false);
          setDraft(value);
        }
      },
      autoFocus: true,
      className: `w-full rounded border border-white/40 bg-white/10 px-2 py-1 text-inherit outline-none ${className}`,
      placeholder,
    };

    return multiline ? <textarea {...sharedProps} rows={3} /> : <input {...sharedProps} />;
  }

  return (
    <span
      className={`group relative inline-block cursor-text ${className}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Click to edit"
    >
      {value}
      <span className="pointer-events-none absolute -inset-1 rounded border border-dashed border-white/40 opacity-0 transition-opacity group-hover:opacity-100" />
    </span>
  );
}

function EmailForm({
  ctaText,
  emailPlaceholder,
  collectFirstName,
  collectConsent,
  consentRequired,
  customFields,
  successTitle,
  successMessage,
  successShareLabel,
  onSubmit,
  publicUrl,
  activeVariant,
  palette,
  radius,
  instanceId,
  state,
  setState,
}: {
  ctaText: string;
  emailPlaceholder: string;
  collectFirstName?: boolean;
  collectConsent?: boolean;
  consentRequired?: boolean;
  customFields: WaitlistCustomField[];
  successTitle: string;
  successMessage: string;
  successShareLabel: string;
  onSubmit: (data: SignupData) => Promise<{ ok: boolean; duplicate?: boolean; referralMessage?: string }>;
  publicUrl?: string;
  activeVariant?: WaitlistVariant;
  palette: WaitlistContent['colors'];
  radius: number;
  instanceId: string;
  state: WaitlistFormState;
  setState: React.Dispatch<React.SetStateAction<WaitlistFormState>>;
}) {
  const visibleFields = customFields.filter((field) => field.enabled);
  const emailId = `${instanceId}-email`;
  const firstNameId = `${instanceId}-first-name`;
  const consentId = `${instanceId}-consent`;
  const errorId = `${instanceId}-error`;
  const statusId = `${instanceId}-status`;

  const updateField = (field: keyof WaitlistFormState, value: string | boolean) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
      errorMessage: '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState((prev) => ({ ...prev, errorMessage: '' }));

    if (!state.email.trim() || !state.email.includes('@')) {
      setState((prev) => ({ ...prev, errorMessage: 'Enter a valid email address.' }));
      return;
    }

    const requiredField = visibleFields.find((field) => field.required && !state.fieldValues[field.id]?.trim());
    if (requiredField) {
      setState((prev) => ({ ...prev, errorMessage: `Please complete ${requiredField.label}.` }));
      return;
    }

    if (collectConsent && consentRequired && !state.consent) {
      setState((prev) => ({ ...prev, errorMessage: 'Please provide consent to continue.' }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    const result = await onSubmit({
      email: state.email.trim(),
      firstName: collectFirstName ? (state.firstName.trim() || undefined) : undefined,
      consent: collectConsent ? state.consent : undefined,
      honeypot: state.honeypot,
      customFields: visibleFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: state.fieldValues[field.id] || '',
      })),
    });

    if (result.ok) {
      setState((prev) => ({
        ...prev,
        loading: false,
        submitted: true,
        duplicate: Boolean(result.duplicate),
        resolvedReferralMessage: result.referralMessage || prev.resolvedReferralMessage,
        errorMessage: '',
      }));
    } else {
      setState((prev) => ({
        ...prev,
        loading: false,
        errorMessage: 'Could not complete signup. Please try again.',
      }));
    }
  };

  const referralUrl = useMemo(() => {
    if (!publicUrl) return '';
    if (activeVariant) {
      return `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}ref=waitlist-${activeVariant.toLowerCase()}`;
    }
    return `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}ref=waitlist`;
  }, [activeVariant, publicUrl]);

  const inputStyle: CSSProperties = {
    borderColor: `${palette?.borderColor || '#334155'}66`,
    backgroundColor: palette?.inputBackground || '#ffffff',
    color: palette?.inputText || '#111827',
    borderRadius: `${Math.max(radius - 4, 8)}px`,
  };

  const buttonStyle: CSSProperties = {
    backgroundColor: palette?.buttonBackground || '#ffffff',
    color: palette?.buttonText || '#111827',
    borderRadius: `${Math.max(radius - 2, 10)}px`,
  };

  if (state.submitted) {
    return (
      <div
        className="space-y-3 p-5 text-center"
        role="status"
        aria-live="polite"
        id={statusId}
        style={{
          borderRadius: `${radius}px`,
          border: `1px solid ${palette?.borderColor || '#334155'}`,
          backgroundColor: palette?.sectionBackground || 'rgba(15, 23, 42, 0.25)',
        }}
      >
        <p className="text-lg font-semibold" style={{ color: palette?.textPrimary || '#f8fafc' }}>
          {state.duplicate ? 'You are already on the list.' : successTitle}
        </p>
        <p className="text-sm" style={{ color: palette?.textSecondary || '#cbd5e1' }}>
          {state.duplicate ? 'We already have your signup and will keep you updated.' : successMessage}
        </p>
        <p className="text-xs" style={{ color: palette?.textSecondary || '#cbd5e1' }}>{state.resolvedReferralMessage}</p>
        {referralUrl ? (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(referralUrl)}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold"
            style={buttonStyle}
          >
            {successShareLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form className="mx-auto w-full max-w-2xl space-y-3" noValidate onSubmit={handleSubmit} aria-describedby={state.errorMessage ? errorId : undefined}>
      <input
        type="text"
        name="website"
        value={state.honeypot}
        onChange={(event) => updateField('honeypot', event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
      />

      {collectFirstName ? (
        <div className="space-y-1.5 text-left">
          <label htmlFor={firstNameId} className="text-xs font-medium" style={{ color: palette?.textSecondary || '#cbd5e1' }}>
            First name
          </label>
          <input
            id={firstNameId}
            type="text"
            value={state.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
            placeholder="Your first name"
            className="w-full border px-4 py-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      ) : null}

      {visibleFields.map((field) => {
        const fieldId = `${instanceId}-${field.id}`;
        const commonProps = {
          id: fieldId,
          value: state.fieldValues[field.id] || '',
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = event.target.value;
            setState((prev) => ({
              ...prev,
              errorMessage: '',
              fieldValues: { ...prev.fieldValues, [field.id]: value },
            }));
          },
          placeholder: field.placeholder || field.label,
          className: 'w-full border px-4 py-3 text-sm outline-none',
          style: inputStyle,
        };

        return (
          <div key={field.id} className="space-y-1.5 text-left">
            <label htmlFor={fieldId} className="text-xs font-medium" style={{ color: palette?.textSecondary || '#cbd5e1' }}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            {field.type === 'textarea'
              ? <textarea rows={3} {...commonProps} />
              : <input type={field.type === 'url' ? 'url' : 'text'} {...commonProps} />}
          </div>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5 text-left">
          <label htmlFor={emailId} className="text-xs font-medium" style={{ color: palette?.textSecondary || '#cbd5e1' }}>
            Email address
          </label>
          <input
            id={emailId}
            type="email"
            value={state.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder={emailPlaceholder}
            className="w-full border px-4 py-3 text-sm outline-none"
            style={inputStyle}
            aria-invalid={Boolean(state.errorMessage)}
            aria-describedby={state.errorMessage ? errorId : undefined}
          />
        </div>
        <button
          type="submit"
          disabled={state.loading}
          className="px-6 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={buttonStyle}
        >
          {state.loading ? 'Joining...' : ctaText}
        </button>
      </div>

      {collectConsent ? (
        <div className="space-y-1.5 text-left">
          <label htmlFor={consentId} className="flex items-start gap-2 text-xs" style={{ color: palette?.textSecondary || '#cbd5e1' }}>
            <input
              id={consentId}
              type="checkbox"
              checked={state.consent}
              onChange={(event) => updateField('consent', event.target.checked)}
              className="mt-0.5"
            />
            <span>
              I agree to receive updates and product announcements.
              {consentRequired ? ' (Required)' : ' (Optional)'}
            </span>
          </label>
        </div>
      ) : null}

      {state.errorMessage ? (
        <p id={errorId} className="rounded-md border border-red-300/50 bg-red-500/10 px-3 py-2 text-xs text-left text-red-100" role="alert">
          {state.errorMessage}
        </p>
      ) : null}
    </form>
  );
}

const ACCENT_GRADIENTS: Record<string, string> = {
  indigo: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #6366f1 100%)',
  emerald: 'linear-gradient(135deg, #064e3b 0%, #047857 45%, #10b981 100%)',
  rose: 'linear-gradient(135deg, #881337 0%, #be123c 45%, #fb7185 100%)',
  orange: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 45%, #fb923c 100%)',
  sky: 'linear-gradient(135deg, #075985 0%, #0369a1 45%, #38bdf8 100%)',
};

const LIGHT_ACCENT_GRADIENTS: Record<string, string> = {
  indigo: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 45%, #c7d2fe 100%)',
  emerald: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 45%, #a7f3d0 100%)',
  rose: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 45%, #fecdd3 100%)',
  orange: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fed7aa 100%)',
  sky: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 45%, #bae6fd 100%)',
};

function createInitialFormState(referralMessage?: string): WaitlistFormState {
  return {
    email: '',
    firstName: '',
    consent: false,
    honeypot: '',
    fieldValues: {},
    submitted: false,
    duplicate: false,
    errorMessage: '',
    loading: false,
    resolvedReferralMessage: referralMessage || 'Share this page with one founder friend.',
  };
}

export default function WaitlistPageTemplate({
  content,
  productName,
  mode,
  onContentChange,
  onEmailSubmit,
  signupCount,
  publicUrl,
  activeVariant,
  onImageUpload,
  onSectionOrderChange,
}: WaitlistPageTemplateProps) {
  const editable = mode === 'preview';
  const change = onContentChange ?? (() => undefined);
  const normalized = normalizeWaitlistContent(content, productName);
  const [heroFormState, setHeroFormState] = useState<WaitlistFormState>(() => createInitialFormState(normalized.referralMessage));
  const [footerFormState, setFooterFormState] = useState<WaitlistFormState>(() => createInitialFormState(normalized.referralMessage));

  const accentHex = getAccentHex(normalized.accentColor || 'indigo');
  const heroBackground = (normalized.theme === 'light'
    ? LIGHT_ACCENT_GRADIENTS[normalized.accentColor || 'indigo']
    : ACCENT_GRADIENTS[normalized.accentColor || 'indigo']) || ACCENT_GRADIENTS.indigo;

  const palette = normalized.colors || normalizeWaitlistContent({}, productName).colors!;
  const typography = normalized.typography || normalizeWaitlistContent({}, productName).typography!;
  const spacing = normalized.spacing || normalizeWaitlistContent({}, productName).spacing!;
  const visibility = normalized.sectionVisibility || normalizeWaitlistContent({}, productName).sectionVisibility!;
  const renderConfig = getWaitlistTemplateRenderConfig(normalized.templateId);

  const alignCenter = normalized.textAlign !== 'left';
  const textAlignClass = renderConfig.heroCopyClass || (alignCenter ? 'text-center' : 'text-left');
  const sectionPadding = `${spacing.sectionPaddingY}px`;
  const sectionOrder = (normalized.sectionOrder?.length ? normalized.sectionOrder : WAITLIST_SECTION_ORDER)
    .filter((sectionId) => visibility[sectionId]);

  useEffect(() => {
    if (mode !== 'public') return;
    const initial = createInitialFormState(normalized.referralMessage);
    setHeroFormState(initial);
    setFooterFormState(initial);
  }, [mode, normalized.referralMessage, productName, publicUrl]);

  const sectionStyle: CSSProperties = {
    borderColor: palette.borderColor,
    backgroundColor: palette.sectionBackground,
    color: palette.textPrimary,
    paddingTop: sectionPadding,
    paddingBottom: sectionPadding,
  };

  const renderText = (field: string, value: string, multiline = false, className = '') => {
    if (!editable) return <span className={className}>{value}</span>;
    return (
      <EditableField
        value={value}
        multiline={multiline}
        className={className}
        onChange={(nextValue) => change(field, nextValue)}
      />
    );
  };

  const renderImageSlot = () => {
    if (normalized.imageUrl) {
      return (
        <div className="group relative">
          <img
            src={normalized.imageUrl}
            alt={`${productName} preview`}
            className="w-full object-cover"
            style={{
              borderRadius: `${spacing.cardRadius}px`,
              border: `1px solid ${palette.borderColor}`,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          />
          {editable && onImageUpload ? (
            <label
              className="absolute bottom-3 right-3 cursor-pointer rounded-full px-3 py-2 text-xs font-semibold opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: palette.buttonBackground, color: palette.buttonText }}
            >
              Replace image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onImageUpload(file);
                  event.currentTarget.value = '';
                }}
              />
            </label>
          ) : null}
        </div>
      );
    }

    return (
      <label
        className={editable && onImageUpload ? 'block cursor-pointer p-6 text-sm transition-opacity hover:opacity-90' : 'block p-6 text-sm'}
        style={{
          borderRadius: `${spacing.cardRadius}px`,
          border: `1px solid ${palette.borderColor}`,
          color: palette.textSecondary,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {editable && onImageUpload ? 'Upload a product mockup, screenshot, or brand visual.' : 'Add an image URL in the builder to show your product mockup here.'}
        {editable && onImageUpload ? (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImageUpload(file);
              event.currentTarget.value = '';
            }}
          />
        ) : null}
      </label>
    );
  };

  const renderGeneratedVisual = () => {
    const cardStyle: CSSProperties = {
      borderRadius: `${spacing.cardRadius}px`,
      border: `1px solid ${palette.borderColor}`,
      backgroundColor: palette.sectionBackground,
      color: palette.textPrimary,
      boxShadow: '0 24px 80px rgba(0,0,0,0.16)',
    };

    const mutedStyle: CSSProperties = { color: palette.textSecondary };
    const accentStyle: CSSProperties = { backgroundColor: accentHex };

    switch (renderConfig.heroVisual) {
      case 'ai-demo':
        return (
          <div className="space-y-3 p-5" style={cardStyle} data-template-layout="ai-tool">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accentHex }}>AI output preview</span>
              <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${accentHex}22`, color: accentHex }}>Beta</span>
            </div>
            <div className="rounded-xl border p-4 font-mono text-xs" style={{ borderColor: `${palette.borderColor}99`, backgroundColor: palette.pageBackground }}>
              <p style={mutedStyle}>Input: messy workflow</p>
              <p className="mt-3" style={{ color: palette.textPrimary }}>→ clear recommendation</p>
              <p className="mt-1" style={{ color: palette.textPrimary }}>→ next best action</p>
              <p className="mt-1" style={{ color: palette.textPrimary }}>→ ready-to-use output</p>
            </div>
          </div>
        );
      case 'phone':
        return (
          <div className="mx-auto max-w-[290px] rounded-[36px] border p-3" style={{ ...cardStyle, borderRadius: 36 }} data-template-layout="mobile-app">
            <div className="rounded-[28px] p-4" style={{ backgroundColor: palette.pageBackground }}>
              <div className="mx-auto mb-4 h-1 w-16 rounded-full" style={accentStyle} />
              <div className="space-y-3">
                <div className="h-28 rounded-2xl" style={{ background: `linear-gradient(135deg, ${accentHex}66, transparent)` }} />
                <div className="h-3 w-36 rounded-full" style={{ backgroundColor: palette.textPrimary, opacity: 0.8 }} />
                <div className="h-3 w-48 rounded-full" style={{ backgroundColor: palette.textSecondary, opacity: 0.5 }} />
                <div className="h-10 rounded-2xl" style={{ backgroundColor: palette.buttonBackground }} />
              </div>
            </div>
          </div>
        );
      case 'marketplace':
        return (
          <div className="grid gap-3 sm:grid-cols-2" data-template-layout="marketplace">
            {['Demand side', 'Supply side'].map((label, index) => (
              <div key={label} className="p-5" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentHex }}>{label}</p>
                <div className="mt-6 space-y-2">
                  <div className="h-3 rounded-full" style={{ backgroundColor: palette.textPrimary, opacity: index ? 0.5 : 0.8 }} />
                  <div className="h-3 w-2/3 rounded-full" style={{ backgroundColor: palette.textSecondary, opacity: 0.45 }} />
                  <div className="mt-5 h-9 rounded-full" style={{ backgroundColor: index ? palette.buttonBackground : `${accentHex}44` }} />
                </div>
              </div>
            ))}
          </div>
        );
      case 'member-circle':
        return (
          <div className="p-6 text-center" style={cardStyle} data-template-layout="community">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accentHex }}>Founding circle</p>
            <div className="relative mx-auto mt-6 h-48 w-48">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <span
                  key={item}
                  className="absolute h-14 w-14 rounded-full border"
                  style={{
                    borderColor: palette.borderColor,
                    backgroundColor: item % 2 ? accentHex : palette.pageBackground,
                    left: `${70 + Math.cos((item / 6) * Math.PI * 2) * 68}px`,
                    top: `${70 + Math.sin((item / 6) * Math.PI * 2) * 68}px`,
                  }}
                />
              ))}
              <span className="absolute left-[66px] top-[66px] h-16 w-16 rounded-full" style={accentStyle} />
            </div>
          </div>
        );
      case 'creator-board':
        return (
          <div className="grid gap-3 p-4" style={cardStyle} data-template-layout="creator-tool">
            {['Idea', 'Draft', 'Publish'].map((label, index) => (
              <div key={label} className="rounded-xl border p-3" style={{ borderColor: palette.borderColor, backgroundColor: index === 1 ? `${accentHex}22` : palette.pageBackground }}>
                <p className="text-xs font-semibold" style={{ color: index === 1 ? accentHex : palette.textSecondary }}>{label}</p>
                <div className="mt-3 h-3 rounded-full" style={{ backgroundColor: palette.textPrimary, opacity: 0.7 }} />
                <div className="mt-2 h-3 w-2/3 rounded-full" style={{ backgroundColor: palette.textSecondary, opacity: 0.4 }} />
              </div>
            ))}
          </div>
        );
      case 'product-drop':
        return (
          <div className="p-5" style={cardStyle} data-template-layout="ecommerce">
            <div className="aspect-square rounded-lg border" style={{ borderColor: palette.borderColor, background: `linear-gradient(145deg, ${accentHex}55, ${palette.pageBackground})` }} />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">First drop</p>
                <p className="text-xs" style={mutedStyle}>Early access list</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: palette.buttonBackground, color: palette.buttonText }}>Reserve</span>
            </div>
          </div>
        );
      case 'service-proof':
        return (
          <div className="space-y-3 p-5" style={cardStyle} data-template-layout="b2b-service">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accentHex }}>Service proof</p>
            {['Clear scope', 'Measurable outcome', 'First delivery slots'].map((label) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: palette.borderColor, backgroundColor: palette.pageBackground }}>
                <span className="h-3 w-3 rounded-full" style={accentStyle} />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        );
      case 'dashboard':
      default:
        return (
          <div className="space-y-4 p-5" style={cardStyle} data-template-layout="saas">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accentHex }}>Workflow dashboard</span>
              <span className="h-3 w-3 rounded-full" style={accentStyle} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[72, 48, 91].map((value) => (
                <div key={value} className="rounded-xl border p-3" style={{ borderColor: palette.borderColor, backgroundColor: palette.pageBackground }}>
                  <p className="text-2xl font-bold">{value}%</p>
                  <p className="text-xs" style={mutedStyle}>Signal</p>
                </div>
              ))}
            </div>
            <div className="h-28 rounded-xl" style={{ background: `linear-gradient(135deg, ${accentHex}44, transparent)` }} />
          </div>
        );
    }
  };

  const renderHeroVisual = () => {
    if (normalized.imageUrl) return renderImageSlot();
    return (
      <div className="space-y-3">
        {renderGeneratedVisual()}
        {editable && onImageUpload ? (
          <div>{renderImageSlot()}</div>
        ) : null}
      </div>
    );
  };

  const renderFormSection = (instanceId: string) => {
    const fields = normalized.customFields?.filter((field) => field.enabled) || [];
    const isHero = instanceId === 'waitlist-hero-form';
    const formState = isHero ? heroFormState : footerFormState;
    const setFormState = isHero ? setHeroFormState : setFooterFormState;

    if (mode === 'public' && onEmailSubmit) {
      return (
        <EmailForm
          ctaText={normalized.ctaText}
          emailPlaceholder={normalized.emailPlaceholder}
          collectFirstName={normalized.collectFirstName}
          collectConsent={normalized.collectConsent}
          consentRequired={normalized.consentRequired}
          customFields={fields}
          successTitle={normalized.successTitle || 'You are on the list.'}
          successMessage={normalized.successMessage || 'Thanks for joining. We will keep you updated.'}
          successShareLabel={normalized.successShareLabel || 'Copy share link'}
          onSubmit={onEmailSubmit}
          publicUrl={publicUrl}
          activeVariant={activeVariant}
          palette={palette}
          radius={spacing.cardRadius}
          instanceId={instanceId}
          state={formState}
          setState={setFormState}
        />
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 opacity-85">
        {fields.map((field) => (
          <div
            key={field.id}
            className="w-full border px-4 py-3 text-left text-sm"
            style={{
              borderColor: `${palette.borderColor}80`,
              backgroundColor: palette.inputBackground,
              color: palette.inputText,
              borderRadius: `${Math.max(spacing.cardRadius - 4, 8)}px`,
            }}
          >
            {field.label}{field.required ? ' *' : ''}
          </div>
        ))}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div
            className="flex-1 border px-4 py-3 text-left text-sm"
            style={{
              borderColor: `${palette.borderColor}80`,
              backgroundColor: palette.inputBackground,
              color: palette.inputText,
              borderRadius: `${Math.max(spacing.cardRadius - 4, 8)}px`,
            }}
          >
            {normalized.emailPlaceholder}
          </div>
          <div
            className="px-6 py-3 text-sm font-semibold"
            style={{
              backgroundColor: palette.buttonBackground,
              color: palette.buttonText,
              borderRadius: `${Math.max(spacing.cardRadius - 2, 10)}px`,
            }}
          >
            {normalized.ctaText}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (sectionId: WaitlistSectionId) => {
    switch (sectionId) {
      case 'problemSolution':
        return (
          <section className="border-t px-6" style={sectionStyle}>
            <div className={`mx-auto grid gap-6 ${renderConfig.problemGridClass}`} style={{ maxWidth: `${spacing.contentMaxWidth}px` }}>
              <div
                className={`${textAlignClass} ${renderConfig.sectionFrameClass} p-5`}
                style={{
                  borderLeft: `3px solid ${accentHex}`,
                  backgroundColor: `${accentHex}08`,
                }}
              >
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: accentHex }}>
                  The problem
                </h2>
                <p style={{ fontSize: `${typography.bodySize + 1}px`, lineHeight: 1.6, color: palette.textPrimary }}>
                  {renderText('problemStatement', normalized.problemStatement, true)}
                </p>
              </div>
              <div
                className={`${textAlignClass} ${renderConfig.sectionFrameClass} p-5`}
                style={{
                  borderLeft: `3px solid ${palette.textPrimary}`,
                  backgroundColor: `${palette.textPrimary}06`,
                }}
              >
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: palette.textPrimary }}>
                  The solution
                </h2>
                <p style={{ fontSize: `${typography.bodySize + 1}px`, lineHeight: 1.6, color: palette.textPrimary }}>
                  {renderText('solutionSummary', normalized.solutionSummary, true)}
                </p>
              </div>
            </div>
          </section>
        );
      case 'benefits':
        return (
          <section className="border-t px-6" style={{ ...sectionStyle, backgroundColor: palette.pageBackground }}>
            <div className="mx-auto" style={{ maxWidth: `${spacing.contentMaxWidth}px` }}>
              <h2 className={`mb-8 text-2xl font-bold ${textAlignClass}`} style={{ fontFamily: typography.headingFamily }}>What you get</h2>
              <div className={`grid gap-4 ${renderConfig.benefitGridClass}`}>
                {normalized.benefits.map((benefit, index) => (
                  <div
                    key={`${benefit}-${index}`}
                    className={`relative overflow-hidden border p-5 transition-shadow ${renderConfig.sectionFrameClass}`}
                    style={{
                      borderRadius: `${spacing.cardRadius}px`,
                      borderColor: palette.borderColor,
                      backgroundColor: palette.sectionBackground,
                    }}
                  >
                    <div
                      className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                      style={{
                        backgroundColor: `${accentHex}1a`,
                        color: accentHex,
                        border: `1px solid ${accentHex}33`,
                      }}
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <p style={{ fontSize: `${typography.bodySize + 1}px`, lineHeight: 1.55, color: palette.textPrimary }}>
                      {editable ? (
                        <EditableField
                          value={benefit}
                          multiline
                          onChange={(value) => change(`benefit_${index}`, value)}
                        />
                      ) : benefit}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-wide">
                {normalized.trustItems.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="rounded-full border px-3 py-1"
                    style={{ borderColor: `${accentHex}66`, color: palette.textSecondary }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>
        );
      case 'howItWorks':
        return (
          <section className="border-t px-6" style={sectionStyle}>
            <div className="mx-auto" style={{ maxWidth: `${spacing.contentMaxWidth}px` }}>
              <h2 className={`mb-8 text-2xl font-bold ${textAlignClass}`} style={{ fontFamily: typography.headingFamily }}>How it works</h2>
              <div className={`grid gap-4 ${renderConfig.benefitGridClass}`}>
                {normalized.howItWorks.map((step, index) => (
                  <div
                    key={`${step}-${index}`}
                    className={`border p-5 ${renderConfig.sectionFrameClass}`}
                    style={{ borderRadius: `${spacing.cardRadius}px`, borderColor: palette.borderColor }}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: accentHex }}>Step {index + 1}</p>
                    <p style={{ fontSize: `${typography.bodySize}px`, color: palette.textSecondary }}>
                      {editable ? (
                        <EditableField
                          value={step}
                          multiline
                          onChange={(value) => change(`how_${index}`, value)}
                        />
                      ) : step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'testimonials':
        return (
          <section className="border-t px-6" style={{ ...sectionStyle, backgroundColor: palette.pageBackground }}>
            <div className={`mx-auto grid gap-6 ${renderConfig.problemGridClass}`} style={{ maxWidth: `${spacing.contentMaxWidth}px` }}>
              {normalized.testimonials.map((testimonial, index) => (
                <div
                  key={`${testimonial.author}-${index}`}
                  className={`border p-5 ${renderConfig.sectionFrameClass}`}
                  style={{
                    borderRadius: `${spacing.cardRadius}px`,
                    borderColor: palette.borderColor,
                    backgroundColor: palette.sectionBackground,
                  }}
                >
                  <p style={{ fontSize: `${typography.bodySize}px`, color: palette.textSecondary }}>&quot;{testimonial.quote}&quot;</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-widest" style={{ color: accentHex }}>
                    {testimonial.author}{testimonial.role ? ` - ${testimonial.role}` : ''}
                  </p>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-center" style={{ color: palette.textSecondary }}>
              {renderText('socialProof', normalized.socialProof, false)}
            </p>
          </section>
        );
      case 'faq':
        return (
          <section className="border-t px-6" style={sectionStyle}>
            <div className="mx-auto" style={{ maxWidth: `${spacing.contentMaxWidth}px` }}>
              <h2 className={`mb-6 text-2xl font-bold ${textAlignClass}`} style={{ fontFamily: typography.headingFamily }}>FAQ</h2>
              <div className="space-y-3">
                {normalized.faq.map((item, index) => (
                  <div
                    key={`${item.question}-${index}`}
                    className="rounded-lg border p-4"
                    style={{ borderColor: palette.borderColor, borderRadius: `${spacing.cardRadius}px` }}
                  >
                    <p className="font-semibold" style={{ color: palette.textPrimary }}>{item.question}</p>
                    <p className="mt-1 text-sm" style={{ color: palette.textSecondary }}>{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="overflow-hidden border"
      style={{
        borderRadius: `${spacing.cardRadius}px`,
        borderColor: palette.borderColor,
        backgroundColor: palette.pageBackground,
        color: palette.textPrimary,
        fontFamily: typography.bodyFamily,
      }}
    >
      <section
        className="px-6"
        style={{
          paddingTop: sectionPadding,
          paddingBottom: sectionPadding,
          background: heroBackground,
          color: palette.textPrimary,
        }}
      >
        <div
          className={`mx-auto ${renderConfig.heroLayoutClass}`}
          style={{ maxWidth: `${spacing.contentMaxWidth}px` }}
          data-template-id={normalized.templateId}
        >
          <div className={renderConfig.heroCopyClass}>
            {normalized.logoUrl ? (
              <img src={normalized.logoUrl} alt={`${productName} logo`} className="mb-4 h-10 w-auto rounded bg-white/10 p-1" />
            ) : null}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  backgroundColor: `${accentHex}22`,
                  color: accentHex,
                  border: `1px solid ${accentHex}55`,
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accentHex }}
                  aria-hidden
                />
                Pre-launch
              </p>
              <p
                className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ borderColor: `${palette.textPrimary}40`, color: palette.textPrimary }}
              >
                {productName || 'Startup'}
              </p>
            </div>

            {normalized.launchDate ? (
              <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: palette.textSecondary }}>
                Launching {new Date(normalized.launchDate).toLocaleDateString()}
              </p>
            ) : null}

            <h1
              className="leading-tight"
              style={{
                fontFamily: typography.headingFamily,
                fontWeight: typography.headingWeight,
                fontSize: `${typography.headingSize}px`,
                letterSpacing: `${typography.letterSpacing}px`,
                color: palette.textPrimary,
              }}
            >
              {renderText('headline', normalized.headline, false, 'block')}
            </h1>

            <p
              className="mt-4"
              style={{
                fontFamily: typography.bodyFamily,
                fontWeight: typography.bodyWeight,
                fontSize: `${typography.subheadingSize}px`,
                letterSpacing: `${typography.letterSpacing}px`,
                color: palette.textSecondary,
              }}
            >
              {renderText('subheadline', normalized.subheadline, true, 'block')}
            </p>

            {mode === 'public' && normalized.abTestEnabled && activeVariant ? (
              <p className="mt-2 text-xs uppercase tracking-wider" style={{ color: `${palette.textSecondary}` }}>
                Variant {activeVariant}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            {renderHeroVisual()}
          </div>
        </div>

        <div className="mx-auto mt-10" style={{ maxWidth: `${Math.min(spacing.contentMaxWidth, 960)}px` }}>
          {renderFormSection('waitlist-hero-form')}
        </div>

        {signupCount && signupCount > 0 ? (
          <p className="mt-4 text-center text-sm" style={{ color: palette.textSecondary }}>{signupCount} people already joined.</p>
        ) : null}
      </section>

      {editable && onSectionOrderChange ? (
        <SortableList
          items={sectionOrder.map((id) => ({ id }))}
          onReorder={(items) => onSectionOrderChange(items.map((item) => item.id))}
          className="relative"
          renderItem={(item) => (
            <div className="group/section relative">
              <div
                className="pointer-events-none absolute left-4 top-3 z-10 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide opacity-0 shadow-sm transition-opacity group-hover/section:opacity-100"
                style={{ backgroundColor: palette.buttonBackground, color: palette.buttonText }}
              >
                Drag to reorder
              </div>
              {renderSection(item.id)}
            </div>
          )}
        />
      ) : (
        sectionOrder.map((sectionId) => <div key={sectionId}>{renderSection(sectionId)}</div>)
      )}

      <section
        className="border-t px-6"
        style={{
          paddingTop: sectionPadding,
          paddingBottom: sectionPadding,
          borderColor: palette.borderColor,
          background: heroBackground,
          color: palette.textPrimary,
        }}
      >
        <div className={`mx-auto max-w-3xl ${textAlignClass}`}>
          <h2 className="text-2xl font-bold" style={{ fontFamily: typography.headingFamily }}>Ready to validate demand?</h2>
          <p className="mt-2 text-sm" style={{ color: palette.textSecondary }}>{normalized.referralMessage}</p>
          <div className="mt-6">{renderFormSection('waitlist-footer-form')}</div>

          {normalized.socialLinks && (normalized.socialLinks.website || normalized.socialLinks.x || normalized.socialLinks.linkedin) ? (
            <div className="mt-6 flex justify-center gap-4 text-xs">
              {normalized.socialLinks.website ? <a href={normalized.socialLinks.website} target="_blank" rel="noreferrer" className="underline">Website</a> : null}
              {normalized.socialLinks.x ? <a href={normalized.socialLinks.x} target="_blank" rel="noreferrer" className="underline">X</a> : null}
              {normalized.socialLinks.linkedin ? <a href={normalized.socialLinks.linkedin} target="_blank" rel="noreferrer" className="underline">LinkedIn</a> : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
