/**
 * Advanced Fields Section Component
 * Collapsible section for optional PMF form fields
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvancedFieldsSectionProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  completedCount?: number;
  totalCount?: number;
}

export const AdvancedFieldsSection: React.FC<AdvancedFieldsSectionProps> = ({
  children,
  defaultOpen = false,
  completedCount = 0,
  totalCount = 5,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between hover:bg-primary/5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">Advanced Options</span>
            <span className="text-xs text-muted-foreground ml-2">
              (Optional - for better analysis)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <span className="text-xs text-primary font-medium">
                {completedCount}/{totalCount} completed
              </span>
            )}
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-4 p-4 border-2 border-primary/10 rounded-lg bg-background/50">
          <div className="flex items-start gap-2 p-3 bg-info-subtle border border-info/30 rounded-md mb-4">
            <Sparkles className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
            <p className="text-xs text-info">
              <strong>Pro Tip:</strong> Completing these optional fields helps us provide more
              accurate PMF analysis, industry-specific insights, and competitive positioning advice.
            </p>
          </div>
          {children}
        </div>
      )}
    </div>
  );
};

export default AdvancedFieldsSection;
