import React, { useState, useMemo } from 'react';
import { 
  Plus, MessageSquare, Trash2, Calendar, CheckCircle, Circle, Search, Menu, X,
  Sparkles, BookOpen, Users, Target, Settings, LogOut, CreditCard, 
  MoreVertical, Archive, Copy, Download, Share2, Edit, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChatSessions, ChatSession } from '@/hooks/useChatSessions';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatSidebarProps {
  onSessionSelect: (session: ChatSession | null) => void;
  onNewChat: () => void;
  className?: string;
  onTabChange?: (tab: 'bizmap' | 'sprint') => void;
}

type SortOption = 'recent' | 'alphabetical' | 'completion';
type GroupOption = 'date' | 'status' | 'none';

export const ChatSidebar = ({ onSessionSelect, onNewChat, className, onTabChange }: ChatSidebarProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [groupBy, setGroupBy] = useState<GroupOption>('date');
  const { 
    sessions, 
    loading, 
    currentSessionId, 
    setCurrentSessionId, 
    createNewSession, 
    deleteSession,
    updateSession
  } = useChatSessions();
  const { user, signOut } = useAuth();
  const { balance, monthlyQuota } = useCredits();

  // Quick actions
  const quickActions = [
    { icon: Sparkles, label: 'Explore Prompts', onClick: () => navigate('/prompt-library') },
    { icon: BookOpen, label: 'Resources', onClick: () => navigate('/resources') },
    { icon: Users, label: 'Community', onClick: () => navigate('/community') },
    { icon: Target, label: 'Sprint Planner', onClick: () => onTabChange?.('sprint') },
  ];

  // Filter and sort sessions
  const sortedSessions = useMemo(() => {
    let filtered = sessions.filter(session =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'completion':
        filtered.sort((a, b) => {
          if (a.is_completed === b.is_completed) return 0;
          return a.is_completed ? -1 : 1;
        });
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }

    return filtered;
  }, [sessions, searchQuery, sortBy]);

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Chats': sortedSessions };
    }

    if (groupBy === 'status') {
      return {
        'Completed': sortedSessions.filter(s => s.is_completed),
        'In Progress': sortedSessions.filter(s => !s.is_completed),
      };
    }

    // Group by date
    const groups: Record<string, ChatSession[]> = {
      'Today': [],
      'Yesterday': [],
      'Last 7 Days': [],
      'Last 30 Days': [],
      'Older': [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    sortedSessions.forEach(session => {
      const date = new Date(session.updated_at);
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (date >= today) {
        groups['Today'].push(session);
      } else if (date >= yesterday) {
        groups['Yesterday'].push(session);
      } else if (diffDays <= 7) {
        groups['Last 7 Days'].push(session);
      } else if (diffDays <= 30) {
        groups['Last 30 Days'].push(session);
      } else {
        groups['Older'].push(session);
      }
    });

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([, sessions]) => sessions.length > 0)
    );
  }, [sortedSessions, groupBy]);

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

  const handleDeleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await deleteSession(sessionId);
  };

  const handleRenameSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const newTitle = prompt('Enter new title:', session.title);
    if (newTitle && newTitle !== session.title) {
      await updateSession(sessionId, { title: newTitle });
      toast.success('Chat renamed');
    }
  };

  const handleDuplicateSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const newTitle = `${session.title} (Copy)`;
    const newSessionId = await createNewSession(newTitle);
    if (newSessionId) {
      await updateSession(newSessionId, { 
        answers: session.answers,
        current_step: session.current_step 
      });
      toast.success('Chat duplicated');
    }
  };

  const handleExportSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
        "glass-card-silver h-[700px] flex flex-col hover-lift",
        isCollapsed ? "w-16" : "w-80",
        className
      )}>
        <div className="p-4 border-b border-border/50">
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
      "glass-card-silver h-[700px] flex flex-col hover-lift transition-all duration-300",
      isCollapsed ? "w-16" : "w-80",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {!isCollapsed && <span className="ml-2 font-semibold">Chats</span>}
          </Button>
        </div>
        
        {!isCollapsed && (
          <>
            {/* Quick Actions Menu */}
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                  className="justify-start gap-2 text-xs h-9 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <action.icon className="w-3.5 h-3.5" />
                  <span className="truncate">{action.label}</span>
                </Button>
              ))}
            </div>

            <Button
              onClick={handleNewChat}
              className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              size="lg"
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

            {/* Filter and Sort Controls */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                  <SelectItem value="completion">Completion</SelectItem>
                </SelectContent>
              </Select>

              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupOption)}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
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
            ) : sortedSessions.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="glass-card-silver p-6 rounded-xl">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-primary/50" />
                  <p className="text-sm font-medium mb-2">
                    {searchQuery ? 'No chats found' : 'Ready to start?'}
                  </p>
                  {!searchQuery && (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate('/prompt-library')}
                        className="h-auto p-0 text-primary"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Explore Prompts
                      </Button>
                      <p>or start a new chat above</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSessions).map(([group, groupSessions]) => (
                  <div key={group}>
                    {groupBy !== 'none' && (
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group}
                      </div>
                    )}
                    <div className="space-y-1">
                      {groupSessions.map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "group relative p-3 rounded-lg cursor-pointer transition-all duration-200",
                            "hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10",
                            "hover:shadow-lg hover:scale-[1.02]",
                            currentSessionId === session.id && "bg-gradient-to-r from-primary/20 to-secondary/20 ring-2 ring-primary/30 shadow-lg"
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

                            {/* Context Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameSession(session.id);
                                }}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateSession(session.id);
                                }}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportSession(session.id);
                                }}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Export
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
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
                                        onClick={() => handleDeleteSession(session.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* User Profile Footer */}
      {!isCollapsed && user && (
        <div className="border-t border-border/50 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.user_metadata?.full_name || 'User'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CreditCard className="w-3 h-3" />
                      <span>{balance}/{monthlyQuota} credits</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/account')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/pricing')}>
                <CreditCard className="w-4 h-4 mr-2" />
                Upgrade Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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