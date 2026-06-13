import React from 'react';
import { Loader2, Globe, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SearchResultsProps {
  status?: 'searching' | 'found' | 'none';
  sourceCount?: number;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ 
  status = 'none', 
  sourceCount = 0,
  className = '' 
}) => {
  if (status === 'none') {
    return null;
  }

  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm">
          {status === 'searching' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-muted-foreground">Searching the web for current information...</span>
            </>
          )}
          {status === 'found' && (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-muted-foreground">
                Found <Badge variant="secondary" className="mx-1">{sourceCount}</Badge> sources
              </span>
              <Globe className="h-4 w-4 ml-auto text-primary" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

