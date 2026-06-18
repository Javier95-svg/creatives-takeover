import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Globe, ShieldCheck } from 'lucide-react';
import { useAppBuilderDomain } from '@/hooks/useAppBuilderDomain';
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

  // Nothing to surface yet — the toolbar "Publish" button is the call to action.
  if (!customDomainConnected && !publishedUrl) {
    return null;
  }

  const displayUrl = customDomainConnected ? record!.config.connectedUrl : publishedUrl!;
  const displayHost = displayUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

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
      </div>
    </div>
  );
};
