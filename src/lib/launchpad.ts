import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Launchpad data access. Posts live in community_posts with comments in
 * post_comments, votes in user_votes and saves in user_bookmarks. Counters,
 * stage, project name and moderation are server-owned (launchpad_guard_post),
 * so nothing here writes them.
 */

// The Launchpad columns are newer than the generated types.
const db = supabase as unknown as SupabaseClient;

export type PostKind = 'discussion' | 'feedback' | 'milestone' | 'idea';

export const POST_KINDS: ReadonlyArray<{ value: PostKind; label: string; hint: string }> = [
  { value: 'feedback', label: 'Ask for feedback', hint: 'Get honest reactions to a page, pitch, price or feature.' },
  { value: 'milestone', label: 'Milestone', hint: 'A launch, first customer, revenue or another win.' },
  { value: 'idea', label: 'Idea', hint: 'Something you are thinking of building. Ask if it is worth it.' },
  { value: 'discussion', label: 'Discussion', hint: 'A question or topic for other founders.' },
];

/** Legacy rows predate the four kinds; they read as discussions. */
export function postKind(value: string | null | undefined): PostKind {
  return value === 'feedback' || value === 'milestone' || value === 'idea' ? value : 'discussion';
}

export function postKindLabel(value: string | null | undefined) {
  return POST_KINDS.find((kind) => kind.value === postKind(value))?.label ?? 'Discussion';
}

export type PostSort = 'best' | 'new' | 'top';

export const TITLE_MAX = 140;
export const BODY_MAX = 5000;
export const COMMENT_MAX = 2000;

export interface LaunchpadAuthor {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface LaunchpadPost {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  post_type: string | null;
  topic: string | null;
  project_name: string | null;
  stage: number | null;
  upvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string | null;
  author: LaunchpadAuthor | null;
  voted: boolean;
  saved: boolean;
}

export interface LaunchpadComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: LaunchpadAuthor | null;
}

const POST_COLUMNS = 'id, user_id, title, content, post_type, topic, project_name, stage, upvotes, comment_count, created_at, updated_at';

async function authorsById(ids: string[]): Promise<Map<string, LaunchpadAuthor>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await db.from('public_profiles').select('id, username, full_name, avatar_url').in('id', unique);
  if (error) throw error;
  return new Map(((data ?? []) as LaunchpadAuthor[]).map((row) => [row.id, row]));
}

async function viewerMarks(viewerId: string | undefined, postIds: string[]) {
  if (!viewerId || postIds.length === 0) return { voted: new Set<string>(), saved: new Set<string>() };
  const [votes, saves] = await Promise.all([
    db.from('user_votes').select('post_id').eq('user_id', viewerId).eq('vote_type', 'up').in('post_id', postIds),
    db.from('user_bookmarks').select('post_id').eq('user_id', viewerId).in('post_id', postIds),
  ]);
  if (votes.error) throw votes.error;
  if (saves.error) throw saves.error;
  return {
    voted: new Set<string>((votes.data ?? []).map((row: { post_id: string }) => row.post_id)),
    saved: new Set<string>((saves.data ?? []).map((row: { post_id: string }) => row.post_id)),
  };
}

async function hydrate(rows: Omit<LaunchpadPost, 'author' | 'voted' | 'saved'>[], viewerId?: string): Promise<LaunchpadPost[]> {
  const [authors, marks] = await Promise.all([
    authorsById(rows.map((row) => row.user_id)),
    viewerMarks(viewerId, rows.map((row) => row.id)),
  ]);
  return rows.map((row) => ({
    ...row,
    upvotes: row.upvotes ?? 0,
    comment_count: row.comment_count ?? 0,
    author: authors.get(row.user_id) ?? null,
    voted: marks.voted.has(row.id),
    saved: marks.saved.has(row.id),
  }));
}

/**
 * "Best" favours recent posts that people engaged with. Volume is small, so it
 * is ranked here over the latest posts rather than in SQL.
 */
