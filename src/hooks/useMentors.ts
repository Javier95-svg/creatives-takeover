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
}

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
      console.error('Error fetching mentors:', error);
      toast.error('Failed to load mentors');
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
      console.error('Error fetching mentor:', error);
      toast.error('Failed to load mentor');
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
      console.error('Error creating mentor:', error);
      toast.error(error.message || 'Failed to create mentor');
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
      
      const { data, error } = await supabase
        .from('mentors')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Mentor updated successfully');
      return data as Mentor;
    } catch (error: any) {
      console.error('Error updating mentor:', error);
      toast.error(error.message || 'Failed to update mentor');
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
      console.error('Error deleting mentor:', error);
      toast.error(error.message || 'Failed to delete mentor');
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

