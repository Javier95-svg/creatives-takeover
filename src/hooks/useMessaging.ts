import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logWarn, logInfo } from '@/lib/logger';
import { handleError, getUserMessage } from '@/lib/errors';

export interface Conversation {
  id: string;
  participants: string[];
  is_group: boolean;
  name?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  attachments?: any;
  is_read: boolean;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// Samuel Starkman's email, user ID, and username constants
export const SAMUEL_STARKMAN_EMAIL = 'sestarkman@gmail.com';
export const SAMUEL_STARKMAN_USER_ID = '22fdf3fa-b444-4949-a2c3-a5acc247b390'; // Known user ID from previous conversation
export const SAMUEL_STARKMAN_USERNAME = 'samuelstarkman'; // Username based on firstname + lastname pattern

// Nic M Rayce's email constant
export const NIC_M_RAYCE_EMAIL = 'nicmrayce@gmail.com';
export const SOPHIA_LOPEZ_PIMENTA_EMAIL = 'lopezpimenta@gmail.com';
export const SOPHIA_LOPEZ_PIMENTA_USER_ID = '50695a54-30c6-4b57-969e-b2de733bcd73';
export const DELRAJ_SINGH_UPPAL_EMAIL = 'd.singh@khalsa.com';
export const DELRAJ_SINGH_UPPAL_USER_ID = '2cd4b8ec-5631-4de3-b480-d3c71de5d366';
export const MATIAS_PANCORVO_EMAIL = 'pancorvomatias@gmail.com';
export const MATIAS_PANCORVO_USER_ID = 'd4d2ec5d-75ca-482a-8126-2e5a9ff9b98c';
export const DAIANA_TOKPAYEVA_EMAIL = 'daiana.tokpayeva@outlook.com';
export const DAIANA_TOKPAYEVA_USER_ID = 'cc157118-0681-4600-a5fc-d37f5f4b4f31';
export const KATIE_BRETT_EMAIL = 'katie@pocketplanit.com';
export const KATIE_BRETT_USER_ID = 'a786507a-b45c-4044-9b92-d9db40340f47';
export const JOHNNY_BOU_MALHAB_EMAIL = 'johnny@monochrome.digital';
export const JOHNNY_BOU_MALHAB_USER_ID = 'dd972b4a-7e02-41c4-a722-bacead700c9b';
export const JULIO_SANCHEZ_REDONDO_EMAIL = 'julio.s.redondo@gmail.com';
export const JULIO_SANCHEZ_REDONDO_USER_ID = '03c6df3c-40a3-4478-a52b-511605ee988b';
export const JELENA_DABOVIC_EMAIL = 'jdabovic58@gmail.com';
export const JELENA_DABOVIC_USER_ID = '3c5c2feb-e1d1-49db-adc6-0b1483431da7';
export const CAROLINA_BARTHALOT_EMAIL = 'carolinabarthalot@gmail.com';
export const CAROLINA_BARTHALOT_USER_ID = '1b0d63d2-13b8-4829-b5a9-75a7bb2f313b';
export const LUCAS_ANNARATTONE_EMAIL = 'lannarattone@gmail.com';
export const LUCAS_ANNARATTONE_USER_ID = '089e99ca-18d6-43f5-9687-f60c2d76b2f8';
export const ARTUR_SINDARSKY_EMAIL = 'arturpatser@gmail.com';
export const ARTUR_SINDARSKY_USER_ID = '1f0fe62a-7744-4153-bfcf-4f20b6e820d3';
export const SHARON_PRAISE_AKPUNNE_EMAIL = 'sharonpraiseakpunne1@gmail.com';
export const SHARON_PRAISE_AKPUNNE_USER_ID = '77283f92-7d90-45e2-97aa-3ec500781656';
export const VIVIAN_UBOCHI_EMAIL = 'vivian@gooroconsulting.com';
export const VIVIAN_UBOCHI_USER_ID = '5e919674-60ba-42b9-bd18-813f484f7c24';
export const SAKINA_LOKHANDWALA_EMAIL = 'slsakina27@gmail.com';
export const SAKINA_LOKHANDWALA_USER_ID = '625f9871-b975-40c5-9b71-a093419c69c8';
export const MATAS_RAMANAUSKAS_EMAIL = 'matt.ramanauskas@gmail.com';
export const MATAS_RAMANAUSKAS_USER_ID = 'e1db835c-4149-407e-807e-5ff0b99661c0';
export const PEDRO_MONESTEL_EMAIL = 'monestelp93@gmail.com';
export const PEDRO_MONESTEL_USER_ID = 'f7d02d67-dd5b-4ce7-95dd-f6f2c9bdbc35';
export const YASMINE_CAXEIRO_EMAIL = 'mine.caxeiro@n1n3consulting.com';
export const YASMINE_CAXEIRO_USER_ID = '357b97ca-c578-43b1-8e48-b438142312ec';

// Karolina Żurawska's email constant
export const KAROLINA_ZURAWSKA_EMAIL = 'kz.zurawska@gmail.com';

type UseMessagingOptions = {
  autoLoad?: boolean;
  suppressLoadErrors?: boolean;
};

const normalizeIdentity = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const tokenizeIdentity = (value: string): string[] =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 2);

