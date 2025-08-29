import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Calendar, CheckCircle, Circle, Search, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useChatSessions, ChatSession } from '@/hooks/useChatSessions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  onSessionSelect: (session: ChatSession | null) => void;
  onNewChat: () => void;
  className?: string;
}

export const ChatSidebar = ({ onSessionSelect, onNewChat, className }: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { 
    sessions, 
    loading, 
    currentSessionId, 
    setCurrentSessionId, 
    createNewSession, 
    deleteSession 
  } = useChatSessions();
  const { user } = useAuth();

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = async () => {
    const sessionId = await createNewSession();
    if (sessionId) {
      onSessionSelect(null);
      onNewChat();
    }
  };

  const handleSessionClick = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    onSessionSelect(session);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(sessionId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getProgressBadge = (session: ChatSession) => {
    if (session.is_completed) {
      return <Badge variant="default" className="text-xs">Completed</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Step {session.current_step}/7</Badge>;
  };

  if (!user) {
    return (
      <div className={cn(
        "border-r bg-card/50 backdrop-blur-sm flex flex-col",
        isCollapsed ? "w-16" : "w-80",
        className
      )}>
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-start"
          >
            <Menu className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Chats</span>}
          </Button>
        </div>
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sign in to save your conversations</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "border-r bg-card/50 backdrop-blur-sm flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-80",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {!isCollapsed && <span className="ml-2">Chats</span>}
          </Button>
        </div>
        
        {!isCollapsed && (
          <>
            <Button
              onClick={handleNewChat}
              className="w-full justify-start gap-2"
              variant="default"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </>
        )}
      </div>

      {/* Chat List */}
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No chats found' : 'No conversations yet'}
                </p>
                {!searchQuery && (
                  <p className="text-xs mt-1">Start a new chat to begin!</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50",
                      currentSessionId === session.id && "bg-muted/70 ring-1 ring-primary/20"
                    )}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {session.is_completed ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <h4 className="font-medium text-sm truncate">
                            {session.title}
                          </h4>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(session.updated_at)}
                          </div>
                          {getProgressBadge(session)}
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{session.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Collapsed state indicator */}
      {isCollapsed && (
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="w-full aspect-square p-0"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Separator className="my-2" />
          <div className="space-y-1">
            {sessions.slice(0, 3).map((session) => (
              <Button
                key={session.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full aspect-square p-0",
                  currentSessionId === session.id && "bg-muted"
                )}
                onClick={() => handleSessionClick(session)}
                title={session.title}
              >
                {session.is_completed ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};