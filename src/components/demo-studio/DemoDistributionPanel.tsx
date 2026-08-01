import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Check, Copy, ExternalLink, Radar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCustomerDiscovery } from '@/hooks/useCustomerDiscovery';
import { captureEvent } from '@/lib/analytics';

/**
 * Publishing a demo used to be the end of the road: the founder got a URL and no
 * indication of where to send it. The whole pre-build promise ("prospects react,
 * commit, or reject") depends on prospects arriving, and a pre-build founder has no
 * audience yet. PMF Discovery already finds the communities and people discussing
 * this exact problem — this surfaces that run at the moment the link exists.
 */

const MAX_COMMUNITIES = 4;
const MAX_PEOPLE = 5;

interface DemoDistributionPanelProps {
  shareUrl: string;
  demoTitle: string | null;
}

export default function DemoDistributionPanel({ shareUrl, demoTitle }: DemoDistributionPanelProps) {
  const { discovery } = useCustomerDiscovery();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const communities = (discovery?.communities ?? []).slice(0, MAX_COMMUNITIES);
  const people = (discovery?.people ?? []).slice(0, MAX_PEOPLE);
  const hasTargets = communities.length > 0 || people.length > 0;

  // Seeded from Discovery's own DM template so the outreach language matches the
  // pain it actually found, with the live demo link appended.
  const defaultMessage = useMemo(() => {
    const base = discovery?.dmTemplate?.trim();
    const product = demoTitle?.trim() || discovery?.productName?.trim() || 'something';
    if (base) return `${base}\n\nHere is a 60-second walkthrough: ${shareUrl}`;
    return [
      `I am working on ${product} and I am trying to find out whether the problem is worth solving before I build it.`,
      '',
      `I put together a short interactive walkthrough — no signup needed: ${shareUrl}`,
      '',
      'If you have two minutes, I would genuinely value knowing whether this looks useful or irrelevant to you.',
    ].join('\n');
  }, [discovery?.dmTemplate, discovery?.productName, demoTitle, shareUrl]);

  const outreachMessage = message ?? defaultMessage;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(outreachMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      captureEvent('demo_distribution_message_copied', {
        has_discovery: Boolean(discovery?.id),
        community_count: communities.length,
        people_count: people.length,
      });
      toast.success('Outreach message copied.');
    } catch {
      toast.error('Could not copy the message.');
    }
  };

  if (!hasTargets) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <Radar className="h-4 w-4 text-primary" /> Now find people to show it to
        </h4>
        <p className="text-xs leading-5 text-muted-foreground">
          A published demo only becomes evidence once real prospects react to it. Customer Discovery
          finds the communities and people already discussing your problem, and every reaction you log
          counts toward your PMF decision.
        </p>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/pmf-lab?mode=discover">
            Find customers to talk to
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <Radar className="h-4 w-4 text-primary" /> Share it where your customers already are
        </h4>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          From your Customer Discovery run. Reactions here become verified demand evidence in PMF Lab.
        </p>
      </div>

      {communities.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Communities</p>
          <ul className="space-y-1.5">
            {communities.map((community) => (
              <li key={community.name} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{community.name}</p>
                  {community.howToEngage && (
                    <p className="text-xs leading-5 text-muted-foreground">{community.howToEngage}</p>
                  )}
                </div>
                {community.url && (
                  <a
                    href={community.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground transition hover:text-foreground"
                    aria-label={`Open ${community.name}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {people.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" />
            People who described this problem
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {people.map((person) => (
              <li key={`${person.username}-${person.permalink}`}>
                <a
                  href={person.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition hover:bg-muted"
                >
                  {person.subreddit ? `u/${person.username}` : person.username}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Outreach message</p>
        <Textarea
          rows={6}
          value={outreachMessage}
          onChange={(event) => setMessage(event.target.value)}
          className="text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={copyMessage}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy message'}
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link to="/pmf-lab?step=interviews">
              Log what they said
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
