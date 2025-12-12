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
          className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>View Sources ({sources.length})</span>
          </span>
          <span className="text-xs">
            {webSources.length > 0 && `🌐 ${webSources.length}`}
            {webSources.length > 0 && knowledgeSources.length > 0 && ' • '}
            {knowledgeSources.length > 0 && `📖 ${knowledgeSources.length}`}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-primary/20">
          <CardContent className="p-4 space-y-3">
            {webSources.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Globe className="h-3 w-3" />
                  Web Sources
                </div>
                {webSources.map((source, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            [{index + 1}]
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs px-1.5 py-0 h-5 bg-blue-500/10 text-blue-700 border-blue-500/20"
                          >
                            Web
                          </Badge>
                          {source.relevance && (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-1.5 py-0 h-5"
                            >
                              {Math.round((source.relevance || source.similarity || 0) * 100)}% match
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-medium mb-1 line-clamp-2">
                          {source.title}
                        </h4>
                        {(source.snippet || source.excerpt) && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {source.snippet || source.excerpt}
                          </p>
                        )}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 w-fit"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{source.url}</span>
                          </a>
                        )}
                        {source.publishedDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Published: {new Date(source.publishedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {source.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
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
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            [{webSources.length + index + 1}]
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-xs px-1.5 py-0 h-5 bg-purple-500/10 text-purple-700 border-purple-500/20"
                          >
                            Knowledge
                          </Badge>
                          {source.relevance && (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-1.5 py-0 h-5"
                            >
                              {Math.round((source.relevance || source.similarity || 0) * 100)}% match
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-medium mb-1">
                          {source.title}
                        </h4>
                        {(source.snippet || source.excerpt) && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {source.snippet || source.excerpt}
                          </p>
                        )}
                        {source.source && !source.url && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Source: {source.source}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 p-2 bg-primary/5 rounded text-xs text-muted-foreground border border-primary/10">
              💡 Sources are automatically retrieved and verified. Click links to view full articles.
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

