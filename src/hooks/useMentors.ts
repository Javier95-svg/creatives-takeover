import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Mentor, AvailabilitySlot, MentorCurrency } from '@/types/mentor';
import { generateMentorSlug } from '@/utils/mentorSlug';

export interface CreateMentorInput {
  name: string;
  picture?: string | null;
  bio: string;
  hourly_rate: number; // In cents (8-week program fee)
  hourly_rate_per_hour?: number; // In cents (per-hour consulting rate)
  currency?: MentorCurrency; // Currency code (e.g., 'USD', 'GBP', 'EUR')
  stripe_connected_account_id?: string | null;
  expertise?: string[];
  universities?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  linkedin_url?: string | null;
  twitter_x_url?: string | null;
  website_url?: string | null;
  calendly_url?: string | null;
}

// Helper function to format error messages
const formatErrorMessage = (error: any, defaultMessage: string): string => {
  const errorMessage = error?.message || error?.toString() || '';
  const errorCode = error?.code || error?.hint || '';
  const errorColumn = error?.column;
  
  // Check for schema cache errors
  if (errorMessage.includes('schema cache') || 
      errorMessage.includes('Could not find the table') ||
      errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
    return 'Database table not found. Please ensure migrations have been applied. Contact support if this persists.';
  }
  
  // Check for missing column errors
  if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
    const columnMatch = errorMessage.match(/column "?(\w+)"? does not exist/i);
    const columnName = columnMatch ? columnMatch[1] : errorColumn || 'unknown';
    return `Database column '${columnName}' not found. Please ensure all migrations have been applied, including the universities column migration.`;
  }
  
  // Check for permission errors
  if (errorCode === '42501' || 
      errorMessage.includes('permission denied') || 
      errorMessage.includes('row-level security') ||
      errorMessage.includes('new row violates row-level security')) {
    return 'Permission denied. Please check your access rights.';
  }
  
  // Check for connection errors
  if (errorMessage.includes('fetch') || 
      errorMessage.includes('network') || 
      errorMessage.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Check for constraint violations
  if (errorMessage.includes('violates') || errorMessage.includes('constraint')) {
    return `Database constraint error: ${errorMessage}`;
  }
  
  // Return specific error message if available, otherwise default
  return errorMessage || defaultMessage;
};

// Helper to convert database row to Mentor type
const convertToMentor = (data: any): Mentor => {
  return {
    ...data,
    hourly_rate_per_hour: data.hourly_rate_per_hour ?? 0,
    availability: (data.availability || []) as AvailabilitySlot[],
  };
};

/**
 * Custom hook for managing mentor data operations.
 *
 * @warning The `loading` state is shared across ALL operations (fetchMentors,
 * fetchMentorById, createMentor, etc.). This can cause race conditions when
 * multiple operations run concurrently. Components should maintain their own
 * loading state for critical UI rendering decisions.
 *
 * @example
 * // CORRECT: Component-level loading state
 * const { fetchMentorById } = useMentors();
 * const [loading, setLoading] = useState(true);
 * const [mentor, setMentor] = useState(null);
 *
 * useEffect(() => {
 *   const loadData = async () => {
 *     try {
 *       setLoading(true);
 *       const data = await fetchMentorById(id);
 *       setMentor(data);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *   loadData();
 * }, [id]);
 *
 * // INCORRECT: Relying on hook's shared loading state
 * const { fetchMentorById, loading } = useMentors();
 * if (loading) return <Spinner />; // Race condition risk!
 */
