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
import { trackPulseGuestOpened, trackPulseGuestQuestionAsked } from '@/lib/analytics';
import {
  extractPublicPulseLinks, findPublicPulseQuestion, publicPulseFollowUps, PUBLIC_PULSE_STARTERS, type PublicPulseLink,
} from '@/lib/publicPlatformFacts';

// guest: a signed-out reply, whose links go through followPublicPulseLink.
// links: page cards under that reply, taken from the pages it links to.
// feedbackSessionId: set on signed-in answers so they can be rated.
export interface PulseMessage extends PulseHomeMessage {
  timestamp?: Date; guest?: boolean; links?: PublicPulseLink[]; feedbackSessionId?: string;
  /** Founder answers: where "Remember this" saves (the conversation's project, or the account). */
  memoryScope?: { projectId: string | null };
}

const GUEST_CHAT_KEY = 'ct_pulse_guest_chat';

function readGuestChat(): PulseMessage[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(GUEST_CHAT_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    // Only text is kept; cards are rebuilt from it, so stored data cannot add links.
    return parsed.flatMap((item): PulseMessage[] => {
      if (!item || typeof item !== 'object') return [];
      const { id, role, content } = item as Record<string, unknown>;
      if (typeof id !== 'string' || (role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content) return [];
      return [role === 'assistant' ? { id, role, content, guest: true, links: extractPublicPulseLinks(content) } : { id, role, content }];
    }).slice(-30);
  } catch { return []; }
}

function saveGuestChat(messages: PulseMessage[]) {
  try {
    sessionStorage.setItem(GUEST_CHAT_KEY, JSON.stringify(messages.slice(-30).map(({ id, role, content }) => ({ id, role, content }))));
  } catch { /* storage unavailable: the chat just is not kept */ }
}

function clearGuestChat() {
  try { sessionStorage.removeItem(GUEST_CHAT_KEY); } catch { /* nothing to clear */ }
}

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
  const isGuestIdentity = !user;
  useEffect(() => {
    const generation = ++guestEpoch.current; guestBusy.current = false;
    // A signed-out chat survives pages where Pulse is hidden (such as the quiz);
    // signing in drops it.
    setGuestMessages(isGuestIdentity ? readGuestChat() : []); setGuestStreaming(false); setGuestError(''); guestSession.current = crypto.randomUUID();
    if (!isGuestIdentity) clearGuestChat();
    return () => { guestEpoch.current = generation + 1; };
  }, [identity, isGuestIdentity]);
  useEffect(() => { if (isGuestIdentity && !guestStreaming) saveGuestChat(guestMessages); }, [isGuestIdentity, guestStreaming, guestMessages]);
  const proactiveMessage = !isAuthenticated
    ? "Hi, I'm Pulse. Ask me anything about Creatives Takeover."
    : founder && route ? `I can help with ${route.toolName}. What are you working through?` : 'Welcome back. What would you like help with today?';
  useEffect(() => {
    if (!loaded || sessionStorage.getItem('pulse_proactive_dismissed') === 'true') return;
    const timer = setTimeout(() => setProactiveVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [loaded, identity]);
  const dismissProactive = useCallback(() => { setProactiveVisible(false); sessionStorage.setItem('pulse_proactive_dismissed', 'true'); }, []);
  const openPanel = useCallback(() => {
    setIsOpen(true); setActiveTab('chat'); dismissProactive();
    if (!isAuthenticated) trackPulseGuestOpened({ page_path: location.pathname });
  }, [dismissProactive, isAuthenticated, location.pathname]);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const sendMessage = useCallback(async (text: string) => {
    if (isAuthenticated) { await sendVerified(text); return; }
    if (!loaded || !text.trim() || guestBusy.current) return;
    const question = findPublicPulseQuestion(text);
    trackPulseGuestQuestionAsked({ question_id: question?.id ?? 'typed', answer_source: question ? 'prewritten' : 'model' });
    if (question) {
      // Fixed questions get their written answer at once, with no model call.
      setGuestError('');
      setGuestMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content: question.text },
        { id: crypto.randomUUID(), role: 'assistant', content: question.answer, links: extractPublicPulseLinks(question.answer), guest: true }]);
      return;
    }
    guestBusy.current = true; setGuestStreaming(true); setGuestError('');
    const generation = guestEpoch.current;
    const alive = () => generation === guestEpoch.current && identityRef.current === identity;
    const assistantId = crypto.randomUUID();
    setGuestMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content: text.trim() }, { id: assistantId, role: 'assistant', content: '', guest: true }]);
    const fail = () => { if (alive()) setGuestError('Pulse was interrupted. Please send your question again.'); };
    try {
      // Public product guidance has no saved user context and retains its existing flow.
      await streamChat(text.trim(), guestSession.current, guestMessages.map(({ role, content }) => ({ role, content })),
        { currentPage: location.pathname }, null, null, null, 'pulse', undefined,
        chunk => { if (alive()) setGuestMessages(previous => previous.map(message => message.id === assistantId ? { ...message, content: message.content + chunk } : message)); },
        () => {}, undefined, fail);
    } catch { fail(); }
    finally {
      if (alive()) {
        guestBusy.current = false; setGuestStreaming(false);
        setGuestMessages(previous => previous.map(message => message.id === assistantId ? { ...message, links: extractPublicPulseLinks(message.content) } : message));
      }
    }
  }, [isAuthenticated, sendVerified, loaded, guestMessages, location.pathname, identity]);
  const getQuickReplies = useCallback(() => {
    // Signed out: the starter questions, then up to two not asked yet after each reply
    // (src/lib/publicPlatformFacts.ts).
    if (!isAuthenticated) {
      return guestMessages.length
        ? publicPulseFollowUps(guestMessages.filter(message => message.role === 'user').map(message => message.content))
        : PUBLIC_PULSE_STARTERS;
    }
    if (account.hasCategoryAccess) {
      if (account.userType === 'mentor') return ['Which bookings need my attention?', 'Help me prepare for a session', 'Recommend an article'];
      if (account.userType === 'marketplace') return ['Who has reached out recently?', 'Help me qualify an enquiry', 'Improve my service offering'];
      if (account.userType === 'investor') return ['Explain my current matches', 'What information is missing?', 'Review my investment focus'];
    }
    if (account.userType === 'mentor') return ['Help me clarify my expertise', 'Improve my mentoring offer', 'Recommend an article'];
    if (account.userType === 'marketplace') return ['Sharpen my service offering', 'Clarify my ideal customer', 'Recommend an article'];
    if (account.userType === 'investor') return ['Review my investment focus', 'Recommend relevant content', 'Help me define screening criteria'];
    return ['What should I focus on?', 'Use my project context', 'Suggest next step'];
  }, [isAuthenticated, account.userType, account.hasCategoryAccess, guestMessages]);
  // Signed-in answers carry the conversation's session id so they can be rated.
  const messages: PulseMessage[] = isAuthenticated
    ? conversation.messages.map(message => ({ ...message, feedbackSessionId: conversation.sessionId ?? undefined,
      // Memory and follow-ups belong to founders and builders, scoped like the conversation.
      memoryScope: founder ? { projectId: scope.projectId } : undefined }))
    : guestMessages;
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
