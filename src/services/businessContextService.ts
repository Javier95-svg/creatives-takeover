/**
 * Business Context Service
 * Centralized service for managing and aggregating enhanced business context
 * across the AI Co-Founder system
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  FounderProfile,
  ProgressMilestone,
  ProgressBlocker,
  MarketIntelligence,
  AggregatedUserContext,
  ProgressMetrics,
  ServiceResponse,
  CreateFounderProfileRequest,
  UpdateFounderProfileRequest,
  EnhancedBusinessContext,
  ChatbotConversation,
  DecisionRecord,
  ConversationMemory,
} from '@/types/aiCofounder';

/**
 * Business Context Service Class
 * Handles all operations related to user business context aggregation
 */
export class BusinessContextService {
  /**
   * Get complete aggregated context for a user
   * This is the primary method to get all context needed by the AI
   */
  static async getAggregatedContext(
    userId: string
  ): Promise<ServiceResponse<AggregatedUserContext>> {
    try {
      // Fetch all data in parallel
      const [
        founderProfileResult,
        milestonesResult,
        blockersResult,
        marketIntelResult,
        conversationResult,
      ] = await Promise.all([
        this.getFounderProfile(userId),
        this.getMilestones(userId),
        this.getActiveBlockers(userId),
        this.getMarketIntelligence(userId),
        this.getLatestConversation(userId),
      ]);

      // Extract data
      const founderProfile = founderProfileResult.data || null;
      const allMilestones = milestonesResult.data || [];
      const activeBlockers = blockersResult.data || [];
      const marketIntelligence = marketIntelResult.data || null;
      const conversation = conversationResult.data || null;

      // Separate completed and current milestones
      const completedMilestones = allMilestones.filter(
        (m) => m.status === 'completed'
      );
      const currentMilestones = allMilestones.filter(
        (m) => m.status !== 'completed' && m.status !== 'skipped'
      );

      // Calculate progress metrics
      const progressMetrics = await this.calculateProgressMetrics(
        userId,
        allMilestones,
        activeBlockers
      );

      // Get decision history from conversation
      const decisionHistory: DecisionRecord[] =
        conversation?.decision_history || [];

      // Get conversation memory
      const conversationMemory: ConversationMemory =
        conversation?.conversation_memory || {
          importantTopics: [],
          userPreferences: {},
          previousSolutions: [],
          emotionalContext: {},
          relationshipPhase: 'building-trust',
        };

      // Calculate insights
      const insights = this.calculateInsights(
        founderProfile,
        progressMetrics,
        activeBlockers,
        allMilestones
      );

      const aggregatedContext: AggregatedUserContext = {
        userId,
        founderProfile,
        currentMilestones,
        completedMilestones,
        activeBlockers,
        progressMetrics,
        marketIntelligence,
        decisionHistory,
        conversationMemory,
        insights,
      };

      return {
        success: true,
        data: aggregatedContext,
      };
    } catch (error: any) {
      console.error('[BusinessContextService] Error aggregating context:', error);
      return {
        success: false,
        error: {
          code: 'AGGREGATION_ERROR',
          message: 'Failed to aggregate user context',
          details: error.message,
        },
      };
    }
  }

