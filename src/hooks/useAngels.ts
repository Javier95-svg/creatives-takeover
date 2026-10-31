import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AngelInvestor, CreateAngelInput } from '@/types/angel';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PUBLIC_LIST_CACHE } from '@/lib/publicListCache';
import { useAuth } from '@/contexts/AuthContext';

// What a card shows to everyone. Contact details (email, LinkedIn, X) are a
// Pro feature, so they are not part of the public list: Pro members and admins
// get them from get_angel_contacts_v1 (useAngelContacts).
const ANGEL_CARD_COLUMNS = 'id, name, picture, firm_name, investment_stages, sectors, website_url, is_active, created_at, updated_at';

type AngelContacts = Pick<AngelInvestor, 'id' | 'email' | 'linkedin_url' | 'twitter_x_url'>;

async function fetchAngelContacts(ids?: string[]): Promise<AngelContacts[]> {
  const { data, error } = await (supabase as any).rpc('get_angel_contacts_v1', ids ? { p_ids: ids } : {});
  if (!error) return (data ?? []) as AngelContacts[];
  // Until 20261031100000 is applied the function does not exist and the
  // columns are still readable, so read them directly.
  if (error.code !== 'PGRST202') throw error;
  const base = (supabase as any).from('angel_investors').select('id, email, linkedin_url, twitter_x_url');
  const fallback = await (ids ? base.in('id', ids) : base.eq('is_active', true));
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []) as AngelContacts[];
}

/** Contact details by investor id; empty unless `enabled` (Pro or admin). */
export function useAngelContacts(enabled: boolean) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['angel-contacts', user?.id],
    enabled: enabled && Boolean(user),
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchAngelContacts(),
  });
  return useMemo(() => new Map((data ?? []).map((contact) => [contact.id, contact])), [data]);
}

// Helper function to format error messages
const formatErrorMessage = (error: any, defaultMessage: string): string => {
  const errorMessage = error?.message || error?.toString() || '';
  const errorCode = error?.code || error?.hint || '';

  if (errorMessage.includes('schema cache') ||
      errorMessage.includes('Could not find the table') ||
      (errorMessage.includes('relation') && errorMessage.includes('does not exist'))) {
    return 'Database table not found. Please ensure migrations have been applied.';
  }

  if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
    return `Database schema error: ${errorMessage}. Please ensure all migrations have been applied.`;
  }

  if (errorCode === '42501' ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('row-level security') ||
      errorMessage.includes('new row violates row-level security')) {
    return 'Permission denied. Please check your access rights.';
  }

  if (errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (errorMessage.includes('violates') || errorMessage.includes('constraint')) {
    return `Database constraint error: ${errorMessage}`;
  }

  return errorMessage || defaultMessage;
};

