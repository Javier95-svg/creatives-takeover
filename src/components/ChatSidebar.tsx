import React, { useState, useMemo } from 'react';
import { Plus, MessageSquare, Trash2, Search, Edit, Pin, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useChatSessions, ChatSession } from '@/hooks/useChatSessions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ModeSelector } from '@/components/chatbot/ModeSelector';

interface ChatSidebarProps {
  onSessionSelect: (session: ChatSession | null) => void;
  onNewChat: () => void;
  className?: string;
  modeInfo?: {
    activeMode: 'planning' | 'gtm';
    onModeChange: (mode: 'planning' | 'gtm') => void;
  };
}

export const ChatSidebar = ({ onSessionSelect, onNewChat, className, modeInfo }: ChatSidebarProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { 
    sessions, 
    loading, 
    currentSessionId, 
    setCurrentSessionId, 
    createNewSession, 
    deleteSession,
    updateSession,
    togglePinSession
  } = useChatSessions();
  const { user, signOut } = useAuth();

  // Group sessions by date (Today, Yesterday, This Week, Older)
  const groupedSessions = useMemo(() => {
    let filtered = sessions.filter(session =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort: pinned first, then by date
    filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    // Group by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups: {
      label: string;
      sessions: typeof filtered;
    }[] = [
      { label: 'Today', sessions: [] },
      { label: 'Yesterday', sessions: [] },
      { label: 'This Week', sessions: [] },
      { label: 'Older', sessions: [] }
    ];

    filtered.forEach(session => {
      const sessionDate = new Date(session.updated_at);
      
      if (sessionDate >= today) {
        groups[0].sessions.push(session);
      } else if (sessionDate >= yesterday) {
        groups[1].sessions.push(session);
      } else if (sessionDate >= thisWeek) {
        groups[2].sessions.push(session);
      } else {
        groups[3].sessions.push(session);
      }
    });

    // Filter out empty groups
    return groups.filter(group => group.sessions.length > 0);
  }, [sessions, searchQuery]);

  const handleNewChat = async () => {
    const sessionId = await createNewSession();
    if (sessionId) {
      onSessionSelect(null);
      onNewChat();
    }
  };

  const handleSessionClick = (session: ChatSession) => {
    console.log('🔵 Sidebar: Clicked session', session.id, session.title);
    // Don't do anything if clicking the same session
    if (currentSessionId === session.id) {
      console.log('🔵 Session already selected, skipping');
      return;
    }
    setCurrentSessionId(session.id);
    onSessionSelect(session);
  };

  const handleRenameSession = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const newTitle = prompt('Rename chat:', session.title);
    if (newTitle && newTitle !== session.title) {
      await updateSession(sessionId, { title: newTitle });
      toast.success('Chat renamed');
    }
  };

  const handlePinSession = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await togglePinSession(sessionId);
    } catch (error) {
      console.error('Error pinning session:', error);
      toast.error('Failed to update chat');
    }
  };

  const handleDeleteClick = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await deleteSession(sessionToDelete);
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error in confirmDelete:', error);
      toast.error('Failed to delete chat. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const sidebarWidth = isCollapsed ? 56 : 256;

  if (!user) {
    return (
      <TooltipProvider>
        <div 
          className={cn("h-full border-r-0 glass-sidebar flex flex-col relative transition-all duration-300 ease-in-out overflow-hidden", className)}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Toggle Button - Modern design above divider */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute right-3 top-3 z-50 rounded-xl w-9 h-9 p-0 glass-chat border border-border/30 backdrop-blur-xl bg-background/60 hover:bg-background/80 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>

          {!isCollapsed && (
            <div className="animate-fade-in flex flex-col h-full">
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div>
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to save your chat history
                  </p>
                  {/* Sign In Button right after the text */}
                  <Button
                    onClick={() => navigate('/login')}
                    className="rounded-xl h-11 glass-chat-button hover:shadow-lg transition-all duration-300"
                    size="lg"
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="p-2 flex items-center justify-center h-full animate-fade-in">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div 
        className={cn("h-full border-r-0 glass-sidebar flex flex-col relative transition-all duration-300 ease-in-out overflow-hidden", className)}
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Toggle Button - Modern design above divider */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute right-3 top-3 z-50 rounded-xl w-9 h-9 p-0 glass-chat border border-border/30 backdrop-blur-xl bg-background/60 hover:bg-background/80 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
        {/* Collapsed State - Mini Icons */}
        {isCollapsed && (
          <div className="p-3 space-y-2 pt-16 animate-fade-in">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewChat}
                  className="w-full h-11 rounded-xl hover:bg-muted/60 hover:shadow-md transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>

            <div className="h-px bg-border/50 my-2" />

            {groupedSessions.flatMap(group => group.sessions).slice(0, 5).map((session) => (
              <Tooltip key={session.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "w-full h-11 rounded-xl hover:bg-muted/60 hover:shadow-md transition-all duration-300",
                      currentSessionId === session.id && "bg-primary/10 border border-primary/20"
                    )}
                    onClick={() => handleSessionClick(session)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="truncate">{session.title}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Expanded State - Full Content */}
        {!isCollapsed && (
          <div className="animate-fade-in flex flex-col h-full">
            {/* Header - New Chat */}
            <div className="flex-shrink-0 p-4 border-b border-border/30">
              <Button
                onClick={handleNewChat}
                className="w-full justify-start gap-2 glass-chat-button rounded-xl h-11 hover:shadow-lg transition-all duration-300"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 p-4 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 glass-chat-input border-border/40 rounded-xl backdrop-blur-xl bg-background/60 hover:bg-background/80 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
            </div>

            {/* Chat List - Scrollable */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 min-w-fit">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : groupedSessions.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No chats found' : 'No chats yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 min-w-fit">
                    {groupedSessions.map((group) => (
                      <div key={group.label} className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                          {group.label}
                        </h3>
                        {group.sessions.map((session) => (
                          <div
                            key={session.id}
                            className={cn(
                              "group relative p-3 rounded-xl cursor-pointer transition-all duration-300",
                              "hover:bg-muted/60 hover:shadow-md hover:-translate-y-0.5",
                              currentSessionId === session.id && "bg-primary/10 border border-primary/20 shadow-sm"
                            )}
                            onClick={() => handleSessionClick(session)}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm whitespace-nowrap flex-1">
                                    {session.title}
                                  </h4>
                                  {session.is_pinned && (
                                    <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDate(session.updated_at)}
                                </p>
                              </div>

                              {/* Actions Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-8 w-8 p-0 flex-shrink-0 rounded-lg"
                                  >
                                    <span className="text-lg leading-none">⋯</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={(e) => handlePinSession(session.id, e)}>
                                    <Pin className="w-4 h-4 mr-2" />
                                    {session.is_pinned ? 'Unpin' : 'Pin'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleRenameSession(session.id, e)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => handleDeleteClick(session.id, e)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* User Footer */}
            <div className="flex-shrink-0 border-t border-border/30 p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-3 h-auto rounded-xl hover:bg-muted/60 transition-all duration-300">
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                        </p>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete chat?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete this chat. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};
