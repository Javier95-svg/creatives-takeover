import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
import { createIdempotencyKey } from '@/lib/idempotency';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MVPMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  model?: string;
}

interface PersistedSession {
  messages: MVPMessage[];
  currentHtml: string | null;
  projectName: string;
  projectId: string;
}

function extractHtmlFromText(fullText: string): string | null {
  const start = fullText.indexOf('<html-output>');
  const end = fullText.indexOf('</html-output>');
  if (start === -1 || end === -1) return null;
  return fullText.slice(start + '<html-output>'.length, end).trim();
}

// ── Constants ────────────────────────────────────────────────────────────────

const STREAM_URL = 'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/mvp-builder-generate';
const STORAGE_KEY = 'ct_app_builder_session';

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMVPBuilder() {
  const { user } = useAuth();
  const { ensureCredits, handleCreditError } = useCreditActions();

  const [messages, setMessages] = useState<MVPMessage[]>([]);
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectName, setProjectName] = useState('Name Your App');
  const [projectId, setProjectId] = useState<string>(() => crypto.randomUUID());

  // Abort controller ref to cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  // ── Persistence ───────────────────────────────────────────────────────────

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const session: PersistedSession = JSON.parse(raw);
      // Strip streaming flags that may have been saved mid-stream
      const cleanMessages = (session.messages || []).map((m) => ({
        ...m,
        isStreaming: false,
      }));
      setMessages(cleanMessages);
      setCurrentHtml(session.currentHtml ?? null);
      setProjectName(session.projectName ?? 'Name Your App');
      if (session.projectId) setProjectId(session.projectId);
    } catch {
      // Corrupt data — ignore
    }
  }, []);

  // Save to localStorage whenever state changes
  const persist = useCallback(
    (msgs: MVPMessage[], html: string | null, name: string, pid: string) => {
      try {
        const session: PersistedSession = {
          messages: msgs.map((m) => ({ ...m, isStreaming: false })),
          currentHtml: html,
          projectName: name,
          projectId: pid,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Storage full — ignore
      }
    },
    []
  );

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isGenerating) return;

      const isFirstGeneration = messages.length === 0;
      const creditFeature = isFirstGeneration
        ? 'APP_BUILDER_GENERATE'
        : 'APP_BUILDER_REFINE';

      // Credit check (shows upgrade prompt if insufficient)
      const required = ensureCredits(creditFeature, {
        featureName: isFirstGeneration
          ? 'AI App Builder — Generate'
          : 'AI App Builder — Refine',
      });
      if (required === null) return; // Upgrade prompt opened

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      let didTimeout = false;
      const timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 120000);

      // Build optimistic UI
      const userMsg: MVPMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
      };
      const assistantMsg: MVPMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      const nextMessages = [...messages, userMsg, assistantMsg];
      setMessages(nextMessages);
      setIsGenerating(true);

      // Build conversation history for API (exclude the placeholder assistant msg)
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const idempotencyKey = createIdempotencyKey(
          'app-builder',
          `${user?.id ?? 'anon'}-${Date.now()}`
        );

        const res = await fetch(STREAM_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            userMessage: prompt,
            currentHtml: currentHtml,
            conversationHistory,
            userId: user?.id ?? null,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedContent = '';
        let newHtml: string | null = null;
        let completedModel: string | null = null;
        let finalized = false;

        const finalizeResponse = () => {
          if (finalized) return;
          finalized = true;

          const fallbackHtml = extractHtmlFromText(streamedContent);
          const finalHtml = newHtml ?? fallbackHtml ?? currentHtml;

          const finalMessages = nextMessages.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: streamedContent || 'Done!',
                  isStreaming: false,
                  ...(completedModel ? { model: completedModel } : {}),
                }
              : m
          );
          setMessages(finalMessages);
          if (newHtml ?? fallbackHtml) setCurrentHtml(newHtml ?? fallbackHtml);
          persist(finalMessages, finalHtml, projectName, projectId);
        };

        const read = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              finalizeResponse();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') {
                finalizeResponse();
                return;
              }

              let event: Record<string, unknown>;
              try {
                event = JSON.parse(raw);
              } catch {
                continue;
              }

              if (event.type === 'delta' && typeof event.content === 'string') {
                streamedContent += event.content;
                setMessages((prev) => {
                  const updated = prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: streamedContent }
                      : m
                  );
                  return updated;
                });
              } else if (event.type === 'code' && typeof event.html === 'string') {
                newHtml = event.html;
              } else if (event.type === 'complete') {
                completedModel = typeof event.model === 'string' ? event.model : null;
                finalizeResponse();
                return;
              } else if (event.type === 'error') {
                const errMsg = (event.error as string) ?? 'Something went wrong.';
                const errCode = event.errorCode as string | undefined;
                handleCreditError(
                  { message: errMsg, status: errCode === 'INSUFFICIENT_CREDITS' ? 402 : 500 },
                  { error: errMsg, errorCode: errCode },
                  creditFeature
                );
                // Update the assistant message with the error
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: `⚠️ ${errMsg}`, isStreaming: false }
                      : m
                  )
                );
                return;
              }
            }
          }
        };

        await read();
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          if (!didTimeout) return;
          toast.error('Request timed out. Please try a simpler prompt.');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content: '⚠️ Request timed out. Please try a shorter or simpler prompt.',
                    isStreaming: false,
                  }
                : m
            )
          );
          return;
        }
        console.error('App Builder stream error:', err);
        toast.error('Connection error. Please try again.');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: '⚠️ Connection error. Please try again.',
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        clearTimeout(timeoutId);
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [
      messages,
      currentHtml,
      isGenerating,
      user,
      projectName,
      projectId,
      ensureCredits,
      handleCreditError,
      persist,
    ]
  );

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetProject = useCallback(() => {
    abortRef.current?.abort();
    const newId = crypto.randomUUID();
    setMessages([]);
    setCurrentHtml(null);
    setProjectName('Name Your App');
    setProjectId(newId);
    setIsGenerating(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Persist project name changes (always, even on an empty session)
  useEffect(() => {
    persist(messages, currentHtml, projectName, projectId);
  }, [projectName]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages,
    currentHtml,
    isGenerating,
    projectName,
    projectId,
    setProjectName,
    sendMessage,
    resetProject,
  };
}
