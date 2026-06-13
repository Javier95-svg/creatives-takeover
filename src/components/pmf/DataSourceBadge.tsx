/**
 * Data Source Badge Component
 * Shows which fields were auto-populated from the wizard
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Info } from 'lucide-react';

interface DataSourceBadgeProps {
  source: string;
  confidence?: number;
  onEdit?: () => void;
  compact?: boolean;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  source,
  confidence = 1,
  onEdit,
  compact = false,
}) => {
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-success';
    return 'text-warning';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Medium confidence';
    return 'Low confidence - please verify';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs bg-success-subtle border-success/30 text-success">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Auto-filled
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs font-medium">From: {source}</p>
            <p className={`text-xs mt-1 ${getConfidenceColor()}`}>{getConfidenceLabel()}</p>
            {onEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                Click to edit this field
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-start gap-2 p-2 bg-success-subtle border border-success/30 rounded-md">
      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="text-xs font-medium text-success">
          ✓ Auto-filled from Business Plan
        </p>
        <p className="text-xs text-muted-foreground">
          Source: {source}
        </p>
        {confidence < 0.8 && (
          <div className="flex items-start gap-1.5 mt-1">
            <Info className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
            <p className={`text-xs ${getConfidenceColor()}`}>
              {getConfidenceLabel()} - Please review and update if needed
            </p>
          </div>
        )}
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-xs text-primary hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
};

export default DataSourceBadge;
