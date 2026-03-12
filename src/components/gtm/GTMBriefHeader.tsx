import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Download, Save, Loader2 } from 'lucide-react';

interface GTMBriefHeaderProps {
  planTitle: string;
  summaryInsight: string;
  isSaving: boolean;
  isExporting: boolean;
  onSave: () => void;
  onExport: () => void;
  onRegenerate: () => void;
}

const GTMBriefHeader: React.FC<GTMBriefHeaderProps> = ({
  planTitle,
  summaryInsight,
  isSaving,
  isExporting,
  onSave,
  onExport,
  onRegenerate,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-3 text-center">
        <Badge className="bg-primary/10 text-primary border-primary/20">Stage V: LAUNCH</Badge>
        <h1 className="text-2xl md:text-4xl font-bold creatives-font takeover-gradient leading-tight">
          {planTitle}
        </h1>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          Start Over
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting} className="gap-2">
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export PDF
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Plan
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Saving marks Stage V complete.
      </p>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-foreground/80 italic leading-relaxed">{summaryInsight}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GTMBriefHeader;
