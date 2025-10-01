import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  userId: string;
  preferences: {
    industry?: string;
    businessStage?: string;
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    interests: string[];
    communicationStyle?: 'formal' | 'casual' | 'technical';
    preferredResponseLength?: 'brief' | 'detailed' | 'comprehensive';
    timezone?: string;
    language?: string;
  };
  behavior: {
    averageSessionDuration: number;
    preferredTopics: string[];
    commonIntents: string[];
    satisfactionScore: number;
    lastActiveAt: string;
    totalSessions: number;
  };
  businessContext: {
    currentBusiness?: {
      name: string;
      industry: string;
      stage: string;
      size: string;
    };
    previousBusinesses: Array<{
      name: string;
      industry: string;
      outcome: 'success' | 'failure' | 'ongoing';
    }>;
    goals: string[];
    painPoints: string[];
  };
  createdAt: string;
  lastUpdated: string;
}

export interface PersonalizationConfig {
  enableProfileTracking: boolean;
  enableBehaviorAnalysis: boolean;
  enableContextualResponses: boolean;
  enableRecommendations: boolean;
  enableAIPersonalization: boolean;
  dataRetentionDays: number;
  privacyMode: 'full' | 'limited' | 'minimal';
}

export interface PersonalizedResponse {
  content: string;
  tone: 'formal' | 'casual' | 'technical';
  length: 'brief' | 'detailed' | 'comprehensive';
  focus: string[];
  recommendations: string[];
  personalizationLevel: number; // 0-1
}

export class PersonalizationManager {
  private config: PersonalizationConfig;
  private userProfile: UserProfile | null = null;
  private behaviorData: Map<string, any> = new Map();

  constructor(config: PersonalizationConfig) {
    this.config = config;
  }

  async loadUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      this.userProfile = data;
      return data;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          ...updates,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;

      if (this.userProfile) {
        this.userProfile = { ...this.userProfile, ...updates };
      }
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  async trackUserBehavior(sessionId: string, behavior: {
    eventType: string;
    data: Record<string, any>;
    timestamp: string;
  }): Promise<void> {
    if (!this.config.enableBehaviorAnalysis) return;

    try {
      await supabase
        .from('user_behavior')
        .insert({
          session_id: sessionId,
          user_id: this.userProfile?.userId,
          event_type: behavior.eventType,
          data: behavior.data,
          timestamp: behavior.timestamp
        });
    } catch (error) {
      console.error('Error tracking user behavior:', error);
    }
  }

  async generatePersonalizedResponse(
    baseResponse: string,
    context: {
      intent: string;
      entities: string[];
      sessionHistory: any[];
    }
  ): Promise<PersonalizedResponse> {
    if (!this.userProfile || !this.config.enableContextualResponses) {
      return {
        content: baseResponse,
        tone: 'casual',
        length: 'detailed',
        focus: [],
        recommendations: [],
        personalizationLevel: 0
      };
    }

    const { preferences, behavior, businessContext } = this.userProfile;
    
    // Determine tone based on communication style
    const tone = preferences.communicationStyle || 'casual';
    
    // Determine response length
    const length = preferences.preferredResponseLength || 'detailed';
    
    // Generate focus areas based on interests and business context
    const focus = this.generateFocusAreas(preferences, businessContext, context);
    
    // Generate recommendations based on behavior and context
    const recommendations = this.generateRecommendations(behavior, businessContext, context);
    
    // Personalize content based on user profile
    const personalizedContent = this.personalizeContent(baseResponse, {
      tone,
      length,
      focus,
      preferences,
      businessContext
    });

    return {
      content: personalizedContent,
      tone,
      length,
      focus,
      recommendations,
      personalizationLevel: this.calculatePersonalizationLevel(preferences, behavior)
    };
  }

  private generateFocusAreas(
    preferences: UserProfile['preferences'],
    businessContext: UserProfile['businessContext'],
    context: any
  ): string[] {
    const focus: string[] = [];

    // Add industry-specific focus
    if (preferences.industry) {
      focus.push(preferences.industry);
    }

    // Add business stage focus
    if (preferences.businessStage) {
      focus.push(preferences.businessStage);
    }

    // Add interest-based focus
    focus.push(...preferences.interests.slice(0, 3));

    // Add current business context
    if (businessContext.currentBusiness) {
      focus.push(businessContext.currentBusiness.industry);
      focus.push(businessContext.currentBusiness.stage);
    }

    return [...new Set(focus)].slice(0, 5);
  }

  private generateRecommendations(
    behavior: UserProfile['behavior'],
    businessContext: UserProfile['businessContext'],
    context: any
  ): string[] {
    const recommendations: string[] = [];

    // Based on preferred topics
    if (behavior.preferredTopics.length > 0) {
      recommendations.push(`Explore more about ${behavior.preferredTopics[0]}`);
    }

    // Based on business goals
    if (businessContext.goals.length > 0) {
      recommendations.push(`Focus on achieving: ${businessContext.goals[0]}`);
    }

    // Based on pain points
    if (businessContext.painPoints.length > 0) {
      recommendations.push(`Address: ${businessContext.painPoints[0]}`);
    }

    // Based on experience level
    if (behavior.satisfactionScore < 3) {
      recommendations.push('Consider our beginner-friendly resources');
    }

    return recommendations.slice(0, 3);
  }

