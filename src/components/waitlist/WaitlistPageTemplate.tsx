import { useState, useRef } from 'react';

export interface WaitlistContent {
  headline: string;
  subheadline: string;
  benefits: [string, string, string];
  socialProof: string;
  ctaText: string;
  emailPlaceholder: string;
  collectFirstName?: boolean;
  collectConsent?: boolean;
}

export interface SignupData {
  email: string;
  firstName?: string;
  consent?: boolean;
}

interface WaitlistPageTemplateProps {
  content: WaitlistContent;
  productName: string;
  mode: 'preview' | 'public';
  onContentChange?: (field: string, value: string) => void;
  onEmailSubmit?: (data: SignupData) => Promise<boolean>;
  signupCount?: number;
}

// Inline-editable text field for preview mode
function EditableField({
  value,
  onChange,
  multiline = false,
  className = '',
  placeholder = '',
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) onChange(draft.trim());
    else setDraft(value);
  };

  if (editing) {
    const sharedProps = {
      ref: inputRef as any,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { setEditing(false); setDraft(value); }
      },
      autoFocus: true,
      className: `bg-white/10 border border-white/40 rounded px-2 py-1 text-inherit font-inherit w-full outline-none ${className}`,
      placeholder,
    };
    return multiline
      ? <textarea {...sharedProps} rows={3} style={{ resize: 'none' }} />
      : <input {...sharedProps} />;
  }

  return (
    <span
      className={`cursor-text group relative inline-block ${className}`}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value}
      <span className="absolute -inset-1 rounded border border-dashed border-white/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </span>
  );
}

function EmailForm({
  ctaText,
  emailPlaceholder,
  collectFirstName,
  collectConsent,
  onSubmit,
}: {
  ctaText: string;
  emailPlaceholder: string;
  collectFirstName?: boolean;
  collectConsent?: boolean;
  onSubmit: (data: SignupData) => Promise<boolean>;
}) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // should stay empty
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email.trim() || !email.includes('@')) return;
    // Honeypot: bots fill this, humans don't
    if (honeypot) { setSubmitted(true); return; }
    setLoading(true);
    const ok = await onSubmit({
      email: email.trim(),
      firstName: collectFirstName ? firstName.trim() || undefined : undefined,
      consent: collectConsent ? consent : undefined,
    });
    setLoading(false);
    if (ok) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center gap-2 text-white font-medium text-lg">
          <span className="text-2xl">✓</span> You're on the list. We'll be in touch.
        </div>
        <p className="text-white/60 text-sm">
          Know someone who'd love this? Share the link with them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-md w-full mx-auto">
      {/* Honeypot — hidden from real users */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
      />

      {collectFirstName && (
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Your first name"
          className="w-full rounded-lg px-4 py-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-white/50"
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handle()}
          placeholder={emailPlaceholder}
          className="flex-1 rounded-lg px-4 py-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-white/50"
        />
        <button
          onClick={handle}
          disabled={loading}
          className="bg-white text-indigo-700 font-semibold px-6 py-3 rounded-lg text-sm hover:bg-indigo-50 transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? 'Joining…' : ctaText}
        </button>
      </div>

      {collectConsent && (
        <label className="flex items-start gap-2 cursor-pointer text-left">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <span className="text-white/70 text-xs">
            I agree to receive product updates and announcements. No spam, unsubscribe anytime.
          </span>
        </label>
      )}
    </div>
  );
}

const BENEFIT_ICONS = ['⚡', '🎯', '🚀'];

