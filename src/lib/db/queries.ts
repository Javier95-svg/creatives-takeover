import { safe } from '@/integrations/supabase/safe';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logInfo, logError } from '@/lib/logger';

type Tables = Database['public']['Tables'];

/**
 * Centralized database queries with built-in retry logic and error handling
 * All queries use the safe.ts wrapper for resilience
 */
export const queries = {
  // ============= Chat Sessions =============
  async getChatSessions(userId: string) {
    logInfo('Fetching chat sessions', { userId });
    return await safe.select(async () =>
      await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    );
  },

  async createChatSession(userId: string, title?: string) {
    logInfo('Creating chat session', { userId, title });
    return await safe.insert(async () =>
      await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: title || 'New Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
    );
  },

  async updateChatSession(sessionId: string, updates: Partial<Tables['chat_sessions']['Update']>) {
    logInfo('Updating chat session', { sessionId, updates });
    return await safe.update(async () =>
      await supabase
        .from('chat_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single()
    );
  },

  async deleteChatSession(sessionId: string) {
    logInfo('Deleting chat session', { sessionId });
    return await safe.delete(async () =>
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
    );
  },

  // ============= Accountability Partnerships =============
  async getPartnerships(userId: string) {
    logInfo('Fetching partnerships', { userId });
    return await safe.select(async () =>
      await supabase
        .from('accountability_partnerships')
        .select(`
          *,
          partner_profile:profiles!partner_id(
            id, full_name, avatar_url, bio
          ),
          requester_profile:profiles!requester_id(
            id, full_name, avatar_url, bio
          ),
          sprint:sprints(id, title, description, start_date, end_date)
        `)
        .or(`requester_id.eq.${userId},partner_id.eq.${userId}`)
        .order('created_at', { ascending: false })
    );
  },

  async sendPartnershipRequest(requesterId: string, partnerId: string, sprintId?: string) {
    logInfo('Sending partnership request', { requesterId, partnerId, sprintId });
    return await safe.insert(async () =>
      await supabase
        .from('accountability_partnerships')
        .insert({
          requester_id: requesterId,
          partner_id: partnerId,
          sprint_id: sprintId,
          status: 'pending'
        })
        .select()
        .single()
    );
  },

  async updatePartnershipStatus(partnershipId: string, status: string) {
    logInfo('Updating partnership status', { partnershipId, status });
    return await safe.update(async () =>
      await supabase
        .from('accountability_partnerships')
        .update({ status })
        .eq('id', partnershipId)
        .select()
        .single()
    );
  },

  async getRecentNudges(userId: string) {
    logInfo('Fetching recent nudges', { userId });
    return await safe.select(async () =>
      await supabase
        .from('accountability_nudges')
        .select(`
          *,
          nudger_profile:profiles!nudger_id(
            id, full_name, avatar_url
          )
        `)
        .eq('nudged_id', userId)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
    );
  },

  async sendNudge(senderId: string, receiverId: string, partnershipId: string, nudgeType: string, message?: string) {
    logInfo('Sending nudge', { senderId, receiverId, nudgeType });
    return await safe.insert(async () =>
      await supabase
        .from('accountability_nudges')
        .insert({
          nudger_id: senderId,
          nudged_id: receiverId,
          partnership_id: partnershipId,
          nudge_type: nudgeType,
          nudge_trigger: {},
          message
        })
        .select()
        .single()
    );
  },

  async acknowledgeNudge(nudgeId: string) {
    logInfo('Acknowledging nudge', { nudgeId });
    return await safe.update(async () =>
      await supabase
        .from('accountability_nudges')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', nudgeId)
    );
  },

  // ============= Community Posts =============
  async getCommunityPosts(filters?: { tags?: string[]; limit?: number; offset?: number }) {
    logInfo('Fetching community posts', { filters });
    let query = supabase
      .from('community_posts')
      .select(`
        *,
        profiles:user_id (
          id, full_name, avatar_url, username
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    return await safe.select(async () => await query);
  },

  async getUserVote(userId: string, postId: string) {
    logInfo('Checking user vote', { userId, postId });
    return await safe.select(async () =>
      await supabase
        .from('user_votes')
        .select('vote_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()
    );
  },

  async upsertVote(userId: string, postId: string, voteType: 'up' | 'down') {
    logInfo('Upserting vote', { userId, postId, voteType });
    return await safe.insert(async () =>
      await supabase
        .from('user_votes')
        .upsert({
          post_id: postId,
          user_id: userId,
          vote_type: voteType
        })
    );
  },

  async deleteVote(userId: string, postId: string) {
    logInfo('Deleting vote', { userId, postId });
    return await safe.delete(async () =>
      await supabase
        .from('user_votes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
    );
  },

  // ============= Dashboard Data =============
  async getDashboardData(userId: string) {
    logInfo('Fetching dashboard data', { userId });
    // Note: This would need a proper table - removing for now as it doesn't exist
    return { data: null, error: null };
  },

  async getUserTasks(userId: string) {
    logInfo('Fetching user tasks', { userId });
    return await safe.select(async () =>
      await supabase
        .from('roadmap_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true })
    );
  },

  async updateTask(taskId: string, updates: any) {
    logInfo('Updating task', { taskId, updates });
    return await safe.update(async () =>
      await supabase
        .from('roadmap_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()
    );
  },

  // ============= Profile & Reputation =============
  async getProfile(userId: string) {
    logInfo('Fetching profile', { userId });
    return await safe.select(async () =>
      await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    );
  },

  async getReputation(userId: string) {
    logInfo('Fetching reputation', { userId });
    return await safe.select(async () =>
      await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    );
  },

  // ============= Credits =============
  async getUserCredits(userId: string) {
    logInfo('Fetching user credits', { userId });
    return await safe.select(async () =>
      await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single()
    );
  },

  async deductCredits(userId: string, amount: number, feature: string, reason?: string) {
    logInfo('Deducting credits', { userId, amount, feature });
    
    // Get current balance
    const { data: credits } = await this.getUserCredits(userId);
    if (!credits || credits.balance < amount) {
      throw new Error('Insufficient credits');
    }

    // Deduct credits
    const newBalance = credits.balance - amount;
    await safe.update(async () =>
      await supabase
        .from('user_credits')
        .update({ balance: newBalance })
        .eq('user_id', userId)
    );

    // Log transaction
    await safe.insert(async () =>
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: -amount,
          tx_type: 'deduct',
          feature,
          reason
        })
    );

    return { newBalance };
  }
};
