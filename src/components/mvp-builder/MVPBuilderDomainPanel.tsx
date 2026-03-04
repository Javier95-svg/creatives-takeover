import React, { useState } from 'react';
import {
  Globe,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppBuilderDomain, CNAME_TARGET } from '@/hooks/useAppBuilderDomain';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <button
      onClick={copy}
      className="ml-1 p-1 rounded hover:bg-muted transition-colors shrink-0"
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

interface DnsRowProps {
  type: string;
  host: string;
  value: string;
  verified?: boolean;
}
function DnsRow({ type, host, value, verified }: DnsRowProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
          {type}
        </span>
        {verified !== undefined && (
          <span
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium',
              verified ? 'text-emerald-500' : 'text-amber-500'
            )}
          >
            {verified ? (
              <Check className="h-3 w-3" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {verified ? 'Verified' : 'Pending'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <span className="text-muted-foreground">Host</span>
        <span className="flex items-center gap-1 font-mono break-all">
          {host}
          <CopyButton value={host} />
        </span>
        <span className="text-muted-foreground">Value</span>
        <span className="flex items-center gap-1 font-mono break-all">
          {value}
          <CopyButton value={value} />
        </span>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface MVPBuilderDomainPanelProps {
  projectId: string;
}

export const MVPBuilderDomainPanel: React.FC<MVPBuilderDomainPanelProps> = ({
  projectId,
}) => {
  const { record, isLoading, isVerifying, isSaving, saveDomain, verifyDomain, removeDomain } =
    useAppBuilderDomain(projectId);

  const [inputDomain, setInputDomain] = useState('');

  const handleSave = () => {
    const val = inputDomain.trim();
    if (val) {
      saveDomain(val);
      setInputDomain('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const isVerified = record?.status === 'verified';

  return (
    <div className="flex flex-col gap-4 p-4 text-sm overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary/70 shrink-0" />
        <div>
          <p className="font-semibold text-foreground">Custom Domain</p>
          <p className="text-[11px] text-muted-foreground">
            Connect your own domain to this project
          </p>
        </div>
      </div>

      {/* ── No domain yet: enter domain ── */}
      {!record && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={inputDomain}
              onChange={(e) => setInputDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="yourdomain.com or www.yourdomain.com"
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
          <p className="text-[11px] text-muted-foreground/70">
            Enter a domain you own. We'll generate the DNS records you need to add at your registrar.
          </p>
        </div>
      )}

      {/* ── Domain saved: show DNS records + verify ── */}
      {record && (
        <>
          {/* Domain pill + remove */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/50 px-3 py-2">
            <div className="flex items-center gap-2">
              {isVerified ? (
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span className="font-medium text-xs">{record.domain}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  isVerified
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600'
                )}
              >
                {isVerified ? 'Connected' : 'Pending'}
              </span>
            </div>
            <button
              onClick={removeDomain}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
              title="Remove domain"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Success state */}
          {isVerified && (
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3 flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Domain verified successfully
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500/80">
                  Your domain is connected. CNAME routing will be active once
                  hosting infrastructure is provisioned.
                </p>
              </div>
            </div>
          )}

          {/* DNS Records */}
          {!isVerified && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Step 1 — Add DNS records</p>
                <p className="text-[11px] text-muted-foreground">
                  Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add
                  these two records:
                </p>
              </div>

              <DnsRow
                type="TXT — Ownership verification"
                host={`_ct-verify.${record.domain}`}
                value={`ct-app-verify=${record.verificationToken}`}
                verified={record.txtVerified}
              />

              <DnsRow
                type="CNAME — Domain routing"
                host={`www.${record.domain}`}
                value={CNAME_TARGET}
              />

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/80">Things to know:</p>
                <ul className="space-y-0.5 list-none">
                  <li className="flex gap-1.5">
                    <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                    DNS propagation can take up to 48 hours.
                  </li>
                  <li className="flex gap-1.5">
                    <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                    Verification requires only the TXT record; CNAME is for live routing.
                  </li>
                  <li className="flex gap-1.5">
                    <ChevronRight className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                    Use the exact host values shown — including the underscore prefix on the TXT record.
                  </li>
                </ul>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Step 2 — Verify your domain
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Once you've added the records, click below. You can check multiple times.
                </p>
              </div>

              <Button
                onClick={verifyDomain}
                disabled={isVerifying}
                size="sm"
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Checking DNS…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    Verify DNS Records
                  </>
                )}
              </Button>
            </>
          )}

          {/* Re-verify button when already verified */}
          {isVerified && (
            <Button
              variant="outline"
              size="sm"
              onClick={verifyDomain}
              disabled={isVerifying}
              className="w-full text-xs"
            >
              {isVerifying ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              )}
              Re-check DNS
            </Button>
          )}
        </>
      )}
    </div>
  );
};
