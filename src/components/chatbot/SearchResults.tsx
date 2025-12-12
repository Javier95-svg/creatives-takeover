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
    <Card className={`border-2 border-gradient-bold rounded-2xl bg-gradient-to-r from-primary/10 via-accent-bold/5 to-primary/10 shadow-lg relative overflow-hidden ${className} animate-message-slide-in`}>
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-flow opacity-30 animate-gradient-flow pointer-events-none" style={{ backgroundSize: '300% 100%' }} />
      
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center gap-3 text-sm">
          {status === 'searching' && (
            <>
              <div className="relative">
                <Loader2 className="h-5 w-5 animate-spin text-primary drop-shadow-lg" />
                <div className="absolute inset-0 h-5 w-5 animate-ping text-primary/30" />
              </div>
              <span className="text-foreground font-medium gradient-text-bold">
                Searching the web for real-time insights...
              </span>
            </>
          )}
          {status === 'found' && (
            <>
              <div className="relative">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 drop-shadow-lg animate-bounce-slow" />
                <div className="absolute inset-0 h-5 w-5 animate-ping text-green-600/30 dark:text-green-400/30" />
              </div>
              <span className="text-foreground font-medium">
                Found <Badge variant="secondary" className="mx-1 px-2 py-0.5 bg-gradient-bold-2 text-white border-0 font-bold shadow-md">{sourceCount}</Badge> relevant sources
              </span>
              <Globe className="h-5 w-5 ml-auto text-primary animate-bounce-slow drop-shadow-lg" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

