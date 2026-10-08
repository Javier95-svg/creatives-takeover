import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  addComment, createPost, deleteComment, deletePost, getPost, launchpadErrorMessage, listComments,
  listFollowedTopics, listPosts, listTopicStats, setSaved, setTopicFollow, setUpvote, updatePost,
  type LaunchpadPost, type NewPost, type PostFilters,
} from '@/lib/launchpad';
import {
  enterLaunch, getSupporterStatus, isMissingRoundsError, listEnteredProjectIds, listRound, toggleLaunchVote, withdrawLaunch,
  type LaunchSort, type RoundLaunch,
} from '@/lib/launchpadLaunches';
import { trackRetentionEvent } from '@/lib/retentionSystem';

const POSTS = 'launchpad-posts';
const POST = 'launchpad-post';

export function useLaunchpadPosts(filters: PostFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [POSTS, user?.id, filters],
    queryFn: () => listPosts(filters, user?.id),
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  });
}

export function useLaunchpadPost(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [POST, user?.id, id],
    queryFn: () => getPost(id!, user?.id),
    enabled: Boolean(user && id),
  });
}

/** Applies a change to a post wherever it is cached: feeds and the detail page. */
function usePatchPost() {
  const queryClient = useQueryClient();
  return (postId: string, patch: (post: LaunchpadPost) => LaunchpadPost) => {
    queryClient.setQueriesData<LaunchpadPost[]>({ queryKey: [POSTS] }, (rows) => rows?.map((row) => row.id === postId ? patch(row) : row));
    queryClient.setQueriesData<LaunchpadPost | null>({ queryKey: [POST] }, (row) => row && row.id === postId ? patch(row) : row);
  };
}

export function useUpvote() {
  const { user } = useAuth();
  const patch = usePatchPost();
  return useMutation({
    mutationFn: ({ postId, on }: { postId: string; on: boolean }) => setUpvote(user!.id, postId, on),
    onMutate: ({ postId, on }) => patch(postId, (post) => ({ ...post, voted: on, upvotes: Math.max(0, post.upvotes + (on ? 1 : -1)) })),
    onError: (error, { postId, on }) => {
      patch(postId, (post) => ({ ...post, voted: !on, upvotes: Math.max(0, post.upvotes + (on ? -1 : 1)) }));
      toast.error(launchpadErrorMessage(error, 'Could not save your upvote.'));
    },
    onSuccess: (_data, { on }) => { if (on) void trackRetentionEvent('launchpad_post_upvoted', { user_id: user?.id }); },
  });
}

export function useSavePost() {
  const { user } = useAuth();
  const patch = usePatchPost();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, on }: { postId: string; on: boolean }) => setSaved(user!.id, postId, on),
    onMutate: ({ postId, on }) => patch(postId, (post) => ({ ...post, saved: on })),
    onError: (error, { postId, on }) => {
      patch(postId, (post) => ({ ...post, saved: !on }));
      toast.error(launchpadErrorMessage(error, 'Could not update your saved posts.'));
    },
    onSuccess: (_data, { on }) => { toast.success(on ? 'Saved.' : 'Removed from saved.'); void queryClient.invalidateQueries({ queryKey: [POSTS, user?.id] }); },
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPost) => createPost(user!.id, input),
    onSuccess: (_id, input) => {
      void queryClient.invalidateQueries({ queryKey: [POSTS] });
      void queryClient.invalidateQueries({ queryKey: ['launchpad-topic-stats'] });
      void trackRetentionEvent('launchpad_post_created', { user_id: user?.id, kind: input.kind, topic: input.topic, has_project: Boolean(input.projectId) });
    },
    onError: (error) => toast.error(launchpadErrorMessage(error, 'Could not publish your post. Please try again.')),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NewPost }) => updatePost(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [POSTS] });
      void queryClient.invalidateQueries({ queryKey: [POST] });
      toast.success('Post updated.');
    },
    onError: (error) => toast.error(launchpadErrorMessage(error, 'Could not update your post.')),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [POSTS] });
      void queryClient.invalidateQueries({ queryKey: ['launchpad-topic-stats'] });
      toast.success('Post deleted.');
    },
    onError: () => toast.error('Could not delete the post.'),
  });
}

export function useLaunchpadComments(postId: string | undefined) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['launchpad-comments', postId], queryFn: () => listComments(postId!), enabled: Boolean(user && postId) });
}

export function useCommentMutations(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patch = usePatchPost();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['launchpad-comments', postId] });
  const add = useMutation({
    mutationFn: (content: string) => addComment(user!.id, postId, content),
    onSuccess: () => {
      refresh();
      patch(postId, (post) => ({ ...post, comment_count: post.comment_count + 1 }));
      void trackRetentionEvent('launchpad_comment_created', { user_id: user?.id });
    },
    onError: (error) => toast.error(launchpadErrorMessage(error, 'Could not post your reply.')),
  });
  const remove = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => { refresh(); patch(postId, (post) => ({ ...post, comment_count: Math.max(0, post.comment_count - 1) })); },
    onError: () => toast.error('Could not delete the reply.'),
  });
  return { add, remove };
}