  /**
   * Get or create founder profile for a user
   */
  static async getFounderProfile(
    userId: string
  ): Promise<ServiceResponse<FounderProfile | null>> {
    try {
      const { data, error } = await supabase
        .from('founder_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
      }

      return {
        success: true,
        data: data as FounderProfile | null,
      };
    } catch (error: any) {
      console.error('[BusinessContextService] Error fetching founder profile:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_PROFILE_ERROR',
          message: 'Failed to fetch founder profile',
          details: error.message,
        },
      };
    }
  }

  /**
   * Create founder profile
   */
  static async createFounderProfile(
    userId: string,
    profileData: CreateFounderProfileRequest
  ): Promise<ServiceResponse<FounderProfile>> {
    try {
      const { data, error } = await supabase
        .from('founder_profiles')
        .insert([
          {
            user_id: userId,
            ...profileData,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as FounderProfile,
      };
    } catch (error: any) {
      console.error('[BusinessContextService] Error creating founder profile:', error);
      return {
        success: false,
        error: {
          code: 'CREATE_PROFILE_ERROR',
          message: 'Failed to create founder profile',
          details: error.message,
        },
      };
    }
  }

  /**
   * Update founder profile
   */
  static async updateFounderProfile(
    userId: string,
    updates: UpdateFounderProfileRequest
  ): Promise<ServiceResponse<FounderProfile>> {
    try {
      const { data, error } = await supabase
        .from('founder_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as FounderProfile,
      };
    } catch (error: any) {
      console.error('[BusinessContextService] Error updating founder profile:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_PROFILE_ERROR',
          message: 'Failed to update founder profile',
          details: error.message,
        },
      };
    }
  }

  /**
   * Get all milestones for a user
   */
  static async getMilestones(
    userId: string
  ): Promise<ServiceResponse<ProgressMilestone[]>> {
    try {
      const { data, error } = await supabase
        .from('progress_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: (data as ProgressMilestone[]) || [],
      };
    } catch (error: any) {
      console.error('[BusinessContextService] Error fetching milestones:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_MILESTONES_ERROR',
          message: 'Failed to fetch milestones',
          details: error.message,
        },
      };
    }
  }

  /**
   * Get active blockers for a user
   */
  static async getActiveBlockers(
    userId: string
  ): Promise<ServiceResponse<ProgressBlocker[]>> {
    try {
      const { data, error } = await supabase
        .from('progress_blockers')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['open', 'in_progress'])
        .order('severity', { ascending: false })
        .order('identified_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: (data as ProgressBlocker[]) || [],
      };
    } catch (error: any) {
      console.error('[BusinessContextService] Error fetching blockers:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_BLOCKERS_ERROR',
          message: 'Failed to fetch blockers',
          details: error.message,
        },
      };
    }
  }

  /**
   * Get market intelligence for user's industry
   */
  static async getMarketIntelligence(
    userId: string
  ): Promise<ServiceResponse<MarketIntelligence | null>> {
    try {
      // First, get user's business context to determine industry
      const conversation = await this.getLatestConversation(userId);
      const industry =
        conversation.data?.business_context?.industry ||
        conversation.data?.founder_profile?.domain_expertise?.[0];

      if (!industry) {
        return { success: true, data: null };
      }

      const { data, error } = await supabase
        .from('market_intelligence_cache')
        .select('*')
        .eq('industry', industry)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        success: true,
        data: data as MarketIntelligence | null,
      };
    } catch (error: any) {
      console.error(
        '[BusinessContextService] Error fetching market intelligence:',
        error
      );
      return {
        success: false,
        error: {
          code: 'FETCH_MARKET_INTEL_ERROR',
          message: 'Failed to fetch market intelligence',
          details: error.message,
        },
      };
    }
  }

  /**
   * Get latest conversation for a user
   */
  static async getLatestConversation(
    userId: string
  ): Promise<ServiceResponse<ChatbotConversation | null>> {
    try {
      const { data, error } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        success: true,
        data: data as ChatbotConversation | null,
      };
    } catch (error: any) {
      console.error('[BusinessContextService] Error fetching conversation:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_CONVERSATION_ERROR',
          message: 'Failed to fetch conversation',
          details: error.message,
        },
      };
    }
  }

  /**
   * Update conversation context
   */
  static async updateConversationContext(
    conversationId: string,
    updates: Partial<ChatbotConversation>
  ): Promise<ServiceResponse<ChatbotConversation>> {
    try {
      const { data, error } = await supabase
        .from('chatbot_conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as ChatbotConversation,
      };
    } catch (error: any) {
      console.error(
        '[BusinessContextService] Error updating conversation context:',
        error
      );
      return {
        success: false,
        error: {
          code: 'UPDATE_CONTEXT_ERROR',
          message: 'Failed to update conversation context',
          details: error.message,
        },
      };
    }
  }

  /**
   * Calculate progress metrics
   */
  private static async calculateProgressMetrics(
    userId: string,
    milestones: ProgressMilestone[],
    blockers: ProgressBlocker[]
  ): Promise<ProgressMetrics> {
    // Get current plan day from database function
    const { data: currentDayData } = await supabase.rpc('get_current_plan_day', {
      user_uuid: userId,
    });

    const currentDay = currentDayData || 0;

    // Get velocity from database function
    const { data: velocityData } = await supabase.rpc(
      'calculate_progress_velocity',
      {
        user_uuid: userId,
        days: 7,
      }
    );

    const velocity = velocityData || 0;

    // Calculate completed milestones
    const completedMilestones = milestones
      .filter((m) => m.status === 'completed')
      .map((m) => m.id);

    // Calculate average quality score
    const qualityScores = milestones
      .filter((m) => m.quality_score !== null && m.status === 'completed')
      .map((m) => m.quality_score || 0);

    const qualityScore =
      qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;

    // Determine if on track (simple heuristic: at least 1 milestone per 4 days)
    const expectedMilestones = Math.floor(currentDay / 4);
    const onTrack = completedMilestones.length >= expectedMilestones;

    return {
      currentDay,
      completedMilestones,
      activeBlockers: blockers.length,
      velocity,
      qualityScore: Math.round(qualityScore),
      onTrack,
    };
  }

  /**
   * Calculate insights based on context
   */
  private static calculateInsights(
    founderProfile: FounderProfile | null,
    progressMetrics: ProgressMetrics,
    blockers: ProgressBlocker[],
    milestones: ProgressMilestone[]
  ) {
    // Critical blockers (high or critical severity)
    const criticalBlockers = blockers.filter((b) =>
      ['high', 'critical'].includes(b.severity)
    );

    // Next suggested milestone based on typical progression
    const completedTypes = new Set(
      milestones
        .filter((m) => m.status === 'completed')
        .map((m) => m.milestone_type)
    );

    const typicalProgression: Array<
      ProgressMilestone['milestone_type']
    > = [
      'business_concept',
      'target_customer',
      'validation_plan',
      'mvp_design',
      'launch_strategy',
      'pricing_model',
      'success_goals',
    ];

    const nextSuggestedMilestone =
      typicalProgression.find((type) => !completedTypes.has(type)) || null;

    // Areas needing attention
    const needsAttention: string[] = [];

    if (!founderProfile || founderProfile.profile_completeness < 50) {
      needsAttention.push('Complete your founder profile for personalized guidance');
    }

    if (criticalBlockers.length > 0) {
      needsAttention.push(
        `${criticalBlockers.length} critical blocker(s) need immediate attention`
      );
    }

    if (!progressMetrics.onTrack) {
      needsAttention.push('Progress is behind schedule - consider adjusting timeline');
    }

    if (progressMetrics.qualityScore < 60) {
      needsAttention.push('Milestone quality needs improvement');
    }

    if (blockers.length > 3) {
      needsAttention.push('Multiple blockers detected - prioritization recommended');
    }

    return {
      isOnTrack: progressMetrics.onTrack,
      criticalBlockers,
      nextSuggestedMilestone,
      profileCompleteness: founderProfile?.profile_completeness || 0,
      needsAttention,
    };
  }

  /**
   * Enrich business context with aggregated data
   * Converts aggregated context into format expected by AI
   */
  static enrichBusinessContext(
    baseContext: EnhancedBusinessContext,
    aggregatedContext: AggregatedUserContext
  ): EnhancedBusinessContext {
    return {
      ...baseContext,
      founderProfile: aggregatedContext.founderProfile || undefined,
      marketDynamics: aggregatedContext.marketIntelligence || undefined,
      progressMetrics: aggregatedContext.progressMetrics,
      decisionHistory: aggregatedContext.decisionHistory,
      conversationMemory: aggregatedContext.conversationMemory,
    };
  }

  /**
   * Format context for AI prompt
   * Creates a concise summary of context for system prompts
   */
  static formatContextForAI(context: AggregatedUserContext): string {
    const parts: string[] = [];

    // Founder profile summary
    if (context.founderProfile) {
      parts.push(`## Founder Profile
- Experience: ${context.founderProfile.entrepreneurial_experience}
- Risk Tolerance: ${context.founderProfile.risk_tolerance}
- Decision Style: ${context.founderProfile.decision_making_style}
- Skill Gaps: ${context.founderProfile.skill_gaps.join(', ') || 'None identified'}
- Primary Goals: ${context.founderProfile.primary_goals.join(', ')}`);
    }

    // Progress summary
    parts.push(`## Progress Metrics
- Current Day: ${context.progressMetrics.currentDay}/30
- Completed Milestones: ${context.progressMetrics.completedMilestones.length}
- Active Blockers: ${context.progressMetrics.activeBlockers}
- Velocity: ${context.progressMetrics.velocity.toFixed(2)} milestones/week
- Quality Score: ${context.progressMetrics.qualityScore}/100
- Status: ${context.progressMetrics.onTrack ? '✓ On Track' : '⚠ Behind Schedule'}`);

    // Blockers
    if (context.activeBlockers.length > 0) {
      parts.push(`## Active Blockers
${context.activeBlockers
  .slice(0, 3)
  .map(
    (b) => `- [${b.severity.toUpperCase()}] ${b.blocker_title}: ${b.blocker_description}`
  )
  .join('\n')}`);
    }

    // Insights
    if (context.insights.needsAttention.length > 0) {
      parts.push(`## Areas Needing Attention
${context.insights.needsAttention.map((item) => `- ${item}`).join('\n')}`);
    }

    // Next milestone suggestion
    if (context.insights.nextSuggestedMilestone) {
      parts.push(
        `## Next Suggested Focus\n${context.insights.nextSuggestedMilestone.replace('_', ' ').toUpperCase()}`
      );
    }

    return parts.join('\n\n');
  }
}

export default BusinessContextService;