export const useMessaging = (options: UseMessagingOptions = {}) => {
  const { autoLoad = true, suppressLoadErrors = false } = options;
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  // Ref to track current messages for subscription callbacks
  const messagesRef = useRef<Record<string, Message[]>>({});
  const conversationIdsRef = useRef<Set<string>>(new Set());
  
  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdsRef.current = new Set(conversations.map((conversation) => conversation.id));
  }, [conversations]);

  const scopedConversationIds = conversations.map((conversation) => conversation.id).join('|');

  // Get user ID by email using database function with fallback
  const getUserIdByEmail = useCallback(async (email: string): Promise<string | null> => {
    if (!user) {
      logWarn('getUserIdByEmail: User not authenticated');
      return null;
    }

    // Direct lookup for Samuel's email - use known user ID
    if (email.toLowerCase() === SAMUEL_STARKMAN_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Samuel user ID', { userId: SAMUEL_STARKMAN_USER_ID });
      return SAMUEL_STARKMAN_USER_ID;
    }

    // Direct lookup for Nic M Rayce's email
    if (email.toLowerCase() === NIC_M_RAYCE_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Looking up Nic M Rayce user ID', { email });
      // Will use RPC function or profile lookup below
    }

    if (email.toLowerCase() === SOPHIA_LOPEZ_PIMENTA_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Sophia Lopez Pimenta user ID', {
        userId: SOPHIA_LOPEZ_PIMENTA_USER_ID
      });
      return SOPHIA_LOPEZ_PIMENTA_USER_ID;
    }

    if (email.toLowerCase() === DELRAJ_SINGH_UPPAL_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Delraj Singh Uppal user ID', {
        userId: DELRAJ_SINGH_UPPAL_USER_ID
      });
      return DELRAJ_SINGH_UPPAL_USER_ID;
    }

    if (email.toLowerCase() === MATIAS_PANCORVO_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Matias Pancorvo user ID', {
        userId: MATIAS_PANCORVO_USER_ID
      });
      return MATIAS_PANCORVO_USER_ID;
    }

    if (email.toLowerCase() === DAIANA_TOKPAYEVA_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Daiana Tokpayeva user ID', {
        userId: DAIANA_TOKPAYEVA_USER_ID
      });
      return DAIANA_TOKPAYEVA_USER_ID;
    }

    if (email.toLowerCase() === KATIE_BRETT_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Katie Brett user ID', {
        userId: KATIE_BRETT_USER_ID
      });
      return KATIE_BRETT_USER_ID;
    }

    if (email.toLowerCase() === JOHNNY_BOU_MALHAB_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Johnny Bou Malhab user ID', {
        userId: JOHNNY_BOU_MALHAB_USER_ID
      });
      return JOHNNY_BOU_MALHAB_USER_ID;
    }

    if (email.toLowerCase() === JULIO_SANCHEZ_REDONDO_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Julio Sanchez Redondo user ID', {
        userId: JULIO_SANCHEZ_REDONDO_USER_ID
      });
      return JULIO_SANCHEZ_REDONDO_USER_ID;
    }

    if (email.toLowerCase() === JELENA_DABOVIC_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Jelena Dabovic user ID', {
        userId: JELENA_DABOVIC_USER_ID
      });
      return JELENA_DABOVIC_USER_ID;
    }

    if (email.toLowerCase() === CAROLINA_BARTHALOT_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Carolina Barthalot user ID', {
        userId: CAROLINA_BARTHALOT_USER_ID
      });
      return CAROLINA_BARTHALOT_USER_ID;
    }

    if (email.toLowerCase() === LUCAS_ANNARATTONE_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Lucas Annarattone user ID', {
        userId: LUCAS_ANNARATTONE_USER_ID
      });
      return LUCAS_ANNARATTONE_USER_ID;
    }

    if (email.toLowerCase() === ARTUR_SINDARSKY_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Artur Sindarsky user ID', {
        userId: ARTUR_SINDARSKY_USER_ID
      });
      return ARTUR_SINDARSKY_USER_ID;
    }

    if (email.toLowerCase() === SHARON_PRAISE_AKPUNNE_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Sharon Praise-Akpunne user ID', {
        userId: SHARON_PRAISE_AKPUNNE_USER_ID
      });
      return SHARON_PRAISE_AKPUNNE_USER_ID;
    }

    if (email.toLowerCase() === VIVIAN_UBOCHI_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Vivian Ubochi user ID', {
        userId: VIVIAN_UBOCHI_USER_ID
      });
      return VIVIAN_UBOCHI_USER_ID;
    }

    if (email.toLowerCase() === SAKINA_LOKHANDWALA_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Sakina Lokhandwala user ID', {
        userId: SAKINA_LOKHANDWALA_USER_ID
      });
      return SAKINA_LOKHANDWALA_USER_ID;
    }

    if (email.toLowerCase() === MATAS_RAMANAUSKAS_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Matas Ramanauskas user ID', {
        userId: MATAS_RAMANAUSKAS_USER_ID
      });
      return MATAS_RAMANAUSKAS_USER_ID;
    }

    if (email.toLowerCase() === PEDRO_MONESTEL_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Pedro Monestel user ID', {
        userId: PEDRO_MONESTEL_USER_ID
      });
      return PEDRO_MONESTEL_USER_ID;
    }

    if (email.toLowerCase() === YASMINE_CAXEIRO_EMAIL.toLowerCase()) {
      logInfo('getUserIdByEmail: Using known Yasmine Caxeiro user ID', {
        userId: YASMINE_CAXEIRO_USER_ID
      });
      return YASMINE_CAXEIRO_USER_ID;
    }

    try {
      logInfo('getUserIdByEmail: Looking up user ID for email', { email });
      
      // Try RPC function first
      const { data, error } = await supabase.rpc('get_user_id_by_email', {
        user_email: email
      });

      if (error) {
        logWarn('getUserIdByEmail: RPC function failed, trying direct query', {
          error: error.message,
          code: error.code,
          email
        });
        
        // Fallback: Try querying profiles table if email is stored there
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();
        
        if (!profileError && profileData?.id) {
          logInfo('getUserIdByEmail: Found user ID via profiles table', { email, userId: profileData.id });
          return profileData.id;
        }
        
        return null;
      }

      if (!data) {
        logWarn('getUserIdByEmail: No user found for email', { email });
        return null;
      }

      logInfo('getUserIdByEmail: Found user ID', { email, userId: data });
      return data;
    } catch (error) {
      logError('getUserIdByEmail: Exception occurred', error, {
        email,
        currentUserId: user?.id
      });
      return null;
    }
  }, [user]);

  const loadUnreadCounts = useCallback(async (conversationIds?: string[]) => {
    if (!user) return;

    const ids = conversationIds ?? Array.from(conversationIdsRef.current);

    if (ids.length === 0) {
      setUnreadCounts({});
      return;
    }

    try {
      const { data, error } = await safe.select(async () =>
        await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', ids)
          .neq('sender_id', user.id)
          .eq('is_read', false)
      );

      if (error) throw error;

      const nextUnreadCounts: Record<string, number> = {};
      ids.forEach((id) => {
        nextUnreadCounts[id] = 0;
      });

      (data || []).forEach((row) => {
        const conversationId = row.conversation_id;
        nextUnreadCounts[conversationId] = (nextUnreadCounts[conversationId] || 0) + 1;
      });

      console.log('[UNREAD_SYNC] Reloaded unread counts:', nextUnreadCounts);
      setUnreadCounts(nextUnreadCounts);
    } catch (error) {
      logError('Error loading unread counts', error);
    }
  }, [user]);

  const resolveMentorUserId = useCallback(async (mentor: { name: string; user_id?: string | null }): Promise<string | null> => {
    if (!user) {
      logWarn('resolveMentorUserId: User not authenticated');
      return null;
    }

    const mentorName = mentor.name?.trim();
    if (!mentorName) {
      logWarn('resolveMentorUserId: Missing mentor name');
      return null;
    }

    const mentorNameNormalized = normalizeIdentity(mentorName);
    if (
      mentorNameNormalized.includes('sophia') &&
      (mentorNameNormalized.includes('pimenta') || mentorNameNormalized.includes('lopez'))
    ) {
      return SOPHIA_LOPEZ_PIMENTA_USER_ID;
    }

    if (
      mentorNameNormalized.includes('delraj') &&
      (mentorNameNormalized.includes('uppal') || mentorNameNormalized.includes('singh'))
    ) {
      return DELRAJ_SINGH_UPPAL_USER_ID;
    }

    if (
      mentorNameNormalized.includes('matias') &&
      mentorNameNormalized.includes('pancorvo')
    ) {
      return MATIAS_PANCORVO_USER_ID;
    }

    if (
      mentorNameNormalized.includes('daiana') &&
      mentorNameNormalized.includes('tokpayeva')
    ) {
      return DAIANA_TOKPAYEVA_USER_ID;
    }

    if (
      mentorNameNormalized.includes('katie') &&
      mentorNameNormalized.includes('brett')
    ) {
      return KATIE_BRETT_USER_ID;
    }

    if (
      mentorNameNormalized.includes('johnny') &&
      mentorNameNormalized.includes('malhab')
    ) {
      return JOHNNY_BOU_MALHAB_USER_ID;
    }

    if (
      mentorNameNormalized.includes('julio') &&
      mentorNameNormalized.includes('sanchez') &&
      mentorNameNormalized.includes('redondo')
    ) {
      return JULIO_SANCHEZ_REDONDO_USER_ID;
    }

    if (
      mentorNameNormalized.includes('jelena') &&
      mentorNameNormalized.includes('dabovic')
    ) {
      return JELENA_DABOVIC_USER_ID;
    }

    if (
      mentorNameNormalized.includes('sakina') &&
      mentorNameNormalized.includes('lokhandwala')
    ) {
      return SAKINA_LOKHANDWALA_USER_ID;
    }

    if (
      mentorNameNormalized.includes('carolina') &&
      mentorNameNormalized.includes('barthalot')
    ) {
      return CAROLINA_BARTHALOT_USER_ID;
    }

    if (
      mentorNameNormalized.includes('lucas') &&
      mentorNameNormalized.includes('annarattone')
    ) {
      return LUCAS_ANNARATTONE_USER_ID;
    }

    if (
      mentorNameNormalized.includes('artur') &&
      mentorNameNormalized.includes('sindarsky')
    ) {
      return ARTUR_SINDARSKY_USER_ID;
    }

    if (
      mentorNameNormalized.includes('sharon') &&
      mentorNameNormalized.includes('praise') &&
      mentorNameNormalized.includes('akpunne')
    ) {
      return SHARON_PRAISE_AKPUNNE_USER_ID;
    }

    if (
      mentorNameNormalized.includes('vivian') &&
      mentorNameNormalized.includes('ubochi')
    ) {
      return VIVIAN_UBOCHI_USER_ID;
    }

    if (
      mentorNameNormalized.includes('matas') &&
      mentorNameNormalized.includes('ramanauskas')
    ) {
      return MATAS_RAMANAUSKAS_USER_ID;
    }

    if (
      mentorNameNormalized.includes('pedro') &&
      mentorNameNormalized.includes('monestel')
    ) {
      return PEDRO_MONESTEL_USER_ID;
    }

    if (
      mentorNameNormalized.includes('yasmine') &&
      mentorNameNormalized.includes('caxeiro')
    ) {
      return YASMINE_CAXEIRO_USER_ID;
    }

    if (mentor.user_id && mentor.user_id.trim() !== '') {
      return mentor.user_id;
    }

    const mentorTokens = tokenizeIdentity(mentorName);
    if (mentorTokens.length === 0) {
      logWarn('resolveMentorUserId: Could not tokenize mentor name', { mentorName });
      return null;
    }

    const firstToken = mentorTokens[0];
    const lastToken = mentorTokens[mentorTokens.length - 1];
    const searchTokens = Array.from(new Set([firstToken, lastToken].filter(Boolean)));

    try {
      const orClauses = searchTokens.flatMap((token) => [
        `full_name.ilike.%${token}%`,
        `username.ilike.%${token}%`
      ]);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .or(orClauses.join(','))
        .limit(50);

      if (error) {
        logError('resolveMentorUserId: Error querying profiles', error, {
          mentorName,
          searchTokens
        });
        return null;
      }

      if (!data || data.length === 0) {
        logWarn('resolveMentorUserId: No profile candidates found', { mentorName, searchTokens });
        return null;
      }

      const ranked = data
        .map((profile) => {
          const profileFullNameNormalized = normalizeIdentity(profile.full_name || '');
          const profileUsernameNormalized = normalizeIdentity(profile.username || '');
          const combinedNormalized = `${profileFullNameNormalized} ${profileUsernameNormalized}`;

          const exactNameMatch = profileFullNameNormalized === mentorNameNormalized;
          const exactUsernameMatch = profileUsernameNormalized === mentorNameNormalized;
          const hasAllTokens = mentorTokens.every((token) => combinedNormalized.includes(token));
          const hasFirstLast = combinedNormalized.includes(firstToken) && combinedNormalized.includes(lastToken);

          let score = 0;
          if (exactNameMatch) score += 120;
          if (exactUsernameMatch) score += 110;
          if (hasAllTokens) score += 70;
          if (hasFirstLast) score += 45;
          score += mentorTokens.reduce((acc, token) => acc + (combinedNormalized.includes(token) ? 5 : 0), 0);

          return {
            profileId: profile.id,
            score
          };
        })
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score);

      if (ranked.length === 0) {
        logWarn('resolveMentorUserId: No ranked matches found', { mentorName, searchTokens });
        return null;
      }

      if (ranked.length > 1 && ranked[0].score - ranked[1].score < 25) {
        logWarn('resolveMentorUserId: Ambiguous mentor match; refusing auto-link', {
          mentorName,
          topScores: ranked.slice(0, 3).map((candidate) => candidate.score)
        });
        return null;
      }

      logInfo('resolveMentorUserId: Resolved mentor user ID via profile matching', {
        mentorName,
        resolvedUserId: ranked[0].profileId,
        score: ranked[0].score
      });
      return ranked[0].profileId;
    } catch (error) {
      logError('resolveMentorUserId: Exception occurred', error, { mentorName, searchTokens });
      return null;
    }
  }, [user]);

  const loadConversationsFromServer = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await safe.select(async () =>
        await supabase
          .from('conversations')
          .select('*')
          .contains('participants', [user.id])
          .order('last_message_at', { ascending: false, nullsFirst: false })
      );

      if (error) throw error;

      const loadedConversations = (data || []) as Conversation[];
      setConversations(loadedConversations);

      const conversationIds = loadedConversations.map((conversation) => conversation.id);
      await loadUnreadCounts(conversationIds);

      console.log('[CONVERSATION_SYNC] Reloaded conversations from backend:', {
        conversationCount: loadedConversations.length,
        conversationIds
      });
    } catch (error) {
      logError('Error loading conversations', error);
      if (!suppressLoadErrors) {
        toast.error('Failed to load conversations. Please refresh the page.');
      }
    }
  }, [user, loadUnreadCounts, suppressLoadErrors]);

  // Load user's conversations and keep them synced with backend as source of truth
  useEffect(() => {
    if (!user || !autoLoad) return;

    loadConversationsFromServer();

    const conversationSubscription = supabase
      .channel(`user-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participants.cs.{${user.id}}`
        },
        () => {
          console.log('[CONVERSATION_SYNC] Realtime conversation change received, reloading from backend');
          loadConversationsFromServer();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
    };
  }, [user, autoLoad, loadConversationsFromServer, loadUnreadCounts]);

  // Scoped realtime sync: subscribe only to message events for conversations this user participates in.
  useEffect(() => {
    if (!user || !autoLoad || conversations.length === 0 || !scopedConversationIds) return;

    const scopedChannels = conversations.map((conversation) =>
      supabase
        .channel(`user-messages-sync-${user.id}-${conversation.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversation.id}`
          },
          (payload) => {
            console.log('[UNREAD_SYNC] Scoped message event received:', {
              eventType: payload.eventType,
              conversationId: conversation.id
            });

            loadUnreadCounts([conversation.id]);

            // Keep sidebar ordering synchronized when conversations receive/lose messages.
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              loadConversationsFromServer();
            }
          }
        )
        .subscribe()
    );

    return () => {
      scopedChannels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, autoLoad, scopedConversationIds, loadUnreadCounts, loadConversationsFromServer]);

  useEffect(() => {
    if (user) return;
    setConversations([]);
    setMessages({});
    setUnreadCounts({});
    setActiveConversationId(null);
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const abortController = new AbortController();

    const loadMessages = async () => {
      try {
        const { data, error } = await safe.select(async () =>
          await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', activeConversationId)
            .order('created_at', { ascending: true })
        );

        if (error) throw error;
        if (abortController.signal.aborted) return;

        // Get unique sender IDs
        const senderIds = [...new Set((data || []).map(msg => msg.sender_id))];
        
        if (senderIds.length === 0) {
          setMessages(prev => ({
            ...prev,
            [activeConversationId]: []
          }));
          setUnreadCounts(prev => ({
            ...prev,
            [activeConversationId]: 0
          }));
          return;
        }

        // Batch fetch all sender profiles in a single query
        const { data: profilesData, error: profilesError } = await safe.select(async () =>
          await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds)
        );

        if (profilesError) throw profilesError;
        if (abortController.signal.aborted) return;

        // Create a map of sender ID to profile data
        const profilesMap = new Map(
          (profilesData || []).map(profile => [profile.id, profile])
        );

        // Map messages with sender data
        const messagesWithSenders = (data || []).map((message) => ({
          ...message,
          message_type: message.message_type as 'text' | 'image' | 'file',
          sender: profilesMap.get(message.sender_id) || undefined
        })) as Message[];

        if (!abortController.signal.aborted) {
          setMessages(prev => ({
            ...prev,
            [activeConversationId]: messagesWithSenders
          }));

          const unreadForActiveConversation = messagesWithSenders.filter(
            (message) => message.sender_id !== user?.id && !message.is_read
          ).length;

          setUnreadCounts(prev => ({
            ...prev,
            [activeConversationId]: unreadForActiveConversation
          }));
        }
      } catch (error: any) {
        if (!abortController.signal.aborted) {
          logError('Error loading messages', error);
          toast.error('Failed to load messages. Please try again.');
        }
      }
    };

    loadMessages();

    // Subscribe to messages in this conversation (INSERT and UPDATE events)
    const messageSubscription = supabase
      .channel(`messages-${activeConversationId}`)
      .on('postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        async (payload) => {
          console.log('[REALTIME] Message event:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            // Handle new message insertion
            const existingMessages = messagesRef.current[activeConversationId] || [];

            // Check if message already exists (prevent duplicates)
            if (existingMessages.some(m => m.id === payload.new.id)) {
              return;
            }

            // Get sender info from existing messages if available
            let senderData = existingMessages.find(m => m.sender_id === payload.new.sender_id)?.sender;

            // If sender not found, fetch it
            if (!senderData) {
              try {
                const { data } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', payload.new.sender_id)
                  .single();
                senderData = data || undefined;
              } catch (error) {
                logError('Error fetching sender profile', error);
              }
            }

            const newMessage: Message = {
              id: payload.new.id,
              conversation_id: payload.new.conversation_id,
              sender_id: payload.new.sender_id,
              content: payload.new.content,
              message_type: payload.new.message_type as 'text' | 'image' | 'file',
              attachments: payload.new.attachments,
              is_read: payload.new.is_read,
              reply_to_id: payload.new.reply_to_id,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
              sender: senderData
            };

            // Use functional update to add message
            setMessages(prev => {
              const currentMessages = prev[activeConversationId] || [];
              // Double-check for duplicates (race condition protection)
              if (currentMessages.some(m => m.id === newMessage.id)) {
                return prev;
              }
              return {
                ...prev,
                [activeConversationId]: [...currentMessages, newMessage]
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            // Handle message updates (like is_read status changes)
            const updatedMessage: Message = {
              id: payload.new.id,
              conversation_id: payload.new.conversation_id,
              sender_id: payload.new.sender_id,
              content: payload.new.content,
              message_type: payload.new.message_type as 'text' | 'image' | 'file',
              attachments: payload.new.attachments,
              is_read: payload.new.is_read,
              reply_to_id: payload.new.reply_to_id,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
              sender: messagesRef.current[activeConversationId]?.find(m => m.id === payload.new.id)?.sender
            };

            // Update the specific message in state
            setMessages(prev => ({
              ...prev,
              [activeConversationId]: (prev[activeConversationId] || []).map(msg =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            }));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => ({
              ...prev,
              [activeConversationId]: (prev[activeConversationId] || []).filter(
                (msg) => msg.id !== payload.old.id
              )
            }));
          }

          loadUnreadCounts([activeConversationId]);
        }
      )
      .subscribe();

    return () => {
      abortController.abort();
      supabase.removeChannel(messageSubscription);
    };
  }, [activeConversationId, user?.id, loadUnreadCounts]);

  const startConversation = useCallback(async (participantId: string): Promise<string | null> => {
    if (!user || loading) {
      logWarn('startConversation: User not authenticated or already loading');
      return null;
    }

    if (participantId === user.id) {
      toast.error('You cannot start a conversation with yourself.');
      return null;
    }

    setLoading(true);
    try {
      logInfo('startConversation: Starting conversation', {
        currentUserId: user.id,
        participantId,
        email: user.email
      });

      // First check in-memory state for quick lookup
      const existingInMemory = conversations.find(conv => 
        conv.participants.length === 2 && 
        conv.participants.includes(participantId) && 
        conv.participants.includes(user.id)
      );

      if (existingInMemory) {
        logInfo('startConversation: Found existing conversation in memory', { conversationId: existingInMemory.id });
        setActiveConversationId(existingInMemory.id);
        return existingInMemory.id;
      }

      // Primary path: atomic RPC backed by DB uniqueness.
      const { data: rpcData, error: rpcError } = await safe.rpc(async () =>
        await supabase.rpc('create_or_get_direct_conversation', {
          p_other_user_id: participantId
        })
      );

      if (!rpcError) {
        const rpcConversation = rpcData as Conversation | null;

        if (rpcConversation?.id) {
          logInfo('startConversation: Resolved via atomic RPC', {
            conversationId: rpcConversation.id
          });

          setConversations(prev => {
            const withoutCurrent = prev.filter(conversation => conversation.id !== rpcConversation.id);
            const merged = [rpcConversation, ...withoutCurrent];
            return merged.sort((a, b) => {
              const aTime = new Date(a.last_message_at || a.created_at).getTime();
              const bTime = new Date(b.last_message_at || b.created_at).getTime();
              return bTime - aTime;
            });
          });

          setActiveConversationId(rpcConversation.id);
          return rpcConversation.id;
        }
      } else {
        // Graceful fallback while environments catch up with migrations.
        logWarn('startConversation: Atomic RPC unavailable, falling back to legacy flow', {
          code: rpcError.code,
          message: rpcError.message
        });
      }

      // Legacy fallback: query existing conversation.
      logInfo('startConversation: Checking database for existing conversation');
      const { data: existingConversations, error: queryError } = await safe.select(async () =>
        await supabase
          .from('conversations')
          .select('*')
          .eq('is_group', false)
          .contains('participants', [user.id])
      );

      if (queryError) {
        logError('startConversation: Error querying existing conversations', queryError, {
          code: queryError.code,
          message: queryError.message
        });
        // Continue to create new conversation even if query fails
      } else if (existingConversations && existingConversations.length > 0) {
        // Filter to find exact match (both participants)
        const exactMatch = existingConversations.find(conv => 
          conv.participants.length === 2 &&
          conv.participants.includes(user.id) &&
          conv.participants.includes(participantId)
        );

        if (exactMatch) {
          logInfo('startConversation: Found existing conversation in database', { conversationId: exactMatch.id });
          setConversations(prev => {
            // Add to state if not already there
            if (!prev.find(c => c.id === exactMatch.id)) {
              return [exactMatch, ...prev];
            }
            return prev;
          });
          setActiveConversationId(exactMatch.id);
          return exactMatch.id;
        }
      }

      // Legacy fallback: create conversation.
      logInfo('startConversation: Creating new conversation', {
        participants: [user.id, participantId],
        is_group: false
      });

      const { data, error } = await safe.insert(async () =>
        await supabase
          .from('conversations')
          .insert({
            participants: [user.id, participantId],
            is_group: false,
            // Ensure newly created conversations sort to the top immediately.
            last_message_at: new Date().toISOString()
          })
          .select()
          .single()
      );

      if (error) {
        logError('startConversation: Error creating conversation', error, {
          code: error.code,
          message: error.message,
          participants: [user.id, participantId]
        });
        throw error;
      }

      if (!data) {
        logError('startConversation: No data returned from conversation creation', new Error('No data returned'));
        throw new Error('Failed to create conversation: No data returned');
      }

      logInfo('startConversation: Conversation created successfully', {
        conversationId: data.id,
        participants: data.participants
      });

      setConversations(prev => [data, ...prev]);
      setActiveConversationId(data.id);
      return data.id;
    } catch (error) {
      const appError = handleError(error);
      logError('startConversation: Error starting conversation', appError, {
        currentUserId: user?.id,
        participantId
      });
      
      // Provide more specific error messages
      const errorMessage = getUserMessage(error);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, loading, conversations, setActiveConversationId]);

  const sendMessage = useCallback(async (conversationId: string, content: string, replyToId?: string) => {
    const trimmedContent = content.trim();

    if (!user || !trimmedContent) {
      logWarn('sendMessage: Invalid parameters', {
        hasUser: !!user,
        hasContent: !!trimmedContent
      });
      return;
    }

    // Use separate sending state so the input stays enabled
    setSending(true);
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticTimestamp = new Date().toISOString();
    const existingSender = (messagesRef.current[conversationId] || []).find(
      (message) => message.sender_id === user.id
    )?.sender;
    const optimisticSender = existingSender || {
      id: user.id,
      full_name: user.user_metadata?.full_name || undefined,
      avatar_url: user.user_metadata?.avatar_url || undefined
    };

    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmedContent,
      message_type: 'text',
      attachments: null,
      is_read: false,
      reply_to_id: replyToId,
      created_at: optimisticTimestamp,
      updated_at: optimisticTimestamp,
      sender: optimisticSender
    };

    // Show message immediately in UI before waiting for network/realtime events.
    setMessages(prev => {
      const currentMessages = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: [...currentMessages, optimisticMessage]
      };
    });

    // Keep active conversation order fresh immediately.
    setConversations(prev => {
      const index = prev.findIndex(conversation => conversation.id === conversationId);
      if (index === -1) return prev;

      const updatedConversation = {
        ...prev[index],
        last_message_at: optimisticTimestamp,
        updated_at: optimisticTimestamp
      };

      const remaining = prev.filter((_, currentIndex) => currentIndex !== index);
      return [updatedConversation, ...remaining];
    });

    try {
      logInfo('sendMessage: Sending message', {
        conversationId,
        senderId: user.id,
        contentLength: trimmedContent.length,
        replyToId
      });

      const { data, error } = await safe.insert(async () =>
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: trimmedContent,
            message_type: 'text',
            reply_to_id: replyToId
          })
          .select()
          .single()
      );

      if (error) {
        logError('sendMessage: Error inserting message', error, {
          code: error.code,
          message: error.message,
          conversationId,
          senderId: user.id
        });
        throw error;
      }

      if (!data) {
        logError('sendMessage: No data returned from message insertion', new Error('No data returned'));
        throw new Error('Failed to send message: No data returned');
      }

      logInfo('sendMessage: Message sent successfully', {
        messageId: data.id,
        conversationId
      });

      const persistedMessage: Message = {
        id: data.id,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type as 'text' | 'image' | 'file',
        attachments: data.attachments,
        is_read: data.is_read,
        reply_to_id: data.reply_to_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        sender: optimisticSender
      };

      // Replace optimistic message with persisted row and prevent duplicates if realtime already inserted it.
      setMessages(prev => {
        const currentMessages = prev[conversationId] || [];
        const withoutOptimistic = currentMessages.filter((message) => message.id !== optimisticId);

        if (withoutOptimistic.some((message) => message.id === persistedMessage.id)) {
          return {
            ...prev,
            [conversationId]: withoutOptimistic
          };
        }

        return {
          ...prev,
          [conversationId]: [...withoutOptimistic, persistedMessage]
        };
      });

      // Update conversation's last message timestamp
      const { error: updateError } = await safe.update(async () =>
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)
      );

      // Keep local ordering/timestamp in sync regardless of realtime latency.
      setConversations(prev => {
        const index = prev.findIndex(conversation => conversation.id === conversationId);
        if (index === -1) return prev;

        const updatedConversation = {
          ...prev[index],
          last_message_at: data.created_at || optimisticTimestamp,
          updated_at: data.updated_at || optimisticTimestamp
        };

        const remaining = prev.filter((_, currentIndex) => currentIndex !== index);
        return [updatedConversation, ...remaining];
      });

      if (updateError) {
        logWarn('sendMessage: Failed to update conversation timestamp', {
          error: updateError.message,
          conversationId
        });
        // Don't throw - message was sent successfully
      }

      return data;
    } catch (error) {
      // Remove optimistic message if backend write failed.
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(
          (message) => message.id !== optimisticId
        )
      }));

      const appError = handleError(error);
      logError('sendMessage: Error sending message', appError, {
        conversationId,
        senderId: user?.id
      });
      
      // Provide more specific error messages
      const errorMessage = getUserMessage(error);
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  }, [user]);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to delete messages');
      return false;
    }

    if (!conversationId || !messageId || messageId.startsWith('temp-')) {
      return false;
    }

    const currentConversationMessages = messagesRef.current[conversationId] || [];
    const targetMessage = currentConversationMessages.find((message) => message.id === messageId);

    if (!targetMessage) {
      toast.error('Message not found');
      return false;
    }

    if (targetMessage.sender_id !== user.id) {
      toast.error('You can only delete messages you sent');
      return false;
    }

    const nextConversationMessages = currentConversationMessages.filter((message) => message.id !== messageId);

    // Optimistically remove message for immediate feedback.
    setMessages((prev) => ({
      ...prev,
      [conversationId]: nextConversationMessages
    }));
    setUnreadCounts((prev) => ({
      ...prev,
      [conversationId]: nextConversationMessages.filter(
        (message) => message.sender_id !== user.id && !message.is_read
      ).length
    }));

    try {
      const { data: deletedRows, error: deleteError } = await safe.delete(async () =>
        await supabase
          .from('messages')
          .delete()
          .eq('id', messageId)
          .eq('conversation_id', conversationId)
          .eq('sender_id', user.id)
          .select('id')
      );

      if (deleteError) {
        throw deleteError;
      }

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('Message was not deleted');
      }

      // Keep conversation ordering accurate if the latest message was removed.
      const { data: latestMessageRow, error: latestMessageError } = await safe.select(async () =>
        await supabase
          .from('messages')
          .select('created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      );

      if (latestMessageError) {
        logWarn('deleteMessage: Failed to fetch latest message after delete', {
          conversationId,
          error: latestMessageError.message
        });
      } else {
        const nextLastMessageAt = latestMessageRow?.created_at ?? null;

        const { error: updateConversationError } = await safe.update(async () =>
          await supabase
            .from('conversations')
            .update({ last_message_at: nextLastMessageAt })
            .eq('id', conversationId)
        );

        if (updateConversationError) {
          logWarn('deleteMessage: Failed to update conversation timestamp', {
            conversationId,
            error: updateConversationError.message
          });
        }

        setConversations((prev) => {
          const index = prev.findIndex((conversation) => conversation.id === conversationId);
          if (index === -1) return prev;

          const updatedConversation = {
            ...prev[index],
            last_message_at: nextLastMessageAt || undefined,
            updated_at: new Date().toISOString()
          };

          const remaining = prev.filter((_, currentIndex) => currentIndex !== index);
          const merged = [updatedConversation, ...remaining];
          return merged.sort((a, b) => {
            const aTime = new Date(a.last_message_at || a.created_at).getTime();
            const bTime = new Date(b.last_message_at || b.created_at).getTime();
            return bTime - aTime;
          });
        });
      }

      await loadUnreadCounts([conversationId]);
      await loadConversationsFromServer();
      toast.success('Message deleted');
      return true;
    } catch (error) {
      // Revert optimistic update on failure.
      setMessages((prev) => ({
        ...prev,
        [conversationId]: currentConversationMessages
      }));
      setUnreadCounts((prev) => ({
        ...prev,
        [conversationId]: currentConversationMessages.filter(
          (message) => message.sender_id !== user.id && !message.is_read
        ).length
      }));

      const appError = handleError(error);
      logError('deleteMessage: Error deleting message', appError, {
        conversationId,
        messageId,
        userId: user.id
      });

      toast.error(getUserMessage(error));
      return false;
    }
  }, [user, loadUnreadCounts, loadConversationsFromServer]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    console.log('[MARK_READ] Marking conversation as read:', {
      conversationId,
      userId: user.id
    });

    try {
      const { data, error } = await safe.update(async () => {
        const result = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .eq('is_read', false)
          .select('id');
        return result;
      });

      if (error) {
        console.error('[MARK_READ] Error:', error);
        throw error;
      }

      const updatedCount = data?.length || 0;
      console.log('[MARK_READ] Backend write succeeded:', {
        conversationId,
        updatedCount
      });

      // CRITICAL: Update local state immediately (don't wait for real-time subscription)
      // This ensures unread badges clear instantly
      setMessages(prev => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: conversationMessages.map(msg =>
            msg.sender_id !== user.id && !msg.is_read
              ? { ...msg, is_read: true }
              : msg
          )
        };
      });

      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: 0
      }));

      // Force reload from source of truth to prevent stale badge reappearance.
      await loadUnreadCounts([conversationId]);
    } catch (error) {
      console.error('[MARK_READ] Exception:', error);
      logError('Error marking messages as read', error);
    }
  }, [user, loadUnreadCounts]);

  const getUnreadCount = (conversationId: string): number => {
    return unreadCounts[conversationId] || 0;
  };

  // Get total unread messages count across all conversations
  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conversation) => total + (unreadCounts[conversation.id] || 0), 0);
  }, [conversations, unreadCounts]);

  // Get user ID by username
  const getUserIdByUsername = useCallback(async (username: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (error) {
        logError('getUserIdByUsername: Error fetching profile', error, {
          code: error.code,
          message: error.message,
          username
        });
        return null;
      }

      if (!data) {
        logWarn('getUserIdByUsername: No profile found for username', { username });
        return null;
      }

      return data.id;
    } catch (error) {
      logError('getUserIdByUsername: Exception occurred', error, { username });
      return null;
    }
  }, []);

  // Get username by user ID
  const getUsernameByUserId = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (error) {
        logError('getUsernameByUserId: Error fetching profile', error, {
          code: error.code,
          message: error.message,
          userId
        });
        return null;
      }

      if (!data || !data.username) {
        logWarn('getUsernameByUserId: No username found for user ID', { userId });
        return null;
      }

      return data.username;
    } catch (error) {
      logError('getUsernameByUserId: Exception occurred', error, { userId });
      return null;
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to delete conversations');
      return false;
    }

    try {
      // First, verify the user is a participant in this conversation
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation || !conversation.participants.includes(user.id)) {
        toast.error('You do not have permission to delete this conversation');
        return false;
      }

      console.log('[DELETE] Attempting conversation removal:', {
        conversationId,
        userId: user.id,
        participants: conversation.participants
      });

      // Try hard delete first and verify the backend actually deleted rows.
      const { data: deletedRows, error: deleteError } = await safe.delete(async () =>
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId)
          .select('id')
      );

      if (deleteError) {
        console.error('[DELETE] Hard delete failed:', deleteError);
        logError('Error deleting conversation', deleteError);
        toast.error('Failed to delete conversation');
        return false;
      }

      const hardDeleteCount = deletedRows?.length || 0;
      let removalMode: 'hard-delete' | 'participant-removal' = 'hard-delete';

      if (hardDeleteCount === 0) {
        // Fallback for environments where DELETE policy is unavailable:
        // remove current user from participants so the thread stays hidden for this user across sessions/devices.
        const updatedParticipants = conversation.participants.filter((participantId) => participantId !== user.id);

        const { data: participantUpdateRows, error: participantUpdateError } = await safe.update(async () =>
          await supabase
            .from('conversations')
            .update({ participants: updatedParticipants })
            .eq('id', conversationId)
            .select('id, participants')
        );

        if (participantUpdateError || !participantUpdateRows || participantUpdateRows.length === 0) {
          console.error('[DELETE] Fallback participant removal failed:', participantUpdateError);
          logError('Error removing participant from conversation during delete fallback', participantUpdateError);
          toast.error('Failed to delete conversation');
          return false;
        }

        removalMode = 'participant-removal';
      }

      console.log('[DELETE] Backend write succeeded:', {
        conversationId,
        hardDeleteCount,
        removalMode
      });

      // Remove from local state only after successful database deletion
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setMessages(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });

      // If this was the active conversation, clear it
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }

      // Always re-sync from source of truth after deletion.
      await loadConversationsFromServer();

      toast.success('Conversation deleted successfully');
      return true;
    } catch (error) {
      console.error('[DELETE] Exception:', error);
      logError('Error deleting conversation', error);
      toast.error('Failed to delete conversation');
      return false;
    }
  }, [user, conversations, activeConversationId, setActiveConversationId, loadConversationsFromServer]);

  // Add reaction to a message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) {
      logWarn('addReaction: User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      if (error) {
        logError('Error adding reaction', error);
        toast.error('Failed to add reaction');
        throw error;
      }

      logInfo('Reaction added successfully', { messageId, emoji });
    } catch (error) {
      logError('Error adding reaction', error);
      toast.error('Failed to add reaction');
    }
  }, [user]);

  // Remove reaction from a message
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) {
      logWarn('removeReaction: User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) {
        logError('Error removing reaction', error);
        toast.error('Failed to remove reaction');
        throw error;
      }

      logInfo('Reaction removed successfully', { messageId, emoji });
    } catch (error) {
      logError('Error removing reaction', error);
      toast.error('Failed to remove reaction');
    }
  }, [user]);

  return {
    conversations,
    messages,
    loading,
    sending,
    activeConversationId,
    setActiveConversationId,
    startConversation,
    sendMessage,
    deleteMessage,
    markAsRead,
    getUnreadCount,
    getTotalUnreadCount,
    deleteConversation,
    getUserIdByEmail,
    resolveMentorUserId,
    getUserIdByUsername,
    getUsernameByUserId,
    addReaction,
    removeReaction
  };
};