export const useAngels = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdminRole();
  const [loading, setLoading] = useState(false);

  // Fetch all active angel investors
  const fetchAngels = useCallback(async (): Promise<AngelInvestor[]> => {
    try {
      setLoading(true);

      return await queryClient.fetchQuery({
        queryKey: ['public-angels', 'list'],
        ...PUBLIC_LIST_CACHE,
        queryFn: async ({ signal }) => {
          const { data, error } = await (supabase as any)
            .from('angel_investors').select(ANGEL_CARD_COLUMNS).eq('is_active', true)
            .order('name', { ascending: true }).abortSignal(signal);
          if (error) throw error;
          return (data || []) as AngelInvestor[];
        },
      });
    } catch (error: any) {
      console.error('Error fetching angel investors:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to load angel investors');
      toast.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  // Fetch single angel investor by ID
  const fetchAngelById = useCallback(async (id: string): Promise<AngelInvestor | null> => {
    try {
      setLoading(true);

      const [{ data, error }, contacts] = await Promise.all([
        (supabase as any)
          .from('angel_investors')
          .select(ANGEL_CARD_COLUMNS)
          .eq('id', id)
          .maybeSingle(),
        fetchAngelContacts([id]),
      ]);

      if (error) throw error;

      return data ? { ...data, ...contacts[0] } as AngelInvestor : null;
    } catch (error: any) {
      console.error('Error fetching angel investor:', {
        id,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to load angel investor');
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create angel investor (admin only)
  const createAngel = useCallback(async (input: CreateAngelInput): Promise<AngelInvestor | null> => {
    if (!isAdmin) {
      toast.error('Only admins can create angel investors');
      return null;
    }

    try {
      setLoading(true);

      const insertData: Record<string, any> = {
        name: input.name,
        firm_name: input.firm_name,
        investment_stages: input.investment_stages || [],
        sectors: input.sectors || [],
        picture: input.picture || null,
        email: input.email || null,
        website_url: input.website_url || null,
        linkedin_url: input.linkedin_url || null,
        twitter_x_url: input.twitter_x_url || null,
        is_active: input.is_active !== undefined ? input.is_active : true,
      };

      console.log('Creating angel investor with data:', {
        fields: Object.keys(insertData),
        name: insertData.name,
        firm_name: insertData.firm_name,
        investment_stages: insertData.investment_stages,
        hasPicture: !!insertData.picture,
        is_active: insertData.is_active
      });

      const { data, error } = await (supabase as any)
        .from('angel_investors')
        .insert([insertData])
        .select(ANGEL_CARD_COLUMNS)
        .single();

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          column: (error as any).column,
          table: (error as any).table
        });
        throw error;
      }

      console.log('Angel investor created successfully:', {
        id: data?.id,
        name: data?.name,
      });

      await queryClient.invalidateQueries({ queryKey: ['public-angels'] });
      toast.success('Angel investor created successfully');
      return data as AngelInvestor;
    } catch (error: any) {
      console.error('Error creating angel investor:', {
        input,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        column: error?.column,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to create angel investor');
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, queryClient]);

  // Update angel investor (admin only)
  const updateAngel = useCallback(async (id: string, input: Partial<CreateAngelInput>): Promise<AngelInvestor | null> => {
    if (!isAdmin) {
      toast.error('Only admins can update angel investors');
      return null;
    }

    try {
      setLoading(true);

      const cleanInput: Record<string, any> = {};
      if (input.name !== undefined) cleanInput.name = input.name;
      if (input.picture !== undefined) cleanInput.picture = input.picture;
      if (input.firm_name !== undefined) cleanInput.firm_name = input.firm_name;
      if (input.investment_stages !== undefined) cleanInput.investment_stages = input.investment_stages;
      if (input.sectors !== undefined) cleanInput.sectors = input.sectors;
      if (input.email !== undefined) cleanInput.email = input.email;
      if (input.website_url !== undefined) cleanInput.website_url = input.website_url;
      if (input.linkedin_url !== undefined) cleanInput.linkedin_url = input.linkedin_url;
      if (input.twitter_x_url !== undefined) cleanInput.twitter_x_url = input.twitter_x_url;
      if (input.is_active !== undefined) cleanInput.is_active = input.is_active;

      console.log('Updating angel investor with data:', {
        id,
        fields: Object.keys(cleanInput),
      });

      const { data, error } = await (supabase as any)
        .from('angel_investors')
        .update(cleanInput)
        .eq('id', id)
        .select(ANGEL_CARD_COLUMNS)
        .single();

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('Angel investor updated successfully:', {
        id: data?.id,
        name: data?.name,
      });

      await queryClient.invalidateQueries({ queryKey: ['public-angels'] });
      toast.success('Angel investor updated successfully');
      return data as AngelInvestor;
    } catch (error: any) {
      console.error('Error updating angel investor:', {
        id,
        input,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to update angel investor');
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, queryClient]);

  // Delete angel investor (admin only)
  const deleteAngel = useCallback(async (id: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Only admins can delete angel investors');
      return false;
    }

    try {
      setLoading(true);

      const { error } = await (supabase as any)
        .from('angel_investors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['public-angels'] });
      toast.success('Angel investor deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting angel investor:', {
        id,
        message: error?.message,
        code: error?.code,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to delete angel investor');
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, queryClient]);

  return {
    fetchAngels,
    fetchAngelById,
    createAngel,
    updateAngel,
    deleteAngel,
    loading,
    isAdmin,
  };
};
