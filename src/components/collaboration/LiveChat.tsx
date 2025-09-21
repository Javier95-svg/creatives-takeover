import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CollaborationMessage } from '@/hooks/useEnhancedCollaboration';
import { MessageCircle, Send, Reply, Edit, Image, File, Mic } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveChatProps {
  messages: CollaborationMessage[];
  onSendMessage: (content: string, messageType?: CollaborationMessage['message_type'], replyToId?: string) => void;
  currentUserId?: string;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  onSendMessage,
  currentUserId,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<CollaborationMessage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    onSendMessage(newMessage.trim(), 'text', replyToMessage?.id);
    setNewMessage('');
    setReplyToMessage(null);
    setIsTyping(false);
  };

  const handleReply = (message: CollaborationMessage) => {
    setReplyToMessage(message);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyToMessage(null);
  };

  const getMessageTypeIcon = (type: CollaborationMessage['message_type']) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      case 'voice':
        return <Mic className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const groupedMessages = messages.reduce((groups: CollaborationMessage[][], message, index) => {
    const prevMessage = messages[index - 1];
    const shouldGroup = 
      prevMessage &&
      prevMessage.user_id === message.user_id &&
      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 300000; // 5 minutes

    if (shouldGroup && groups.length > 0) {
      groups[groups.length - 1].push(message);
    } else {
      groups.push([message]);
    }

    return groups;
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Live Chat
          <Badge variant="secondary">
            {messages.length} messages
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {groupedMessages.map((messageGroup, groupIndex) => (
              <MessageGroup
                key={groupIndex}
                messages={messageGroup}
                currentUserId={currentUserId}
                onReply={handleReply}
              />
            ))}
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Reply indicator */}
        {replyToMessage && (
          <div className="bg-muted p-2 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Replying to {replyToMessage.profiles?.full_name || 'Anonymous'}
              </span>
              <span className="text-sm text-muted-foreground max-w-32 truncate">
                {replyToMessage.content}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelReply}>
              Cancel
            </Button>
          </div>
        )}

        {/* Message input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              setIsTyping(e.target.value.length > 0);
            }}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

interface MessageGroupProps {
  messages: CollaborationMessage[];
  currentUserId?: string;
  onReply: (message: CollaborationMessage) => void;
}

const MessageGroup: React.FC<MessageGroupProps> = ({
  messages,
  currentUserId,
  onReply,
}) => {
  const firstMessage = messages[0];
  const isOwnMessage = firstMessage.user_id === currentUserId;

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={firstMessage.profiles?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {firstMessage.profiles?.full_name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 space-y-1 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {firstMessage.profiles?.full_name || 'Anonymous User'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(firstMessage.created_at), { addSuffix: true })}
          </span>
        </div>

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={isOwnMessage}
            onReply={() => onReply(message)}
          />
        ))}
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: CollaborationMessage;
  isOwnMessage: boolean;
  onReply: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onReply,
}) => {
  return (
    <div
      className={`group relative max-w-xs lg:max-w-md xl:max-w-lg rounded-lg p-3 ${
        isOwnMessage
          ? 'bg-primary text-primary-foreground ml-auto'
          : 'bg-muted'
      }`}
    >
      {/* Reply indicator */}
      {message.reply_to_id && (
        <div className="text-xs opacity-75 mb-1 border-l-2 border-current pl-2">
          Replying to message
        </div>
      )}

      {/* Message content */}
      <div className="flex items-start gap-2">
        {getMessageTypeIcon(message.message_type)}
        <p className="text-sm leading-relaxed break-words">
          {message.content}
        </p>
      </div>

      {/* Message actions */}
      <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReply}
          className="h-6 w-6 p-0 bg-background shadow-sm"
        >
          <Reply className="h-3 w-3" />
        </Button>
      </div>

      {/* Edit indicator */}
      {message.edited_at && (
        <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
          <Edit className="h-3 w-3" />
          edited
        </div>
      )}
    </div>
  );
};

const getMessageTypeIcon = (type: CollaborationMessage['message_type']) => {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4 flex-shrink-0" />;
    case 'file':
      return <File className="h-4 w-4 flex-shrink-0" />;
    case 'voice':
      return <Mic className="h-4 w-4 flex-shrink-0" />;
    case 'system':
      return <MessageCircle className="h-4 w-4 flex-shrink-0 opacity-50" />;
    default:
      return null;
  }
};