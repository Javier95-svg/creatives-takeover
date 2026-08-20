import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, ShieldCheck, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppBuilderDomain } from '@/hooks/useAppBuilderDomain';
import { supabase } from '@/integrations/supabase/client';
import { buildPublicAppUrl } from '@/lib/mvp-builder/publish';
import { cn } from '@/lib/utils';

function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Copy link"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-success" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy link
        </>
      )}
    </button>
  );
}

interface MVPBuilderPublishPanelProps {
  projectId: string;
  /** The reserved public link ({slug}.creativestakeover.app), if the project has been published. */
  publishedUrl: string | null;
}

/**
 * Shows the project's live address in the Publish panel. When a custom domain is
 * connected and verified, that takes precedence and is shown instead of the
 * auto-generated subdomain link. Otherwise the {slug}.creativestakeover.app link
 * is shown with a copy-to-clipboard action.
 */
export const MVPBuilderPublishPanel: React.FC<MVPBuilderPublishPanelProps> = ({
  projectId,
  publishedUrl,
}) => {
  const { record } = useAppBuilderDomain(projectId);
  const customDomainConnected = record?.status === 'verified';

  // The published address is authoritative in the DB: `subdomain_slug` is locked on
  // first publish and never cleared (the live site is served off it). Read it here
  // directly so the link always shows, even if the in-memory/localStorage session
  // lost its `deployment_url` pointer (e.g. a stale cache from before a fix).
  const [dbPublishedUrl, setDbPublishedUrl] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [searchIndexingRequested, setSearchIndexingRequested] = useState(false);
  const [searchReviewStatus, setSearchReviewStatus] = useState<'not_requested' | 'pending' | 'approved' | 'rejected'>('not_requested');
  const [savingSeo, setSavingSeo] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setDbPublishedUrl(null);
      return;
    }
    void (async () => {
      const { data } = await (supabase as any)
        .from('mvp_projects')
        .select('subdomain_slug, deployment_url, title, seo_title, seo_description, search_indexing_requested, search_indexing_review_status')
        .eq('id', projectId)
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as {
        subdomain_slug?: string | null;
        deployment_url?: string | null;
        title?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        search_indexing_requested?: boolean | null;
        search_indexing_review_status?: 'not_requested' | 'pending' | 'approved' | 'rejected' | null;
      };
      const resolved =
        (typeof row.deployment_url === 'string' && row.deployment_url) ||
        (typeof row.subdomain_slug === 'string' && row.subdomain_slug
          ? buildPublicAppUrl(row.subdomain_slug)
          : null);
      setDbPublishedUrl(resolved || null);
      setSeoTitle(row.seo_title || row.title || '');
      setSeoDescription(row.seo_description || '');
      setSearchIndexingRequested(row.search_indexing_requested === true);
      setSearchReviewStatus(row.search_indexing_review_status || 'not_requested');
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Prefer the DB-resolved link; fall back to the freshly-published in-memory URL.
  const effectivePublishedUrl = dbPublishedUrl ?? publishedUrl;

  // Nothing to surface yet — the toolbar "Publish" button is the call to action.
  if (!customDomainConnected && !effectivePublishedUrl) {
    return null;
  }

  const displayUrl = customDomainConnected ? record!.config.connectedUrl : effectivePublishedUrl!;
  const displayHost = displayUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const saveSearchVisibility = async () => {
    const nextTitle = seoTitle.trim();
    const nextDescription = seoDescription.trim();
    if (searchIndexingRequested && (nextTitle.length < 10 || nextTitle.length > 60)) return;
    if (searchIndexingRequested && (nextDescription.length < 50 || nextDescription.length > 160)) return;
    setSavingSeo(true);
    const { error } = await (supabase as any)
      .from('mvp_projects')
      .update({
        seo_title: nextTitle || null,
        seo_description: nextDescription || null,
        search_indexing_requested: searchIndexingRequested,
      })
      .eq('id', projectId);
    setSavingSeo(false);
    if (!error) {
      setSearchReviewStatus(searchIndexingRequested ? 'pending' : 'not_requested');
    }
  };

  return (
    <div className="border-b border-border/50 px-4 py-3">
      <div className="rounded-xl border border-success/30 bg-success/8 p-3">
        <div className="flex items-center gap-2">
          {customDomainConnected ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
          ) : (
            <Globe className="h-4 w-4 shrink-0 text-success" />
          )}
          <p className="text-xs font-semibold text-success dark:text-success">
            {customDomainConnected ? 'Live on your custom domain' : 'Your app is published'}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex min-w-0 items-center gap-1 break-all font-mono text-xs font-medium text-primary hover:underline'
            )}
          >
            {displayHost}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          <CopyLinkButton value={displayUrl} />
        </div>

        {!customDomainConnected && (
          <p className="mt-2 text-caption text-muted-foreground">
            Connect a custom domain below to use your own address instead.
          </p>
        )}
        <Link
          to={`/tech-stack?mvp=${encodeURIComponent(projectId)}`}
          className="mt-3 inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline"
        >
          <Wrench className="h-3.5 w-3.5" />
          Review optional implementation stack
        </Link>
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-background/70 p-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-foreground">Search and AI visibility</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Opt in to review for Google and AI answer engines. The page remains noindex until approved.
            </p>
          </div>
          <input
            type="checkbox"
            checked={searchIndexingRequested}
            onChange={(event) => setSearchIndexingRequested(event.target.checked)}
            aria-label="Request search indexing"
            className="mt-1 h-4 w-4"
          />
        </div>
        <div className="mt-3 space-y-2">
          <label className="block text-caption font-medium text-muted-foreground">
            SEO title (10–60 characters)
            <input
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
              maxLength={60}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground"
            />
          </label>
          <label className="block text-caption font-medium text-muted-foreground">
            SEO description (50–160 characters)
            <textarea
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              maxLength={160}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-caption capitalize text-muted-foreground">Review: {searchReviewStatus.replace('_', ' ')}</p>
          <button
            type="button"
            onClick={saveSearchVisibility}
            disabled={savingSeo}
            className="rounded-md bg-primary px-3 py-1.5 text-caption font-semibold text-primary-foreground disabled:opacity-50"
          >
            {savingSeo ? 'Saving…' : 'Save visibility'}
          </button>
        </div>
      </div>
    </div>
  );
};