  private personalizeContent(
    baseResponse: string,
    personalization: {
      tone: string;
      length: string;
      focus: string[];
      preferences: UserProfile['preferences'];
      businessContext: UserProfile['businessContext'];
    }
  ): string {
    let personalizedContent = baseResponse;

    // Adjust tone
    if (personalization.tone === 'formal') {
      personalizedContent = personalizedContent.replace(/I'm/g, 'I am');
      personalizedContent = personalizedContent.replace(/I'll/g, 'I will');
      personalizedContent = personalizedContent.replace(/I've/g, 'I have');
    } else if (personalization.tone === 'casual') {
      personalizedContent = personalizedContent.replace(/I am/g, "I'm");
      personalizedContent = personalizedContent.replace(/I will/g, "I'll");
      personalizedContent = personalizedContent.replace(/I have/g, "I've");
    }

    // Adjust length
    if (personalization.length === 'brief') {
      // Truncate to first paragraph or 200 characters
      const firstParagraph = personalizedContent.split('\n\n')[0];
      if (firstParagraph.length > 200) {
        personalizedContent = firstParagraph.substring(0, 200) + '...';
      } else {
        personalizedContent = firstParagraph;
      }
    } else if (personalization.length === 'comprehensive') {
      // Add more detailed information
      if (personalization.businessContext.currentBusiness) {
        personalizedContent += `\n\nBased on your ${personalization.businessContext.currentBusiness.industry} business, here are additional considerations...`;
      }
    }

    // Add personalized context
    if (personalization.preferences.industry) {
      personalizedContent = personalizedContent.replace(
        /your business/g,
        `your ${personalization.preferences.industry} business`
      );
    }

    return personalizedContent;
  }

  private calculatePersonalizationLevel(
    preferences: UserProfile['preferences'],
    behavior: UserProfile['behavior']
  ): number {
    let level = 0;

    // Base level from preferences completeness
    const preferenceKeys = Object.keys(preferences);
    level += (preferenceKeys.length / 7) * 0.3;

    // Add level from behavior data
    if (behavior.totalSessions > 5) level += 0.2;
    if (behavior.averageSessionDuration > 300000) level += 0.2; // 5 minutes
    if (behavior.satisfactionScore > 3) level += 0.1;
    if (behavior.preferredTopics.length > 0) level += 0.1;
    if (behavior.commonIntents.length > 0) level += 0.1;

    return Math.min(level, 1);
  }

  async getPersonalizedRecommendations(userId: string): Promise<string[]> {
    if (!this.userProfile) {
      await this.loadUserProfile(userId);
    }

    if (!this.userProfile) return [];

    const recommendations: string[] = [];

    // Based on business stage
    if (this.userProfile.preferences.businessStage === 'idea') {
      recommendations.push('Start with market validation');
      recommendations.push('Define your target audience');
    } else if (this.userProfile.preferences.businessStage === 'planning') {
      recommendations.push('Create a detailed business plan');
      recommendations.push('Research funding options');
    } else if (this.userProfile.preferences.businessStage === 'launch') {
      recommendations.push('Focus on customer acquisition');
      recommendations.push('Optimize your operations');
    }

    // Based on experience level
    if (this.userProfile.preferences.experienceLevel === 'beginner') {
      recommendations.push('Check out our beginner guides');
      recommendations.push('Join our community for support');
    } else if (this.userProfile.preferences.experienceLevel === 'advanced') {
      recommendations.push('Explore advanced strategies');
      recommendations.push('Connect with other experts');
    }

    // Based on interests
    this.userProfile.preferences.interests.forEach(interest => {
      recommendations.push(`Learn more about ${interest}`);
    });

    return recommendations.slice(0, 5);
  }

  async anonymizeUserData(userId: string): Promise<boolean> {
    try {
      // Anonymize user profile
      await supabase
        .from('user_profiles')
        .update({
          preferences: {},
          behavior: {
            averageSessionDuration: 0,
            preferredTopics: [],
            commonIntents: [],
            satisfactionScore: 0,
            lastActiveAt: new Date().toISOString(),
            totalSessions: 0
          },
          businessContext: {
            previousBusinesses: [],
            goals: [],
            painPoints: []
          }
        })
        .eq('user_id', userId);

      // Delete behavior data
      await supabase
        .from('user_behavior')
        .delete()
        .eq('user_id', userId);

      return true;
    } catch (error) {
      console.error('Error anonymizing user data:', error);
      return false;
    }
  }
}

// React Hook for Personalization
export const usePersonalization = (config: PersonalizationConfig) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manager = useMemo(() => new PersonalizationManager(config), [config]);

  const loadUserProfile = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const profile = await manager.loadUserProfile(userId);
      setUserProfile(profile);
      return profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
      return null;
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const updateUserProfile = useCallback(async (userId: string, updates: Partial<UserProfile>) => {
    const success = await manager.updateUserProfile(userId, updates);
    if (success && userProfile) {
      setUserProfile({ ...userProfile, ...updates });
    }
    return success;
  }, [manager, userProfile]);

  const trackUserBehavior = useCallback(async (sessionId: string, behavior: {
    eventType: string;
    data: Record<string, any>;
    timestamp: string;
  }) => {
    await manager.trackUserBehavior(sessionId, behavior);
  }, [manager]);

  const generatePersonalizedResponse = useCallback(async (
    baseResponse: string,
    context: {
      intent: string;
      entities: string[];
      sessionHistory: any[];
    }
  ) => {
    return await manager.generatePersonalizedResponse(baseResponse, context);
  }, [manager]);

  const getPersonalizedRecommendations = useCallback(async (userId: string) => {
    return await manager.getPersonalizedRecommendations(userId);
  }, [manager]);

  const anonymizeUserData = useCallback(async (userId: string) => {
    return await manager.anonymizeUserData(userId);
  }, [manager]);

  return {
    userProfile,
    loading,
    error,
    loadUserProfile,
    updateUserProfile,
    trackUserBehavior,
    generatePersonalizedResponse,
    getPersonalizedRecommendations,
    anonymizeUserData
  };
};
