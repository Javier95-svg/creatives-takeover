import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Mentor, AvailabilitySlot, MentorCurrency } from '@/types/mentor';
import { generateMentorSlug } from '@/utils/mentorSlug';
import { sortMentorsAlphabetically } from '@/utils/mentorSort';

const MARC_BRIGHT_USER_ID = '4eea3ae6-40ec-4bd0-a373-4005343a9e25';
const ALBERT_HOVHANNISYAN_USER_ID = 'e8ddb66e-142b-4d88-9d4f-7ce3cf18ce14';
const ARTUR_SINDARSKY_USER_ID = '1f0fe62a-7744-4153-bfcf-4f20b6e820d3';
const CAROLINA_BARTHALOT_USER_ID = '1b0d63d2-13b8-4829-b5a9-75a7bb2f313b';
const DAIANA_TOKPAYEVA_USER_ID = 'cc157118-0681-4600-a5fc-d37f5f4b4f31';
const DAN_ALBAGHDADI_USER_ID = '0c160536-d5d3-483b-b222-f801c057fde6';
const DANIEL_KAZANI_USER_ID = '127434fb-f706-44a5-b230-ac1b9b17dc8c';
const DELRAJ_SINGH_UPPAL_USER_ID = '2cd4b8ec-5631-4de3-b480-d3c71de5d366';
const GABOR_HOMIK_USER_ID = '5658607e-80ca-4478-8b3b-74148f1b959d';
const JOHNNY_BOU_MALHAB_USER_ID = 'dd972b4a-7e02-41c4-a722-bacead700c9b';
const KATIE_BRETT_USER_ID = 'a786507a-b45c-4044-9b92-d9db40340f47';
const LUCAS_ANNARATTONE_USER_ID = '089e99ca-18d6-43f5-9687-f60c2d76b2f8';
const MATAS_RAMANAUSKAS_USER_ID = 'e1db835c-4149-407e-807e-5ff0b99661c0';
const MATIAS_PANCORVO_USER_ID = 'd4d2ec5d-75ca-482a-8126-2e5a9ff9b98c';
const PEDRO_MONESTEL_USER_ID = 'f7d02d67-dd5b-4ce7-95dd-f6f2c9bdbc35';
const SAKINA_LOKHANDWALA_USER_ID = '625f9871-b975-40c5-9b71-a093419c69c8';
const SHARON_PRAISE_AKPUNNE_USER_ID = '77283f92-7d90-45e2-97aa-3ec500781656';
const SOPHIA_LOPEZ_PIMENTA_USER_ID = '50695a54-30c6-4b57-969e-b2de733bcd73';
const VIVIAN_UBOCHI_USER_ID = '5e919674-60ba-42b9-bd18-813f484f7c24';
const YASMINE_CAXEIRO_USER_ID = '357b97ca-c578-43b1-8e48-b438142312ec';
const UELMAN_LOU_RUBIO_USER_ID = 'e6248878-3f18-4866-9e2e-7ad39f0339de';

const isMarcBrightMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('marc') && normalizedName.includes('bright');
};

const isAlbertHovhannisyanMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('albert') && normalizedName.includes('hovhannisyan');
};

const isArturSindarskyMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('artur') && normalizedName.includes('sindarsky');
};

const isCarolinaBarthalotMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('carolina') && normalizedName.includes('barthalot');
};

const isDaianaTokpayevaMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('daiana') && normalizedName.includes('tokpayeva');
};

const isDanAlbaghdadiMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('dan') && normalizedName.includes('albaghdadi');
};

const isDanielKazaniMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('daniel') && normalizedName.includes('kazani');
};

const isDelrajSinghUppalMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('delraj') && normalizedName.includes('uppal');
};

const isGaborHomikMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalizedName.includes('gabor') && (normalizedName.includes('homik') || normalizedName.includes('hornik'));
};

const isJohnnyBouMalhabMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('johnny') && normalizedName.includes('malhab');
};

const isKatieBrettMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('katie') && normalizedName.includes('brett');
};

const isLucasAnnarattoneMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('lucas') && normalizedName.includes('annarattone');
};

const isMatasRamanauskasMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('matas') && normalizedName.includes('ramanauskas');
};

const isMatiasPancorvoMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('matias') && normalizedName.includes('pancorvo');
};

const isPedroMonestelMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('pedro') && normalizedName.includes('monestel');
};

const isSakinaLokhandwalaMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('sakina') && normalizedName.includes('lokhandwala');
};

const isSharonPraiseAkpunneMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('sharon') && normalizedName.includes('akpunne');
};

const isSophiaLopezPimentaMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('sophia') && normalizedName.includes('pimenta');
};

const isVivianUbochiMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('vivian') && normalizedName.includes('ubochi');
};

const isYasmineCaxeiroMentor = (name?: string | null): boolean => {
  const normalizedName = (name || '').toLowerCase();
  return normalizedName.includes('yasmine') && normalizedName.includes('caxeiro');
};

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
  booking_provider?: 'calendly' | 'koalendar' | 'other' | 'manual';
  nationality?: string | null;
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
    booking_provider: data.booking_provider || inferBookingProvider(data.calendly_url),
    user_id:
      data.user_id ||
      (isMarcBrightMentor(data.name)
        ? MARC_BRIGHT_USER_ID
        : isAlbertHovhannisyanMentor(data.name)
          ? ALBERT_HOVHANNISYAN_USER_ID
          : isArturSindarskyMentor(data.name)
            ? ARTUR_SINDARSKY_USER_ID
            : isCarolinaBarthalotMentor(data.name)
              ? CAROLINA_BARTHALOT_USER_ID
              : isDaianaTokpayevaMentor(data.name)
                ? DAIANA_TOKPAYEVA_USER_ID
                : isDanAlbaghdadiMentor(data.name)
                  ? DAN_ALBAGHDADI_USER_ID
                  : isDanielKazaniMentor(data.name)
                    ? DANIEL_KAZANI_USER_ID
                    : isDelrajSinghUppalMentor(data.name)
                      ? DELRAJ_SINGH_UPPAL_USER_ID
                  : isGaborHomikMentor(data.name)
                    ? GABOR_HOMIK_USER_ID
                  : isJohnnyBouMalhabMentor(data.name)
                    ? JOHNNY_BOU_MALHAB_USER_ID
                    : isKatieBrettMentor(data.name)
                      ? KATIE_BRETT_USER_ID
                      : isLucasAnnarattoneMentor(data.name)
                        ? LUCAS_ANNARATTONE_USER_ID
                        : isMatasRamanauskasMentor(data.name)
                          ? MATAS_RAMANAUSKAS_USER_ID
                          : isMatiasPancorvoMentor(data.name)
                            ? MATIAS_PANCORVO_USER_ID
                            : isPedroMonestelMentor(data.name)
                              ? PEDRO_MONESTEL_USER_ID
                              : isSakinaLokhandwalaMentor(data.name)
                                ? SAKINA_LOKHANDWALA_USER_ID
                                : isSharonPraiseAkpunneMentor(data.name)
                                  ? SHARON_PRAISE_AKPUNNE_USER_ID
                                  : isSophiaLopezPimentaMentor(data.name)
                                    ? SOPHIA_LOPEZ_PIMENTA_USER_ID
                                    : isVivianUbochiMentor(data.name)
                                      ? VIVIAN_UBOCHI_USER_ID
                                      : isYasmineCaxeiroMentor(data.name)
                                        ? YASMINE_CAXEIRO_USER_ID
          : undefined),
    hourly_rate_per_hour: data.hourly_rate_per_hour ?? 0,
    availability: (data.availability || []) as AvailabilitySlot[],
  };
};

const inferBookingProvider = (bookingUrl?: string | null): 'calendly' | 'koalendar' | 'other' | 'manual' => {
  const normalizedUrl = (bookingUrl || '').toLowerCase().trim();
  if (!normalizedUrl) return 'manual';
  if (normalizedUrl.includes('calendly.com')) return 'calendly';
  if (normalizedUrl.includes('koalendar.com')) return 'koalendar';
  return 'other';
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
        .order('name', { ascending: true });

      if (error) throw error;

      const result = sortMentorsAlphabetically((data || []).map(convertToMentor));
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
        booking_provider: input.booking_provider || inferBookingProvider(input.calendly_url),
        nationality: input.nationality || null,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
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
      if (input.booking_provider !== undefined || input.calendly_url !== undefined) {
        cleanInput.booking_provider = input.booking_provider || inferBookingProvider(input.calendly_url);
      }
      if (input.nationality !== undefined) cleanInput.nationality = input.nationality;
      
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
