import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  MessageCircle,
  Trash2,
  Menu,
  Check,
  CheckCheck,
  Paperclip,
  Search,
  X,
  MoreVertical,
  Pin,
  BellOff,
  Archive,
  Ban,
  Flag,
  RotateCcw,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMessaging, Conversation, Message } from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceType } from "@/hooks/use-device-type";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { logError } from "@/lib/logger";
import { generateMentorSlug } from "@/utils/mentorSlug";
import { TypingIndicator } from "./TypingIndicator";
import { MessageReactions } from "./MessageReactions";
import { usePresence } from "@/hooks/usePresence";
import { useSocial } from "@/hooks/useSocial";

interface MessagingInterfaceProps {
  initialConversationId?: string;
}

type ParticipantProfile = {
  full_name: string;
  avatar_url: string | null;
  username: string | null;
  mentor_slug: string | null;
};

const SOPHIA_LOPEZ_PIMENTA_USER_ID = '50695a54-30c6-4b57-969e-b2de733bcd73';
const ARTUR_SINDARSKY_USER_ID = '1f0fe62a-7744-4153-bfcf-4f20b6e820d3';
const YASMINE_CAXEIRO_USER_ID = '357b97ca-c578-43b1-8e48-b438142312ec';
type MentorMeta = {
  user_id: string | null;
  name: string;
  picture: string | null;
};
type MessageReaction = {
  emoji: string;
  count: number;
  userReacted: boolean;
};
type TypingBroadcastPayload = {
  payload?: {
    user_id?: string;
  };
};

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '🤔', '👀', '💯'] as const;
const LONG_PRESS_MS = 320;

const isSophiaMentorName = (name: string | null | undefined): boolean => {
  const normalized = (name || '').toLowerCase();
  return normalized.includes('sophia') && (normalized.includes('pimenta') || normalized.includes('lopez'));
};

const isArturMentorName = (name: string | null | undefined): boolean => {
  const normalized = (name || '').toLowerCase();
  return normalized.includes('artur') && normalized.includes('sindarsky');
};

const isYasmineMentorName = (name: string | null | undefined): boolean => {
  const normalized = (name || '').toLowerCase();
  return normalized.includes('yasmine') && normalized.includes('caxeiro');
};

const normalizeIdentity = (value: string | null | undefined): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const findMentorMetaForParticipant = (
  participantId: string,
  profile: { full_name: string | null; username: string | null } | undefined,
  mentors: MentorMeta[]
): MentorMeta | null => {
  const mentorByUserId = mentors.find((mentor) => mentor.user_id === participantId);
  if (mentorByUserId) {
    return mentorByUserId;
  }

  const normalizedFullName = normalizeIdentity(profile?.full_name);
  if (normalizedFullName) {
    const mentorByName = mentors.find(
      (mentor) => normalizeIdentity(mentor.name) === normalizedFullName
    );
    if (mentorByName) {
      return mentorByName;
    }
  }

  const normalizedUsername = normalizeIdentity(profile?.username);
  if (normalizedUsername) {
    const mentorByUsername = mentors.find(
      (mentor) =>
        normalizeIdentity(mentor.name) === normalizedUsername ||
        normalizeIdentity(generateMentorSlug(mentor.name)) === normalizedUsername
    );
    if (mentorByUsername) {
      return mentorByUsername;
    }
  }

  return null;
};

