import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
  isBot: boolean;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ 
  content, 
  isComplete,
  isBot 
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const [showCursor, setShowCursor] = useState(!isComplete);

  useEffect(() => {
    setDisplayContent(content);
    setShowCursor(!isComplete);
  }, [content, isComplete]);

  // Cursor blink animation
  useEffect(() => {
    if (!showCursor) return;

    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530); // Blink every 530ms

    return () => clearInterval(interval);
  }, [showCursor, isComplete]);

  if (!isBot) {
    return (
      <div className="text-foreground">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-3">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {displayContent}
        </ReactMarkdown>
      </div>
      {!isComplete && (
        <span 
          className={`inline-block w-2 h-4 bg-primary ml-1 transition-opacity duration-100 ${
            showCursor ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Typing cursor"
        />
      )}
    </div>
  );
};
