import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DomainRecord {
  id: string;
  domain: string;
  verificationToken: string;
  txtVerified: boolean;
  status: 'pending' | 'verified' | 'failed';
  verifiedAt: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const VERIFY_URL =
  'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/app-builder-domain-verify';

export const CNAME_TARGET = 'apps.creativestakeover.com';

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAppBuilderDomain(projectId: string) {
  const { user } = useAuth();
  const [record, setRecord] = useState<DomainRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Load existing domain for this project ──────────────────────────────────

  const load = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('app_builder_domains')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (data) {
        setRecord({
          id: data.id,
          domain: data.domain,
          verificationToken: data.verification_token,
          txtVerified: data.txt_verified,
          status: data.status,
          verifiedAt: data.verified_at,
        });
      } else {
        setRecord(null);
      }
    } catch {
      // Ignore — table may not exist in local dev
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save / update domain ───────────────────────────────────────────────────

  const saveDomain = useCallback(
    async (domain: string) => {
      if (!user) {
        toast.error('Sign in to connect a custom domain');
        return;
      }
      const normalized = domain
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      if (!normalized) return;

      setIsSaving(true);
      try {
        // Derive a stable 32-char alphanumeric token from projectId
        const token = btoa(`${projectId}:${user.id}`)
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 32);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('app_builder_domains')
          .upsert(
            {
              project_id: projectId,
              user_id: user.id,
              domain: normalized,
              verification_token: token,
              txt_verified: false,
              status: 'pending',
            },
            { onConflict: 'project_id' }
          )
          .select()
          .single();

        if (error) throw error;

        setRecord({
          id: data.id,
          domain: data.domain,
          verificationToken: data.verification_token,
          txtVerified: data.txt_verified,
          status: data.status,
          verifiedAt: data.verified_at,
        });
        toast.success('Domain saved — add the DNS records shown below.');
      } catch (err) {
        console.error('saveDomain error:', err);
        toast.error('Failed to save domain. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [user, projectId]
  );

  // ── Verify DNS propagation ─────────────────────────────────────────────────

  const verifyDomain = useCallback(async () => {
    if (!record) return;
    setIsVerifying(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          projectId,
          domain: record.domain,
          verificationToken: record.verificationToken,
          userId: user?.id ?? null,
        }),
      });

      const result = await res.json();

      if (result.ok) {
        setRecord((prev) =>
          prev
            ? {
                ...prev,
                txtVerified: result.txtVerified,
                status: result.status,
                verifiedAt: result.verified
                  ? new Date().toISOString()
                  : prev.verifiedAt,
              }
            : prev
        );

        if (result.verified) {
          toast.success('Domain verified! Your custom domain is connected.');
        } else {
          toast.info(
            'DNS records not detected yet. Propagation can take up to 48 hours.'
          );
        }
      } else {
        toast.error('Verification check failed. Please try again.');
      }
    } catch {
      toast.error('Could not reach verification service. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [record, projectId, user]);

  // ── Remove domain ──────────────────────────────────────────────────────────

  const removeDomain = useCallback(async () => {
    if (!record) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('app_builder_domains')
        .delete()
        .eq('id', record.id);
      setRecord(null);
      toast.success('Custom domain removed');
    } catch {
      toast.error('Failed to remove domain');
    }
  }, [record]);

  return {
    record,
    isLoading,
    isVerifying,
    isSaving,
    saveDomain,
    verifyDomain,
    removeDomain,
  };
}