export const MessagingInterface = ({ initialConversationId }: MessagingInterfaceProps) => {
  const { user } = useAuth();
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const {
    conversations,
    messages,
    messagePageState,
    conversationSettings,
    searchResults,
    searchLoading,
    loading,
    sending,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    retryFailedMessage,
    discardFailedMessage,
    loadMessages,
    deleteMessage,
    markAsRead,
    getUnreadCount,
    deleteConversation,
    pinConversation,
    muteConversation,
    archiveConversation,
    reportMessage,
    blockUser,
    searchMessages,
    clearMessageSearch,
    getAttachmentSignedUrl,
    addReaction,
    removeReaction
  } = useMessaging();
  
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSetInitialConversation = useRef(false);
  const previousInitialConversationId = useRef<string | undefined>(undefined);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, ParticipantProfile>>({});
  const [currentUserMentorAvatar, setCurrentUserMentorAvatar] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ messageId: string; conversationId: string } | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingBroadcastAtRef = useRef(0);
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({});
  const [activeReactionMenuMessageId, setActiveReactionMenuMessageId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Get all participant IDs for presence tracking
  const participantIds = useMemo(
    () => Array.from(new Set(conversations.flatMap(c => c.participants).filter(id => id !== user?.id))),
    [conversations, user?.id]
  );
  const { presenceData } = usePresence(participantIds);

  // Track message count to detect new messages
  const activeMessages = useMemo(
    () => (activeConversationId ? messages[activeConversationId] || [] : []),
    [activeConversationId, messages]
  );
  const messageCount = activeMessages.length;
  const lastMessage = messageCount > 0 ? activeMessages[messageCount - 1] : null;
  const currentUserId = user?.id ?? null;
  const activePageState = activeConversationId ? messagePageState[activeConversationId] : undefined;
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations]
  );
  const activeOtherParticipantId = useMemo(
    () => activeConversation && !activeConversation.is_group
      ? activeConversation.participants.find((participantId) => participantId !== user?.id)
      : undefined,
    [activeConversation, user?.id]
  );
  const { friendStatus: activeFriendStatus } = useSocial(activeOtherParticipantId);
  const directMessagingBlocked = Boolean(activeOtherParticipantId && activeFriendStatus !== 'friends');
  const messageIdsKey = useMemo(
    () => activeMessages.map((message) => message.id).join('|'),
    [activeMessages]
  );

  // Auto-scroll to bottom when new messages arrive (only within ScrollArea, not the page)
  useEffect(() => {
    if (!scrollViewportRef.current || !activeConversationId) return;

    const scrollContainer = scrollViewportRef.current;
    if (!scrollContainer) return;

    const isUserMessage = lastMessage?.sender_id === user?.id;
    
    // Only auto-scroll if:
    // 1. User is already near the bottom (within 100px), OR
    // 2. It's the user's own message (they just sent it), OR
    // 3. There are no messages yet
    const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
    
    if (isNearBottom || isUserMessage || messageCount === 0) {
      // Use requestAnimationFrame for smoother scrolling after DOM updates
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      });
    }
  }, [messageCount, activeConversationId, user?.id, lastMessage?.id, lastMessage?.sender_id]);

  // Set initial conversation ID from URL parameter
  useEffect(() => {
    // Reset flag if initialConversationId changes
    if (previousInitialConversationId.current !== initialConversationId) {
      hasSetInitialConversation.current = false;
      previousInitialConversationId.current = initialConversationId;
    }

    if (initialConversationId && !hasSetInitialConversation.current) {
      // If conversations are loaded, check if it exists
      if (conversations.length > 0) {
        const conversationExists = conversations.some(conv => conv.id === initialConversationId);
        if (conversationExists) {
          setActiveConversationId(initialConversationId);
          hasSetInitialConversation.current = true;
        }
      } else if (!loading) {
        // If conversations are not loaded yet and not loading, set it directly
        // This handles the case where we just created a new conversation
        setActiveConversationId(initialConversationId);
        hasSetInitialConversation.current = true;
      }
    }
  }, [initialConversationId, conversations, loading, setActiveConversationId]);

  // If the current user is also a mentor, prefer mentor profile picture over auth provider avatar.
  useEffect(() => {
    if (!user) {
      setCurrentUserMentorAvatar(null);
      return;
    }

    const fetchCurrentUserMentorAvatar = async () => {
      try {
        const { data: mentorByUserId, error } = await supabase
          .from('mentors')
          .select('name, picture')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (mentorByUserId?.picture) {
          setCurrentUserMentorAvatar(mentorByUserId.picture);
          return;
        }

        const fallbackFullName = user.user_metadata?.full_name || user.user_metadata?.name || null;
        if (!fallbackFullName) {
          setCurrentUserMentorAvatar(null);
          return;
        }

        const { data: mentorByName, error: mentorByNameError } = await supabase
          .from('mentors')
          .select('picture')
          .eq('is_active', true)
          .eq('name', fallbackFullName)
          .maybeSingle();

        if (mentorByNameError) throw mentorByNameError;
        setCurrentUserMentorAvatar(mentorByName?.picture || null);
      } catch (error) {
        logError('Error fetching current user mentor avatar', error);
        setCurrentUserMentorAvatar(null);
      }
    };

    fetchCurrentUserMentorAvatar();
  }, [user]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
      // Focus input when conversation is active and ready, without scrolling
      setTimeout(() => {
        if (inputRef.current) {
          // Store current scroll position
          const scrollY = window.scrollY;
          inputRef.current.focus({ preventScroll: true });
          // Restore scroll position if it changed
          if (window.scrollY !== scrollY) {
            window.scrollTo(0, scrollY);
          }
        }
      }, 100);
    }
  }, [activeConversationId, markAsRead]);

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = '44px'; // Reset to minimum
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 120) + 'px'; // Max 120px
    }
  }, [newMessage]);

  // Listen for typing broadcasts
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase.channel(`typing-${activeConversationId}`)
      .on('broadcast', { event: 'typing' }, (payload: TypingBroadcastPayload) => {
        if (payload.payload?.user_id !== user?.id) {
          setOtherUserTyping(true);

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          typingTimeoutRef.current = setTimeout(() => {
            setOtherUserTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user?.id]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setActiveReactionMenuMessageId(null);
    clearLongPressTimer();
  }, [activeConversationId, clearLongPressTimer]);

  useEffect(() => {
    const handleOutsideReactionMenuClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[data-reaction-menu]') || target.closest('[data-reaction-trigger]')) {
        return;
      }

      setActiveReactionMenuMessageId(null);
    };

    document.addEventListener('mousedown', handleOutsideReactionMenuClick);
    document.addEventListener('touchstart', handleOutsideReactionMenuClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideReactionMenuClick);
      document.removeEventListener('touchstart', handleOutsideReactionMenuClick);
    };
  }, []);

  // Load and subscribe to reactions for active conversation
  useEffect(() => {
    if (!activeConversationId || !currentUserId) return;
    const activeMessageIds = new Set(messageIdsKey ? messageIdsKey.split('|') : []);

    const loadReactions = async () => {
      const messageIds = messageIdsKey ? messageIdsKey.split('|') : [];
      if (messageIds.length === 0) {
        setMessageReactions({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (error) throw error;

        // Group reactions by message
        const reactionsByMessage: Record<string, MessageReaction[]> = {};

        messageIds.forEach((messageId) => {
          const msgReactions = data?.filter((reaction) => reaction.message_id === messageId) || [];
          const groupedByEmoji: Record<string, { count: number; userReacted: boolean }> = {};

          msgReactions.forEach((reaction) => {
            if (!groupedByEmoji[reaction.emoji]) {
              groupedByEmoji[reaction.emoji] = { count: 0, userReacted: false };
            }
            groupedByEmoji[reaction.emoji].count++;
            if (reaction.user_id === currentUserId) {
              groupedByEmoji[reaction.emoji].userReacted = true;
            }
          });

          reactionsByMessage[messageId] = Object.entries(groupedByEmoji).map(([emoji, data]) => ({
            emoji,
            ...data
          }));
        });

        setMessageReactions(reactionsByMessage);
      } catch (error) {
        logError('Error loading reactions', error);
      }
    };

    loadReactions();

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions-${activeConversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions'
      }, (payload) => {
        const changedMessageId =
          (payload.new as { message_id?: string } | null)?.message_id ||
          (payload.old as { message_id?: string } | null)?.message_id;

        if (!changedMessageId || !activeMessageIds.has(changedMessageId)) {
          return;
        }

        loadReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUserId, messageIdsKey]);

  useEffect(() => {
    const query = messageSearchQuery.trim();

    if (!query) {
      clearMessageSearch();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchMessages(query, null);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    clearMessageSearch,
    messageSearchQuery,
    searchMessages
  ]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!activeConversationId || !activePageState?.oldestCursor || activePageState.loadingOlder) {
      return;
    }

    const scrollContainer = scrollViewportRef.current;
    const previousScrollHeight = scrollContainer?.scrollHeight || 0;

    await loadMessages(activeConversationId, {
      before: activePageState.oldestCursor,
      limit: 50,
      mode: 'prepend'
    });

    requestAnimationFrame(() => {
      if (!scrollContainer) return;
      scrollContainer.scrollTop += scrollContainer.scrollHeight - previousScrollHeight;
    });
  }, [activeConversationId, activePageState?.loadingOlder, activePageState?.oldestCursor, loadMessages]);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const acceptedFiles = files.filter((file) => file.size <= 10 * 1024 * 1024);

    if (acceptedFiles.length !== files.length) {
      toast.error('Attachments must be 10MB or smaller.');
    }

    setSelectedFiles((current) => [...current, ...acceptedFiles].slice(0, 4));
    event.target.value = '';
  }, []);

  const removeSelectedFile = useCallback((fileIndex: number) => {
    setSelectedFiles((current) => current.filter((_, index) => index !== fileIndex));
  }, []);

  const submitCurrentMessage = useCallback(async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !activeConversationId || sending) return;
    if (directMessagingBlocked) {
      toast.info('You must be connected before sending a direct message.');
      return;
    }

    const messageToSend = newMessage;
    const filesToSend = selectedFiles;

    // Store current scroll position to prevent unwanted scrolling
    const scrollY = window.scrollY;

    setNewMessage("");
    setSelectedFiles([]);

    try {
      const sentMessage = await sendMessage(activeConversationId, messageToSend, { files: filesToSend });

      if (!sentMessage) {
        setNewMessage(messageToSend);
        setSelectedFiles(filesToSend);
      }
    } catch {
      setNewMessage(messageToSend);
      setSelectedFiles(filesToSend);
      toast.error('Failed to send message. Please try again.');
    }

    // Restore scroll position if it changed
    setTimeout(() => {
      if (Math.abs(window.scrollY - scrollY) > 10) {
        window.scrollTo(0, scrollY);
      }
    }, 0);
  }, [activeConversationId, directMessagingBlocked, newMessage, selectedFiles, sendMessage, sending]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCurrentMessage();
  };

  // Broadcast typing events
  const handleTyping = useCallback(() => {
    if (!activeConversationId) return;
    const now = Date.now();

    if (now - lastTypingBroadcastAtRef.current < 1200) {
      return;
    }

    lastTypingBroadcastAtRef.current = now;
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user?.id }
    });
  }, [activeConversationId, user?.id]);

  const getOtherParticipant = useCallback((conversation: Conversation): string | undefined => {
    if (!user) return undefined;
    return conversation.participants.find((id: string) => id !== user.id);
  }, [user]);

  // Fetch participant profiles for conversations
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const fetchProfiles = async () => {
      const participantIds = new Set<string>();
      
      // Collect all participant IDs
      conversations.forEach(conv => {
        if (!conv.is_group) {
          const otherParticipant = conv.participants.find((id: string) => id !== user.id);
          if (otherParticipant) {
            participantIds.add(otherParticipant);
          }
        }
      });

      // Filter out already fetched profiles
      const idsToFetch = Array.from(participantIds).filter((id) => {
        const cachedProfile = participantProfiles[id];
        return !cachedProfile || !cachedProfile.avatar_url;
      });

      if (idsToFetch.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', idsToFetch);

        const { data: mentorData, error: mentorError } = await supabase
          .from('mentors')
          .select('user_id, name, picture')
          .eq('is_active', true);

        if (error) throw error;
        if (mentorError) throw mentorError;

        const mergedMentorData = (mentorData || []) as MentorMeta[];

        const profileById = new Map(
          (data || []).map((profile) => [profile.id, profile])
        );

        const newProfiles: Record<string, ParticipantProfile> = {};
        idsToFetch.forEach((participantId) => {
          const profile = profileById.get(participantId);
          let mentorMeta = findMentorMetaForParticipant(participantId, profile, mergedMentorData);

          if (
            !mentorMeta &&
            participantId === SOPHIA_LOPEZ_PIMENTA_USER_ID
          ) {
            mentorMeta =
              mergedMentorData.find((mentor) => isSophiaMentorName(mentor.name)) || null;
          }

          if (
            !mentorMeta &&
            participantId === ARTUR_SINDARSKY_USER_ID
          ) {
            mentorMeta =
              mergedMentorData.find((mentor) => isArturMentorName(mentor.name)) || null;
          }

          if (
            !mentorMeta &&
            participantId === YASMINE_CAXEIRO_USER_ID
          ) {
            mentorMeta =
              mergedMentorData.find((mentor) => isYasmineMentorName(mentor.name)) || null;
          }

          if (!profile && !mentorMeta) return;

          newProfiles[participantId] = {
            full_name: profile?.full_name || mentorMeta?.name || 'Unknown User',
            // Keep avatar aligned with mentor banner picture whenever available.
            avatar_url: mentorMeta?.picture || profile?.avatar_url || null,
            username: profile?.username || null,
            mentor_slug: mentorMeta?.name ? generateMentorSlug(mentorMeta.name) : null
          };
        });

        if (Object.keys(newProfiles).length > 0) {
          setParticipantProfiles(prev => ({ ...prev, ...newProfiles }));
        }
      } catch (error) {
        logError('Error fetching participant profiles', error);
      }
    };

    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, user]);

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.is_group && conversation.name) {
      return conversation.name;
    }
    
    // For 1-on-1 chats, get the other participant's name
    const otherParticipantId = getOtherParticipant(conversation);
    if (otherParticipantId && participantProfiles[otherParticipantId]) {
      return participantProfiles[otherParticipantId].full_name;
    }
    
    return "Direct Message";
  };

  const getConversationAvatar = (conversation: Conversation): string | null => {
    if (conversation.is_group) {
      return null; // Group avatars handled separately
    }

    const otherParticipantId = getOtherParticipant(conversation);
    if (otherParticipantId && participantProfiles[otherParticipantId]) {
      return participantProfiles[otherParticipantId].avatar_url;
    }

    return null;
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // Prevent selecting the conversation
    setConversationToDelete(conversationId);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;
    
    setIsDeleting(true);
    const success = await deleteConversation(conversationToDelete);
    setIsDeleting(false);
    
    if (success) {
      setConversationToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConversationToDelete(null);
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
    markAsRead(conversationId);
    if (isMobile) {
      setMobileSheetOpen(false);
    }
  };

  const handleDeleteMessageClick = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    if (!activeConversationId) return;
    setMessageToDelete({ messageId, conversationId: activeConversationId });
  };

  const handleConfirmDeleteMessage = async () => {
    if (!messageToDelete) return;

    setIsDeletingMessage(true);
    const success = await deleteMessage(messageToDelete.conversationId, messageToDelete.messageId);
    setIsDeletingMessage(false);

    if (success) {
      setMessageToDelete(null);
    }
  };

  const handleCancelDeleteMessage = () => {
    setMessageToDelete(null);
  };

  const handleRetryFailedMessage = useCallback((message: Message) => {
    if (!activeConversationId || !message.client_message_id) return;
    void retryFailedMessage(activeConversationId, message.client_message_id);
  }, [activeConversationId, retryFailedMessage]);

  const handleDiscardFailedMessage = useCallback((message: Message) => {
    if (!activeConversationId || !message.client_message_id) return;
    discardFailedMessage(activeConversationId, message.client_message_id);
  }, [activeConversationId, discardFailedMessage]);

  const handleReportMessage = useCallback((message: Message) => {
    void reportMessage(message.id, 'other');
    setActiveReactionMenuMessageId(null);
  }, [reportMessage]);

  const handleBlockActiveParticipant = useCallback(() => {
    if (!activeConversationId) return;
    const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
    if (!activeConversation) return;

    const otherParticipant = getOtherParticipant(activeConversation);
    if (!otherParticipant) return;

    void blockUser(otherParticipant, activeConversationId);
  }, [activeConversationId, blockUser, conversations, getOtherParticipant]);

  const updateMessageReactionState = useCallback((messageId: string, emoji: string, shouldAdd: boolean) => {
    setMessageReactions((prev) => {
      const current = prev[messageId] || [];
      const existing = current.find((reaction) => reaction.emoji === emoji);

      let nextReactions: MessageReaction[];
      if (shouldAdd) {
        if (existing) {
          nextReactions = current.map((reaction) =>
            reaction.emoji === emoji
              ? { ...reaction, count: reaction.count + (reaction.userReacted ? 0 : 1), userReacted: true }
              : reaction
          );
        } else {
          nextReactions = [...current, { emoji, count: 1, userReacted: true }];
        }
      } else {
        if (!existing) {
          nextReactions = current;
        } else if (existing.count <= 1) {
          nextReactions = current.filter((reaction) => reaction.emoji !== emoji);
        } else {
          nextReactions = current.map((reaction) =>
            reaction.emoji === emoji
              ? { ...reaction, count: Math.max(0, reaction.count - 1), userReacted: false }
              : reaction
          );
        }
      }

      return {
        ...prev,
        [messageId]: nextReactions
      };
    });
  }, []);

  const handleReactionToggle = useCallback(async (messageId: string, emoji: string) => {
    const existing = (messageReactions[messageId] || []).find((reaction) => reaction.emoji === emoji);
    const userReacted = !!existing?.userReacted;
    const shouldAdd = !userReacted;

    updateMessageReactionState(messageId, emoji, shouldAdd);

    if (shouldAdd) {
      await addReaction(messageId, emoji);
      return;
    }

    await removeReaction(messageId, emoji);
  }, [addReaction, messageReactions, removeReaction, updateMessageReactionState]);

  const handleOpenReactionMenu = useCallback((messageId: string) => {
    setActiveReactionMenuMessageId((current) => (current === messageId ? null : messageId));
  }, []);

  const handleReactionMenuTap = useCallback((event: React.MouseEvent, messageId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }

    handleOpenReactionMenu(messageId);
  }, [handleOpenReactionMenu]);

  const handleMessageTouchStart = useCallback((event: React.TouchEvent, messageId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic('medium');
      setActiveReactionMenuMessageId(messageId);
    }, LONG_PRESS_MS);
  }, [clearLongPressTimer, triggerHaptic]);

  const handleQuickReactionSelect = useCallback(async (messageId: string, emoji: string) => {
    setActiveReactionMenuMessageId(null);
    await handleReactionToggle(messageId, emoji);
  }, [handleReactionToggle]);

  const renderMessageContent = (content: string) => {
    const elements: JSX.Element[] = [];
    const urlRegex = /https?:\/\/[^\s]+/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = urlRegex.exec(content)) !== null) {
      const matchStart = match.index;
      const rawUrl = match[0];

      if (matchStart > lastIndex) {
        elements.push(<span key={`text-${key++}`}>{content.slice(lastIndex, matchStart)}</span>);
      }

      let cleanUrl = rawUrl;
      let trailingPunctuation = '';

      while (cleanUrl.length > 0 && /[.,!?;:)\]]/.test(cleanUrl[cleanUrl.length - 1])) {
        trailingPunctuation = cleanUrl[cleanUrl.length - 1] + trailingPunctuation;
        cleanUrl = cleanUrl.slice(0, -1);
      }

      if (cleanUrl) {
        elements.push(
          <a
            key={`link-${key++}`}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all hover:opacity-80"
          >
            {cleanUrl}
          </a>
        );
      }

      if (trailingPunctuation) {
        elements.push(<span key={`punct-${key++}`}>{trailingPunctuation}</span>);
      }

      lastIndex = matchStart + rawUrl.length;
    }

    if (lastIndex < content.length) {
      elements.push(<span key={`text-${key++}`}>{content.slice(lastIndex)}</span>);
    }

    return elements;
  };

  const handleAttachmentOpen = useCallback(async (storagePath?: string) => {
    if (!storagePath) return;
    const signedUrl = await getAttachmentSignedUrl(storagePath);
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  }, [getAttachmentSignedUrl]);

  const isAttachmentFilenameFallback = (message: Message): boolean => {
    const content = message.content.trim();
    const attachments = message.attachment_rows || [];

    if (!content || attachments.length === 0) {
      return false;
    }

    const fallbackContent = attachments
      .map((attachment) => attachment.file_name.trim())
      .filter(Boolean)
      .join(', ');

    return content === fallbackContent;
  };

  const renderMessageAttachments = (message: Message, isOwnMessage: boolean) => {
    const attachments = message.attachment_rows || [];
    if (attachments.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {message.upload_progress !== undefined && message.upload_progress < 100 && (
          <div className={`h-1.5 overflow-hidden rounded-full ${isOwnMessage ? 'bg-primary-foreground/25' : 'bg-background'}`}>
            <div
              className={isOwnMessage ? 'h-full bg-primary-foreground' : 'h-full bg-primary'}
              style={{ width: `${message.upload_progress}%` }}
            />
          </div>
        )}

        {attachments.map((attachment, index) => {
          const isImage = attachment.mime_type.startsWith('image/');
          const attachmentKey = `${message.id}-${attachment.storage_path || attachment.file_name}-${index}`;

          if (isImage && attachment.signed_url) {
            return (
              <button
                key={attachmentKey}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleAttachmentOpen(attachment.storage_path);
                }}
                className={`block overflow-hidden rounded-lg border transition-colors ${
                  isOwnMessage
                    ? 'border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15'
                    : 'border-border/60 bg-background/70 hover:bg-background'
                }`}
                aria-label={`Open ${attachment.file_name}`}
              >
                <img
                  src={attachment.signed_url}
                  alt={attachment.file_name}
                  className="max-h-80 w-full max-w-sm object-contain"
                  loading="lazy"
                  onLoad={() => messageVirtualizer.measure()}
                  onError={() => messageVirtualizer.measure()}
                />
              </button>
            );
          }

          return (
            <button
              key={attachmentKey}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleAttachmentOpen(attachment.storage_path);
              }}
              className={`flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition-colors ${
                isOwnMessage
                  ? 'border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15'
                  : 'border-border/60 bg-background/70 hover:bg-background'
              }`}
            >
              {isImage ? <ImageIcon className="h-4 w-4 flex-shrink-0" /> : <FileText className="h-4 w-4 flex-shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
              {attachment.storage_path ? (
                <Download className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const getMessageReceiptState = (message: { id: string; is_read: boolean; delivery_status?: string }) => {
    if (message.delivery_status) {
      return message.delivery_status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    }

    // Optimistic client-side messages use temp IDs until backend persistence.
    // This maps to "not received yet" (single check) in the UI.
    if (message.id.startsWith('temp-')) {
      return 'pending' as const;
    }

    if (message.is_read) {
      return 'read' as const;
    }

    // Persisted but unread => delivered (double grey).
    return 'delivered' as const;
  };

  // Group messages by sender and time (within 5 minutes)
  const groupedMessages = useMemo(() => activeMessages.reduce<typeof activeMessages[]>((groups, message, index) => {
    const prevMessage = activeMessages[index - 1];
    const shouldGroup =
      prevMessage &&
      prevMessage.sender_id === message.sender_id &&
      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 300000; // 5 minutes

    if (shouldGroup && groups.length > 0) {
      groups[groups.length - 1].push(message);
    } else {
      groups.push([message]);
    }

    return groups;
  }, []), [activeMessages]);

  const messageVirtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => scrollViewportRef.current,
    estimateSize: () => 96,
    overscan: 8,
  });

  const renderMessageGroup = (
    messageGroup: typeof activeMessages,
    groupIndex: number,
    shouldAnimate: boolean
  ) => {
    if (messageGroup.length === 0) return null;

    const firstMessage = messageGroup[0];
    const isOwnMessage = firstMessage.sender_id === user?.id;

    return (
      <div
        key={firstMessage.id || groupIndex}
        className={`flex gap-2 md:gap-3 ${shouldAnimate ? 'animate-in slide-in-from-bottom-2 duration-300' : ''} ${
        isOwnMessage ? 'justify-end' : 'justify-start'
      }`}
      >
        {!isOwnMessage && (
          <div className="relative">
            <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 self-end">
              <AvatarImage
                src={
                  participantProfiles[firstMessage.sender_id]?.avatar_url ||
                  firstMessage.sender?.avatar_url ||
                  undefined
                }
              />
              <AvatarFallback>
                {(participantProfiles[firstMessage.sender_id]?.full_name || firstMessage.sender?.full_name || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Presence indicator */}
            {presenceData[firstMessage.sender_id]?.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
        )}

        <div className="flex flex-col gap-1 max-w-[88%] sm:max-w-[84%] md:max-w-[78%] lg:max-w-[72%] xl:max-w-[68%]">
	          {messageGroup.map((message, idx) => (
	            <div key={message.id} data-message-id={message.id} className="group">
              <div
                data-reaction-trigger
                onContextMenu={(event) => {
                  event.preventDefault();
                  setActiveReactionMenuMessageId(message.id);
                }}
                onClick={(event) => handleReactionMenuTap(event, message.id)}
                onTouchStart={(event) => handleMessageTouchStart(event, message.id)}
	                onTouchMove={clearLongPressTimer}
	                onTouchEnd={clearLongPressTimer}
	                onTouchCancel={clearLongPressTimer}
	                className={`relative px-3 py-2 ${
	                  message.delivery_status === 'failed'
	                    ? 'bg-destructive/10 text-destructive border border-destructive/30 rounded-2xl rounded-br-sm'
	                    : isOwnMessage
	                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
	                    : 'bg-muted rounded-2xl rounded-bl-sm'
	                }`}
	              >
                {/* Speech bubble tail only on last message in group */}
                {idx === messageGroup.length - 1 && (
                  isOwnMessage ? (
                    <div
                      className="absolute bottom-0 -right-2 w-4 h-4 bg-primary"
                      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
                    />
                  ) : (
                    <div
                      className="absolute bottom-0 -left-2 w-4 h-4 bg-muted"
                      style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
                    />
                  )
                )}

	                {message.content && !isAttachmentFilenameFallback(message) && (
	                  <p className="text-sm whitespace-pre-wrap break-words">{renderMessageContent(message.content)}</p>
	                )}

	                {renderMessageAttachments(message, isOwnMessage)}

	                {isOwnMessage && !message.id.startsWith('temp-') && (
	                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteMessageClick(e, message.id)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/15"
	                    aria-label="Delete message"
	                  >
	                    <Trash2 className="h-3.5 w-3.5" />
	                  </Button>
	                )}

	                {!message.id.startsWith('temp-') && (
	                  <Button
	                    type="button"
	                    variant="ghost"
	                    size="sm"
	                    onClick={(event) => {
	                      event.stopPropagation();
	                      handleReportMessage(message);
	                    }}
	                    className={`absolute top-1 ${isOwnMessage ? 'right-8' : 'right-1'} h-6 w-6 p-0 opacity-0 transition-opacity md:group-hover:opacity-100 ${
	                      isOwnMessage
	                        ? 'text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground'
	                        : 'text-muted-foreground hover:bg-background/80'
	                    }`}
	                    aria-label="Report message"
	                  >
	                    <Flag className="h-3.5 w-3.5" />
	                  </Button>
	                )}

                {/* Timestamp and read receipt only on last message */}
                {idx === messageGroup.length - 1 && (
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(message.created_at))} ago
                    </p>
	                    {isOwnMessage && (() => {
	                      const receiptState = getMessageReceiptState(message);

	                      if (receiptState === 'failed') {
	                        return <span className="text-xs font-medium">Not sent</span>;
	                      }

	                      if (receiptState === 'read') {
                        return (
                          <span className="text-xs flex items-center" title="Read">
                            <CheckCheck className="h-3 w-3 text-blue-500" />
                          </span>
                        );
                      }

                      if (receiptState === 'delivered') {
                        return (
                          <span className="text-xs flex items-center" title="Delivered">
                            <CheckCheck className="h-3 w-3 text-muted-foreground" />
                          </span>
                        );
                      }

                      return (
                        <span className="text-xs flex items-center" title="Sending">
                          <Check className="h-3 w-3 opacity-70" />
                        </span>
                      );
	                    })()}
	                  </div>
	                )}
	              </div>

	              {message.local_failed && (
	                <div className="mt-1 flex justify-end gap-1">
	                  <Button
	                    type="button"
	                    variant="outline"
	                    size="sm"
	                    className="h-7 gap-1 px-2 text-xs"
	                    onClick={() => handleRetryFailedMessage(message)}
	                  >
	                    <RotateCcw className="h-3 w-3" />
	                    Retry
	                  </Button>
	                  <Button
	                    type="button"
	                    variant="ghost"
	                    size="sm"
	                    className="h-7 gap-1 px-2 text-xs"
	                    onClick={() => handleDiscardFailedMessage(message)}
	                  >
	                    <X className="h-3 w-3" />
	                    Remove
	                  </Button>
	                </div>
	              )}

              {activeReactionMenuMessageId === message.id && (
                <div className={`mt-1 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div
                    data-reaction-menu
                    className="flex max-w-[260px] flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-background px-2 py-1 shadow-lg md:max-w-[360px]"
                  >
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={`${message.id}-${emoji}`}
                        type="button"
                        className="h-8 w-8 rounded-full text-base transition-transform hover:scale-110 active:scale-95"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleQuickReactionSelect(message.id, emoji);
                        }}
                        aria-label={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message reactions */}
              {messageReactions[message.id] && messageReactions[message.id].length > 0 && (
                <MessageReactions
                  reactions={messageReactions[message.id]}
                  onAddReaction={(emoji) => handleReactionToggle(message.id, emoji)}
                  onRemoveReaction={(emoji) => handleReactionToggle(message.id, emoji)}
                  className="mt-1 ml-1"
                />
              )}
            </div>
          ))}
        </div>

        {isOwnMessage && (
          <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 self-end">
            <AvatarImage src={currentUserMentorAvatar || user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  // Conversation list renderer (reusable for desktop and mobile)
  const renderConversationList = (onSelect: (id: string) => void) => (
    <>
      <div className="space-y-3 border-b p-4">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages
        </h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={messageSearchQuery}
            onChange={(event) => setMessageSearchQuery(event.target.value)}
            placeholder="Search messages"
            className="h-9 pl-9 pr-9"
          />
          {messageSearchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              onClick={() => setMessageSearchQuery('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className={isMobile ? "h-[calc(var(--vh,1vh)*100-120px)]" : "h-[calc(600px-80px)]"}>
        {messageSearchQuery.trim() ? (
          <div className="p-2">
            {searchLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((result) => {
                  const resultConversation = conversations.find((conversation) => conversation.id === result.conversation_id);

                  return (
                    <button
                      key={result.id}
                      type="button"
                      className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted/60"
                      onClick={() => {
                        onSelect(result.conversation_id);
                        setMessageSearchQuery('');
                        requestAnimationFrame(() => {
                          const element = document.querySelector(`[data-message-id="${result.id}"]`);
                          element?.scrollIntoView({ block: 'center' });
                        });
                      }}
                    >
                      <p className="truncate text-xs font-medium">
                        {resultConversation ? getConversationName(resultConversation) : 'Conversation'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{result.content}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">No messages found</div>
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => {
              const unreadCount = getUnreadCount(conversation.id);
              const settings = conversationSettings[conversation.id];
              
              return (
                <div
                  key={conversation.id}
                  className="relative group"
                >
                  <Button
                    variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                    className="w-full justify-start p-3 h-auto min-h-[44px] touch-manipulation"
                    onClick={() => onSelect(conversation.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="relative">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={getConversationAvatar(conversation) || undefined} />
                          <AvatarFallback>
                            {getConversationName(conversation).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {(() => {
                          const otherParticipantId = getOtherParticipant(conversation);
                          return otherParticipantId && presenceData[otherParticipantId]?.status === 'online' && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                          );
                        })()}
                      </div>
                      
	                      <div className="flex-1 text-left min-w-0">
	                        <div className="flex min-w-0 items-center gap-1">
	                          <p className="font-medium text-sm truncate">
	                            {getConversationName(conversation)}
	                          </p>
	                          {settings?.pinned_at && <Pin className="h-3 w-3 flex-shrink-0 text-primary" />}
	                          {settings?.muted_until && new Date(settings.muted_until) > new Date() && (
	                            <BellOff className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
	                          )}
	                        </div>
	                        {conversation.last_message_at && (
	                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.last_message_at))} ago
                          </p>
                        )}
                      </div>
                      
                      {unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      )}
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-10 w-10 p-0 min-h-[44px] min-w-[44px] touch-manipulation hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => handleDeleteClick(e, conversation.id)}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </>
  );

  return (
    <div className={`responsive-messaging-shell flex ${isMobile ? 'flex-col' : ''} border rounded-lg bg-card`}>
      {/* Desktop & Tablet Conversations List */}
      {!isMobile && (
        <div className={`${isTablet ? 'w-64' : 'w-80'} border-r bg-card/50 flex-shrink-0`}>
          {renderConversationList(handleConversationSelect)}
        </div>
      )}

      {/* Mobile Conversations Sheet */}
      {isMobile && (
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="left" className="w-[85vw] sm:w-[320px] md:w-[400px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Conversations</SheetTitle>
            </SheetHeader>
            <div className="h-full bg-card/50">
              {renderConversationList(handleConversationSelect)}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 border-b bg-card/50 flex items-center gap-2 min-h-[44px]">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 min-h-[44px] min-w-[44px] touch-manipulation"
                  onClick={() => setMobileSheetOpen(true)}
                  aria-label="Open conversations"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              {(() => {
                const activeConversation = conversations.find(c => c.id === activeConversationId);
                if (!activeConversation) return null;

	                const conversationName = getConversationName(activeConversation);
	                const conversationAvatar = getConversationAvatar(activeConversation);
	                const settings = conversationSettings[activeConversation.id];
	                const isPinned = !!settings?.pinned_at;
	                const isMuted = !!settings?.muted_until && new Date(settings.muted_until) > new Date();

	                const otherParticipantId = getOtherParticipant(activeConversation);

	                return (
	                  <>
	                    <div className="flex items-center gap-2 flex-1 min-w-0">
	                      <div className="relative">
	                        <Avatar className="h-8 w-8 flex-shrink-0">
	                          <AvatarImage src={conversationAvatar || undefined} />
	                          <AvatarFallback>
	                            {conversationName.charAt(0).toUpperCase()}
	                          </AvatarFallback>
	                        </Avatar>
	                        {otherParticipantId && presenceData[otherParticipantId]?.status === 'online' && (
	                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
	                        )}
	                      </div>
	                      <div className="min-w-0">
	                        <h4 className="font-semibold text-sm md:text-base truncate">
	                          {conversationName}
	                        </h4>
	                        <div className="flex items-center gap-1">
	                          {isPinned && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Pinned</Badge>}
	                          {isMuted && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Muted</Badge>}
	                        </div>
	                      </div>
	                    </div>
	                    <DropdownMenu>
	                      <DropdownMenuTrigger asChild>
	                        <Button
	                          type="button"
	                          variant="ghost"
	                          size="sm"
	                          className="h-10 w-10 p-0"
	                          aria-label="Conversation actions"
	                        >
	                          <MoreVertical className="h-5 w-5" />
	                        </Button>
	                      </DropdownMenuTrigger>
	                      <DropdownMenuContent align="end" className="w-48">
	                        <DropdownMenuItem onClick={() => void pinConversation(activeConversation.id, !isPinned)}>
	                          <Pin className="mr-2 h-4 w-4" />
	                          {isPinned ? 'Unpin' : 'Pin'}
	                        </DropdownMenuItem>
	                        <DropdownMenuItem onClick={() => void muteConversation(activeConversation.id, !isMuted)}>
	                          <BellOff className="mr-2 h-4 w-4" />
	                          {isMuted ? 'Unmute' : 'Mute'}
	                        </DropdownMenuItem>
	                        <DropdownMenuItem onClick={() => void archiveConversation(activeConversation.id, true)}>
	                          <Archive className="mr-2 h-4 w-4" />
	                          Archive
	                        </DropdownMenuItem>
	                        <DropdownMenuSeparator />
	                        <DropdownMenuItem onClick={handleBlockActiveParticipant} className="text-destructive">
	                          <Ban className="mr-2 h-4 w-4" />
	                          Block user
	                        </DropdownMenuItem>
	                      </DropdownMenuContent>
	                    </DropdownMenu>
	                  </>
	                );
	              })()}
	            </div>

	            {/* Messages */}
	            <div ref={scrollViewportRef} className="flex-1 overflow-y-auto p-3 md:p-4">
	              <div className="mb-3 flex justify-center">
	                {activePageState?.hasMore ? (
	                  <Button
	                    type="button"
	                    variant="outline"
	                    size="sm"
	                    className="h-8 gap-2 text-xs"
	                    onClick={handleLoadOlderMessages}
	                    disabled={activePageState.loadingOlder}
	                  >
	                    {activePageState.loadingOlder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
	                    Load older
	                  </Button>
	                ) : activeMessages.length > 0 ? (
	                  <span className="text-xs text-muted-foreground">Beginning of conversation</span>
	                ) : null}
	              </div>

	              <div
	                className="relative"
	                style={{ height: `${messageVirtualizer.getTotalSize()}px` }}
	              >
	                {messageVirtualizer.getVirtualItems().map((virtualItem) => {
	                  const messageGroup = groupedMessages[virtualItem.index];
	                  return (
	                    <div
	                      key={virtualItem.key}
	                      data-index={virtualItem.index}
	                      ref={messageVirtualizer.measureElement}
	                      className="absolute left-0 top-0 w-full pb-3 md:pb-4"
	                      style={{ transform: `translateY(${virtualItem.start}px)` }}
	                    >
	                      {renderMessageGroup(
	                        messageGroup,
	                        virtualItem.index,
	                        virtualItem.index === groupedMessages.length - 1
	                      )}
	                    </div>
	                  );
	                })}
	              </div>

	              <div className="space-y-3 md:space-y-4">
	                {otherUserTyping && (() => {
	                  const activeConversation = conversations.find(c => c.id === activeConversationId);
	                  if (!activeConversation) return null;

                  const otherParticipantId = getOtherParticipant(activeConversation);
                  const otherParticipant = otherParticipantId ? participantProfiles[otherParticipantId] : null;

                  return (
                    <TypingIndicator
                      userAvatar={otherParticipant?.avatar_url}
                      userName={otherParticipant?.full_name}
                    />
                  );
	                })()}
	                <div ref={messagesEndRef} />
	              </div>
	            </div>

	            {/* Message Input - Sticky on mobile */}
	            <form onSubmit={handleSendMessage} className={`p-3 md:p-4 border-t bg-card/50 ${isMobile ? 'sticky bottom-0' : ''}`}>
	              {selectedFiles.length > 0 && (
	                <div className="mb-2 flex flex-wrap gap-2">
	                  {selectedFiles.map((file, index) => (
	                    <div
	                      key={`${file.name}-${file.size}-${index}`}
	                      className="flex max-w-full items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
	                    >
	                      {file.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
	                      <span className="max-w-[180px] truncate">{file.name}</span>
	                      <Button
	                        type="button"
	                        variant="ghost"
	                        size="sm"
	                        className="h-5 w-5 p-0"
	                        onClick={() => removeSelectedFile(index)}
	                        aria-label="Remove attachment"
	                      >
	                        <X className="h-3 w-3" />
	                      </Button>
	                    </div>
	                  ))}
	                </div>
	              )}
	              <div className="flex gap-2">
	                <input
	                  ref={fileInputRef}
	                  type="file"
	                  multiple
	                  className="hidden"
	                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/zip"
	                  onChange={handleFileSelection}
	                />
	                <Button
	                  type="button"
	                  variant="outline"
	                  className="min-h-[44px] min-w-[44px] px-3 touch-manipulation"
	                  onClick={() => fileInputRef.current?.click()}
                    disabled={directMessagingBlocked}
	                  aria-label="Attach files"
	                >
	                  <Paperclip className="h-4 w-4" />
	                </Button>
	                <Textarea
	                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void submitCurrentMessage();
                    }
                  }}
                  placeholder={directMessagingBlocked ? "Connect before messaging..." : "Type a message..."}
                  autoFocus={!isMobile}
                  disabled={directMessagingBlocked}
                  className="min-h-[44px] max-h-[120px] resize-none text-base md:text-sm"
                  rows={1}
                />
	                <Button
	                  type="submit"
	                  disabled={directMessagingBlocked || sending || (!newMessage.trim() && selectedFiles.length === 0)}
	                  className="min-h-[44px] min-w-[44px] px-3 touch-manipulation"
	                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">
                {isMobile ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setMobileSheetOpen(true)}
                      className="mb-4 min-h-[44px] touch-manipulation"
                    >
                      <Menu className="h-4 w-4 mr-2" />
                      Select a conversation
                    </Button>
                    <br />
                    or start a new one
                  </>
                ) : (
                  "Select a conversation to start messaging"
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!conversationToDelete} onOpenChange={handleCancelDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Delete Confirmation Dialog */}
      <Dialog open={!!messageToDelete} onOpenChange={handleCancelDeleteMessage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Do you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDeleteMessage}
              disabled={isDeletingMessage}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMessage}
              disabled={isDeletingMessage}
            >
              {isDeletingMessage ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
