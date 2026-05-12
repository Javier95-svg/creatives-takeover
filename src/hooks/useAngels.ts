import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AngelInvestor, CreateAngelInput } from '@/types/angel';
import { useAdminRole } from '@/hooks/useAdminRole';

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
  const { isAdmin } = useAdminRole();
  const [loading, setLoading] = useState(false);

  // Fetch all active angel investors
  const fetchAngels = useCallback(async (): Promise<AngelInvestor[]> => {
    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('angel_investors')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []) as AngelInvestor[];
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
  }, []);

  // Fetch single angel investor by ID
  const fetchAngelById = useCallback(async (id: string): Promise<AngelInvestor | null> => {
    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('angel_investors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      return data as AngelInvestor | null;
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
        .select()
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
  }, [isAdmin]);

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
        .select()
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
  }, [isAdmin]);

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
  }, [isAdmin]);

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
