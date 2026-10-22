import type { ComponentType, ReactNode } from 'react';
import { ExternalLink, FileText, Globe, Instagram, Linkedin, Rocket, Users2, Youtube } from 'lucide-react';

interface StartupLinks {
  pitchDeck?: string;
  waitlist?: string;
  demo?: string;
  website?: string;
  loom?: string;
}

interface SocialLinks {
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  github: string | null;
  instagram: string | null;
  youtube?: string | null;
}

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const STARTUP_LINKS: Array<[keyof StartupLinks, string, ComponentType<{ className?: string }>]> = [
  ['website', 'Website', Globe],
  ['demo', 'Demo', Rocket],
  ['loom', 'Loom Presentation', ExternalLink],
  ['pitchDeck', 'Pitch Deck', FileText],
  ['waitlist', 'Waitlist', Users2],
];
const linkLabel = (label: string) => label === 'Loom Presentation' ? 'Loom' : label;

/**
 * Project resources and personal social profiles stay distinct in the hero.
 */
// Founders type these links themselves; only web addresses become links.
const webUrl = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null);

export function ProfileLinks({ startupLinks, social }: { startupLinks: StartupLinks | null; social: SocialLinks }) {
  const projectWebsite = webUrl(startupLinks?.website) ?? webUrl(social.website);
  const startup = STARTUP_LINKS.filter(([key]) => key !== 'website' && Boolean(webUrl(startupLinks?.[key])));
  if (projectWebsite) startup.unshift(['website', 'Website', Globe]);
  const candidates: Array<[string | null, string, ReactNode]> = [
    [webUrl(social.linkedin), 'LinkedIn', <Linkedin key="l" className="h-5 w-5" aria-hidden="true" />],
    [webUrl(social.twitter), 'X', <XIcon key="x" className="h-5 w-5" />],
    [webUrl(social.github), 'GitHub', <GitHubIcon key="g" className="h-5 w-5" />],
    [webUrl(social.instagram), 'Instagram', <Instagram key="i" className="h-5 w-5" aria-hidden="true" />],
    [webUrl(social.youtube), 'YouTube', <Youtube key="y" className="h-5 w-5" aria-hidden="true" />],
  ];
  const socials = candidates.filter((item): item is [string, string, ReactNode] => item[0] !== null);

  if (startup.length === 0 && socials.length === 0) return null;

  return (
    <div className={`mb-5 grid gap-4 ${startup.length > 0 && socials.length > 0 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
      {startup.length > 0 && (
        <section aria-label="Project links" className="flex min-w-0 flex-col gap-2.5">
          <h3 className="border-b border-primary/25 pb-1.5 text-xs font-semibold uppercase tracking-wider text-primary">Project links</h3>
          <div className="flex flex-wrap content-start justify-start gap-2">
            {startup.map(([key, label, Icon]) => (
              <a key={key} href={(key === 'website' ? projectWebsite : webUrl(startupLinks?.[key]))!} target="_blank" rel="noopener noreferrer" title={label}
                aria-label={label}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border/70 px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {linkLabel(label)}
              </a>
            ))}
          </div>
        </section>
      )}
      {socials.length > 0 && (
        <section aria-label="Social links" className="flex min-w-0 flex-col gap-2.5">
          <h3 className="border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Social links</h3>
          <div className="flex flex-wrap items-center justify-start gap-2">
            {socials.map(([href, label, icon]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border/70 px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span>{label}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