export function bestScore(post: Pick<LaunchpadPost, 'upvotes' | 'comment_count' | 'created_at'>, now = Date.now()) {
  const hours = Math.max(0, (now - new Date(post.created_at).getTime()) / 3_600_000);
  return (post.upvotes + 2 * post.comment_count + 1) / Math.pow(hours + 2, 1.5);
}

export interface PostFilters {
  sort: PostSort;
  topic?: string | null;
  kind?: PostKind | null;
  stage?: number | null;
  savedOnly?: boolean;
  authorId?: string | null;
  limit: number;
}

export async function listPosts(filters: PostFilters, viewerId?: string): Promise<LaunchpadPost[]> {
  let savedIds: string[] | null = null;
  if (filters.savedOnly) {
    if (!viewerId) return [];
    const { data, error } = await db.from('user_bookmarks').select('post_id').eq('user_id', viewerId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    const ids: string[] = (data ?? []).map((row: { post_id: string }) => row.post_id);
    if (ids.length === 0) return [];
    savedIds = ids;
  }

  // Best ranks client-side, so it reads a wider window than it shows.
  const fetchSize = filters.sort === 'best' ? Math.max(filters.limit, 100) : filters.limit;
  let query = db.from('community_posts').select(POST_COLUMNS).eq('is_public', true).is('hidden_at', null);
  if (filters.topic) query = query.eq('topic', filters.topic);
  if (filters.kind) query = filters.kind === 'discussion'
    ? query.or('post_type.is.null,post_type.not.in.(feedback,milestone,idea)')
    : query.eq('post_type', filters.kind);
  if (filters.stage) query = query.eq('stage', filters.stage);
  if (filters.authorId) query = query.eq('user_id', filters.authorId);
  if (savedIds) query = query.in('id', savedIds);
  query = filters.sort === 'top'
    ? query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false });

  const { data, error } = await query.limit(fetchSize);
  if (error) throw error;
  let rows = (data ?? []) as Omit<LaunchpadPost, 'author' | 'voted' | 'saved'>[];
  if (filters.sort === 'best') {
    const now = Date.now();
    rows = [...rows].sort((a, b) => bestScore(b as LaunchpadPost, now) - bestScore(a as LaunchpadPost, now)).slice(0, filters.limit);
  }
  return hydrate(rows, viewerId);
}

