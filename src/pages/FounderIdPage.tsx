import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Hash, Link2, Plus, RefreshCw, Share2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { AccountSignupDialog } from '@/components/auth/AccountSignupDialog';
import SEO, { createBreadcrumbSchema, createFAQSchema, createWebPageSchema } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePageAnalytics } from '@/hooks/usePageAnalytics';
import { useCTAAttribution } from '@/hooks/useCTAAttribution';
import { captureEvent } from '@/lib/analytics';
import { isFounderIdAccount } from '@/lib/founderId';
import { founderIdBaseHandle, nextFreeHandle } from '@/lib/founderIdHandle';
import { cn } from '@/lib/utils';
import {
  FOUNDER_ID_CLOSING,
  FOUNDER_ID_EXAMPLE_CARDS,
  FOUNDER_ID_EXAMPLE_LINK,
  FOUNDER_ID_FAQ_SECTION,
  FOUNDER_ID_FAQS,
  FOUNDER_ID_HERO,
  FOUNDER_ID_PATH,
  FOUNDER_ID_PROGRAMS,
  FOUNDER_ID_SECTIONS,
  FOUNDER_ID_SEO,
  FOUNDER_ID_SHARE,
  FOUNDER_ID_TRY,
} from '@/data/founderIdPage';
import profileShot from '@/assets/founder-id/profile.webp';
import supportShot from '@/assets/founder-id/support.webp';
import updatesShot from '@/assets/founder-id/updates.webp';
import '@/components/founder-id/founder-id.css';
import { IdCard } from '@/components/founder-id/IdCard';

// After signup the visitor comes back here with ?open=mine and goes straight
// on to their own Founder ID.
const POST_AUTH_DEST = `${FOUNDER_ID_PATH}?open=mine`;

const FACT_ICONS: Record<string, typeof Link2> = { link: Link2, preview: Share2, live: RefreshCw, number: Hash };

// The real screens, captured from a live Founder ID (dark theme).
const SECTION_SHOTS: Record<string, { src: string; width: number; height: number; alt: string }> = {
  profile: {
    src: profileShot,
    width: 1130,
    height: 657,
    alt: 'The profile part of a Founder ID: name, location and pitch beside the project, role, stage, industry and connections, project links and social links.',
  },
  support: {
    src: supportShot,
    width: 1130,
    height: 622,
    alt: 'The support part of a Founder ID: an amount with quick +10, +25 and +50 buttons, a name, a message and a Donate button.',
  },
  updates: {
    src: updatesShot,
    width: 1344,
    height: 1121,
    alt: 'Project Updates on a Founder ID: a post with screenshots, likes, comments, reposts and a share button, in a carousel of recent updates.',
  },
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A title whose closing words are set in champagne foil. */
const Title = ({ as: Tag = 'h2', id, lead, accent, className }: { as?: 'h1' | 'h2'; id?: string; lead: string; accent: string; className: string }) => (
  <Tag id={id} className={className}>
    {lead} <span className="fid-foil">{accent}</span>
  </Tag>
);

/**
 * The example cards, fanned out and tilting gently toward the pointer on
 * desktop. Every few seconds the front card moves to the back.
 */
const CardDeck = ({ caption }: { caption: string }) => {
  const deckRef = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(0);
  const count = FOUNDER_ID_EXAMPLE_CARDS.length;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setFront((current) => (current + 1) % count);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [count]);

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || prefersReducedMotion() || !deckRef.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    deckRef.current.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
    deckRef.current.style.setProperty('--rx', `${(-y * 12).toFixed(2)}deg`);
  };

  const reset = () => {
    deckRef.current?.style.removeProperty('--ry');
    deckRef.current?.style.removeProperty('--rx');
  };

  return (
    <div className="fid-stage" onPointerMove={tilt} onPointerLeave={reset}>
      <div ref={deckRef} className="fid-deck">
        {FOUNDER_ID_EXAMPLE_CARDS.map((person, index) => {
          const position = (index - front + count) % count;
          return (
            <div key={person.handle} className="fid-deck__slot" data-pos={position} aria-hidden={position !== 0}>
              <IdCard
                person={person}
                label={`Example Founder ID card: ${person.name}, @${person.handle}, founder number ${person.number}, ${person.stage} stage, building ${person.tagline.toLowerCase()}.`}
              />
            </div>
          );
        })}
      </div>
      <div className="fid-stage__floor" aria-hidden="true" />
      <p className="fid-stage__caption">{caption}</p>
    </div>
  );
};

