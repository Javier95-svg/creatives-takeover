import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, Hash, Link2, RefreshCw, Share2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { AccountSignupDialog } from '@/components/auth/AccountSignupDialog';
import SEO, { createBreadcrumbSchema, createWebPageSchema } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePageAnalytics } from '@/hooks/usePageAnalytics';
import { useCTAAttribution } from '@/hooks/useCTAAttribution';
import { captureEvent } from '@/lib/analytics';
import { isFounderIdAccount } from '@/lib/founderId';
import { cn } from '@/lib/utils';
import {
  FOUNDER_ID_CLOSING,
  FOUNDER_ID_EXAMPLE_CARDS,
  FOUNDER_ID_EXAMPLE_LINK,
  FOUNDER_ID_HERO,
  FOUNDER_ID_PATH,
  FOUNDER_ID_SECTIONS,
  FOUNDER_ID_SEO,
  FOUNDER_ID_SHARE,
} from '@/data/founderIdPage';
import profileShot from '@/assets/founder-id/profile.webp';
import supportShot from '@/assets/founder-id/support.webp';
import updatesShot from '@/assets/founder-id/updates.webp';
import '@/components/founder-id/founder-id.css';

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

type CardPerson = (typeof FOUNDER_ID_EXAMPLE_CARDS)[number];

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

/**
 * A Founder ID card in HTML, laid out like the real 1200×630 card
 * (api/_founder-id-card.tsx). Without a person it is the blank card, still
 * waiting for a name and a number.
 */
const IdCard = ({ person }: { person?: CardPerson }) => (
  <div
    className="fid-idcard"
    role="img"
    aria-label={person
      ? `Example Founder ID card: ${person.name}, @${person.handle}, founder number ${person.number}, ${person.stage} stage, building ${person.tagline.toLowerCase()}.`
      : 'A blank Founder ID card: your name, @yourname, and a founder number still to be assigned.'}
  >
    <span className="fid-idcard__ring" />
    <span className="fid-idcard__ring" />
    <div className="fid-idcard__body" aria-hidden="true">
      <div className="fid-idcard__top">
        <span className="fid-idcard__brand">FOUNDER ID</span>
        <span className="fid-idcard__small">• {(person?.stage ?? 'Your stage').toUpperCase()}</span>
      </div>
      <span className="fid-idcard__small fid-idcard__label">FOUNDER NO.</span>
      <span className="fid-idcard__number">
        {person
          ? person.number
          : Array.from({ length: 6 }, (_, index) => <span key={index} className="fid-idcard__slot">&nbsp;</span>)}
      </span>
      <span className="fid-idcard__name">{(person?.name ?? 'Your name').toUpperCase()}</span>
      <span className="fid-idcard__handle">@{person?.handle ?? 'yourname'}</span>
      <div className="fid-idcard__foot">
        <span className="fid-idcard__who">
          {person && <span className="fid-idcard__mono">{initials(person.name)}</span>}
          <span>
            <span className="fid-idcard__small">BUILDING IN PUBLIC</span>
            <span className="fid-idcard__value">{person?.tagline ?? 'What you’re building'}</span>
          </span>
        </span>
        <div>
          <span className="fid-idcard__small">FOLLOW THE JOURNEY</span>
          <span className="fid-idcard__value">creatives-takeover.com/@{person?.handle ?? 'yourname'}</span>
        </div>
      </div>
    </div>
  </div>
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
              <IdCard person={person} />
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
                <IdCard />
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
        contextValue={FOUNDER_ID_EXAMPLE_LINK}
        returnPath={POST_AUTH_DEST}
      />
    </>
  );
};

export default FounderIdPage;
