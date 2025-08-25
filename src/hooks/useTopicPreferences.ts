import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useTopicPreferences = () => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load user's topic preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_topic_preferences')
          .select('topic')
          .eq('user_id', user.id);

        if (error) throw error;

        setSelectedTopics(data?.map(item => item.topic) || []);
      } catch (error) {
        console.error('Error loading topic preferences:', error);
        toast.error('Failed to load your topic preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Save topic preference
  const saveTopicPreference = async (topic: string) => {
    if (!user) {
      toast.error('Please log in to save preferences');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_topic_preferences')
        .insert({
          user_id: user.id,
          topic: topic
        });

      if (error) throw error;

      setSelectedTopics(prev => [...prev, topic]);
      toast.success(`Added ${topic} to your interests`);
    } catch (error) {
      console.error('Error saving topic preference:', error);
      toast.error('Failed to save preference');
    }
  };

  // Remove topic preference
  const removeTopicPreference = async (topic: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_topic_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('topic', topic);

      if (error) throw error;

      setSelectedTopics(prev => prev.filter(t => t !== topic));
      toast.success(`Removed ${topic} from your interests`);
    } catch (error) {
      console.error('Error removing topic preference:', error);
      toast.error('Failed to remove preference');
    }
  };

  // Toggle topic preference
  const toggleTopicPreference = async (topic: string) => {
    if (selectedTopics.includes(topic)) {
      await removeTopicPreference(topic);
    } else {
      await saveTopicPreference(topic);
    }
  };

  return {
    selectedTopics,
    loading,
    toggleTopicPreference,
    isAuthenticated: !!user
  };
};