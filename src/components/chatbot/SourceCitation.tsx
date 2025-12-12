import React from 'react';
import { ExternalLink, Globe, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Source {
  title: string;
  url?: string;
  source?: string;
  sourceType?: 'web' | 'knowledge';
  snippet?: string;
  excerpt?: string;
  relevance?: number;
  similarity?: number;
  publishedDate?: string;
}

interface SourceCitationProps {
  sources: Source[];
  className?: string;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ sources, className = '' }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  const webSources = sources.filter(s => s.sourceType === 'web' || s.url);
  const knowledgeSources = sources.filter(s => s.sourceType === 'knowledge' || (!s.url && s.source));

  return (
    <Collapsible defaultOpen={false} className={className}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between text-sm text-muted-foreground hover:text-foreground rounded-xl border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:bg-primary/5 hover:scale-[1.02] group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-flow opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-gradient-flow" style={{ backgroundSize: '300% 100%' }} />
          <span className="flex items-center gap-2 relative z-10">
            <BookOpen className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-medium">View Sources ({sources.length})</span>
          </span>
          <span className="text-xs relative z-10 flex items-center gap-1">
            {webSources.length > 0 && <span className="bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">🌐 {webSources.length}</span>}
            {webSources.length > 0 && knowledgeSources.length > 0 && <span className="text-muted-foreground">•</span>}
            {knowledgeSources.length > 0 && <span className="bg-purple-500/20 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">📖 {knowledgeSources.length}</span>}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-3 border-2 border-gradient-bold rounded-2xl bg-gradient-to-br from-background/95 to-muted/20 shadow-xl relative overflow-hidden animate-message-slide-in">
          {/* Animated border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-flow opacity-30 animate-gradient-flow pointer-events-none" style={{ backgroundSize: '300% 100%' }} />
          
          <CardContent className="p-4 space-y-3 relative z-10">
            {webSources.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Globe className="h-3 w-3" />
                  Web Sources
                </div>
                {webSources.map((source, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20 hover:from-blue-100/60 hover:to-blue-200/40 dark:hover:from-blue-900/40 dark:hover:to-blue-800/30 transition-all duration-300 border-2 border-blue-500/20 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] group relative overflow-hidden"
                  >
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-flow opacity-0 group-hover:opacity-10 transition-opacity duration-300 animate-gradient-flow pointer-events-none" style={{ backgroundSize: '300% 100%' }} />
                    
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            [{index + 1}]
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-0.5 h-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold shadow-sm"
                          >
                            🌐 Web
                          </Badge>
                          {source.relevance && (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-2 py-0.5 h-6 bg-primary/10 text-primary border-primary/30 font-semibold"
                            >
                              {Math.round((source.relevance || source.similarity || 0) * 100)}% match
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-bold mb-2 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                          {source.title}
                        </h4>
                        {(source.snippet || source.excerpt) && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                            {source.snippet || source.excerpt}
                          </p>
                        )}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-accent-bold font-medium hover:underline flex items-center gap-1 w-fit group/link transition-all duration-200"
                          >
                            <ExternalLink className="h-3 w-3 group-hover/link:rotate-45 transition-transform duration-300" />
                            <span className="truncate max-w-[200px] underline-offset-2 decoration-primary/30 decoration-2 group-hover/link:decoration-accent-bold">Visit source</span>
                          </a>
                        )}
                        {source.publishedDate && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            Published: {new Date(source.publishedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {source.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 flex-shrink-0 rounded-xl hover:bg-primary/20 hover:text-primary hover:scale-110 transition-all duration-300 hover:rotate-12"
                          onClick={() => window.open(source.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {knowledgeSources.length > 0 && (
              <div className="space-y-2">
                {webSources.length > 0 && <div className="border-t border-border my-3" />}
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <BookOpen className="h-3 w-3" />
                  Knowledge Base
                </div>
                {knowledgeSources.map((source, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20 hover:from-purple-100/60 hover:to-purple-200/40 dark:hover:from-purple-900/40 dark:hover:to-purple-800/30 transition-all duration-300 border-2 border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02] group relative overflow-hidden"
                  >
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-flow opacity-0 group-hover:opacity-10 transition-opacity duration-300 animate-gradient-flow pointer-events-none" style={{ backgroundSize: '300% 100%' }} />
                    
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                            [{webSources.length + index + 1}]
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-0.5 h-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold shadow-sm"
                          >
                            📖 Knowledge
                          </Badge>
                          {source.relevance && (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-2 py-0.5 h-6 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold"
                            >
                              {Math.round((source.relevance || source.similarity || 0) * 100)}% match
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-bold mb-2 text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          {source.title}
                        </h4>
                        {(source.snippet || source.excerpt) && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                            {source.snippet || source.excerpt}
                          </p>
                        )}
                        {source.source && !source.url && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Source: {source.source}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 via-accent-bold/5 to-primary/10 rounded-xl text-xs text-foreground border-2 border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-flow opacity-20 animate-gradient-flow pointer-events-none" style={{ backgroundSize: '300% 100%' }} />
              <p className="relative z-10 font-medium flex items-center gap-2">
                <span className="text-lg">💡</span>
                <span>Sources are automatically retrieved and verified. Click links to view full articles.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

