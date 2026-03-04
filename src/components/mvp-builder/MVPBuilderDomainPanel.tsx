import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  APP_BUILDER_A_TARGETS,
  CNAME_TARGET,
  type DomainVerificationCheck,
  useAppBuilderDomain,
} from '@/hooks/useAppBuilderDomain';
import { cn } from '@/lib/utils';

function CopyButton({ value }: { value: string }) {
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
      className="ml-1 rounded p-1 transition-colors hover:bg-muted"
      title="Copy"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

function formatExpectedValue(check: DomainVerificationCheck) {
  return check.expected.join(', ');
}

function DnsRow({
  label,
  recordType,
  host,
  value,
  verified,
}: {
  label: string;
  recordType: string;
  host: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {recordType}
          </p>
        </div>
        {verified !== undefined ? (
          <span
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium',
              verified ? 'text-emerald-600' : 'text-amber-600'
            )}
          >
            {verified ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {verified ? 'Verified' : 'Pending'}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <span className="text-muted-foreground">Host</span>
        <span className="flex items-center gap-1 break-all font-mono">
          {host}
          <CopyButton value={host} />
        </span>

        <span className="text-muted-foreground">Value</span>
        <span className="flex items-center gap-1 break-all font-mono">
          {value}
          <CopyButton value={value} />
        </span>
      </div>
    </div>
  );
}

interface MVPBuilderDomainPanelProps {
  projectId: string;
}

export const MVPBuilderDomainPanel: React.FC<MVPBuilderDomainPanelProps> = ({
  projectId,
}) => {
  const { record, isLoading, isSaving, isVerifying, saveDomain, verifyDomain, removeDomain } =
    useAppBuilderDomain(projectId);
  const [inputDomain, setInputDomain] = useState('');

  const handleSave = () => {
    const value = inputDomain.trim();
    if (!value) return;
    saveDomain(value);
    setInputDomain('');
  };

  const statusSummary = useMemo(() => {
    if (!record) return null;
    if (record.status === 'verified') {
      return {
        title: 'Custom domain connected',
        tone: 'success' as const,
        body: `DNS ownership and routing are both verified for ${record.config.connectedUrl}.`,
      };
    }

    if (record.txtVerified && !record.routingVerified) {
      return {
        title: 'Ownership verified, routing still pending',
        tone: 'warning' as const,
        body: 'Your TXT verification record is live, but the routing record has not propagated yet.',
      };
    }

    return {
      title: 'DNS records still pending',
      tone: 'warning' as const,
      body: 'Add the records exactly as shown below, then re-run verification after propagation.',
    };
  }, [record]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 shrink-0 text-primary/70" />
        <div>
          <p className="font-semibold text-foreground">Custom Domain</p>
          <p className="text-[11px] text-muted-foreground">
            Connect a domain you own to this MVP project and verify the DNS setup.
          </p>
        </div>
      </div>

      {!record && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-card/70 p-4">
          <div className="flex gap-2">
            <Input
              value={inputDomain}
              onChange={(event) => setInputDomain(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSave()}
              placeholder="app.yourdomain.com or yourdomain.com"
              className="h-9 text-xs"
              disabled={isSaving}
            />
            <Button
              size="sm"
              className="h-9 shrink-0"
              onClick={handleSave}
              disabled={!inputDomain.trim() || isSaving}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
            </Button>
          </div>

          <div className="space-y-1 text-[11px] text-muted-foreground">
            <p>Use the exact hostname you want your app to live on.</p>
            <p>
              For subdomains like <span className="font-mono text-foreground">app.yourdomain.com</span>,
              the system will generate a CNAME record.
            </p>
            <p>
              For apex domains like <span className="font-mono text-foreground">yourdomain.com</span>,
              the system will generate the A record values required for direct routing.
            </p>
          </div>
        </div>
      )}

      {record && statusSummary && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              {record.status === 'verified' ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              )}
              <div>
                <p className="text-xs font-medium text-foreground">{record.domain}</p>
                <p className="text-[10px] text-muted-foreground">
                  Project URL: {record.config.connectedUrl}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={removeDomain}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
              title="Remove domain"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div
            className={cn(
              'rounded-xl border px-4 py-3',
              statusSummary.tone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/8'
                : 'border-amber-500/30 bg-amber-500/8'
            )}
          >
            <p
              className={cn(
                'text-xs font-semibold',
                statusSummary.tone === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              )}
            >
              {statusSummary.title}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{statusSummary.body}</p>
            {record.lastCheckedAt ? (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Last checked: {new Date(record.lastCheckedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Step 1 - Add these DNS records</p>
            <p className="text-[11px] text-muted-foreground">
              Open your domain registrar or DNS provider, remove any conflicting records for this hostname,
              and add the records exactly as shown.
            </p>
          </div>

          <DnsRow
            label="Ownership verification"
            recordType="TXT"
            host={record.checks.txt.host}
            value={formatExpectedValue(record.checks.txt)}
            verified={record.txtVerified}
          />

          <DnsRow
            label={record.config.routingType === 'A' ? 'Live app routing' : 'Live app routing'}
            recordType={record.config.routingType}
            host={record.checks.routing.host}
            value={formatExpectedValue(record.checks.routing)}
            verified={record.routingVerified}
          />

          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground/90">Registrar notes</p>
            <div className="flex gap-1.5">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
              <p>Set TTL to automatic or the lowest available value to speed up propagation.</p>
            </div>
            <div className="flex gap-1.5">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
              <p>
                If your provider asks for a root host for the A record, use <span className="font-mono text-foreground">@</span>.
                The required apex target is {APP_BUILDER_A_TARGETS.join(', ')}.
              </p>
            </div>
            <div className="flex gap-1.5">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
              <p>
                If your provider asks for a CNAME target, point the hostname to <span className="font-mono text-foreground">{CNAME_TARGET}</span>.
              </p>
            </div>
            <div className="flex gap-1.5">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
              <p>DNS propagation usually starts within minutes, but some registrars can take up to 48 hours.</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Step 2 - Verify the configuration</p>
            <p className="text-[11px] text-muted-foreground">
              We will check both ownership and routing. The domain is marked connected only after both records are live.
            </p>
          </div>

          <Button onClick={verifyDomain} disabled={isVerifying} size="sm" className="w-full">
            {isVerifying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Checking DNS...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Verify DNS Records
              </>
            )}
          </Button>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">TXT verification</span>
                <span className={cn('font-medium', record.txtVerified ? 'text-emerald-600' : 'text-amber-600')}>
                  {record.txtVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              {record.checks.txt.found.length > 0 ? (
                <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                  Found: {record.checks.txt.found.join(', ')}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">No matching TXT record detected yet.</p>
              )}
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">Routing record</span>
                <span className={cn('font-medium', record.routingVerified ? 'text-emerald-600' : 'text-amber-600')}>
                  {record.routingVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              {record.checks.routing.found.length > 0 ? (
                <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                  Found: {record.checks.routing.found.join(', ')}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  No matching {record.config.routingType} record detected yet.
                </p>
              )}
            </div>
          </div>

          {record.status === 'verified' ? (
            <a
              href={record.config.connectedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open connected domain
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </>
      )}
    </div>
  );
};
