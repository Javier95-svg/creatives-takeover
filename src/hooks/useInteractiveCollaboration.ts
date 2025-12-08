import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CollaborationWhiteboard {
  id: string;
  session_id: string;
  name: string;
  canvas_data: any;
  width: number;
  height: number;
  background_color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WhiteboardObject {
  id: string;
  whiteboard_id: string;
  object_type: 'path' | 'rect' | 'circle' | 'text' | 'image' | 'line';
  object_data: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface CollaborationPoll {
  id: string;
  session_id: string;
  title: string;
  description?: string;
  poll_type: 'single_choice' | 'multiple_choice' | 'rating' | 'open_text';
  options: string[];
  anonymous: boolean;
  allow_comments: boolean;
  closes_at?: string;
  status: 'draft' | 'active' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  selected_options: string[];
  rating_value?: number;
  text_response?: string;
  comment?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface CollaborationFile {
  id: string;
  session_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export const useInteractiveCollaboration = (sessionId: string) => {
  const { user } = useAuth();
  const [whiteboards, setWhiteboards] = useState<CollaborationWhiteboard[]>([]);
  const [whiteboardObjects, setWhiteboardObjects] = useState<WhiteboardObject[]>([]);
  const [polls, setPolls] = useState<CollaborationPoll[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [files, setFiles] = useState<CollaborationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const realtimeChannelsRef = useRef<RealtimeChannel[]>([]);

  // Fetch whiteboards
  const fetchWhiteboards = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_whiteboards')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setWhiteboards(data);
    }
  }, [sessionId]);

  // Fetch whiteboard objects
  const fetchWhiteboardObjects = useCallback(async (whiteboardId?: string) => {
    if (!sessionId) return;

    let query = supabase
      .from('whiteboard_objects')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (whiteboardId) {
      query = query.eq('whiteboard_id', whiteboardId);
    } else {
      // Get objects for all whiteboards in this session
      const whiteboardIds = whiteboards.map(w => w.id);
      if (whiteboardIds.length > 0) {
        query = query.in('whiteboard_id', whiteboardIds);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      setWhiteboardObjects(data as any);
    }
  }, [sessionId, whiteboards]);

  // Fetch polls
  const fetchPolls = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_polls')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPolls(data as any);
    }
  }, [sessionId]);

  // Fetch poll votes
  const fetchPollVotes = useCallback(async (pollId?: string) => {
    if (!sessionId) return;

    let query = supabase
      .from('poll_votes')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .order('created_at', { ascending: true });

    if (pollId) {
      query = query.eq('poll_id', pollId);
    } else {
      // Get votes for all polls in this session
      const pollIds = polls.map(p => p.id);
      if (pollIds.length > 0) {
        query = query.in('poll_id', pollIds);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      setPollVotes(data as any);
    }
  }, [sessionId, polls]);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_files')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFiles(data as any);
    }
  }, [sessionId]);

  // Create whiteboard
  const createWhiteboard = useCallback(async (name: string, width = 1200, height = 800) => {
    if (!user || !sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_whiteboards')
      .insert({
        session_id: sessionId,
        name,
        width,
        height,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating whiteboard:', error);
      return null;
    }

    return data;
  }, [user, sessionId]);

  // Add whiteboard object
  const addWhiteboardObject = useCallback(async (whiteboardId: string, objectType: WhiteboardObject['object_type'], objectData: any) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('whiteboard_objects')
      .insert({
        whiteboard_id: whiteboardId,
        object_type: objectType,
        object_data: objectData,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding whiteboard object:', error);
      return null;
    }

    return data;
  }, [user]);

  // Update whiteboard object
  const updateWhiteboardObject = useCallback(async (objectId: string, objectData: any) => {
    const { error } = await supabase
      .from('whiteboard_objects')
      .update({ object_data: objectData })
      .eq('id', objectId);

    if (error) {
      console.error('Error updating whiteboard object:', error);
    }
  }, []);

  // Delete whiteboard object
  const deleteWhiteboardObject = useCallback(async (objectId: string) => {
    const { error } = await supabase
      .from('whiteboard_objects')
      .update({ is_deleted: true })
      .eq('id', objectId);

    if (error) {
      console.error('Error deleting whiteboard object:', error);
    }
  }, []);

  // Create poll
  const createPoll = useCallback(async (title: string, description: string, pollType: CollaborationPoll['poll_type'], options: string[], anonymous = false, allowComments = true, closesAt?: string) => {
    if (!user || !sessionId) return;

    const { data, error } = await supabase
      .from('collaboration_polls')
      .insert({
        session_id: sessionId,
        title,
        description,
        poll_type: pollType,
        options,
        anonymous,
        allow_comments: allowComments,
        closes_at: closesAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating poll:', error);
      return null;
    }

    return data;
  }, [user, sessionId]);

  // Vote on poll
  const voteOnPoll = useCallback(async (pollId: string, selectedOptions: string[], ratingValue?: number, textResponse?: string, comment?: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('poll_votes')
      .upsert({
        poll_id: pollId,
        user_id: user.id,
        selected_options: selectedOptions,
        rating_value: ratingValue,
        text_response: textResponse,
        comment,
      })
      .select()
      .single();

    if (error) {
      console.error('Error voting on poll:', error);
      return null;
    }

    return data;
  }, [user]);

  // Upload file
  const uploadFile = useCallback(async (file: File, description?: string, tags: string[] = [], isPublic = false) => {
    if (!user || !sessionId) return;

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionId}/${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('collaboration-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return null;
      }

      // Save file metadata
      const { data, error } = await supabase
        .from('collaboration_files')
        .insert({
          session_id: sessionId,
          filename: fileName,
          original_filename: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
          storage_path: uploadData.path,
          description,
          tags,
          is_public: isPublic,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving file metadata:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in file upload:', error);
      return null;
    }
  }, [user, sessionId]);

  // Download file
  const downloadFile = useCallback(async (fileId: string) => {
    if (!user) return;

    // Log access
    await supabase
      .from('file_access_logs')
      .insert({
        file_id: fileId,
        user_id: user.id,
        access_type: 'download',
      });

    // Get file info
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Get download URL
    const { data } = supabase.storage
      .from('collaboration-files')
      .getPublicUrl(file.storage_path);

    // Trigger download
    const link = document.createElement('a');
    link.href = data.publicUrl;
    link.download = file.original_filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [user, files]);

  // Set up real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!sessionId) return;

    const channels: RealtimeChannel[] = [];

    // Whiteboards channel
    const whiteboardsChannel = supabase
      .channel(`whiteboards:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_whiteboards',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchWhiteboards();
        }
      )
      .subscribe();

    channels.push(whiteboardsChannel);

    // Whiteboard objects channel
    const objectsChannel = supabase
      .channel(`whiteboard_objects:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whiteboard_objects',
        },
        () => {
          fetchWhiteboardObjects();
        }
      )
      .subscribe();

    channels.push(objectsChannel);

    // Polls channel
    const pollsChannel = supabase
      .channel(`polls:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_polls',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    channels.push(pollsChannel);

    // Poll votes channel
    const votesChannel = supabase
      .channel(`poll_votes:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
        },
        () => {
          fetchPollVotes();
        }
      )
      .subscribe();

    channels.push(votesChannel);

    // Files channel
    const filesChannel = supabase
      .channel(`files:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_files',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchFiles();
        }
      )
      .subscribe();

    channels.push(filesChannel);

    // Clean up old channels before setting new ones
    realtimeChannelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    realtimeChannelsRef.current = channels;
  }, [sessionId, fetchWhiteboards, fetchWhiteboardObjects, fetchPolls, fetchPollVotes, fetchFiles]);

  // Initialize
  useEffect(() => {
    if (sessionId && user) {
      const initializeData = async () => {
        setLoading(true);
        await Promise.all([
          fetchWhiteboards(),
          fetchPolls(),
          fetchFiles(),
        ]);
        setLoading(false);
      };

      initializeData();
      setupRealtimeSubscriptions();

      return () => {
        // Clean up channels from ref
        realtimeChannelsRef.current.forEach(channel => {
          supabase.removeChannel(channel);
        });
        realtimeChannelsRef.current = [];
      };
    }
  }, [sessionId, user]);

  // Fetch dependent data when parent data changes
  useEffect(() => {
    if (whiteboards.length > 0) {
      fetchWhiteboardObjects();
    }
  }, [whiteboards, fetchWhiteboardObjects]);

  useEffect(() => {
    if (polls.length > 0) {
      fetchPollVotes();
    }
  }, [polls, fetchPollVotes]);

  return {
    whiteboards,
    whiteboardObjects,
    polls,
    pollVotes,
    files,
    loading,
    createWhiteboard,
    addWhiteboardObject,
    updateWhiteboardObject,
    deleteWhiteboardObject,
    createPoll,
    voteOnPoll,
    uploadFile,
    downloadFile,
  };
};