export async function getPost(id: string, viewerId?: string): Promise<LaunchpadPost | null> {
  const { data, error } = await db.from('community_posts').select(POST_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [post] = await hydrate([data], viewerId);
  return post;
}

export interface NewPost {
  title: string;
  content: string;
  kind: PostKind;
  topic: string;
  /** null detaches; undefined (edits only) keeps whatever project is attached. */
  projectId?: string | null;
}

export async function createPost(userId: string, input: NewPost): Promise<string> {
  const { data, error } = await db.from('community_posts').insert({
    user_id: userId,
    title: input.title.trim(),
    content: input.content.trim(),
    post_type: input.kind,
    topic: input.topic,
    project_id: input.projectId ?? null,
    feedback_requested: input.kind === 'feedback',
    is_public: true,
    source_type: 'manual',
    content_type: 'text',
    tags: [],
  }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function updatePost(id: string, input: NewPost) {
  const { error } = await db.from('community_posts').update({
    title: input.title.trim(),
    content: input.content.trim(),
    post_type: input.kind,
    topic: input.topic,
    ...(input.projectId === undefined ? {} : { project_id: input.projectId }),
    feedback_requested: input.kind === 'feedback',
  }).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id: string) {
  const { error } = await db.from('community_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function setUpvote(userId: string, postId: string, on: boolean) {
  const { error } = on
    ? await db.from('user_votes').upsert({ user_id: userId, post_id: postId, vote_type: 'up' }, { onConflict: 'user_id,post_id' })
    : await db.from('user_votes').delete().eq('user_id', userId).eq('post_id', postId);
  if (error) throw error;
}

export async function setSaved(userId: string, postId: string, on: boolean) {
  const { error } = on
    ? await db.from('user_bookmarks').upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' })
    : await db.from('user_bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
  if (error) throw error;
}

export async function listComments(postId: string): Promise<LaunchpadComment[]> {
  const { data, error } = await db.from('post_comments').select('id, post_id, user_id, content, created_at')
    .eq('post_id', postId).is('hidden_at', null).order('created_at', { ascending: true }).limit(500);
  if (error) throw error;
  const rows = (data ?? []) as Omit<LaunchpadComment, 'author'>[];
  const authors = await authorsById(rows.map((row) => row.user_id));
  return rows.map((row) => ({ ...row, author: authors.get(row.user_id) ?? null }));
}

export async function addComment(userId: string, postId: string, content: string) {
  const { error } = await db.from('post_comments').insert({ user_id: userId, post_id: postId, content: content.trim() });
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await db.from('post_comments').delete().eq('id', id);
  if (error) throw error;
}

export type ReportCategory = 'spam' | 'harassment' | 'misleading_information' | 'inappropriate_content' | 'other';

export const REPORT_CATEGORIES: ReadonlyArray<{ value: ReportCategory; label: string }> = [
  { value: 'spam', label: 'Spam or self-promotion' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'misleading_information', label: 'Misleading' },
  { value: 'inappropriate_content', label: 'Inappropriate' },
  { value: 'other', label: 'Something else' },
];

export async function reportContent(reporterId: string, target: { postId?: string; commentId?: string }, category: ReportCategory, explanation: string) {
  const { error } = await db.from('community_reports').insert({
    reporter_id: reporterId,
    post_id: target.postId ?? null,
    comment_id: target.commentId ?? null,
    category,
    explanation: explanation.trim() || null,
  });
  // Reporting twice is not an error from the reporter's point of view.
  if (error && error.code !== '23505') throw error;
}

export interface TopicStats {
  slug: string;
  post_count: number;
  follower_count: number;
  last_post_at: string | null;
}

export async function listTopicStats(): Promise<Map<string, TopicStats>> {
  const { data, error } = await db.rpc('launchpad_topic_stats');
  if (error) throw error;
  return new Map(((data ?? []) as TopicStats[]).map((row) => [row.slug, { ...row, post_count: Number(row.post_count), follower_count: Number(row.follower_count) }]));
}

export async function listFollowedTopics(userId: string): Promise<Set<string>> {
  const { data, error } = await db.from('user_topic_preferences').select('topic').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row: { topic: string }) => row.topic));
}

export async function setTopicFollow(userId: string, topic: string, on: boolean) {
  const { error } = on
    ? await db.from('user_topic_preferences').upsert({ user_id: userId, topic }, { onConflict: 'user_id,topic' })
    : await db.from('user_topic_preferences').delete().eq('user_id', userId).eq('topic', topic);
  if (error) throw error;
}

export interface DirectoryProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  positioning_line: string | null;
  startup_name: string | null;
  startup_tagline: string | null;
  startup_industry: string[] | null;
  location: string | null;
  user_type: string | null;
  stage: number | null;
  followers_count: number;
  post_count: number;
}

export interface DirectoryFilters {
  search: string;
  userType: string | null;
  stage: number | null;
  sector: string | null;
  limit: number;
}

export async function listDirectory(filters: DirectoryFilters): Promise<DirectoryProfile[]> {
  const { data, error } = await db.rpc('launchpad_profiles', {
    p_search: filters.search.trim() || null,
    p_user_type: filters.userType,
    p_stage: filters.stage,
    p_sector: filters.sector,
    p_limit: filters.limit,
    p_offset: 0,
  });
  if (error) throw error;
  return ((data ?? []) as DirectoryProfile[]).map((row) => ({ ...row, post_count: Number(row.post_count) }));
}

/** Supabase errors raised by the guard triggers carry a sentence meant for people. */
export function launchpadErrorMessage(error: unknown, fallback: string) {
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : '';
  return /^(You |That |This launch|Publish the launch|Voting for this round|Sign in)/.test(message) ? message : fallback;
}

export function authorName(author: LaunchpadAuthor | null) {
  return author?.full_name || author?.username || 'A founder';
}
