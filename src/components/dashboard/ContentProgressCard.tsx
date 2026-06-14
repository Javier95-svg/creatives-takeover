import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Bookmark, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunityPulse } from '@/hooks/useCommunityPulse';

export function ContentProgressCard() {
  const { user } = useAuth();
  const { todaysPulse } = useCommunityPulse();
  const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) return;
      const { count, error } = await supabase
        .from('user_bookmarks' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (!error && count !== null) setBookmarkCount(count);
    };
    void fetchBookmarks();
  }, [user]);

  const trendingTopics: string[] = (todaysPulse as any)?.trending_topics?.slice(0, 3) ?? [];

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-accent-teal" />
          Founder Library
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Saved articles */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-accent-teal" />
            <span className="text-sm font-medium">Bookmarked</span>
          </div>
          <span className="text-lg font-bold">
            {bookmarkCount === null ? '…' : bookmarkCount}
          </span>
        </div>

        {/* Trending topics */}
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Trending today
          </p>
          {trendingTopics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {trendingTopics.map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="text-xs border-accent-teal/30 text-accent-teal"
                >
                  {topic}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No trending topics yet today.</p>
          )}
        </div>

        {/* CTA */}
        <Link to="/newspaper">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1">
            Read Today's Newspaper <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
