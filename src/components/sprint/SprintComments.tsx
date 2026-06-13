import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Zap, 
  Star, 
  MessageCircle,
  Clock 
} from 'lucide-react';
import { SprintComment, useSprints } from '@/hooks/useSprints';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface SprintCommentsProps {
  sprintId: string;
  comments: SprintComment[];
  onCommentAdded: () => void;
}

const SprintComments: React.FC<SprintCommentsProps> = ({ 
  sprintId, 
  comments, 
  onCommentAdded 
}) => {
  const { user } = useAuth();
  const { addSprintComment } = useSprints();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (commentType: SprintComment['comment_type'] = 'general') => {
    if (!newComment.trim() || !user) return;

    try {
      setIsSubmitting(true);
      await addSprintComment(sprintId, newComment, commentType);
      setNewComment('');
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCommentTypeIcon = (type: SprintComment['comment_type']) => {
    switch (type) {
      case 'nudge': return Zap;
      case 'celebration': return Star;
      case 'feedback': return MessageCircle;
      default: return MessageSquare;
    }
  };

  const getCommentTypeColor = (type: SprintComment['comment_type']) => {
    switch (type) {
      case 'nudge': return 'text-warning bg-warning-subtle';
      case 'celebration': return 'text-success bg-success-subtle';
      case 'feedback': return 'text-info bg-info-subtle';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Community Comments & Accountability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment Section */}
        {user && (
          <div className="space-y-3">
            <Textarea
              placeholder="Share an update, ask for feedback, or encourage others..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSubmitComment('nudge')}
                disabled={!newComment.trim() || isSubmitting}
              >
                <Zap className="w-4 h-4 mr-1" />
                Send Nudge
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSubmitComment('celebration')}
                disabled={!newComment.trim() || isSubmitting}
              >
                <Star className="w-4 h-4 mr-1" />
                Celebrate
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmitComment('general')}
                disabled={!newComment.trim() || isSubmitting}
              >
                <Send className="w-4 h-4 mr-1" />
                Comment
              </Button>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet. Be the first to share an update!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const CommentIcon = getCommentTypeIcon(comment.comment_type);
              
              return (
                <div key={comment.id} className="flex gap-3 p-4 rounded-lg border bg-card">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.author_avatar} />
                    <AvatarFallback>
                      {comment.author_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-2 py-0.5 ${getCommentTypeColor(comment.comment_type)}`}
                      >
                        <CommentIcon className="w-3 h-3 mr-1" />
                        {comment.comment_type}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    
                    {comment.comment_type === 'nudge' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          Thanks
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Engagement Tips */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Community Accountability Tips:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Share daily updates on your progress</li>
            <li>• Send nudges to encourage others when they're stuck</li>
            <li>• Celebrate wins, no matter how small</li>
            <li>• Ask for specific feedback on your work</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SprintComments;