/** A real screen in a dark device frame. */
const Device = ({ tag, children }: { tag?: string; children: ReactNode }) => (
  <div className="fid-device">
    <div className="fid-device__bar">
      <span className="fid-device__dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="fid-device__url">creatives-takeover.com/@javier</span>
      {tag && <span className="fid-device__tag">{tag}</span>}
    </div>
    {children}
  </div>
);

const FounderIdPage = () => {
  usePageAnalytics(FOUNDER_ID_PATH, 'Founder ID - Creatives Takeover');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { set: setAttribution } = useCTAAttribution();
  const [signupOpen, setSignupOpen] = useState(false);
  const [activePart, setActivePart] = useState(0);
  const partRefs = useRef<Array<HTMLLIElement | null>>([]);

  // "Try it with your name": the visitor's own card and the link signup would
  // give them (src/lib/founderIdHandle.ts), checked against taken usernames.
  const [tryName, setTryName] = useState('');
  const [tryProject, setTryProject] = useState('');
  const baseHandle = founderIdBaseHandle(tryName);
  const [checkedBase, setCheckedBase] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setCheckedBase(baseHandle), 400);
    return () => window.clearTimeout(timer);
  }, [baseHandle]);
  const takenHandles = useQuery({
    queryKey: ['founder-id-taken-handles', checkedBase],
    enabled: Boolean(checkedBase),
    staleTime: 60_000,
    queryFn: async () => {
      // The base is a-z0-9 only, so it carries no LIKE wildcards.
      const { data, error } = await supabase.from('public_profiles').select('username').ilike('username', `${checkedBase}%`).limit(200);
      if (error) throw error;
      return (data ?? []).map((row) => row.username).filter((name): name is string => Boolean(name));
    },
  });
  const predictedHandle = baseHandle && checkedBase === baseHandle && takenHandles.data
    ? nextFreeHandle(baseHandle, takenHandles.data)
    : baseHandle;
  const tryPerson = baseHandle && predictedHandle
    ? { name: tryName.trim(), handle: predictedHandle, number: '', stage: null, tagline: tryProject.trim() || null }
    : null;
  const triedRef = useRef(false);
  const onTryName = (value: string) => {
    setTryName(value);
    if (!triedRef.current && value.trim()) {
      triedRef.current = true;
      captureEvent('founder_id_try_used', {});
    }
  };

  // Signed-in visitors get a link to their own Founder ID instead of signup.
  const me = useQuery({
    queryKey: ['founder-id-page-me', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('username, user_type').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data as { username: string | null; user_type: string | null } | null;
    },
  });
  // The /@username short link is a vercel.json redirect, so in-app links use
  // the canonical /profile/:username.
  const myHref = me.data?.username ? `/profile/${encodeURIComponent(me.data.username)}` : '/account';
  const ownsFounderId = !me.data || isFounderIdAccount(me.data.user_type);

  useEffect(() => {
    if (searchParams.get('open') !== 'mine' || !user || !me.isFetched) return;
    navigate(myHref, { replace: true });
  }, [searchParams, user, me.isFetched, myHref, navigate]);

  // The part crossing the middle of the screen drives the sticky screen.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = partRefs.current.indexOf(entry.target as HTMLLIElement);
          if (index >= 0) setActivePart(index);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    partRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const showPart = (index: number) => {
    setActivePart(index);
    partRefs.current[index]?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  };

  const openSignup = useCallback((placement: string) => {
    captureEvent('founder_id_cta_clicked', { placement, signed_in: false });
    setAttribution('founder_id_page', location.pathname, placement);
    setSignupOpen(true);
  }, [location.pathname, setAttribution]);

  const primaryCta = (placement: string) =>
    user ? (
      <Link to={myHref} className="fid-btn fid-btn--gold" onClick={() => captureEvent('founder_id_cta_clicked', { placement, signed_in: true })}>
        {ownsFounderId ? FOUNDER_ID_HERO.signedInCta : 'Open my profile'}
        <ArrowRight aria-hidden="true" />
      </Link>
    ) : (
      <button type="button" className="fid-btn fid-btn--gold" onClick={() => openSignup(placement)}>
        {FOUNDER_ID_HERO.primaryCta}
        <ArrowRight aria-hidden="true" />
      </button>
    );

  const structuredData = [
    createWebPageSchema({ name: FOUNDER_ID_SEO.title, description: FOUNDER_ID_SEO.description, url: FOUNDER_ID_PATH }),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Founder ID', url: FOUNDER_ID_PATH },
    ]),
    createFAQSchema(FOUNDER_ID_FAQS),
  ];

  return (
    <>
      <SEO
        title={FOUNDER_ID_SEO.title}
        description={FOUNDER_ID_SEO.description}
        keywords={FOUNDER_ID_SEO.keywords}
        url={FOUNDER_ID_PATH}
        image={FOUNDER_ID_SEO.image}
        structuredData={structuredData}
      />
      <div className="fid relative min-h-screen overflow-x-clip">
        <Navigation />
        <main>
          {/* Hero: the link, then the real card it shares. */}
          <section className="fid-ob fid-hero" aria-labelledby="founder-id-title">
            <div className="fid-rings" aria-hidden="true"><span /><span /><span /></div>
            <div className="fid-container fid-hero__inner">
              <ScrollReveal>
                <p className="fid-label fid-label--both">{FOUNDER_ID_HERO.eyebrow}</p>
              </ScrollReveal>
              <ScrollReveal delay={0.05}>
                <Title as="h1" id="founder-id-title" className="fid-h1" lead={FOUNDER_ID_HERO.titleLead} accent={FOUNDER_ID_HERO.titleAccent} />
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <p className="fid-lede">{FOUNDER_ID_HERO.lede}</p>
              </ScrollReveal>
              <ScrollReveal delay={0.15} className="flex w-full flex-col items-center gap-6">
                <div className="fid-claim">
                  <span className="fid-claim__link" aria-label={`Your link: ${FOUNDER_ID_EXAMPLE_LINK}`}>
                    <span>creatives-takeover.com/@</span>
                    <span>yourname</span>
                    <i className="fid-claim__caret" aria-hidden="true" />
                  </span>
                  {primaryCta('hero')}
                </div>
                <div className="fid-hero__actions">
                  {!user && <span>{FOUNDER_ID_HERO.note}</span>}
                  <a href={`#${FOUNDER_ID_SECTIONS.id}`}>
                    {FOUNDER_ID_HERO.secondaryCta}
                    <ArrowDown aria-hidden="true" />
                  </a>
                </div>
              </ScrollReveal>
              <ScrollReveal variant="scale" delay={0.2} className="flex w-full justify-center">
                <CardDeck caption={FOUNDER_ID_HERO.cardCaption} />
              </ScrollReveal>
            </div>
          </section>

          {/* Try it: the visitor's own card, live, and the link signup would give them. */}
          <section className="fid-section fid-try" aria-labelledby="founder-id-try">
            <div className="fid-container fid-try__grid">
              <ScrollReveal variant="slide-right">
                <div className="fid-try__form">
                  <p className="fid-label">{FOUNDER_ID_TRY.eyebrow}</p>
                  <Title id="founder-id-try" className="fid-h2" lead={FOUNDER_ID_TRY.title} accent={FOUNDER_ID_TRY.titleAccent} />
                  <p className="fid-lede">{FOUNDER_ID_TRY.lede}</p>
                  <div className="fid-fields">
                    <label className="fid-field" htmlFor="founder-id-try-name">
                      <span>{FOUNDER_ID_TRY.nameLabel}</span>
                      <input
                        id="founder-id-try-name"
                        type="text"
                        autoComplete="name"
                        maxLength={40}
                        placeholder={FOUNDER_ID_TRY.namePlaceholder}
                        value={tryName}
                        onChange={(event) => onTryName(event.target.value)}
                      />
                    </label>
                    <label className="fid-field" htmlFor="founder-id-try-project">
                      <span>{FOUNDER_ID_TRY.projectLabel}</span>
                      <input
                        id="founder-id-try-project"
                        type="text"
                        maxLength={60}
                        placeholder={FOUNDER_ID_TRY.projectPlaceholder}
                        value={tryProject}
                        onChange={(event) => setTryProject(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="fid-try__link" aria-live="polite">
                    <span className="fid-try__link-label">{FOUNDER_ID_TRY.linkLabel}</span>
                    <span className="fid-try__url">
                      creatives-takeover.com/@<strong>{predictedHandle ?? 'yourname'}</strong>
                    </span>
                    {baseHandle && predictedHandle && predictedHandle !== baseHandle && (
                      <span className="fid-try__note">{FOUNDER_ID_TRY.takenNote}</span>
                    )}
                  </div>
                  {primaryCta('try')}
                </div>
              </ScrollReveal>
              <ScrollReveal variant="slide-left" delay={0.1}>
                <div className="fid-try__card">
                  <IdCard person={tryPerson ?? undefined} className="fid-idcard--flat" />
                  <p className="fid-stage__caption">{FOUNDER_ID_TRY.numberNote}</p>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Made to be shared: four facts in one editorial row. */}
          <section className="fid-section">
            <div className="fid-container">
              <div className="fid-head">
                <ScrollReveal>
                  <div className="fid-head__title">
                    <p className="fid-label">{FOUNDER_ID_SHARE.eyebrow}</p>
                    <Title className="fid-h2" lead={FOUNDER_ID_SHARE.title} accent={FOUNDER_ID_SHARE.titleAccent} />
                  </div>
                </ScrollReveal>
                <ScrollReveal delay={0.08}>
                  <p className="fid-lede">{FOUNDER_ID_SHARE.lede}</p>
                </ScrollReveal>
              </div>
              <ScrollReveal>
                <div className="fid-facts">
                  {FOUNDER_ID_SHARE.items.map((item) => {
                    const Icon = FACT_ICONS[item.key];
                    return (
                      <div key={item.key} className="fid-fact">
                        <span className="fid-fact__icon"><Icon aria-hidden="true" /></span>
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </div>
                    );
                  })}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* What's inside: the parts scroll past, the screen stays and changes. */}
          <section id={FOUNDER_ID_SECTIONS.id} className="fid-section scroll-mt-24">
            <div className="fid-container">
              <div className="fid-head">
                <ScrollReveal>
                  <div className="fid-head__title">
                    <p className="fid-label">{FOUNDER_ID_SECTIONS.eyebrow}</p>
                    <Title className="fid-h2" lead={FOUNDER_ID_SECTIONS.title} accent={FOUNDER_ID_SECTIONS.titleAccent} />
                  </div>
                </ScrollReveal>
              </div>

              <div className="fid-show">
                <ol className="fid-show__parts">
                  {FOUNDER_ID_SECTIONS.items.map((item, index) => {
                    const shot = SECTION_SHOTS[item.key];
                    return (
                      <li
                        key={item.key}
                        ref={(element) => { partRefs.current[index] = element; }}
                        className={cn('fid-part', index === activePart && 'is-active')}
                      >
                        <p className="fid-label fid-label--plain">{item.label}</p>
                        <h3 className="fid-h3">{item.title}</h3>
                        <p className="fid-lede">{item.body}</p>
                        <ul>
                          {item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                        </ul>
                        {/* Below lg each part carries its own screen. */}
                        <div className="fid-part__screen mt-6">
                          <Device>
                            <div className="fid-device__screen">
                              <img src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} loading="lazy" decoding="async" />
                            </div>
                          </Device>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="fid-show__sticky">
                  <Device tag="Real Founder ID">
                    <div className="fid-device__screen fid-device__screen--stack">
                      {FOUNDER_ID_SECTIONS.items.map((item, index) => {
                        const shot = SECTION_SHOTS[item.key];
                        return (
                          <img
                            key={item.key}
                            src={shot.src}
                            width={shot.width}
                            height={shot.height}
                            alt={index === activePart ? shot.alt : ''}
                            aria-hidden={index !== activePart}
                            className={cn(index === activePart && 'is-active')}
                            loading="lazy"
                            decoding="async"
                          />
                        );
                      })}
                    </div>
                  </Device>
                  <div className="fid-tabs" role="group" aria-label="Parts of a Founder ID">
                    {FOUNDER_ID_SECTIONS.items.map((item, index) => (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={index === activePart}
                        className={cn(index === activePart && 'is-active')}
                        onClick={() => showPart(index)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* For programs: the cohort showcase, shown with the example cards. */}
          <section className="fid-section" aria-labelledby="founder-id-programs">
            <div className="fid-container fid-programs">
              <ScrollReveal variant="slide-right">
                <div className="fid-programs__text">
                  <p className="fid-label">{FOUNDER_ID_PROGRAMS.eyebrow}</p>
                  <Title id="founder-id-programs" className="fid-h2" lead={FOUNDER_ID_PROGRAMS.title} accent={FOUNDER_ID_PROGRAMS.titleAccent} />
                  <p className="fid-lede">{FOUNDER_ID_PROGRAMS.lede}</p>
                  <ul className="fid-checks">
                    {FOUNDER_ID_PROGRAMS.bullets.map((bullet) => (
                      <li key={bullet}><Check aria-hidden="true" />{bullet}</li>
                    ))}
                  </ul>
                  <Link
                    to={FOUNDER_ID_PROGRAMS.cta.href}
                    className="fid-btn fid-btn--outline"
                    onClick={() => captureEvent('founder_id_cta_clicked', { placement: 'programs', signed_in: Boolean(user) })}
                  >
                    {FOUNDER_ID_PROGRAMS.cta.label}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </ScrollReveal>
              <ScrollReveal variant="slide-left" delay={0.1}>
                <figure className="fid-frame">
                  <figcaption className="fid-frame__bar">
                    <span className="fid-device__dots" aria-hidden="true"><i /><i /><i /></span>
                    <span>{FOUNDER_ID_PROGRAMS.exampleLabel}</span>
                  </figcaption>
                  <div className="fid-mini-grid">
                    {FOUNDER_ID_EXAMPLE_CARDS.map((person) => (
                      <IdCard key={person.handle} person={person} className="fid-idcard--flat" label={`Example card: ${person.name}`} />
                    ))}
                  </div>
                </figure>
              </ScrollReveal>
            </div>
          </section>

          {/* FAQ: the questions that stop people from signing up. */}
          <section className="fid-section" aria-labelledby="founder-id-faq">
            <div className="fid-container fid-faq">
              <ScrollReveal>
                <div className="fid-head__title">
                  <p className="fid-label">{FOUNDER_ID_FAQ_SECTION.eyebrow}</p>
                  <Title id="founder-id-faq" className="fid-h2" lead={FOUNDER_ID_FAQ_SECTION.title} accent={FOUNDER_ID_FAQ_SECTION.titleAccent} />
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.08}>
                <div className="fid-faq__list">
                  {FOUNDER_ID_FAQS.map((faq) => (
                    <details
                      key={faq.question}
                      className="fid-faq__item"
                      onToggle={(event) => {
                        if ((event.currentTarget as HTMLDetailsElement).open) captureEvent('founder_id_faq_opened', { question: faq.question });
                      }}
                    >
                      <summary>
                        <span>{faq.question}</span>
                        <Plus aria-hidden="true" />
                      </summary>
                      <p>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Closing: the blank card and the claim. */}
          <section className="fid-ob fid-close" aria-labelledby="founder-id-close">
            <div className="fid-rings" aria-hidden="true"><span /><span /><span /></div>
            <div className="fid-container fid-close__grid">
              <ScrollReveal variant="slide-right">
                <div className="fid-close__text">
                  <p className="fid-label">{FOUNDER_ID_CLOSING.eyebrow}</p>
                  <Title id="founder-id-close" className="fid-h2" lead={FOUNDER_ID_CLOSING.title} accent={FOUNDER_ID_CLOSING.titleAccent} />
                  <p className="fid-lede">{FOUNDER_ID_CLOSING.body}</p>
                  <div className="fid-close__cta">
                    {primaryCta('closing')}
                    {!user && <p className="fid-close__note">{FOUNDER_ID_HERO.note}</p>}
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal variant="slide-left" delay={0.1}>
                <IdCard person={tryPerson ?? undefined} />
              </ScrollReveal>
            </div>
          </section>
        </main>
        <Footer />
      </div>
      <AccountSignupDialog
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        title={<>Create your{' '}<span className="bg-gradient-rgb bg-clip-text text-transparent">Founder ID.</span></>}
        subtitle="Create your free account. It takes about ten seconds."
        contextLabel="Your link will look like"
        contextValue={predictedHandle ? `creatives-takeover.com/@${predictedHandle}` : FOUNDER_ID_EXAMPLE_LINK}
        returnPath={POST_AUTH_DEST}
      />
    </>
  );
};

export default FounderIdPage;
