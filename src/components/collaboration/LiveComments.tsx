import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LiveComment } from '@/hooks/useCollaboration';
import { MessageCircle, Check, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveCommentsProps {
  comments: LiveComment[];
  onAddComment: (content: string, contextPath?: string) => void;
  onResolveComment: (commentId: string) => void;
  currentUserId?: string;
}

export const LiveComments: React.FC<LiveCommentsProps> = ({
  comments,
  onAddComment,
  onResolveComment,
  currentUserId,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const unresolvedComments = comments.filter(comment => !comment.is_resolved);
  const resolvedComments = comments.filter(comment => comment.is_resolved);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Live Comments
          {unresolvedComments.length > 0 && (
            <Badge variant="secondary">
              {unresolvedComments.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[80px] resize-none"
          />
          <Button 
            type="submit" 
            size="sm" 
            className="w-full"
            disabled={!newComment.trim() || isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </form>

        <Separator />

        {/* Active Comments */}
        {unresolvedComments.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Active Comments
            </h4>
            {unresolvedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onResolve={onResolveComment}
                currentUserId={currentUserId}
                showResolveButton
              />
            ))}
          </div>
        )}

        {/* Resolved Comments */}
        {resolvedComments.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <h4 className="font-medium text-sm text-muted-foreground">
              Resolved Comments
            </h4>
            {resolvedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onResolve={onResolveComment}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}

        {comments.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Start a conversation with your team</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface CommentItemProps {
  comment: LiveComment;
  onResolve: (commentId: string) => void;
  currentUserId?: string;
  showResolveButton?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onResolve,
  currentUserId,
  showResolveButton = false,
}) => {
  return (
    <div className={`p-3 rounded-lg border ${
      comment.is_resolved 
        ? 'bg-muted/50 border-muted' 
        : 'bg-background border-border'
    }`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {comment.profiles?.full_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {comment.profiles?.full_name || 'Anonymous User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
            
            {comment.is_resolved && (
              <Badge variant="outline" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>
          
          <p className="text-sm leading-relaxed">
            {comment.content}
          </p>
          
          {showResolveButton && !comment.is_resolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResolve(comment.id)}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark as Resolved
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};