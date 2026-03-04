import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type DomainStatus = 'pending' | 'verified' | 'failed';
export type RoutingRecordType = 'A' | 'CNAME';

export interface DomainVerificationCheck {
  host: string;
  expected: string[];
  found: string[];
  passed: boolean;
  recordType: RoutingRecordType | 'TXT';
}

export interface DomainConfig {
  hostname: string;
  registrableDomain: string;
  isApex: boolean;
  txtHost: string;
  txtValue: string;
  routingType: RoutingRecordType;
  routingHost: string;
  routingValues: string[];
  connectedUrl: string;
}

export interface DomainRecord {
  id: string;
  domain: string;
  verificationToken: string;
  txtVerified: boolean;
  routingVerified: boolean;
  status: DomainStatus;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  config: DomainConfig;
  checks: {
    txt: DomainVerificationCheck;
    routing: DomainVerificationCheck;
  };
}

type AppBuilderDomainRow = {
  id: string;
  domain: string;
  verification_token: string;
  txt_verified: boolean;
  routing_verified?: boolean | null;
  status: DomainStatus;
  verified_at: string | null;
  last_checked_at?: string | null;
  txt_host?: string | null;
  txt_value?: string | null;
  routing_record_type?: RoutingRecordType | null;
  routing_host?: string | null;
  routing_values?: string[] | null;
  verification_details?: {
    txt?: Partial<DomainVerificationCheck>;
    routing?: Partial<DomainVerificationCheck>;
  } | null;
};

const KNOWN_TWO_LEVEL_SUFFIXES = new Set([
  'ac.uk',
  'co.jp',
  'co.kr',
  'co.nz',
  'co.uk',
  'com.au',
  'com.br',
  'com.mx',
  'com.tr',
  'gov.uk',
  'net.au',
  'org.au',
  'org.uk',
]);

export const CNAME_TARGET = 'apps.creativestakeover.com';
export const APP_BUILDER_A_TARGETS = ['76.76.21.21'];

function normalizeDomain(input: string) {
  const trimmed = input.toLowerCase().trim();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const hostname = withoutProtocol.split('/')[0]?.replace(/\.+$/, '') || '';

  if (!hostname || hostname.includes(' ') || !hostname.includes('.')) {
    return null;
  }

  if (!/^[a-z0-9.-]+$/.test(hostname)) {
    return null;
  }

  return hostname;
}

function getRegistrableDomain(hostname: string) {
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return hostname;

  const lastTwo = labels.slice(-2).join('.');
  const lastThree = labels.slice(-3).join('.');

  if (KNOWN_TWO_LEVEL_SUFFIXES.has(lastTwo) && labels.length >= 3) {
    return lastThree;
  }

  return lastTwo;
}

function buildDomainConfig(hostname: string, verificationToken: string): DomainConfig {
  const registrableDomain = getRegistrableDomain(hostname);
  const isApex = hostname === registrableDomain;

  return {
    hostname,
    registrableDomain,
    isApex,
    txtHost: `_ct-verify.${hostname}`,
    txtValue: `ct-app-verify=${verificationToken}`,
    routingType: isApex ? 'A' : 'CNAME',
    routingHost: hostname,
    routingValues: isApex ? APP_BUILDER_A_TARGETS : [CNAME_TARGET],
    connectedUrl: `https://${hostname}`,
  };
}

function createEmptyChecks(config: DomainConfig): DomainRecord['checks'] {
  return {
    txt: {
      host: config.txtHost,
      expected: [config.txtValue],
      found: [],
      passed: false,
      recordType: 'TXT',
    },
    routing: {
      host: config.routingHost,
      expected: config.routingValues,
      found: [],
      passed: false,
      recordType: config.routingType,
    },
  };
}

function mapRowToRecord(row: AppBuilderDomainRow): DomainRecord {
  const config = buildDomainConfig(row.domain, row.verification_token);
  const checks = createEmptyChecks(config);

  if (row.txt_host) checks.txt.host = row.txt_host;
  if (row.txt_value) checks.txt.expected = [row.txt_value];
  if (row.routing_host) checks.routing.host = row.routing_host;
  if (row.routing_record_type) checks.routing.recordType = row.routing_record_type;
  if (row.routing_values?.length) checks.routing.expected = row.routing_values;

  if (row.verification_details?.txt) {
    checks.txt = {
      ...checks.txt,
      ...row.verification_details.txt,
      expected: row.verification_details.txt.expected || checks.txt.expected,
      found: row.verification_details.txt.found || checks.txt.found,
      recordType: 'TXT',
      passed: row.verification_details.txt.passed ?? row.txt_verified,
    };
  } else {
    checks.txt.passed = row.txt_verified;
  }

  if (row.verification_details?.routing) {
    checks.routing = {
      ...checks.routing,
      ...row.verification_details.routing,
      expected: row.verification_details.routing.expected || checks.routing.expected,
      found: row.verification_details.routing.found || checks.routing.found,
      recordType:
        (row.verification_details.routing.recordType as RoutingRecordType | undefined) ||
        checks.routing.recordType,
      passed: row.verification_details.routing.passed ?? Boolean(row.routing_verified),
    };
  } else {
    checks.routing.passed = Boolean(row.routing_verified);
  }

  return {
    id: row.id,
    domain: row.domain,
    verificationToken: row.verification_token,
    txtVerified: row.txt_verified,
    routingVerified: Boolean(row.routing_verified),
    status: row.status,
    verifiedAt: row.verified_at,
    lastCheckedAt: row.last_checked_at ?? null,
    config,
    checks,
  };
}

