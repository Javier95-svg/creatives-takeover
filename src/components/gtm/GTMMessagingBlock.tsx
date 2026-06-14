import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { GTMAnalysis } from '@/hooks/useGTMStrategist';

interface GTMMessagingBlockProps {
  messaging: GTMAnalysis['messaging'];
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard.'));
  };
  return (
    <button
      onClick={copy}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Copy"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
};

const GTMMessagingBlock: React.FC<GTMMessagingBlockProps> = ({ messaging }) => {
  const rows: Array<{ label: string; value: string; large?: boolean }> = [
    { label: 'Headline', value: messaging.headline, large: true },
    { label: 'Hook Line', value: messaging.hookLine },
    { label: 'Proof Point', value: messaging.proofPoint },
    { label: 'CTA Copy', value: messaging.ctaCopy },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Messaging Hierarchy</h2>
      </div>
      <p className="text-sm text-muted-foreground">Copy any line directly into your landing page, LinkedIn bio, or outreach messages.</p>

      <div className="space-y-3">
        {rows.map(({ label, value, large }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                  <p className={large ? 'text-xl font-bold' : 'text-base'}>{value}</p>
                </div>
                <CopyButton text={value} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {messaging.toneOfVoice && messaging.toneOfVoice.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Tone of voice:</span>
          {messaging.toneOfVoice.map(tone => (
            <Badge key={tone} variant="secondary" className="text-xs">{tone}</Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default GTMMessagingBlock;
