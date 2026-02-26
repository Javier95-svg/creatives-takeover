import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Send, MessageCircle, Trash2, Menu, Check, CheckCheck } from "lucide-react";
import { useMessaging, Conversation } from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceType, useIsMobile } from "@/hooks/use-device-type";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { logError } from "@/lib/logger";
import { generateMentorSlug } from "@/utils/mentorSlug";
import { TypingIndicator } from "./TypingIndicator";
import { MessageReactions } from "./MessageReactions";
import { usePresence } from "@/hooks/usePresence";

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

const isSophiaMentorName = (name: string | null | undefined): boolean => {
  const normalized = (name || '').toLowerCase();
  return normalized.includes('sophia') && (normalized.includes('pimenta') || normalized.includes('lopez'));
};

export const MessagingInterface = ({ initialConversationId }: MessagingInterfaceProps) => {
  const { user } = useAuth();
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const {
    conversations,
    messages,
    loading,
    sending,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    deleteMessage,
    markAsRead,
    getUnreadCount,
    deleteConversation,
    addReaction,
    removeReaction
  } = useMessaging();
  
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<React.ElementRef<typeof ScrollArea>>(null);
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
  const [messageReactions, setMessageReactions] = useState<Record<string, Array<{ emoji: string; count: number; userReacted: boolean }>>>({});
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Get all participant IDs for presence tracking
  const participantIds = conversations.flatMap(c => c.participants).filter(id => id !== user?.id);
  const { presenceData } = usePresence(participantIds);

  // Track message count to detect new messages
  const messageCount = activeConversationId ? (messages[activeConversationId]?.length || 0) : 0;
  const lastMessage = activeConversationId && messages[activeConversationId]?.length > 0
    ? messages[activeConversationId][messages[activeConversationId].length - 1]
    : null;
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  // Auto-scroll to bottom when new messages arrive (only within ScrollArea, not the page)
  useEffect(() => {
    if (!scrollAreaRef.current || !activeConversationId) return;

    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
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
  }, [messageCount, activeConversationId, user?.id, lastMessage?.id]);

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
        const { data, error } = await supabase
          .from('mentors')
          .select('picture')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        setCurrentUserMentorAvatar(data?.picture || null);
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
      .on('broadcast', { event: 'typing' }, (payload: any) => {
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user?.id]);

  // Load and subscribe to reactions for active conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;

    const loadReactions = async () => {
      const messageIds = activeMessages.map(m => m.id);
      if (messageIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (error) throw error;

        // Group reactions by message
        const reactionsByMessage: Record<string, Array<{ emoji: string; count: number; userReacted: boolean }>> = {};

        messageIds.forEach(msgId => {
          const msgReactions = data?.filter(r => r.message_id === msgId) || [];
          const groupedByEmoji: Record<string, { count: number; userReacted: boolean }> = {};

          msgReactions.forEach(reaction => {
            if (!groupedByEmoji[reaction.emoji]) {
              groupedByEmoji[reaction.emoji] = { count: 0, userReacted: false };
            }
            groupedByEmoji[reaction.emoji].count++;
            if (reaction.user_id === user.id) {
              groupedByEmoji[reaction.emoji].userReacted = true;
            }
          });

          reactionsByMessage[msgId] = Object.entries(groupedByEmoji).map(([emoji, data]) => ({
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
      }, () => {
        // Reload reactions when changes occur
        loadReactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user, activeMessages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || sending) return;

    const messageToSend = newMessage;
    // Clear the input immediately so the user can type the next message
    setNewMessage("");

    // Store current scroll position to prevent unwanted scrolling
    const scrollY = window.scrollY;

    await sendMessage(activeConversationId, messageToSend);

    // Restore scroll position if it changed
    setTimeout(() => {
      if (Math.abs(window.scrollY - scrollY) > 10) {
        window.scrollTo(0, scrollY);
      }
    }, 0);
  };

  // Broadcast typing events
  const handleTyping = useCallback(() => {
    if (!activeConversationId) return;

    supabase.channel(`typing-${activeConversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user?.id }
      });
  }, [activeConversationId, user?.id]);

  const getOtherParticipant = (conversation: Conversation): string | undefined => {
    if (!user) return undefined;
    return conversation.participants.find((id: string) => id !== user.id);
  };

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
      const idsToFetch = Array.from(participantIds).filter(id => !participantProfiles[id]);

      if (idsToFetch.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', idsToFetch);

        const { data: mentorData, error: mentorError } = await supabase
          .from('mentors')
          .select('user_id, name, picture')
          .in('user_id', idsToFetch)
          .eq('is_active', true);

        if (error) throw error;
        if (mentorError) throw mentorError;

        let mergedMentorData = mentorData || [];

        // Fallback for mentors whose user_id is not linked yet (e.g. Sophia).
        if (idsToFetch.includes(SOPHIA_LOPEZ_PIMENTA_USER_ID)) {
          const hasSophiaByUserId = mergedMentorData.some(
            (mentor) => mentor.user_id === SOPHIA_LOPEZ_PIMENTA_USER_ID
          );

          if (!hasSophiaByUserId) {
            const { data: sophiaMentorData, error: sophiaMentorError } = await supabase
              .from('mentors')
              .select('user_id, name, picture')
              .eq('is_active', true)
              .ilike('name', '%sophia%')
              .or('name.ilike.%pimenta%,name.ilike.%lopez%')
              .limit(1);

            if (sophiaMentorError) throw sophiaMentorError;

            if (sophiaMentorData?.length) {
              mergedMentorData = [...mergedMentorData, ...sophiaMentorData];
            }
          }
        }

        const mentorMetaByUserId = new Map<string, { name: string; slug: string; picture: string | null }>();
        mergedMentorData.forEach((mentor) => {
          if (!mentor.name) return;

          const mentorUserId =
            mentor.user_id ||
            (isSophiaMentorName(mentor.name) ? SOPHIA_LOPEZ_PIMENTA_USER_ID : null);

          if (!mentorUserId) return;

          mentorMetaByUserId.set(mentorUserId, {
            name: mentor.name,
            slug: generateMentorSlug(mentor.name),
            picture: mentor.picture || null
          });
        });

        const profileById = new Map(
          (data || []).map((profile) => [profile.id, profile])
        );

        const newProfiles: Record<string, ParticipantProfile> = {};
        idsToFetch.forEach((participantId) => {
          const profile = profileById.get(participantId);
          const mentorMeta = mentorMetaByUserId.get(participantId);

          if (!profile && !mentorMeta) return;

          newProfiles[participantId] = {
            full_name: profile?.full_name || mentorMeta?.name || 'Unknown User',
            // Keep avatar aligned with mentor banner picture whenever available.
            avatar_url: mentorMeta?.picture || profile?.avatar_url || null,
            username: profile?.username || null,
            mentor_slug: mentorMeta?.slug || null
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

  const getMessageReceiptState = (message: { id: string; is_read: boolean }) => {
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
  const groupedMessages = activeMessages.reduce<typeof activeMessages[]>((groups, message, index) => {
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
  }, []);

  // Message group component for rendering grouped messages
  const MessageGroup = ({ messages }: { messages: typeof activeMessages }) => {
    if (messages.length === 0) return null;

    const firstMessage = messages[0];
    const isOwnMessage = firstMessage.sender_id === user?.id;

    return (
      <div className={`flex gap-2 md:gap-3 animate-in slide-in-from-bottom-2 duration-300 ${
        isOwnMessage ? 'justify-end' : 'justify-start'
      }`}>
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
          {messages.map((message, idx) => (
            <div key={message.id} className="group">
              <div
                className={`relative px-3 py-2 ${
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                    : 'bg-muted rounded-2xl rounded-bl-sm'
                }`}
              >
                {/* Speech bubble tail only on last message in group */}
                {idx === messages.length - 1 && (
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

                <p className="text-sm whitespace-pre-wrap break-words">{renderMessageContent(message.content)}</p>

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

                {/* Timestamp and read receipt only on last message */}
                {idx === messages.length - 1 && (
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(message.created_at))} ago
                    </p>
                    {isOwnMessage && (() => {
                      const receiptState = getMessageReceiptState(message);

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

              {/* Message reactions */}
              {messageReactions[message.id] && messageReactions[message.id].length > 0 && (
                <MessageReactions
                  messageId={message.id}
                  reactions={messageReactions[message.id]}
                  onAddReaction={(emoji) => addReaction(message.id, emoji)}
                  onRemoveReaction={(emoji) => removeReaction(message.id, emoji)}
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

  // Conversation list component (reusable for desktop and mobile)
  const ConversationList = ({ onSelect }: { onSelect: (id: string) => void }) => (
    <>
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages
        </h3>
      </div>
      
      <ScrollArea className={isMobile ? "h-[calc(var(--vh,1vh)*100-120px)]" : "h-[calc(600px-80px)]"}>
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => {
              const unreadCount = getUnreadCount(conversation.id);
              
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
                        <p className="font-medium text-sm truncate">
                          {getConversationName(conversation)}
                        </p>
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
          <ConversationList onSelect={handleConversationSelect} />
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
              <ConversationList onSelect={handleConversationSelect} />
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

                const otherParticipantId = getOtherParticipant(activeConversation);

                return (
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
                    <h4 className="font-semibold text-sm md:text-base truncate">
                      {conversationName}
                    </h4>
                  </div>
                );
              })()}
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-3 md:p-4">
              <div className="space-y-3 md:space-y-4">
                {groupedMessages.map((messageGroup, groupIndex) => (
                  <MessageGroup
                    key={messageGroup[0]?.id || groupIndex}
                    messages={messageGroup}
                  />
                ))}
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
            </ScrollArea>

            {/* Message Input - Sticky on mobile */}
            <form onSubmit={handleSendMessage} className={`p-3 md:p-4 border-t bg-card/50 ${isMobile ? 'sticky bottom-0' : ''}`}>
              <div className="flex gap-2">
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
                      handleSendMessage(e as any);
                    }
                  }}
                  placeholder="Type a message..."
                  autoFocus={!isMobile}
                  className="min-h-[44px] max-h-[120px] resize-none text-base md:text-sm"
                  rows={1}
                />
                <Button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
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
