import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DemoCall {
  id: string;
  user_id: string;
  sprint_id?: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  is_public: boolean;
  max_participants: number;
  meeting_url?: string;
  recording_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DemoCallParticipant {
  id: string;
  demo_call_id: string;
  user_id: string;
  role: string;
  joined_at?: string;
  left_at?: string;
  created_at: string;
}

export interface DemoCallFeedback {
  id: string;
  demo_call_id: string;
  user_id: string;
  rating: number;
  feedback_text?: string;
  suggestions?: string;
  created_at: string;
}

export function useDemoCalls() {
  const [calls, setCalls] = useState<DemoCall[]>([]);
  const [participants, setParticipants] = useState<DemoCallParticipant[]>([]);
  const [feedback, setFeedback] = useState<DemoCallFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch demo calls
  const fetchCalls = async () => {
    if (!user) {
      setCalls([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('demo_calls')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (error) {
        console.error('Error fetching demo calls:', error);
        toast.error('Failed to load demo calls');
      } else {
        setCalls(data || []);
      }
    } catch (error) {
      console.error('Error in fetchCalls:', error);
      toast.error('Failed to load demo calls');
    } finally {
      setLoading(false);
    }
  };

  // Fetch participants for a specific call
  const fetchParticipants = async (callId: string) => {
    try {
      const { data, error } = await supabase
        .from('demo_call_participants')
        .select('*')
        .eq('demo_call_id', callId);

      if (error) {
        console.error('Error fetching participants:', error);
      } else {
        setParticipants(data || []);
      }
    } catch (error) {
      console.error('Error in fetchParticipants:', error);
    }
  };

  // Create a new demo call
  const createCall = async (callData: Omit<DemoCall, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error('You must be logged in to schedule a demo call');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('demo_calls')
        .insert({
          ...callData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating demo call:', error);
        toast.error('Failed to create demo call');
        return null;
      }

      toast.success('Demo call scheduled successfully!');
      await fetchCalls();
      return data;
    } catch (error) {
      console.error('Error in createCall:', error);
      toast.error('Failed to create demo call');
      return null;
    }
  };

  // Join a demo call
  const joinCall = async (callId: string, role: string = 'participant') => {
    if (!user) {
      toast.error('You must be logged in to join a demo call');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('demo_call_participants')
        .insert({
          demo_call_id: callId,
          user_id: user.id,
          role
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('You are already registered for this demo call');
        } else {
          console.error('Error joining demo call:', error);
          toast.error('Failed to join demo call');
        }
        return false;
      }

      toast.success('Successfully joined the demo call!');
      await fetchParticipants(callId);
      return true;
    } catch (error) {
      console.error('Error in joinCall:', error);
      toast.error('Failed to join demo call');
      return false;
    }
  };

  // Leave a demo call
  const leaveCall = async (callId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('demo_call_participants')
        .delete()
        .eq('demo_call_id', callId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving demo call:', error);
        toast.error('Failed to leave demo call');
        return false;
      }

      toast.success('Successfully left the demo call');
      await fetchParticipants(callId);
      return true;
    } catch (error) {
      console.error('Error in leaveCall:', error);
      toast.error('Failed to leave demo call');
      return false;
    }
  };

  // Update call status
  const updateCallStatus = async (callId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('demo_calls')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', callId);

      if (error) {
        console.error('Error updating call status:', error);
        toast.error('Failed to update call status');
        return false;
      }

      await fetchCalls();
      return true;
    } catch (error) {
      console.error('Error in updateCallStatus:', error);
      toast.error('Failed to update call status');
      return false;
    }
  };

  // Submit feedback
  const submitFeedback = async (callId: string, rating: number, feedbackText?: string, suggestions?: string) => {
    if (!user) {
      toast.error('You must be logged in to submit feedback');
      return false;
    }

    try {
      const { error } = await supabase
        .from('demo_call_feedback')
        .insert({
          demo_call_id: callId,
          user_id: user.id,
          rating,
          feedback_text: feedbackText,
          suggestions
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        toast.error('Failed to submit feedback');
        return false;
      }

      toast.success('Feedback submitted successfully!');
      return true;
    } catch (error) {
      console.error('Error in submitFeedback:', error);
      toast.error('Failed to submit feedback');
      return false;
    }
  };

  // Get upcoming calls for user
  const getUpcomingCalls = () => {
    const now = new Date();
    return calls.filter(call => 
      new Date(call.scheduled_at) > now && 
      call.status === 'scheduled'
    );
  };

  // Get user's calls
  const getUserCalls = () => {
    return calls.filter(call => call.user_id === user?.id);
  };

  // Check if user can join a call
  const canJoinCall = (call: DemoCall) => {
    if (!user) return false;
    if (call.user_id === user.id) return true; // Owner can always join
    if (!call.is_public) return false; // Private calls require invitation
    
    const participantCount = participants.filter(p => p.demo_call_id === call.id).length;
    return participantCount < call.max_participants;
  };

  useEffect(() => {
    void fetchCalls();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [user]);

  return {
    calls,
    participants,
    feedback,
    loading,
    createCall,
    joinCall,
    leaveCall,
    updateCallStatus,
    submitFeedback,
    fetchParticipants,
    getUpcomingCalls,
    getUserCalls,
    canJoinCall,
    refreshCalls: fetchCalls
  };
}