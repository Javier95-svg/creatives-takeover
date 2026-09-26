import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { useProjects } from '@/hooks/useProjects';
import { usePulseConversation } from '@/hooks/usePulseConversation';
import { streamChat } from '@/hooks/useStreamingChat';
import { getPulseRouteContext } from '@/config/pulseRoutes';
import { pulseScope } from '@/lib/pulseScope';
import type { PulseHomeMessage } from '@/lib/pulseHome';

export interface PulseMessage extends PulseHomeMessage { timestamp?: Date }

export const usePulseWidget = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const account = useAccountContext();
  const projects = useProjects();
  const location = useLocation();
  const route = getPulseRouteContext(location.pathname);
  const founder = account.userType === 'founder' || account.userType === 'builder';
  const projectId = founder ? projects.activeProjectId : null;
  const scope = useMemo(() => pulseScope(account.userType, projectId), [account.userType, projectId]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'feedback'>('chat');
  const [proactiveVisible, setProactiveVisible] = useState(false);
  const loaded = !authLoading && (!isAuthenticated || (!account.isLoading && (!founder || !projects.isLoading)));
  const contextError = isAuthenticated && (account.isError || (founder && projects.error)) ? 'Your account or project could not be loaded. Refresh to retry.' : '';
  const conversation = usePulseConversation(user?.id, scope, isOpen && isAuthenticated && loaded && !contextError, location.pathname);
  const sendVerified = conversation.send;
  const [guestMessages, setGuestMessages] = useState<PulseMessage[]>([]);
  const [guestStreaming, setGuestStreaming] = useState(false);
  const [guestError, setGuestError] = useState('');
  const guestSession = useRef(crypto.randomUUID());
  const guestEpoch = useRef(0);
  const guestBusy = useRef(false);
  const identity = `${user?.id ?? 'guest'}:${scope.userType}:${scope.projectId}`;
  const identityRef = useRef(identity); identityRef.current = identity;
  useEffect(() => {
    const generation = ++guestEpoch.current; guestBusy.current = false;
    setGuestMessages([]); setGuestStreaming(false); setGuestError(''); guestSession.current = crypto.randomUUID();
    return () => { guestEpoch.current = generation + 1; };
  }, [identity]);
  const proactiveMessage = !isAuthenticated
    ? 'Welcome to Creatives Takeover. Ask me about the platform. Sign in to use your saved workspace context.'
    : founder && route ? `I can help with ${route.toolName}. What are you working through?` : 'Welcome back. What would you like help with today?';
  useEffect(() => {
    if (!loaded || sessionStorage.getItem('pulse_proactive_dismissed') === 'true') return;
    const timer = setTimeout(() => setProactiveVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [loaded, identity]);
  const dismissProactive = useCallback(() => { setProactiveVisible(false); sessionStorage.setItem('pulse_proactive_dismissed', 'true'); }, []);
  const openPanel = useCallback(() => { setIsOpen(true); setActiveTab('chat'); dismissProactive(); }, [dismissProactive]);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const sendMessage = useCallback(async (text: string) => {
    if (isAuthenticated) { await sendVerified(text); return; }
    if (!loaded || !text.trim() || guestBusy.current) return;
    guestBusy.current = true; setGuestStreaming(true); setGuestError('');
    const generation = guestEpoch.current;
    const alive = () => generation === guestEpoch.current && identityRef.current === identity;
    const assistantId = crypto.randomUUID();
    setGuestMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content: text.trim() }, { id: assistantId, role: 'assistant', content: '' }]);
    const fail = () => { if (alive()) setGuestError('Pulse was interrupted. Please send your question again.'); };
    try {
      // Public product guidance has no saved user context and retains its existing flow.
      await streamChat(text.trim(), guestSession.current, guestMessages.map(({ role, content }) => ({ role, content })),
        { currentPage: location.pathname }, null, null, null, 'pulse', undefined,
        chunk => { if (alive()) setGuestMessages(previous => previous.map(message => message.id === assistantId ? { ...message, content: message.content + chunk } : message)); },
        () => {}, undefined, fail);
    } catch { fail(); }
    finally { if (alive()) { guestBusy.current = false; setGuestStreaming(false); } }
  }, [isAuthenticated, sendVerified, loaded, guestMessages, location.pathname, identity]);
  const getQuickReplies = useCallback(() => {
    if (!isAuthenticated) return ['What is this platform?', 'Show me pricing', 'How does the AI work?'];
    if (account.userType === 'mentor') return ['Help me clarify my expertise', 'Improve my mentoring offer', 'Recommend an article'];
    if (account.userType === 'marketplace') return ['Sharpen my service offering', 'Clarify my ideal customer', 'Recommend an article'];
    if (account.userType === 'investor') return ['Review my investment focus', 'Recommend relevant content', 'Help me define screening criteria'];
    return ['What should I focus on?', 'Use my project context', 'Suggest next step'];
  }, [isAuthenticated, account.userType]);
  const messages = isAuthenticated ? conversation.messages : guestMessages;
  return {
    isOpen, activeTab, setActiveTab, openPanel, closePanel, proactiveMessage, proactiveVisible, dismissProactive,
    messages: messages.length ? messages : [{ id: 'welcome', role: 'assistant' as const, content: proactiveMessage }],
    isStreaming: isAuthenticated ? conversation.streaming : guestStreaming, sendMessage, getQuickReplies,
    isAuthenticated, contextLoaded: loaded, userName: user?.user_metadata?.full_name ?? null,
    loading: !loaded || (isAuthenticated && !conversation.ready && !contextError && !conversation.error),
    error: contextError || (isAuthenticated ? conversation.error : guestError),
    onRetry: contextError ? () => window.location.reload() : isAuthenticated ? conversation.retry : () => setGuestError(''),
    contextLabel: isAuthenticated ? (founder ? (projects.activeProject?.title ? `Project: ${projects.activeProject.title}` : 'No project selected') : `${account.userType} account`) : 'Public platform guidance',
    contextNotice: isAuthenticated ? conversation.notice : '',
  };
};