export function useAppBuilderDomain(projectId: string) {
  const { user } = useAuth();
  const [record, setRecord] = useState<DomainRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('app_builder_domains')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      setRecord(data ? mapRowToRecord(data as AppBuilderDomainRow) : null);
    } catch {
      setRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveDomain = useCallback(
    async (domain: string) => {
      if (!user) {
        toast.error('Sign in to connect a custom domain');
        return;
      }

      const normalized = normalizeDomain(domain);
      if (!normalized) {
        toast.error('Enter a valid domain or subdomain');
        return;
      }

      setIsSaving(true);
      try {
        const token = btoa(`${projectId}:${user.id}`)
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 32);
        const config = buildDomainConfig(normalized, token);

        const payload = {
          project_id: projectId,
          user_id: user.id,
          domain: normalized,
          verification_token: token,
          txt_verified: false,
          routing_verified: false,
          status: 'pending' as const,
          verified_at: null,
          last_checked_at: null,
          txt_host: config.txtHost,
          txt_value: config.txtValue,
          routing_record_type: config.routingType,
          routing_host: config.routingHost,
          routing_values: config.routingValues,
          verification_details: createEmptyChecks(config),
        };

        const { data, error } = await (supabase as any)
          .from('app_builder_domains')
          .upsert(payload, { onConflict: 'project_id' })
          .select('*')
          .single();

        if (error) throw error;

        setRecord(mapRowToRecord(data as AppBuilderDomainRow));
        toast.success('Domain saved. Add the DNS records below, then verify.');
      } catch (error: any) {
        console.error('saveDomain error:', error);

        const message =
          error?.code === '23505'
            ? 'That domain is already connected to another project.'
            : 'Failed to save domain. Please try again.';

        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, user]
  );

  const verifyDomain = useCallback(async () => {
    if (!record || !user) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'app-builder-domain-verify',
        {
          body: {
            projectId,
            domain: record.domain,
            verificationToken: record.verificationToken,
          },
        }
      );

      if (error) throw error;
      if (!data?.ok) {
        toast.error(data?.error || 'Verification check failed. Please try again.');
        return;
      }

      const nextRecord: DomainRecord = {
        ...record,
        txtVerified: Boolean(data.txtVerified),
        routingVerified: Boolean(data.routingVerified),
        status: data.status as DomainStatus,
        verifiedAt: data.verified ? data.verifiedAt || new Date().toISOString() : null,
        lastCheckedAt: data.lastCheckedAt || new Date().toISOString(),
        checks: {
          txt: {
            host: data.checks?.txt?.host || record.config.txtHost,
            expected: data.checks?.txt?.expected || [record.config.txtValue],
            found: data.checks?.txt?.found || [],
            passed: Boolean(data.checks?.txt?.passed),
            recordType: 'TXT',
          },
          routing: {
            host: data.checks?.routing?.host || record.config.routingHost,
            expected: data.checks?.routing?.expected || record.config.routingValues,
            found: data.checks?.routing?.found || [],
            passed: Boolean(data.checks?.routing?.passed),
            recordType:
              (data.checks?.routing?.recordType as RoutingRecordType | undefined) ||
              record.config.routingType,
          },
        },
      };

      setRecord(nextRecord);

      if (data.verified) {
        toast.success('Domain verified. Your custom domain is now connected.');
      } else {
        toast.info('DNS records are still propagating. Keep the records live and retry.');
      }
    } catch (error) {
      console.error('verifyDomain error:', error);
      toast.error('Could not verify DNS right now. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [projectId, record, user]);

  const removeDomain = useCallback(async () => {
    if (!record) return;

    try {
      await (supabase as any).from('app_builder_domains').delete().eq('id', record.id);
      setRecord(null);
      toast.success('Custom domain removed');
    } catch {
      toast.error('Failed to remove custom domain');
    }
  }, [record]);

  return {
    record,
    isLoading,
    isSaving,
    isVerifying,
    saveDomain,
    verifyDomain,
    removeDomain,
  };
}
