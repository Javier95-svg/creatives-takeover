import { useMemo, useRef, useState } from 'react';
import {
  WaitlistContent,
  WaitlistSignupPayload,
  getAccentHex,
  normalizeWaitlistContent,
  type WaitlistVariant,
} from '@/lib/waitlist';

export type { WaitlistContent } from '@/lib/waitlist';
export type SignupData = WaitlistSignupPayload;

interface WaitlistPageTemplateProps {
  content: WaitlistContent;
  productName: string;
  mode: 'preview' | 'public';
  onContentChange?: (field: string, value: string) => void;
  onEmailSubmit?: (data: SignupData) => Promise<{ ok: boolean; duplicate?: boolean; referralMessage?: string }>;
  signupCount?: number;
  publicUrl?: string;
  activeVariant?: WaitlistVariant;
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
  onSubmit,
  referralMessage,
  publicUrl,
  activeVariant,
}: {
  ctaText: string;
  emailPlaceholder: string;
  collectFirstName?: boolean;
  collectConsent?: boolean;
  consentRequired?: boolean;
  onSubmit: (data: SignupData) => Promise<{ ok: boolean; duplicate?: boolean; referralMessage?: string }>;
  referralMessage?: string;
  publicUrl?: string;
  activeVariant?: WaitlistVariant;
}) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvedReferralMessage, setResolvedReferralMessage] = useState(referralMessage || 'Share this page with one founder friend.');

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (collectConsent && consentRequired && !consent) {
      setErrorMessage('Please provide consent to continue.');
      return;
    }

    setLoading(true);
    const result = await onSubmit({
      email: email.trim(),
      firstName: collectFirstName ? (firstName.trim() || undefined) : undefined,
      consent: collectConsent ? consent : undefined,
      honeypot,
    });
    setLoading(false);

    if (result.ok) {
      if (result.referralMessage) {
        setResolvedReferralMessage(result.referralMessage);
      }
      setSubmitted(true);
    } else {
      setErrorMessage('Could not complete signup. Please try again.');
    }
  };

  const referralUrl = useMemo(() => {
    if (!publicUrl) return '';
    if (activeVariant) {
      return `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}ref=waitlist-${activeVariant.toLowerCase()}`;
    }
    return `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}ref=waitlist`;
  }, [activeVariant, publicUrl]);

  if (submitted) {
    return (
      <div className="space-y-3 rounded-xl border border-white/20 bg-black/20 p-4 text-center">
        <p className="text-lg font-semibold text-white">You are on the list.</p>
        <p className="text-sm text-white/75">{resolvedReferralMessage}</p>
        {referralUrl ? (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(referralUrl)}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
          >
            Copy share link
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-3">
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
      />

      {collectFirstName ? (
        <input
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="Your first name"
          className="w-full rounded-lg border border-white/30 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={emailPlaceholder}
          className="flex-1 rounded-lg border border-white/30 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
        />
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60"
        >
          {loading ? 'Joining...' : ctaText}
        </button>
      </div>

      {collectConsent ? (
        <label className="flex items-start gap-2 text-left text-xs text-white/80">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            I agree to receive updates and product announcements.
            {consentRequired ? ' (Required)' : ' (Optional)'}
          </span>
        </label>
      ) : null}

      {errorMessage ? <p className="text-xs text-red-200">{errorMessage}</p> : null}
    </div>
  );
}

const ACCENT_GRADIENTS: Record<string, string> = {
  indigo: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #7c3aed 100%)',
  emerald: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
  rose: 'linear-gradient(135deg, #9f1239 0%, #e11d48 50%, #fb7185 100%)',
  orange: 'linear-gradient(135deg, #9a3412 0%, #ea580c 50%, #fb923c 100%)',
  sky: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
};

export default function WaitlistPageTemplate({
  content,
  productName,
  mode,
  onContentChange,
  onEmailSubmit,
  signupCount,
  publicUrl,
  activeVariant,
}: WaitlistPageTemplateProps) {
  const editable = mode === 'preview';
  const change = onContentChange ?? (() => undefined);
  const normalized = normalizeWaitlistContent(content, productName);

  const accentHex = getAccentHex(normalized.accentColor || 'indigo');
  const heroBackground = ACCENT_GRADIENTS[normalized.accentColor || 'indigo'] || ACCENT_GRADIENTS.indigo;
  const darkMode = normalized.theme !== 'light';

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

  const surfaceClass = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900';
  const subSurfaceClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900';
  const borderClass = darkMode ? 'border-slate-800' : 'border-slate-200';

  const renderFormSection = () => (mode === 'public' && onEmailSubmit ? (
    <EmailForm
      ctaText={normalized.ctaText}
      emailPlaceholder={normalized.emailPlaceholder}
      collectFirstName={normalized.collectFirstName}
      collectConsent={normalized.collectConsent}
      consentRequired={normalized.consentRequired}
      onSubmit={onEmailSubmit}
      referralMessage={normalized.referralMessage}
      publicUrl={publicUrl}
      activeVariant={activeVariant}
    />
  ) : (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 opacity-70 sm:flex-row">
      <div className="flex-1 rounded-lg bg-white/20 px-4 py-3 text-left text-sm text-white">{normalized.emailPlaceholder}</div>
      <div className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900">{normalized.ctaText}</div>
    </div>
  ));

  return (
    <div className={`overflow-hidden rounded-xl border ${borderClass} ${surfaceClass}`}>
      <section className="px-6 py-16 text-white" style={{ background: heroBackground }}>
        <div className={`mx-auto max-w-6xl ${normalized.layout === 'split' ? 'grid gap-10 md:grid-cols-2 md:items-center' : 'text-center'}`}>
          <div className={normalized.layout === 'split' ? '' : 'mx-auto max-w-3xl'}>
            {normalized.logoUrl ? (
              <img src={normalized.logoUrl} alt={`${productName} logo`} className="mb-4 h-10 w-auto rounded bg-white/10 p-1" />
            ) : null}

            <p className="mb-4 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              {productName || 'Startup'}
            </p>

            {normalized.launchDate ? (
              <p className="mb-3 text-xs uppercase tracking-widest text-white/80">
                Launching {new Date(normalized.launchDate).toLocaleDateString()}
              </p>
            ) : null}

            <h1 className="text-3xl font-black leading-tight md:text-5xl">
              {renderText('headline', normalized.headline, false, 'block')}
            </h1>

            <p className="mt-4 text-base text-white/85 md:text-xl">
              {renderText('subheadline', normalized.subheadline, true, 'block')}
            </p>

            {mode === 'public' && normalized.abTestEnabled && activeVariant ? (
              <p className="mt-2 text-xs uppercase tracking-wider text-white/60">Variant {activeVariant}</p>
            ) : null}
          </div>

          {normalized.layout === 'split' ? (
            <div className="space-y-4">
              {normalized.imageUrl ? (
                <img
                  src={normalized.imageUrl}
                  alt={`${productName} preview`}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 object-cover"
                />
              ) : (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-sm text-white/80">
                  Add an image URL in the builder to show your product mockup here.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mx-auto mt-10 max-w-3xl">{renderFormSection()}</div>

        {signupCount && signupCount > 0 ? (
          <p className="mt-4 text-center text-sm text-white/70">{signupCount} people already joined.</p>
        ) : null}
      </section>

      <section className={`border-t px-6 py-14 ${borderClass} ${subSurfaceClass}`}>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg font-semibold" style={{ color: accentHex }}>The problem</h2>
            <p className="text-sm leading-relaxed">
              {renderText('problemStatement', normalized.problemStatement, true)}
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold" style={{ color: accentHex }}>The solution</h2>
            <p className="text-sm leading-relaxed">
              {renderText('solutionSummary', normalized.solutionSummary, true)}
            </p>
          </div>
        </div>
      </section>

      <section className={`border-t px-6 py-14 ${borderClass} ${surfaceClass}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-bold">What you get</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {normalized.benefits.map((benefit, index) => (
              <div key={`${benefit}-${index}`} className={`rounded-xl border p-5 ${borderClass} ${subSurfaceClass}`}>
                <p className="text-sm leading-relaxed">
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
                className={`rounded-full border px-3 py-1 ${borderClass}`}
                style={{ borderColor: `${accentHex}66`, color: darkMode ? '#e2e8f0' : '#0f172a' }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={`border-t px-6 py-14 ${borderClass} ${subSurfaceClass}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {normalized.howItWorks.map((step, index) => (
              <div key={`${step}-${index}`} className={`rounded-xl border p-5 ${borderClass} bg-transparent`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: accentHex }}>Step {index + 1}</p>
                <p className="text-sm leading-relaxed">
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

      <section className={`border-t px-6 py-14 ${borderClass} ${surfaceClass}`}>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {normalized.testimonials.map((testimonial, index) => (
            <div key={`${testimonial.author}-${index}`} className={`rounded-xl border p-5 ${borderClass} ${subSurfaceClass}`}>
              <p className="text-sm italic">"{testimonial.quote}"</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest" style={{ color: accentHex }}>
                {testimonial.author}{testimonial.role ? ` - ${testimonial.role}` : ''}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm opacity-80">{renderText('socialProof', normalized.socialProof, false)}</p>
      </section>

      <section className={`border-t px-6 py-14 ${borderClass} ${subSurfaceClass}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-center text-2xl font-bold">FAQ</h2>
          <div className="space-y-3">
            {normalized.faq.map((item, index) => (
              <div key={`${item.question}-${index}`} className={`rounded-lg border p-4 ${borderClass}`}>
                <p className="font-semibold">{item.question}</p>
                <p className="mt-1 text-sm opacity-85">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 text-white" style={{ background: heroBackground }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">Ready to validate demand?</h2>
          <p className="mt-2 text-sm text-white/80">{normalized.referralMessage}</p>
          <div className="mt-6">{renderFormSection()}</div>

          {normalized.socialLinks && (normalized.socialLinks.website || normalized.socialLinks.x || normalized.socialLinks.linkedin) ? (
            <div className="mt-6 flex justify-center gap-4 text-xs text-white/90">
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