export function useTopicStats() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['launchpad-topic-stats'], queryFn: listTopicStats, enabled: Boolean(user), staleTime: 60_000 });
}

export function useFollowedTopics() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['launchpad-followed-topics', user?.id], queryFn: () => listFollowedTopics(user!.id), enabled: Boolean(user) });
}

export function useFollowTopic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topic, on }: { topic: string; on: boolean }) => setTopicFollow(user!.id, topic, on),
    onMutate: ({ topic, on }) => {
      queryClient.setQueryData<Set<string>>(['launchpad-followed-topics', user?.id], (current) => {
        const next = new Set(current ?? []);
        if (on) next.add(topic); else next.delete(topic);
        return next;
      });
    },
    onError: () => {
      toast.error('Could not update the topics you follow.');
      void queryClient.invalidateQueries({ queryKey: ['launchpad-followed-topics', user?.id] });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['launchpad-topic-stats'] }),
  });
}

/** The viewer's own quiz stage, for the "posts at my stage" filter. */
export function useMyStage() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['launchpad-my-stage', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.schema('public').from('profiles').select('assigned_stage').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      const stage = (data as { assigned_stage?: number | null } | null)?.assigned_stage;
      return typeof stage === 'number' ? stage : null;
    },
  });
}

const ROUND = 'launchpad-round';

export function useLaunchRound(week: string | null, sort: LaunchSort, limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [ROUND, user?.id, week, sort, limit],
    queryFn: () => listRound(week, sort, limit),
    enabled: Boolean(user),
    // A missing function is a deploy-order state, not a transient failure.
    retry: (count, error) => !isMissingRoundsError(error) && count < 2,
    placeholderData: (previous) => previous,
  });
}

export function useSupporterStatus() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['launchpad-supporter', user?.id], queryFn: getSupporterStatus, enabled: Boolean(user), retry: false });
}

export function useToggleLaunchVote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patch = (launchId: string, change: (row: RoundLaunch) => RoundLaunch) =>
    queryClient.setQueriesData<RoundLaunch[]>({ queryKey: [ROUND] }, (rows) => rows?.map((row) => row.id === launchId ? change(row) : row));
  return useMutation({
    mutationFn: ({ launchId, on }: { launchId: string; on: boolean }) => toggleLaunchVote(launchId, on),
    onMutate: ({ launchId, on }) => patch(launchId, (row) => ({ ...row, voted: on, upvotes: Math.max(0, row.upvotes + (on ? 1 : -1)) })),
    onError: (error, { launchId, on }) => {
      patch(launchId, (row) => ({ ...row, voted: !on, upvotes: Math.max(0, row.upvotes + (on ? -1 : 1)) }));
      toast.error(launchpadErrorMessage(error, 'Could not save your upvote.'));
    },
    onSuccess: (result, { launchId }) => {
      patch(launchId, (row) => ({ ...row, upvotes: result.upvotes, voted: result.voted }));
      if (result.credited > 0) {
        toast.success(`+${result.credited} credit for supporting a launch.`);
        void queryClient.invalidateQueries({ queryKey: ['launchpad-supporter', user?.id] });
      }
      if (result.voted) void trackRetentionEvent('launchpad_launch_upvoted', { user_id: user?.id, credited: result.credited });
    },
    // Ranks depend on every vote, so settle with the server's order.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: [ROUND] }),
  });
}

export function useEnteredLaunchProjects() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['launchpad-entered', user?.id], queryFn: () => listEnteredProjectIds(user!.id), enabled: Boolean(user), retry: false });
}

export function useEnterLaunch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (demoProjectId: string) => enterLaunch(demoProjectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ROUND] });
      void queryClient.invalidateQueries({ queryKey: ['launchpad-entered', user?.id] });
      toast.success('Your launch is in this week\'s round.');
      void trackRetentionEvent('launchpad_launch_entered', { user_id: user?.id });
    },
    onError: (error) => toast.error(launchpadErrorMessage(error, 'Could not enter the launch.')),
  });
}

export function useWithdrawLaunch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (launchId: string) => withdrawLaunch(launchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ROUND] });
      void queryClient.invalidateQueries({ queryKey: ['launchpad-entered', user?.id] });
      toast.success('Launch withdrawn from the round.');
    },
    onError: () => toast.error('Could not withdraw the launch.'),
  });
}

/** The viewer's name and photo, for the composer prompt. */
export function useMyProfileSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['launchpad-me', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.schema('public').from('profiles').select('full_name, username, avatar_url').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as { full_name: string | null; username: string | null; avatar_url: string | null } | null;
    },
  });
}
