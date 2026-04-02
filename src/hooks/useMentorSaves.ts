import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { completeActivationJourney, trackRetentionEvent } from '@/lib/retentionSystem';

export interface SavedMentor {
  id: string;
  mentor_id: string;
  created_at: string;
  mentor: {
    id: string;
    name: string;
    picture: string | null;
    expertise: string[] | null;
    calendly_url: string | null;
  } | null;
}

export const useMentorSaves = () => {
  const { user, isAuthenticated } = useAuth();
  const [savedMentors, setSavedMentors] = useState<SavedMentor[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingMentorId, setPendingMentorId] = useState<string | null>(null);

  const fetchSavedMentors = useCallback(async () => {
    if (!user) {
      setSavedMentors([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentor_saves')
        .select(`
          id,
          mentor_id,
          created_at,
          mentor:mentors (
            id,
            name,
            picture,
            expertise,
            calendly_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setSavedMentors((data as SavedMentor[] | null) ?? []);
    } catch (error) {
      console.error('Failed to load saved mentors', error);
      toast.error('Failed to load your saved mentors.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchSavedMentors();
  }, [fetchSavedMentors]);

  const savedMentorIds = useMemo(
    () => new Set(savedMentors.map((item) => item.mentor_id)),
    [savedMentors],
  );

  const isSaved = useCallback((mentorId: string) => savedMentorIds.has(mentorId), [savedMentorIds]);

  const saveMentor = useCallback(async (
    mentor: {
      id: string;
      name: string;
    },
    source: string,
  ) => {
    if (!user || !isAuthenticated) {
      toast.error('Please sign in to save mentors.');
      return false;
    }

    if (savedMentorIds.has(mentor.id)) {
      return true;
    }

    setPendingMentorId(mentor.id);

    try {
      const { error } = await supabase
        .from('mentor_saves')
        .insert({
          user_id: user.id,
          mentor_id: mentor.id,
        });

      if (error) {
        throw error;
      }

      await fetchSavedMentors();
      await trackRetentionEvent('mentor_saved', {
        user_id: user.id,
        mentor_id: mentor.id,
        mentor_name: mentor.name,
        source,
      });
      await completeActivationJourney({
        user,
        action: 'save_mentor',
        source,
        mentorId: mentor.id,
        mentorName: mentor.name,
        actionUrl: '/community?mentorSource=saved',
      });

      toast.success(`${mentor.name} saved. We'll use this to bring you back to the right mentor at the right time.`);
      return true;
    } catch (error) {
      console.error('Failed to save mentor', error);
      toast.error('Failed to save mentor. Please try again.');
      return false;
    } finally {
      setPendingMentorId(null);
    }
  }, [fetchSavedMentors, isAuthenticated, savedMentorIds, user]);

  const removeSavedMentor = useCallback(async (mentorId: string) => {
    if (!user) {
      return false;
    }

    setPendingMentorId(mentorId);
    try {
      const { error } = await supabase
        .from('mentor_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('mentor_id', mentorId);

      if (error) {
        throw error;
      }

      setSavedMentors((prev) => prev.filter((item) => item.mentor_id !== mentorId));
      toast.success('Removed from saved mentors.');
      return true;
    } catch (error) {
      console.error('Failed to remove saved mentor', error);
      toast.error('Failed to remove saved mentor.');
      return false;
    } finally {
      setPendingMentorId(null);
    }
  }, [user]);

  const buildSaveButtonState = useCallback((mentorId: string) => ({
    saving: pendingMentorId === mentorId,
    saved: isSaved(mentorId),
    icon: isSaved(mentorId) ? BookmarkCheck : Bookmark,
    label: isSaved(mentorId) ? 'Saved' : 'Save Mentor',
  }), [isSaved, pendingMentorId]);

  return {
    savedMentors,
    loading,
    pendingMentorId,
    isSaved,
    saveMentor,
    removeSavedMentor,
    refetch: fetchSavedMentors,
    buildSaveButtonState,
  };
};
