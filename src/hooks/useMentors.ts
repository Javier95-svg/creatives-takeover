import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Mentor } from '@/types/mentor';

export interface CreateMentorInput {
  name: string;
  picture?: string | null;
  bio: string;
  hourly_rate: number; // In cents
  stripe_connected_account_id?: string | null;
  expertise?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  linkedin_url?: string | null;
  twitter_x_url?: string | null;
}

// Helper function to format error messages
const formatErrorMessage = (error: any, defaultMessage: string): string => {
  const errorMessage = error?.message || error?.toString() || '';
  const errorCode = error?.code || error?.hint || '';
  
  // Check for schema cache errors
  if (errorMessage.includes('schema cache') || errorMessage.includes('Could not find the table')) {
    return 'Database table not found. Please ensure migrations have been applied. Contact support if this persists.';
  }
  
  // Check for permission errors
  if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
    return 'Permission denied. Please check your access rights.';
  }
  
  // Check for connection errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Return specific error message if available, otherwise default
  return errorMessage || defaultMessage;
};

export const useMentors = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';

  // Fetch all active mentors
  const fetchMentors = useCallback(async (): Promise<Mentor[]> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []) as Mentor[];
    } catch (error: any) {
      console.error('Error fetching mentors:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to load mentors');
      toast.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single mentor by ID
  const fetchMentorById = useCallback(async (id: string): Promise<Mentor | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      return data as Mentor | null;
    } catch (error: any) {
      console.error('Error fetching mentor:', {
        id,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to load mentor');
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create mentor (admin only)
  const createMentor = useCallback(async (input: CreateMentorInput): Promise<Mentor | null> => {
    if (!isAdmin) {
      toast.error('Only admins can create mentors');
      return null;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('mentors')
        .insert({
          ...input,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Mentor created successfully');
      return data as Mentor;
    } catch (error: any) {
      console.error('Error creating mentor:', {
        input,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to create mentor');
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  // Update mentor (admin only)
  const updateMentor = useCallback(async (id: string, input: Partial<CreateMentorInput>): Promise<Mentor | null> => {
    if (!isAdmin) {
      toast.error('Only admins can update mentors');
      return null;
    }

    try {
      setLoading(true);
      
      // Debug: Log the input to verify picture field is included
      console.log('Updating mentor with input:', {
        id,
        ...input,
        picture: input.picture ? `Picture URL: ${input.picture.substring(0, 50)}...` : 'No picture URL'
      });
      
      const { data, error } = await supabase
        .from('mentors')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Debug: Log the returned data to verify picture was saved
      console.log('Mentor updated successfully:', {
        id: data?.id,
        name: data?.name,
        picture: (data as any)?.picture ? 'Picture URL saved' : 'No picture URL in response'
      });
      
      toast.success('Mentor updated successfully');
      return data as Mentor;
    } catch (error: any) {
      console.error('Error updating mentor:', {
        id,
        input,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to update mentor');
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Delete mentor (admin only)
  const deleteMentor = useCallback(async (id: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Only admins can delete mentors');
      return false;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('mentors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Mentor deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting mentor:', {
        id,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      const errorMessage = formatErrorMessage(error, 'Failed to delete mentor');
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  return {
    fetchMentors,
    fetchMentorById,
    createMentor,
    updateMentor,
    deleteMentor,
    loading,
    isAdmin,
  };
};