export const useMentors = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false); // Shared state across all operations!

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

      const result = (data || []).map(convertToMentor);
      return result;
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

      return data ? convertToMentor(data) : null;
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

  // Fetch mentor by slug (name-based URL)
  const fetchMentorBySlug = useCallback(async (slug: string): Promise<Mentor | null> => {
    try {
      setLoading(true);

      // Fetch all active mentors
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (!data || data.length === 0) {
        return null;
      }

      // Generate slug from each mentor name and match - using the SAME utility function as MentorCard
      const mentor = data.find((m) => {
        const mentorSlug = generateMentorSlug(m.name);
        return mentorSlug === slug;
      });

      if (mentor) {
        return convertToMentor(mentor);
      }

      // Fallback: try partial name match for robustness
      const nameParts = slug.split('-');
      const partialMatch = data.find((m) => {
        const mentorNameLower = m.name.toLowerCase();
        return nameParts.every(part => mentorNameLower.includes(part));
      });

      if (partialMatch) {
        return convertToMentor(partialMatch);
      }

      return null;
    } catch (error: any) {
      console.error('Error fetching mentor by slug:', {
        slug,
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
      
      // Prepare clean insert payload
      const insertData: Record<string, any> = {
        name: input.name,
        bio: input.bio,
        hourly_rate: input.hourly_rate,
        hourly_rate_per_hour: input.hourly_rate_per_hour ?? 0,
        currency: input.currency || 'USD',
        // Do not auto-link mentor ownership to the currently logged-in admin.
        // `user_id` must only point to the mentor's own account, set explicitly later.
        user_id: null,
        picture: input.picture || null,
        expertise: input.expertise || [],
        universities: input.universities || [],
        is_active: input.is_active !== undefined ? input.is_active : true,
        is_featured: input.is_featured !== undefined ? input.is_featured : false,
        linkedin_url: input.linkedin_url || null,
        twitter_x_url: input.twitter_x_url || null,
        website_url: input.website_url || null,
        calendly_url: input.calendly_url || null,
      };
      
      console.log('Creating mentor with data:', {
        fields: Object.keys(insertData),
        hasBio: !!insertData.bio,
        hourly_rate: insertData.hourly_rate,
        hourly_rate_per_hour: insertData.hourly_rate_per_hour,
        hasUniversities: !!insertData.universities,
        universities: insertData.universities
      });
      
      const { data, error } = await supabase
        .from('mentors')
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
      
      console.log('Mentor created successfully:', {
        id: data?.id,
        name: data?.name,
        universities: (data as any)?.universities || []
      });
      
      toast.success('Mentor created successfully');
      return convertToMentor(data);
    } catch (error: any) {
      console.error('Error creating mentor:', {
        input,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        column: error?.column,
        table: error?.table,
        fullError: error
      });
      
      // Enhanced error message with specific column information
      let errorMessage = formatErrorMessage(error, 'Failed to create mentor');
      if (error?.column) {
        errorMessage = `Failed to create mentor: Column '${error.column}' error - ${error.message || errorMessage}`;
      } else if (error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        errorMessage = `Database schema error: ${error.message}. Please ensure all migrations have been applied.`;
      }
      
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
      
      // Filter out undefined values and prepare clean update payload
      const cleanInput: Record<string, any> = {};
      
      // Include all fields that are explicitly set (not undefined)
      if (input.name !== undefined) cleanInput.name = input.name;
      if (input.picture !== undefined) cleanInput.picture = input.picture;
      if (input.bio !== undefined) cleanInput.bio = input.bio;
      if (input.hourly_rate !== undefined) cleanInput.hourly_rate = input.hourly_rate;
      if (input.hourly_rate_per_hour !== undefined) cleanInput.hourly_rate_per_hour = input.hourly_rate_per_hour;
      if (input.currency !== undefined) cleanInput.currency = input.currency;
      if (input.stripe_connected_account_id !== undefined) cleanInput.stripe_connected_account_id = input.stripe_connected_account_id;
      if (input.expertise !== undefined) cleanInput.expertise = input.expertise;
      if (input.universities !== undefined) cleanInput.universities = input.universities;
      if (input.is_active !== undefined) cleanInput.is_active = input.is_active;
      if (input.is_featured !== undefined) cleanInput.is_featured = input.is_featured;
      if (input.linkedin_url !== undefined) cleanInput.linkedin_url = input.linkedin_url;
      if (input.twitter_x_url !== undefined) cleanInput.twitter_x_url = input.twitter_x_url;
      if (input.website_url !== undefined) cleanInput.website_url = input.website_url;
      if (input.calendly_url !== undefined) cleanInput.calendly_url = input.calendly_url;
      
      // Debug: Log the clean input
      console.log('Updating mentor with clean input:', {
        id,
        fields: Object.keys(cleanInput),
        hasBio: cleanInput.bio !== undefined,
        hourly_rate: cleanInput.hourly_rate,
        hourly_rate_per_hour: cleanInput.hourly_rate_per_hour,
        hasUniversities: cleanInput.universities !== undefined,
        universities: cleanInput.universities
      });
      
      const { data, error } = await supabase
        .from('mentors')
        .update(cleanInput)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Enhanced error logging with specific column information
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
      
      console.log('Mentor updated successfully:', {
        id: data?.id,
        name: data?.name,
        bio: data?.bio ? `Bio length: ${data.bio.length}` : 'No bio',
        universities: (data as any)?.universities || []
      });
      
      toast.success('Mentor updated successfully');
      return convertToMentor(data);
    } catch (error: any) {
      console.error('Error updating mentor:', {
        id,
        input,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        column: error?.column,
        table: error?.table,
        fullError: error
      });
      
      // Enhanced error message with specific column information
      let errorMessage = formatErrorMessage(error, 'Failed to update mentor');
      if (error?.column) {
        errorMessage = `Failed to update mentor: Column '${error.column}' error - ${error.message || errorMessage}`;
      } else if (error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        errorMessage = `Database schema error: ${error.message}. Please ensure all migrations have been applied.`;
      }
      
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
    fetchMentorBySlug,
    createMentor,
    updateMentor,
    deleteMentor,
    loading,
    isAdmin,
  };
};
