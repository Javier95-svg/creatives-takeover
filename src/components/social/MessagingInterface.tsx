import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { useMessaging } from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface MessagingInterfaceProps {
  initialConversationId?: string;
}

export const MessagingInterface = ({ initialConversationId }: MessagingInterfaceProps = {}) => {
  const { user } = useAuth();
  const {
    conversations,
    messages,
    loading,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markAsRead,
    getUnreadCount
  } = useMessaging();
  
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<React.ElementRef<typeof ScrollArea>>(null);
  const hasSetInitialConversation = useRef(false);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});

  // Auto-scroll to bottom when new messages arrive (only within ScrollArea, not the page)
  useEffect(() => {
    if (scrollAreaRef.current && activeConversationId) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollContainer) {
        const activeMessages = messages[activeConversationId] || [];
        const lastMessage = activeMessages[activeMessages.length - 1];
        const isUserMessage = lastMessage?.sender_id === user?.id;
        
        // Only auto-scroll if:
        // 1. User is already near the bottom (within 100px), OR
        // 2. It's the user's own message (they just sent it), OR
        // 3. There are no messages yet
        const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
        
        if (isNearBottom || isUserMessage || activeMessages.length === 0) {
          // Use setTimeout to ensure DOM has updated
          setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }, 0);
        }
      }
    }
  }, [messages, activeConversationId, user?.id]);

  // Set initial conversation ID from URL parameter
  useEffect(() => {
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || loading) return;

    // Store current scroll position to prevent unwanted scrolling
    const scrollY = window.scrollY;

    await sendMessage(activeConversationId, newMessage);
    setNewMessage("");

    // Restore scroll position if it changed
    setTimeout(() => {
      if (Math.abs(window.scrollY - scrollY) > 10) {
        window.scrollTo(0, scrollY);
      }
    }, 0);
  };

  const getOtherParticipant = (conversation: any) => {
    if (!user) return null;
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
          .select('id, full_name, avatar_url')
          .in('id', idsToFetch);

        if (error) throw error;

        if (data) {
          const newProfiles: Record<string, { full_name: string; avatar_url: string | null }> = {};
          data.forEach(profile => {
            newProfiles[profile.id] = {
              full_name: profile.full_name || 'Unknown User',
              avatar_url: profile.avatar_url
            };
          });

          setParticipantProfiles(prev => ({ ...prev, ...newProfiles }));
        }
      } catch (error) {
        console.error('Error fetching participant profiles:', error);
      }
    };

    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, user]);

  const getConversationName = (conversation: any) => {
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

  const getConversationAvatar = (conversation: any) => {
    if (conversation.is_group) {
      return null; // Group avatars handled separately
    }
    
    const otherParticipantId = getOtherParticipant(conversation);
    if (otherParticipantId && participantProfiles[otherParticipantId]) {
      return participantProfiles[otherParticipantId].avatar_url;
    }
    
    return null;
  };

  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  return (
    <div className="flex h-[600px] border rounded-lg bg-card">
      {/* Conversations List */}
      <div className="w-80 border-r bg-card/50">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </h3>
        </div>
        
        <ScrollArea className="h-[calc(600px-80px)]">
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
                  <Button
                    key={conversation.id}
                    variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => setActiveConversationId(conversation.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getConversationAvatar(conversation) || undefined} />
                        <AvatarFallback>
                          {getConversationName(conversation).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
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
                        <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card/50">
              <h4 className="font-semibold">
                {getConversationName(conversations.find(c => c.id === activeConversationId))}
              </h4>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {activeMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.sender_id !== user?.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender?.avatar_url} />
                        <AvatarFallback>
                          {message.sender?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(new Date(message.created_at))} ago
                      </p>
                    </div>

                    {message.sender_id === user?.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-card/50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={loading}
                  autoFocus
                />
                <Button type="submit" disabled={loading || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};