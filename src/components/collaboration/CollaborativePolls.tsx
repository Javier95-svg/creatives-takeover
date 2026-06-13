import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CollaborationPoll, PollVote } from '@/hooks/useInteractiveCollaboration';
import { 
  BarChart3, 
  Plus, 
  Vote, 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  Star,
  Send
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CollaborativePollsProps {
  polls: CollaborationPoll[];
  pollVotes: PollVote[];
  currentUserId?: string;
  onCreatePoll: (title: string, description: string, pollType: CollaborationPoll['poll_type'], options: string[], anonymous?: boolean, allowComments?: boolean, closesAt?: string) => void;
  onVote: (pollId: string, selectedOptions: string[], ratingValue?: number, textResponse?: string, comment?: string) => void;
}

export const CollaborativePolls: React.FC<CollaborativePollsProps> = ({
  polls,
  pollVotes,
  currentUserId,
  onCreatePoll,
  onVote,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    type: 'single_choice' as CollaborationPoll['poll_type'],
    options: ['', ''],
    anonymous: false,
    allowComments: true,
  });

  const handleCreatePoll = () => {
    if (!newPoll.title.trim()) return;

    const validOptions = newPoll.options.filter(opt => opt.trim());
    if (validOptions.length < 2 && newPoll.type !== 'open_text') return;

    onCreatePoll(
      newPoll.title,
      newPoll.description,
      newPoll.type,
      validOptions,
      newPoll.anonymous,
      newPoll.allowComments
    );

    // Reset form
    setNewPoll({
      title: '',
      description: '',
      type: 'single_choice',
      options: ['', ''],
      anonymous: false,
      allowComments: true,
    });
    setShowCreateForm(false);
  };

  const addOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const getPollResults = (poll: CollaborationPoll) => {
    const votes = pollVotes.filter(vote => vote.poll_id === poll.id);
    const totalVotes = votes.length;

    if (poll.poll_type === 'single_choice' || poll.poll_type === 'multiple_choice') {
      const optionCounts = poll.options.reduce((acc, option) => {
        acc[option] = votes.filter(vote => vote.selected_options.includes(option)).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalVotes,
        optionCounts,
        votes,
      };
    } else if (poll.poll_type === 'rating') {
      const ratings = votes.map(vote => vote.rating_value || 0);
      const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      
      return {
        totalVotes,
        averageRating,
        votes,
      };
    } else {
      return {
        totalVotes,
        textResponses: votes.map(vote => vote.text_response).filter(Boolean),
        votes,
      };
    }
  };

  const hasUserVoted = (pollId: string) => {
    return pollVotes.some(vote => vote.poll_id === pollId && vote.user_id === currentUserId);
  };

  const getUserVote = (pollId: string) => {
    return pollVotes.find(vote => vote.poll_id === pollId && vote.user_id === currentUserId);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Polls & Voting
            <Badge variant="secondary">
              {polls.length} polls
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Poll
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 overflow-auto">
        {/* Create Poll Form */}
        {showCreateForm && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Create New Poll</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Poll title..."
                value={newPoll.title}
                onChange={(e) => setNewPoll(prev => ({ ...prev, title: e.target.value }))}
              />
              
              <Textarea
                placeholder="Description (optional)..."
                value={newPoll.description}
                onChange={(e) => setNewPoll(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />

              <Select value={newPoll.type} onValueChange={(value: CollaborationPoll['poll_type']) => setNewPoll(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_choice">Single Choice</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="rating">Rating (1-5)</SelectItem>
                  <SelectItem value="open_text">Open Text</SelectItem>
                </SelectContent>
              </Select>

              {(newPoll.type === 'single_choice' || newPoll.type === 'multiple_choice') && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                      {newPoll.options.length > 2 && (
                        <Button variant="ghost" size="sm" onClick={() => removeOption(index)}>
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={newPoll.anonymous}
                    onCheckedChange={(checked) => setNewPoll(prev => ({ ...prev, anonymous: !!checked }))}
                  />
                  <Label htmlFor="anonymous">Anonymous voting</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="comments"
                    checked={newPoll.allowComments}
                    onCheckedChange={(checked) => setNewPoll(prev => ({ ...prev, allowComments: !!checked }))}
                  />
                  <Label htmlFor="comments">Allow comments</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreatePoll}>
                  Create Poll
                </Button>
                <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Polls List */}
        {polls.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No polls yet</p>
            <p className="text-sm">Create a poll to gather team feedback</p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                results={getPollResults(poll)}
                hasUserVoted={hasUserVoted(poll.id)}
                userVote={getUserVote(poll.id)}
                currentUserId={currentUserId}
                onVote={onVote}
                showVoters={!poll.anonymous}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface PollCardProps {
  poll: CollaborationPoll;
  results: any;
  hasUserVoted: boolean;
  userVote?: PollVote;
  currentUserId?: string;
  onVote: (pollId: string, selectedOptions: string[], ratingValue?: number, textResponse?: string, comment?: string) => void;
  showVoters: boolean;
}

const PollCard: React.FC<PollCardProps> = ({
  poll,
  results,
  hasUserVoted,
  userVote,
  currentUserId,
  onVote,
  showVoters,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [ratingValue, setRatingValue] = useState(0);
  const [textResponse, setTextResponse] = useState('');
  const [comment, setComment] = useState('');

  const handleVote = () => {
    onVote(poll.id, selectedOptions, ratingValue || undefined, textResponse || undefined, comment || undefined);
    
    // Reset form
    setSelectedOptions([]);
    setRatingValue(0);
    setTextResponse('');
    setComment('');
  };

  const getStatusBadge = () => {
    if (poll.status === 'closed') {
      return <Badge variant="destructive">Closed</Badge>;
    }
    if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="secondary">Active</Badge>;
  };

  const canVote = poll.status === 'active' && (!poll.closes_at || new Date(poll.closes_at) > new Date());

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{poll.title}</h3>
              {getStatusBadge()}
              {hasUserVoted && <CheckCircle2 className="h-4 w-4 text-success" />}
            </div>
            {poll.description && (
              <p className="text-sm text-muted-foreground">{poll.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={poll.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {poll.profiles?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {poll.profiles?.full_name || 'Anonymous'}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {results.totalVotes} votes
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting Section */}
        {canVote && !hasUserVoted && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            {poll.poll_type === 'single_choice' && (
              <RadioGroup value={selectedOptions[0]} onValueChange={(value) => setSelectedOptions([value])}>
                {poll.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {poll.poll_type === 'multiple_choice' && (
              <div className="space-y-2">
                {poll.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={selectedOptions.includes(option)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOptions(prev => [...prev, option]);
                        } else {
                          setSelectedOptions(prev => prev.filter(opt => opt !== option));
                        }
                      }}
                    />
                    <Label htmlFor={option}>{option}</Label>
                  </div>
                ))}
              </div>
            )}

            {poll.poll_type === 'rating' && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Rating:</span>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setRatingValue(rating)}
                    className={`p-1 ${ratingValue >= rating ? 'text-warning' : 'text-muted-foreground'}`}
                  >
                    <Star className="h-5 w-5 fill-current" />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground">({ratingValue}/5)</span>
              </div>
            )}

            {poll.poll_type === 'open_text' && (
              <Textarea
                placeholder="Your response..."
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                rows={3}
              />
            )}

            {poll.allow_comments && (
              <Textarea
                placeholder="Add a comment (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            )}

            <Button 
              onClick={handleVote}
              disabled={
                (poll.poll_type === 'single_choice' && selectedOptions.length === 0) ||
                (poll.poll_type === 'multiple_choice' && selectedOptions.length === 0) ||
                (poll.poll_type === 'rating' && ratingValue === 0) ||
                (poll.poll_type === 'open_text' && !textResponse.trim())
              }
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Vote
            </Button>
          </div>
        )}

        {/* Results Section */}
        {(hasUserVoted || poll.status === 'closed') && (
          <div className="space-y-3">
            <Separator />
            <h4 className="font-medium text-sm">Results</h4>

            {(poll.poll_type === 'single_choice' || poll.poll_type === 'multiple_choice') && (
              <div className="space-y-2">
                {poll.options.map((option) => {
                  const count = results.optionCounts[option] || 0;
                  const percentage = results.totalVotes > 0 ? (count / results.totalVotes) * 100 : 0;
                  
                  return (
                    <div key={option} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{option}</span>
                        <span>{count} votes ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}

            {poll.poll_type === 'rating' && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Average rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Star
                      key={rating}
                      className={`h-4 w-4 ${
                        rating <= results.averageRating ? 'text-warning fill-current' : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground">
                    ({results.averageRating.toFixed(1)}/5)
                  </span>
                </div>
              </div>
            )}

            {poll.poll_type === 'open_text' && (
              <div className="space-y-2">
                {results.textResponses.map((response: string, index: number) => (
                  <div key={index} className="p-2 bg-muted/50 rounded text-sm">
                    {response}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        {poll.allow_comments && results.votes.some((vote: PollVote) => vote.comment) && (
          <div className="space-y-2">
            <Separator />
            <h4 className="font-medium text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </h4>
            {results.votes
              .filter((vote: PollVote) => vote.comment)
              .map((vote: PollVote) => (
                <div key={vote.id} className="flex gap-2 p-2 bg-muted/50 rounded">
                  {showVoters && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={vote.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {vote.profiles?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    {showVoters && (
                      <div className="text-xs text-muted-foreground">
                        {vote.profiles?.full_name || 'Anonymous'}
                      </div>
                    )}
                    <div className="text-sm">{vote.comment}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};