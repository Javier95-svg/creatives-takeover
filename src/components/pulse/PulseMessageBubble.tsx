import type { MouseEvent, ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type { PulseMessage } from '@/hooks/usePulseWidget';
import { PulseSources } from './PulseSources';
import { PulseAnswerFeedback } from './PulseAnswerFeedback';
import { validateHomeActions } from '@/lib/pulseHome';
import { findPublicPulseLink, type PublicPulseLink } from '@/lib/publicPlatformFacts';
import { followPublicPulseLink } from '@/lib/publicPulseNavigation';
import { trackPulseInvestorProfileClicked } from '@/lib/analytics';

interface PulseMessageBubbleProps {
  message: PulseMessage;
  isStreaming?: boolean;
}

export const PulseMessageBubble = ({ message, isStreaming }: PulseMessageBubbleProps) => {
  const isUser = message.role === 'user';
  const navigate = useNavigate();
  const openInApp = (event: MouseEvent<HTMLAnchorElement>, route: string) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); navigate(route);
  };
  // Tracks the click and prepares the quiz hand-off, then opens the page in the same tab.
  const openGuestLink = (event: MouseEvent<HTMLAnchorElement>, link: PublicPulseLink) => {
    openInApp(event, followPublicPulseLink(link));
  };
  const renderGuestLink = (href: string | undefined, children: ReactNode) => {
    const link = findPublicPulseLink(href);
    if (!link) return <span>{children}</span>;
    return <a className="font-medium underline underline-offset-2" href={link.destination} onClick={event => openGuestLink(event, link)}>{children}</a>;
  };

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center self-end">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
            : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              a: ({ children, href }) => message.guest ? (
                // Signed-out replies only link to the public pages list; anything else stays plain text.
                renderGuestLink(href, children)
              ) : href?.startsWith('/') ? (
                // Site pages open in the same tab, like the cards below the reply.
                <a className="font-medium underline underline-offset-2" href={href} onClick={event => openInApp(event, href)}>
                  {children}
                </a>
              ) : (
                <a className="underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {isStreaming && !message.content && (
          <div className="flex gap-1 items-center py-1">
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
          </div>
        )}
        {!isUser && <>
          {validateHomeActions(message.actions).map((action, index) => <a key={action.id} href={action.route} onClick={() => { if (action.kind === 'investor') trackPulseInvestorProfileClicked({ surface: 'widget', investor_id: action.id, rank: index + 1, is_pro: !action.locked }); }} className="mt-2 block rounded-lg border border-border p-2 hover:bg-background"><span className="block font-medium">{action.title}</span><span className="block text-xs text-muted-foreground">{action.reason}</span>{action.kind === 'investor' && <span className="mt-1 block text-xs font-medium text-primary">{action.locked ? 'Visit profile · Pro' : 'Visit profile'}</span>}</a>)}
          {message.links?.map(link => <a key={link.route} href={link.destination} onClick={event => openGuestLink(event, link)} className="mt-2 flex items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:border-primary/60 hover:bg-background"><span className="min-w-0 flex-1"><span className="block font-medium">{link.title}</span><span className="block text-xs text-muted-foreground">{link.reason}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></a>)}
          <PulseSources sources={message.sources} />
          {message.feedbackSessionId && message.id.endsWith(':assistant') && message.content && !isStreaming &&
            <PulseAnswerFeedback sessionId={message.feedbackSessionId} turnId={message.id.slice(0, -':assistant'.length)} surface="widget" />}
        </>}
      </div>
    </div>
  );
};