export default function WaitlistPageTemplate({
  content,
  productName,
  mode,
  onContentChange,
  onEmailSubmit,
  signupCount,
}: WaitlistPageTemplateProps) {
  const editable = mode === 'preview';
  const change = onContentChange ?? (() => {});

  const renderText = (
    field: string,
    value: string,
    multiline = false,
    className = '',
    placeholder = '',
  ) => {
    if (!editable) return <span className={className}>{value}</span>;
    return (
      <EditableField
        value={value}
        onChange={(v) => change(field, v)}
        multiline={multiline}
        className={className}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className="font-sans overflow-hidden rounded-xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Hero */}
      <div
        className="relative px-6 py-20 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)' }}
      >
        {/* Product name badge */}
        <div className="inline-block bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase mb-6">
          {productName}
        </div>

        {/* Headline */}
        <h1 className="text-3xl md:text-5xl font-black leading-tight mb-5 max-w-2xl mx-auto">
          {renderText('headline', content.headline, false, 'block', 'Your bold headline')}
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-white/85 max-w-xl mx-auto mb-10 leading-relaxed">
          {renderText('subheadline', content.subheadline, true, 'block', 'Who this is for + what they get')}
        </p>

        {/* Email form or preview placeholder */}
        {mode === 'public' && onEmailSubmit ? (
          <EmailForm
            ctaText={content.ctaText}
            emailPlaceholder={content.emailPlaceholder}
            collectFirstName={content.collectFirstName}
            collectConsent={content.collectConsent}
            onSubmit={onEmailSubmit}
          />
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto opacity-60 pointer-events-none select-none">
            <div className="flex-1 bg-white/20 rounded-lg px-4 py-3 text-white/70 text-sm text-left">
              {content.emailPlaceholder}
            </div>
            <div className="bg-white text-indigo-700 font-semibold px-6 py-3 rounded-lg text-sm whitespace-nowrap">
              {content.ctaText}
            </div>
          </div>
        )}

        {signupCount !== undefined && signupCount > 0 && (
          <p className="mt-4 text-white/70 text-sm">{signupCount} {signupCount === 1 ? 'person has' : 'people have'} already joined</p>
        )}

        {editable && (
          <p className="mt-6 text-white/50 text-xs">Click any text above to edit it</p>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-xl font-bold text-gray-500 uppercase tracking-widest mb-10 text-sm">
            What you get
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {content.benefits.map((benefit, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="text-3xl mb-3">{BENEFIT_ICONS[i]}</div>
                <p className="text-gray-800 font-medium text-sm leading-relaxed">
                  {editable ? (
                    <EditableField
                      value={benefit}
                      onChange={(v) => change(`benefit_${i}`, v)}
                      multiline
                      className="text-gray-800"
                      placeholder={`Benefit ${i + 1}`}
                    />
                  ) : benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div className="bg-gray-50 border-y border-gray-100 px-6 py-10 text-center">
        <p className="text-gray-600 text-base italic max-w-lg mx-auto">
          "{renderText('socialProof', content.socialProof, false, '', 'Social proof line')}"
        </p>
      </div>

      {/* Bottom CTA */}
      <div
        className="px-6 py-16 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)' }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to be first in line?</h2>
        <p className="text-white/70 mb-8 text-sm">Spots are limited. Join the waitlist now.</p>

        {mode === 'public' && onEmailSubmit ? (
          <EmailForm
            ctaText={content.ctaText}
            emailPlaceholder={content.emailPlaceholder}
            collectFirstName={content.collectFirstName}
            collectConsent={content.collectConsent}
            onSubmit={onEmailSubmit}
          />
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto opacity-60 pointer-events-none select-none">
            <div className="flex-1 bg-white/20 rounded-lg px-4 py-3 text-white/70 text-sm text-left">
              {content.emailPlaceholder}
            </div>
            <div className="bg-white text-indigo-700 font-semibold px-6 py-3 rounded-lg text-sm whitespace-nowrap">
              {content.ctaText}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 px-6 py-6 text-center">
        <p className="text-gray-500 text-xs">
          © {new Date().getFullYear()} {productName}. Built with{' '}
          <a href="https://creatives-takeover.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
            Creatives Takeover
          </a>
          .
        </p>
      </div>
    </div>
  );
}
