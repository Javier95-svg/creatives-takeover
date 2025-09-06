export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          content: string
          created_at: string
          created_by: string | null
          date: string
          excerpt: string
          external_url: string | null
          id: string
          image: string | null
          is_published: boolean
          read_time: number
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          date?: string
          excerpt: string
          external_url?: string | null
          id?: string
          image?: string | null
          is_published?: boolean
          read_time?: number
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          date?: string
          excerpt?: string
          external_url?: string | null
          id?: string
          image?: string | null
          is_published?: boolean
          read_time?: number
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          answers: Json
          created_at: string
          current_step: number
          id: string
          is_completed: boolean
          launch_report: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          current_step?: number
          id?: string
          is_completed?: boolean
          launch_report?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          current_step?: number
          id?: string
          is_completed?: boolean
          launch_report?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          ai_insights: string[] | null
          ai_next_step: string | null
          ai_processed_at: string | null
          ai_related_topics: string[] | null
          ai_structured_idea: Json | null
          ai_summary: string | null
          ai_trending_angle: string | null
          comment_count: number | null
          content: string
          created_at: string
          downvotes: number | null
          id: string
          location: string | null
          tags: string[] | null
          title: string
          updated_at: string
          upvotes: number | null
          user_id: string
        }
        Insert: {
          ai_insights?: string[] | null
          ai_next_step?: string | null
          ai_processed_at?: string | null
          ai_related_topics?: string[] | null
          ai_structured_idea?: Json | null
          ai_summary?: string | null
          ai_trending_angle?: string | null
          comment_count?: number | null
          content: string
          created_at?: string
          downvotes?: number | null
          id?: string
          location?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          upvotes?: number | null
          user_id: string
        }
        Update: {
          ai_insights?: string[] | null
          ai_next_step?: string | null
          ai_processed_at?: string | null
          ai_related_topics?: string[] | null
          ai_structured_idea?: Json | null
          ai_summary?: string | null
          ai_trending_angle?: string | null
          comment_count?: number | null
          content?: string
          created_at?: string
          downvotes?: number | null
          id?: string
          location?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          upvotes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_group: boolean
          last_message_at: string | null
          name: string | null
          participants: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          name?: string | null
          participants: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          name?: string | null
          participants?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          feature: string | null
          id: string
          metadata: Json | null
          reason: string | null
          session_id: string | null
          tx_type: Database["public"]["Enums"]["credit_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          feature?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          session_id?: string | null
          tx_type: Database["public"]["Enums"]["credit_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          feature?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          session_id?: string | null
          tx_type?: Database["public"]["Enums"]["credit_tx_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string
          from_user_id: string | null
          id: string
          is_read: boolean
          message: string
          post_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          post_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          post_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          downvotes: number | null
          id: string
          post_id: string
          updated_at: string
          upvotes: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          downvotes?: number | null
          id?: string
          post_id: string
          updated_at?: string
          upvotes?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          downvotes?: number | null
          id?: string
          post_id?: string
          updated_at?: string
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          credit_balance: number
          followers_count: number
          following_count: number
          friends_count: number
          full_name: string | null
          github_url: string | null
          id: string
          instagram_url: string | null
          last_credit_reset_at: string
          linkedin_url: string | null
          subscription_tier: string
          twitter_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          credit_balance?: number
          followers_count?: number
          following_count?: number
          friends_count?: number
          full_name?: string | null
          github_url?: string | null
          id: string
          instagram_url?: string | null
          last_credit_reset_at?: string
          linkedin_url?: string | null
          subscription_tier?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          credit_balance?: number
          followers_count?: number
          following_count?: number
          friends_count?: number
          full_name?: string | null
          github_url?: string | null
          id?: string
          instagram_url?: string | null
          last_credit_reset_at?: string
          linkedin_url?: string | null
          subscription_tier?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          created_at: string
          features: Json | null
          monthly_credits: number
          price_cents: number
          stripe_price_id: string | null
          tier_name: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          monthly_credits?: number
          price_cents?: number
          stripe_price_id?: string | null
          tier_name: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          monthly_credits?: number
          price_cents?: number
          stripe_price_id?: string | null
          tier_name?: string
        }
        Relationships: []
      }
      trends: {
        Row: {
          action_steps: string[] | null
          article_source: string | null
          article_url: string | null
          author: string | null
          business_opportunity: Json | null
          category: string
          competition_level: string | null
          created_at: string
          description: string
          entry_difficulty: number | null
          expires_at: string
          geographic_relevance: string[] | null
          id: string
          is_active: boolean
          keywords: string[]
          market_size_estimate: string | null
          market_size_indicator: string | null
          opportunity_score: number | null
          publication_date: string | null
          revenue_models: string[] | null
          sentiment: string | null
          source_urls: string[] | null
          summary: string | null
          target_audience: string[] | null
          time_sensitivity: string | null
          title: string
          trend_score: number
          updated_at: string
        }
        Insert: {
          action_steps?: string[] | null
          article_source?: string | null
          article_url?: string | null
          author?: string | null
          business_opportunity?: Json | null
          category?: string
          competition_level?: string | null
          created_at?: string
          description: string
          entry_difficulty?: number | null
          expires_at?: string
          geographic_relevance?: string[] | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          market_size_estimate?: string | null
          market_size_indicator?: string | null
          opportunity_score?: number | null
          publication_date?: string | null
          revenue_models?: string[] | null
          sentiment?: string | null
          source_urls?: string[] | null
          summary?: string | null
          target_audience?: string[] | null
          time_sensitivity?: string | null
          title: string
          trend_score?: number
          updated_at?: string
        }
        Update: {
          action_steps?: string[] | null
          article_source?: string | null
          article_url?: string | null
          author?: string | null
          business_opportunity?: Json | null
          category?: string
          competition_level?: string | null
          created_at?: string
          description?: string
          entry_difficulty?: number | null
          expires_at?: string
          geographic_relevance?: string[] | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          market_size_estimate?: string | null
          market_size_indicator?: string | null
          opportunity_score?: number | null
          publication_date?: string | null
          revenue_models?: string[] | null
          sentiment?: string | null
          source_urls?: string[] | null
          summary?: string | null
          target_audience?: string[] | null
          time_sensitivity?: string | null
          title?: string
          trend_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          last_credit_grant: string | null
          last_reset_at: string
          monthly_quota: number
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          last_credit_grant?: string | null
          last_reset_at?: string
          monthly_quota?: number
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          last_credit_grant?: string | null
          last_reset_at?: string
          monthly_quota?: number
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          acquisition_source: string | null
          additional_comments: string | null
          business_challenge: string | null
          completed_at: string
          conversion_status: string | null
          created_at: string
          email: string | null
          feature_request: string | null
          id: string
          nps_score: number | null
          session_id: string | null
          user_id: string | null
          ux_rating: number | null
        }
        Insert: {
          acquisition_source?: string | null
          additional_comments?: string | null
          business_challenge?: string | null
          completed_at?: string
          conversion_status?: string | null
          created_at?: string
          email?: string | null
          feature_request?: string | null
          id?: string
          nps_score?: number | null
          session_id?: string | null
          user_id?: string | null
          ux_rating?: number | null
        }
        Update: {
          acquisition_source?: string | null
          additional_comments?: string | null
          business_challenge?: string | null
          completed_at?: string
          conversion_status?: string | null
          created_at?: string
          email?: string | null
          feature_request?: string | null
          id?: string
          nps_score?: number | null
          session_id?: string | null
          user_id?: string | null
          ux_rating?: number | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_topic_preferences: {
        Row: {
          created_at: string
          id: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trend_preferences: {
        Row: {
          created_at: string
          id: string
          notification_enabled: boolean
          preferred_categories: string[]
          preferred_keywords: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_enabled?: boolean
          preferred_categories?: string[]
          preferred_keywords?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_enabled?: boolean
          preferred_categories?: string[]
          preferred_keywords?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_votes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          updated_at: string
          user_id: string
          vote_type: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id: string
          vote_type: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          updated_at?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_post_author_info: {
        Args: { author_user_id: string }
        Returns: {
          author_avatar: string
          author_name: string
        }[]
      }
      grant_monthly_credits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_expired_trends: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_subscription_tier: {
        Args: { is_subscribed?: boolean; new_tier: string; user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      credit_tx_type:
        | "grant"
        | "deduct"
        | "purchase"
        | "refund"
        | "adjustment"
        | "reset"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      credit_tx_type: [
        "grant",
        "deduct",
        "purchase",
        "refund",
        "adjustment",
        "reset",
      ],
    },
  },
} as const
