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
      accountability_nudges: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          message: string | null
          nudge_trigger: Json | null
          nudge_type: string
          nudged_id: string
          nudger_id: string
          partnership_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          nudge_trigger?: Json | null
          nudge_type?: string
          nudged_id: string
          nudger_id: string
          partnership_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          nudge_trigger?: Json | null
          nudge_type?: string
          nudged_id?: string
          nudger_id?: string
          partnership_id?: string
        }
        Relationships: []
      }
      accountability_partnerships: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          partner_id: string
          partnership_settings: Json | null
          partnership_type: string
          requester_id: string
          sprint_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          partner_id: string
          partnership_settings?: Json | null
          partnership_type?: string
          requester_id: string
          sprint_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          partner_id?: string
          partnership_settings?: Json | null
          partnership_type?: string
          requester_id?: string
          sprint_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          created_at: string
          event: string
          id: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          cache_key: string
          cost_estimate: number | null
          created_at: string
          expires_at: string
          id: string
          input_hash: string
          model: string
          provider: string
          response_data: Json
        }
        Insert: {
          cache_key: string
          cost_estimate?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          input_hash: string
          model: string
          provider: string
          response_data: Json
        }
        Update: {
          cache_key?: string
          cost_estimate?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          input_hash?: string
          model?: string
          provider?: string
          response_data?: Json
        }
        Relationships: []
      }
      ai_request_logs: {
        Row: {
          cost_estimate: number | null
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json | null
          model: string
          provider: string
          success: boolean
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model: string
          provider: string
          success?: boolean
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model?: string
          provider?: string
          success?: boolean
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_data_cache: {
        Row: {
          cached_at: string
          created_at: string
          data_payload: Json
          data_type: string
          expires_at: string
          id: string
          integration_id: string
          time_period: string
        }
        Insert: {
          cached_at?: string
          created_at?: string
          data_payload: Json
          data_type: string
          expires_at?: string
          id?: string
          integration_id: string
          time_period: string
        }
        Update: {
          cached_at?: string
          created_at?: string
          data_payload?: Json
          data_type?: string
          expires_at?: string
          id?: string
          integration_id?: string
          time_period?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_data_cache_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      angel_investors: {
        Row: {
          created_at: string | null
          email: string | null
          firm_name: string
          id: string
          investment_stages: string[] | null
          is_active: boolean | null
          linkedin_url: string | null
          name: string
          picture: string | null
          sectors: string[] | null
          twitter_x_url: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          firm_name: string
          id?: string
          investment_stages?: string[] | null
          is_active?: boolean | null
          linkedin_url?: string | null
          name: string
          picture?: string | null
          sectors?: string[] | null
          twitter_x_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          firm_name?: string
          id?: string
          investment_stages?: string[] | null
          is_active?: boolean | null
          linkedin_url?: string | null
          name?: string
          picture?: string | null
          sectors?: string[] | null
          twitter_x_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      app_builder_projects: {
        Row: {
          created_at: string
          html: string | null
          id: string
          messages: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          html?: string | null
          id?: string
          messages?: Json
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          html?: string | null
          id?: string
          messages?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      badge_definitions: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          requirement_data: Json | null
          requirement_type: string
          requirement_value: number | null
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id: string
          name: string
          rarity?: string
          requirement_data?: Json | null
          requirement_type: string
          requirement_value?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          requirement_data?: Json | null
          requirement_type?: string
          requirement_value?: number | null
        }
        Relationships: []
      }
      bizmap_community_feedback: {
        Row: {
          common_concerns: string[] | null
          community_post_id: string | null
          community_score: number | null
          created_at: string | null
          feedback_requested_on: string[] | null
          id: string
          key_suggestions: string[] | null
          roadmap_updates_triggered: boolean | null
          sentiment_analysis: Json | null
          session_id: string
          total_comments: number | null
          total_downvotes: number | null
          total_upvotes: number | null
          updated_at: string | null
          user_id: string
          validation_adjustments: Json | null
          validation_score_delta: number | null
        }
        Insert: {
          common_concerns?: string[] | null
          community_post_id?: string | null
          community_score?: number | null
          created_at?: string | null
          feedback_requested_on?: string[] | null
          id?: string
          key_suggestions?: string[] | null
          roadmap_updates_triggered?: boolean | null
          sentiment_analysis?: Json | null
          session_id: string
          total_comments?: number | null
          total_downvotes?: number | null
          total_upvotes?: number | null
          updated_at?: string | null
          user_id: string
          validation_adjustments?: Json | null
          validation_score_delta?: number | null
        }
        Update: {
          common_concerns?: string[] | null
          community_post_id?: string | null
          community_score?: number | null
          created_at?: string | null
          feedback_requested_on?: string[] | null
          id?: string
          key_suggestions?: string[] | null
          roadmap_updates_triggered?: boolean | null
          sentiment_analysis?: Json | null
          session_id?: string
          total_comments?: number | null
          total_downvotes?: number | null
          total_upvotes?: number | null
          updated_at?: string | null
          user_id?: string
          validation_adjustments?: Json | null
          validation_score_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bizmap_community_feedback_community_post_id_fkey"
            columns: ["community_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bizmap_community_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bizmap_task_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          stage: Database["public"]["Enums"]["bizmap_stage"]
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          stage: Database["public"]["Enums"]["bizmap_stage"]
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          stage?: Database["public"]["Enums"]["bizmap_stage"]
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_insights_cache: {
        Row: {
          business_stage: string
          confidence_score: number | null
          created_at: string
          expires_at: string
          id: string
          industry: string
          insights: Json
        }
        Insert: {
          business_stage: string
          confidence_score?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          industry: string
          insights: Json
        }
        Update: {
          business_stage?: string
          confidence_score?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          industry?: string
          insights?: Json
        }
        Relationships: []
      }
      business_metrics: {
        Row: {
          active_users: number | null
          created_at: string | null
          customers_count: number | null
          expenses: number | null
          hours_worked: number | null
          id: string
          metadata: Json | null
          metric_date: string
          revenue: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_users?: number | null
          created_at?: string | null
          customers_count?: number | null
          expenses?: number | null
          hours_worked?: number | null
          id?: string
          metadata?: Json | null
          metric_date: string
          revenue?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_users?: number | null
          created_at?: string | null
          customers_count?: number | null
          expenses?: number | null
          hours_worked?: number | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          revenue?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_success_scores: {
        Row: {
          action_recommendations: string[] | null
          created_at: string
          execution_feasibility_score: number
          financial_planning_score: number
          id: string
          improvement_areas: string[] | null
          key_strengths: string[] | null
          market_clarity_score: number
          market_strategy_score: number
          overall_score: number
          problem_validation_score: number
          risk_assessment: string
          scoring_criteria: Json | null
          session_id: string | null
          solution_strength_score: number
          success_likelihood: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_recommendations?: string[] | null
          created_at?: string
          execution_feasibility_score: number
          financial_planning_score: number
          id?: string
          improvement_areas?: string[] | null
          key_strengths?: string[] | null
          market_clarity_score: number
          market_strategy_score: number
          overall_score: number
          problem_validation_score: number
          risk_assessment?: string
          scoring_criteria?: Json | null
          session_id?: string | null
          solution_strength_score: number
          success_likelihood?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_recommendations?: string[] | null
          created_at?: string
          execution_feasibility_score?: number
          financial_planning_score?: number
          id?: string
          improvement_areas?: string[] | null
          key_strengths?: string[] | null
          market_clarity_score?: number
          market_strategy_score?: number
          overall_score?: number
          problem_validation_score?: number
          risk_assessment?: string
          scoring_criteria?: Json | null
          session_id?: string | null
          solution_strength_score?: number
          success_likelihood?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          answers: Json
          created_at: string
          current_step: number
          id: string
          importance_score: number | null
          is_completed: boolean
          is_pinned: boolean | null
          journey_stage: string | null
          launch_report: string | null
          milestones_achieved: Json | null
          mood_sentiment: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          current_step?: number
          id?: string
          importance_score?: number | null
          is_completed?: boolean
          is_pinned?: boolean | null
          journey_stage?: string | null
          launch_report?: string | null
          milestones_achieved?: Json | null
          mood_sentiment?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          current_step?: number
          id?: string
          importance_score?: number | null
          is_completed?: boolean
          is_pinned?: boolean | null
          journey_stage?: string | null
          launch_report?: string | null
          milestones_achieved?: Json | null
          mood_sentiment?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatbot_attachments: {
        Row: {
          ai_analysis: Json | null
          conversation_id: string | null
          created_at: string | null
          extracted_text: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string | null
          storage_path: string
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id?: string | null
          storage_path: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string | null
          storage_path?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chatbot_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          answer_quality_scores: Json | null
          business_context: Json | null
          chat_mode: string | null
          context_loaded_at: string | null
          conversation_stage: string | null
          created_at: string
          id: string
          related_session_id: string | null
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answer_quality_scores?: Json | null
          business_context?: Json | null
          chat_mode?: string | null
          context_loaded_at?: string | null
          conversation_stage?: string | null
          created_at?: string
          id?: string
          related_session_id?: string | null
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answer_quality_scores?: Json | null
          business_context?: Json | null
          chat_mode?: string | null
          context_loaded_at?: string | null
          conversation_stage?: string | null
          created_at?: string
          id?: string
          related_session_id?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_feedback: {
        Row: {
          business_context: Json | null
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          message_count: number | null
          rating: number | null
          section: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          business_context?: Json | null
          comment?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          message_count?: number | null
          rating?: number | null
          section?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          business_context?: Json | null
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message_count?: number | null
          rating?: number | null
          section?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chatbot_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_shared_reports: {
        Row: {
          community_post_id: string | null
          conversation_id: string | null
          feedback_count: number | null
          id: string
          is_anonymous: boolean | null
          report_data: Json
          report_type: string
          shared_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          community_post_id?: string | null
          conversation_id?: string | null
          feedback_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          report_data?: Json
          report_type: string
          shared_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          community_post_id?: string | null
          conversation_id?: string | null
          feedback_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          report_data?: Json
          report_type?: string
          shared_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_shared_reports_community_post_id_fkey"
            columns: ["community_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_shared_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cofounder_posts: {
        Row: {
          additional_info: string | null
          commitment: string | null
          created_at: string | null
          equity_range: string | null
          id: string
          industry: string | null
          location: string | null
          looking_for: string[]
          project_description: string
          project_name: string
          stage: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          commitment?: string | null
          created_at?: string | null
          equity_range?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          looking_for: string[]
          project_description: string
          project_name: string
          stage: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          commitment?: string | null
          created_at?: string | null
          equity_range?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          looking_for?: string[]
          project_description?: string
          project_name?: string
          stage?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cohort_checkins: {
        Row: {
          blockers: string[] | null
          checkin_date: string
          cohort_id: string
          community_post_id: string | null
          created_at: string | null
          help_needed: string | null
          id: string
          next_week_goals: string[] | null
          shared_publicly: boolean | null
          user_id: string
          week_number: number
          wins: string[] | null
        }
        Insert: {
          blockers?: string[] | null
          checkin_date: string
          cohort_id: string
          community_post_id?: string | null
          created_at?: string | null
          help_needed?: string | null
          id?: string
          next_week_goals?: string[] | null
          shared_publicly?: boolean | null
          user_id: string
          week_number: number
          wins?: string[] | null
        }
        Update: {
          blockers?: string[] | null
          checkin_date?: string
          cohort_id?: string
          community_post_id?: string | null
          created_at?: string | null
          help_needed?: string | null
          id?: string
          next_week_goals?: string[] | null
          shared_publicly?: boolean | null
          user_id?: string
          week_number?: number
          wins?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_checkins_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "launch_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_checkins_community_post_id_fkey"
            columns: ["community_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_members: {
        Row: {
          attendance_rate: number | null
          cohort_id: string
          current_milestone: string | null
          id: string
          joined_at: string | null
          milestones_completed: number | null
          roadmap_id: string | null
          status: string | null
          total_checkins_expected: number | null
          user_id: string
          weekly_checkins_completed: number | null
        }
        Insert: {
          attendance_rate?: number | null
          cohort_id: string
          current_milestone?: string | null
          id?: string
          joined_at?: string | null
          milestones_completed?: number | null
          roadmap_id?: string | null
          status?: string | null
          total_checkins_expected?: number | null
          user_id: string
          weekly_checkins_completed?: number | null
        }
        Update: {
          attendance_rate?: number | null
          cohort_id?: string
          current_milestone?: string | null
          id?: string
          joined_at?: string | null
          milestones_completed?: number | null
          roadmap_id?: string | null
          status?: string | null
          total_checkins_expected?: number | null
          user_id?: string
          weekly_checkins_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "launch_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "launch_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_activity_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_calls: {
        Row: {
          call_type: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiated_by: string
          metadata: Json | null
          participants: Json
          session_id: string
          started_at: string
          status: string
        }
        Insert: {
          call_type?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by: string
          metadata?: Json | null
          participants?: Json
          session_id: string
          started_at?: string
          status?: string
        }
        Update: {
          call_type?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string
          metadata?: Json | null
          participants?: Json
          session_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_calls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_files: {
        Row: {
          created_at: string
          description: string | null
          file_size_bytes: number
          file_type: string
          filename: string
          id: string
          is_public: boolean
          original_filename: string
          session_id: string
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_size_bytes: number
          file_type: string
          filename: string
          id?: string
          is_public?: boolean
          original_filename: string
          session_id: string
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_size_bytes?: number
          file_type?: string
          filename?: string
          id?: string
          is_public?: boolean
          original_filename?: string
          session_id?: string
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          reply_to_id: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "collaboration_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          session_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          session_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          session_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_polls: {
        Row: {
          allow_comments: boolean
          anonymous: boolean
          closes_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          options: Json
          poll_type: string
          session_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean
          anonymous?: boolean
          closes_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          options?: Json
          poll_type?: string
          session_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean
          anonymous?: boolean
          closes_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          options?: Json
          poll_type?: string
          session_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_sessions: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          resource_id: string
          resource_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          is_active?: boolean
          resource_id: string
          resource_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          resource_id?: string
          resource_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      collaboration_whiteboards: {
        Row: {
          background_color: string
          canvas_data: Json
          created_at: string
          created_by: string
          height: number
          id: string
          name: string
          session_id: string
          updated_at: string
          width: number
        }
        Insert: {
          background_color?: string
          canvas_data?: Json
          created_at?: string
          created_by: string
          height?: number
          id?: string
          name?: string
          session_id: string
          updated_at?: string
          width?: number
        }
        Update: {
          background_color?: string
          canvas_data?: Json
          created_at?: string
          created_by?: string
          height?: number
          id?: string
          name?: string
          session_id?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_whiteboards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_edits: {
        Row: {
          content_path: string
          created_at: string
          edit_data: Json
          edit_type: string
          id: string
          sequence_number: number
          session_id: string
          user_id: string
        }
        Insert: {
          content_path: string
          created_at?: string
          edit_data: Json
          edit_type: string
          id?: string
          sequence_number: number
          session_id: string
          user_id: string
        }
        Update: {
          content_path?: string
          created_at?: string
          edit_data?: Json
          edit_type?: string
          id?: string
          sequence_number?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_edits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_reactions: {
        Row: {
          commitment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          commitment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          commitment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_reactions_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "sprint_commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_milestones: {
        Row: {
          achieved: boolean | null
          achieved_at: string | null
          celebration_message: string | null
          created_at: string
          current_value: number | null
          id: string
          milestone_description: string | null
          milestone_title: string
          milestone_type: string
          target_value: number
          updated_at: string
        }
        Insert: {
          achieved?: boolean | null
          achieved_at?: string | null
          celebration_message?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          milestone_description?: string | null
          milestone_title: string
          milestone_type: string
          target_value: number
          updated_at?: string
        }
        Update: {
          achieved?: boolean | null
          achieved_at?: string | null
          celebration_message?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          milestone_description?: string | null
          milestone_title?: string
          milestone_type?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          metadata: Json | null
          notification_type: string
          post_id: string | null
          read: boolean
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          notification_type: string
          post_id?: string | null
          read?: boolean
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          notification_type?: string
          post_id?: string | null
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
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
          content_type: string | null
          created_at: string
          downvotes: number | null
          draft_data: Json | null
          featured_on_propel: boolean | null
          feedback_category: string[] | null
          feedback_requested: boolean | null
          feedback_status: string | null
          id: string
          is_pinned: boolean | null
          is_repost: boolean | null
          location: string | null
          media_urls: string[] | null
          original_post_id: string | null
          repost_count: number | null
          rich_content: Json | null
          share_count: number | null
          source_data: Json | null
          source_type: string | null
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
          content_type?: string | null
          created_at?: string
          downvotes?: number | null
          draft_data?: Json | null
          featured_on_propel?: boolean | null
          feedback_category?: string[] | null
          feedback_requested?: boolean | null
          feedback_status?: string | null
          id?: string
          is_pinned?: boolean | null
          is_repost?: boolean | null
          location?: string | null
          media_urls?: string[] | null
          original_post_id?: string | null
          repost_count?: number | null
          rich_content?: Json | null
          share_count?: number | null
          source_data?: Json | null
          source_type?: string | null
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
          content_type?: string | null
          created_at?: string
          downvotes?: number | null
          draft_data?: Json | null
          featured_on_propel?: boolean | null
          feedback_category?: string[] | null
          feedback_requested?: boolean | null
          feedback_status?: string | null
          id?: string
          is_pinned?: boolean | null
          is_repost?: boolean | null
          location?: string | null
          media_urls?: string[] | null
          original_post_id?: string | null
          repost_count?: number | null
          rich_content?: Json | null
          share_count?: number | null
          source_data?: Json | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_original_post_id_fkey"
            columns: ["original_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_pulse: {
        Row: {
          active_users: number | null
          avg_engagement_score: number | null
          challenges_completed: number | null
          created_at: string
          id: string
          new_users: number | null
          pulse_date: string
          total_comments: number | null
          total_posts: number | null
          total_upvotes: number | null
          trending_topics: string[] | null
          updated_at: string
        }
        Insert: {
          active_users?: number | null
          avg_engagement_score?: number | null
          challenges_completed?: number | null
          created_at?: string
          id?: string
          new_users?: number | null
          pulse_date: string
          total_comments?: number | null
          total_posts?: number | null
          total_upvotes?: number | null
          trending_topics?: string[] | null
          updated_at?: string
        }
        Update: {
          active_users?: number | null
          avg_engagement_score?: number | null
          challenges_completed?: number | null
          created_at?: string
          id?: string
          new_users?: number | null
          pulse_date?: string
          total_comments?: number | null
          total_posts?: number | null
          total_upvotes?: number | null
          trending_topics?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          admin_email_id: string | null
          admin_email_sent: boolean | null
          created_at: string
          email: string
          error_message: string | null
          id: string
          ip_address: string | null
          message: string
          name: string
          reason: string
          role: string
          user_agent: string | null
          user_email_id: string | null
          user_email_sent: boolean | null
        }
        Insert: {
          admin_email_id?: string | null
          admin_email_sent?: boolean | null
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          message: string
          name: string
          reason: string
          role: string
          user_agent?: string | null
          user_email_id?: string | null
          user_email_sent?: boolean | null
        }
        Update: {
          admin_email_id?: string | null
          admin_email_sent?: boolean | null
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          reason?: string
          role?: string
          user_agent?: string | null
          user_email_id?: string | null
          user_email_sent?: boolean | null
        }
        Relationships: []
      }
      conversation_context_cache: {
        Row: {
          business_context: Json | null
          created_at: string | null
          id: string
          query_embedding: string | null
          retrieved_chunks: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          business_context?: Json | null
          created_at?: string | null
          id?: string
          query_embedding?: string | null
          retrieved_chunks?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          business_context?: Json | null
          created_at?: string | null
          id?: string
          query_embedding?: string | null
          retrieved_chunks?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_memory: {
        Row: {
          ai_response_tone: string | null
          business_stage: string | null
          content: string
          created_at: string
          id: string
          importance_score: number | null
          last_referenced_at: string
          memory_type: string
          reference_count: number | null
          related_memories: string[] | null
          session_id: string | null
          tags: string[] | null
          title: string
          user_id: string
          user_mood: string | null
        }
        Insert: {
          ai_response_tone?: string | null
          business_stage?: string | null
          content: string
          created_at?: string
          id?: string
          importance_score?: number | null
          last_referenced_at?: string
          memory_type: string
          reference_count?: number | null
          related_memories?: string[] | null
          session_id?: string | null
          tags?: string[] | null
          title: string
          user_id: string
          user_mood?: string | null
        }
        Update: {
          ai_response_tone?: string | null
          business_stage?: string | null
          content?: string
          created_at?: string
          id?: string
          importance_score?: number | null
          last_referenced_at?: string
          memory_type?: string
          reference_count?: number | null
          related_memories?: string[] | null
          session_id?: string | null
          tags?: string[] | null
          title?: string
          user_id?: string
          user_mood?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      credit_packs: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          id: string
          label: string
          price_cents: number
          stripe_payment_link: string | null
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits: number
          id: string
          label: string
          price_cents: number
          stripe_payment_link?: string | null
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          id?: string
          label?: string
          price_cents?: number
          stripe_payment_link?: string | null
          stripe_price_id?: string | null
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
            referencedRelation: "active_subscriptions"
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
      daily_challenges: {
        Row: {
          challenge_date: string
          challenge_description: string | null
          challenge_title: string
          challenge_type: string
          completion_count: number | null
          created_at: string | null
          id: string
          participants_count: number | null
          reward_badge_id: string | null
          reward_points: number | null
        }
        Insert: {
          challenge_date: string
          challenge_description?: string | null
          challenge_title: string
          challenge_type: string
          completion_count?: number | null
          created_at?: string | null
          id?: string
          participants_count?: number | null
          reward_badge_id?: string | null
          reward_points?: number | null
        }
        Update: {
          challenge_date?: string
          challenge_description?: string | null
          challenge_title?: string
          challenge_type?: string
          completion_count?: number | null
          created_at?: string | null
          id?: string
          participants_count?: number | null
          reward_badge_id?: string | null
          reward_points?: number | null
        }
        Relationships: []
      }
      daily_check_ins: {
        Row: {
          blockers: string | null
          check_in_date: string
          completed_tasks: string[] | null
          created_at: string
          energy_level: number | null
          energy_level_end: number | null
          goal_achieved: boolean | null
          id: string
          mood_rating: number | null
          photo_url: string | null
          progress_summary: string
          reflection_note: string | null
          sprint_id: string
          streak_count: number | null
          tomorrow_focus: string | null
          updated_at: string
          user_id: string
          what_blocked_you: string | null
          what_went_well: string | null
        }
        Insert: {
          blockers?: string | null
          check_in_date?: string
          completed_tasks?: string[] | null
          created_at?: string
          energy_level?: number | null
          energy_level_end?: number | null
          goal_achieved?: boolean | null
          id?: string
          mood_rating?: number | null
          photo_url?: string | null
          progress_summary: string
          reflection_note?: string | null
          sprint_id: string
          streak_count?: number | null
          tomorrow_focus?: string | null
          updated_at?: string
          user_id: string
          what_blocked_you?: string | null
          what_went_well?: string | null
        }
        Update: {
          blockers?: string | null
          check_in_date?: string
          completed_tasks?: string[] | null
          created_at?: string
          energy_level?: number | null
          energy_level_end?: number | null
          goal_achieved?: boolean | null
          id?: string
          mood_rating?: number | null
          photo_url?: string | null
          progress_summary?: string
          reflection_note?: string | null
          sprint_id?: string
          streak_count?: number | null
          tomorrow_focus?: string | null
          updated_at?: string
          user_id?: string
          what_blocked_you?: string | null
          what_went_well?: string | null
        }
        Relationships: []
      }
      daily_priorities: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          priority_date: string
          priority_order: number
          priority_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          priority_date?: string
          priority_order?: number
          priority_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          priority_date?: string
          priority_order?: number
          priority_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_reminders: {
        Row: {
          created_at: string
          id: string
          is_sent: boolean | null
          metadata: Json | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          sprint_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sent?: boolean | null
          metadata?: Json | null
          reminder_type?: string
          scheduled_for: string
          sent_at?: string | null
          sprint_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sent?: boolean | null
          metadata?: Json | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          sprint_id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_missions: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          mission_date: string
          mission_text: string
          stage: Database["public"]["Enums"]["bizmap_stage"]
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          mission_date: string
          mission_text: string
          stage?: Database["public"]["Enums"]["bizmap_stage"]
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          mission_date?: string
          mission_text?: string
          stage?: Database["public"]["Enums"]["bizmap_stage"]
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          ai_generated: boolean | null
          blocks_task_ids: string[] | null
          business_impact_score: number | null
          completed_at: string | null
          contributes_to_weekly_mission: boolean | null
          cooldown_until: string | null
          created_at: string | null
          deadline_reached_popup_shown: boolean | null
          deadline_time: string | null
          dismissed_at: string | null
          effort_estimate: number | null
          feedback_status: string | null
          id: string
          intent_type: string | null
          is_foundational: boolean
          is_completed: boolean | null
          last_seen_at: string | null
          last_reminder_sent: string | null
          max_suggestions: number
          overdue_reminder_level: number
          overdue_reminder_sent_at: string | null
          priority: string | null
          recommendation_key: string | null
          recommendation_reason: string | null
          recommendation_status: string | null
          rescheduled_at: string | null
          rescheduled_from_date: string | null
          source_route: string | null
          source_tool: string | null
          stage_alignment_score: number | null
          startup_stage_tag: string | null
          task_date: string
          task_description: string | null
          task_source: string | null
          task_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          blocks_task_ids?: string[] | null
          business_impact_score?: number | null
          completed_at?: string | null
          contributes_to_weekly_mission?: boolean | null
          cooldown_until?: string | null
          created_at?: string | null
          deadline_reached_popup_shown?: boolean | null
          deadline_time?: string | null
          dismissed_at?: string | null
          effort_estimate?: number | null
          feedback_status?: string | null
          id?: string
          intent_type?: string | null
          is_foundational?: boolean
          is_completed?: boolean | null
          last_seen_at?: string | null
          last_reminder_sent?: string | null
          max_suggestions?: number
          overdue_reminder_level?: number
          overdue_reminder_sent_at?: string | null
          priority?: string | null
          recommendation_key?: string | null
          recommendation_reason?: string | null
          recommendation_status?: string | null
          rescheduled_at?: string | null
          rescheduled_from_date?: string | null
          source_route?: string | null
          source_tool?: string | null
          stage_alignment_score?: number | null
          startup_stage_tag?: string | null
          task_date: string
          task_description?: string | null
          task_source?: string | null
          task_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          blocks_task_ids?: string[] | null
          business_impact_score?: number | null
          completed_at?: string | null
          contributes_to_weekly_mission?: boolean | null
          cooldown_until?: string | null
          created_at?: string | null
          deadline_reached_popup_shown?: boolean | null
          deadline_time?: string | null
          dismissed_at?: string | null
          effort_estimate?: number | null
          feedback_status?: string | null
          id?: string
          intent_type?: string | null
          is_foundational?: boolean
          is_completed?: boolean | null
          last_seen_at?: string | null
          last_reminder_sent?: string | null
          max_suggestions?: number
          overdue_reminder_level?: number
          overdue_reminder_sent_at?: string | null
          priority?: string | null
          recommendation_key?: string | null
          recommendation_reason?: string | null
          recommendation_status?: string | null
          rescheduled_at?: string | null
          rescheduled_from_date?: string | null
          source_route?: string | null
          source_tool?: string | null
          stage_alignment_score?: number | null
          startup_stage_tag?: string | null
          task_date?: string
          task_description?: string | null
          task_source?: string | null
          task_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_wins: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          win_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          win_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          win_text?: string
        }
        Relationships: []
      }
      dashboard_alerts: {
        Row: {
          action_label: string | null
          action_link: string | null
          alert_type: string
          created_at: string | null
          dismissed_at: string | null
          id: string
          is_dismissed: boolean | null
          message: string
          priority: number | null
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_link?: string | null
          alert_type: string
          created_at?: string | null
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          message: string
          priority?: number | null
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_link?: string | null
          alert_type?: string
          created_at?: string | null
          dismissed_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          message?: string
          priority?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_files: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_kind: string
          file_extension: string | null
          file_size_bytes: number | null
          id: string
          is_protected: boolean
          mime_type: string | null
          origin: string
          preview_payload: Json | null
          source_id: string
          source_table: string
          storage_path: string | null
          summary: string | null
          title: string
          upload_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_kind: string
          file_extension?: string | null
          file_size_bytes?: number | null
          id?: string
          is_protected?: boolean
          mime_type?: string | null
          origin?: string
          preview_payload?: Json | null
          source_id: string
          source_table: string
          storage_path?: string | null
          summary?: string | null
          title: string
          upload_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_kind?: string
          file_extension?: string | null
          file_size_bytes?: number | null
          id?: string
          is_protected?: boolean
          mime_type?: string | null
          origin?: string
          preview_payload?: Json | null
          source_id?: string
          source_table?: string
          storage_path?: string | null
          summary?: string | null
          title?: string
          upload_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_ranking_cache: {
        Row: {
          expires_at: string
          generated_at: string
          model: string
          ordered_candidate_keys: Json
          rationale_by_key: Json
          snapshot_hash: string
          user_id: string
        }
        Insert: {
          expires_at: string
          generated_at?: string
          model: string
          ordered_candidate_keys?: Json
          rationale_by_key?: Json
          snapshot_hash: string
          user_id: string
        }
        Update: {
          expires_at?: string
          generated_at?: string
          model?: string
          ordered_candidate_keys?: Json
          rationale_by_key?: Json
          snapshot_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          created_at: string | null
          id: string
          is_visible: boolean | null
          position: number
          updated_at: string | null
          user_id: string
          widget_settings: Json | null
          widget_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          position: number
          updated_at?: string | null
          user_id: string
          widget_settings?: Json | null
          widget_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          position?: number
          updated_at?: string | null
          user_id?: string
          widget_settings?: Json | null
          widget_type?: string
        }
        Relationships: []
      }
      data_refresh_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          integration_id: string
          is_active: boolean
          job_type: string
          last_run_at: string | null
          max_retries: number
          metadata: Json | null
          next_run_at: string | null
          retry_count: number
          schedule_expression: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id: string
          is_active?: boolean
          job_type: string
          last_run_at?: string | null
          max_retries?: number
          metadata?: Json | null
          next_run_at?: string | null
          retry_count?: number
          schedule_expression: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean
          job_type?: string
          last_run_at?: string | null
          max_retries?: number
          metadata?: Json | null
          next_run_at?: string | null
          retry_count?: number
          schedule_expression?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_refresh_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_call_feedback: {
        Row: {
          created_at: string
          demo_call_id: string
          feedback_text: string | null
          id: string
          rating: number
          suggestions: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          demo_call_id: string
          feedback_text?: string | null
          id?: string
          rating: number
          suggestions?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          demo_call_id?: string
          feedback_text?: string | null
          id?: string
          rating?: number
          suggestions?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_demo_call_feedback_demo_call_id"
            columns: ["demo_call_id"]
            isOneToOne: false
            referencedRelation: "demo_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_call_participants: {
        Row: {
          created_at: string
          demo_call_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demo_call_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demo_call_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_demo_call_participants_demo_call_id"
            columns: ["demo_call_id"]
            isOneToOne: false
            referencedRelation: "demo_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_call_recordings: {
        Row: {
          created_at: string
          demo_call_id: string
          duration_seconds: number | null
          file_path: string
          file_size_bytes: number | null
          id: string
          is_public: boolean
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          demo_call_id: string
          duration_seconds?: number | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_public?: boolean
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          demo_call_id?: string
          duration_seconds?: number | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_public?: boolean
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_demo_call_recordings_demo_call_id"
            columns: ["demo_call_id"]
            isOneToOne: false
            referencedRelation: "demo_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_calls: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_public: boolean
          max_participants: number
          meeting_url: string | null
          recording_url: string | null
          scheduled_at: string
          sprint_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_public?: boolean
          max_participants?: number
          meeting_url?: string | null
          recording_url?: string | null
          scheduled_at: string
          sprint_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_public?: boolean
          max_participants?: number
          meeting_url?: string | null
          recording_url?: string | null
          scheduled_at?: string
          sprint_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          content: string
          content_tokens: number | null
          created_at: string | null
          document_type: string
          embedding: string | null
          id: string
          importance_score: number | null
          metadata: Json | null
          section: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          content_tokens?: number | null
          created_at?: string | null
          document_type: string
          embedding?: string | null
          id?: string
          importance_score?: number | null
          metadata?: Json | null
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_tokens?: number | null
          created_at?: string | null
          document_type?: string
          embedding?: string | null
          id?: string
          importance_score?: number | null
          metadata?: Json | null
          section?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      featured_content: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          display_order: number | null
          expires_at: string
          featured_at: string
          featured_by: string | null
          featured_reason: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          display_order?: number | null
          expires_at?: string
          featured_at?: string
          featured_by?: string | null
          featured_reason?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          display_order?: number | null
          expires_at?: string
          featured_at?: string
          featured_by?: string | null
          featured_reason?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      file_access_logs: {
        Row: {
          access_type: string
          created_at: string
          file_id: string
          id: string
          user_id: string
        }
        Insert: {
          access_type: string
          created_at?: string
          file_id: string
          id?: string
          user_id: string
        }
        Update: {
          access_type?: string
          created_at?: string
          file_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_access_logs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "collaboration_files"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_funnel_ai_sessions: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          decisions_made: Json
          id: string
          insights: Json
          last_message_at: string | null
          messages: Json
          session_mode: string
          session_title: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          decisions_made?: Json
          id?: string
          insights?: Json
          last_message_at?: string | null
          messages?: Json
          session_mode?: string
          session_title?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          decisions_made?: Json
          id?: string
          insights?: Json
          last_message_at?: string | null
          messages?: Json
          session_mode?: string
          session_title?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_funnel_goals: {
        Row: {
          ai_context: Json
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          goal_type: string | null
          id: string
          key_results: Json
          last_ai_review: string | null
          priority: number
          progress_percentage: number
          started_at: string | null
          status: string
          success_criteria: Json
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_context?: Json
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          goal_type?: string | null
          id?: string
          key_results?: Json
          last_ai_review?: string | null
          priority?: number
          progress_percentage?: number
          started_at?: string | null
          status?: string
          success_criteria?: Json
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_context?: Json
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          goal_type?: string | null
          id?: string
          key_results?: Json
          last_ai_review?: string | null
          priority?: number
          progress_percentage?: number
          started_at?: string | null
          status?: string
          success_criteria?: Json
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_funnel_momentum: {
        Row: {
          ai_recommendations: string[]
          analysis_date: string
          created_at: string
          distraction_time_minutes: number
          focus_time_minutes: number
          id: string
          momentum_score: number
          patterns: Json
          period_type: string
          reviewed: boolean
          reviewed_at: string | null
          tasks_completed: number
          tasks_deferred: number
          tasks_overdue: number
          tasks_planned: number
          time_leaks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_recommendations?: string[]
          analysis_date: string
          created_at?: string
          distraction_time_minutes?: number
          focus_time_minutes?: number
          id?: string
          momentum_score?: number
          patterns?: Json
          period_type?: string
          reviewed?: boolean
          reviewed_at?: string | null
          tasks_completed?: number
          tasks_deferred?: number
          tasks_overdue?: number
          tasks_planned?: number
          time_leaks?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_recommendations?: string[]
          analysis_date?: string
          created_at?: string
          distraction_time_minutes?: number
          focus_time_minutes?: number
          id?: string
          momentum_score?: number
          patterns?: Json
          period_type?: string
          reviewed?: boolean
          reviewed_at?: string | null
          tasks_completed?: number
          tasks_deferred?: number
          tasks_overdue?: number
          tasks_planned?: number
          time_leaks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_funnel_projects: {
        Row: {
          actual_hours: number
          ai_context: Json
          blocked_at: string | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          estimated_hours: number | null
          goal_id: string | null
          id: string
          priority: number
          progress_percentage: number
          start_date: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_hours?: number
          ai_context?: Json
          blocked_at?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          estimated_hours?: number | null
          goal_id?: string | null
          id?: string
          priority?: number
          progress_percentage?: number
          start_date?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_hours?: number
          ai_context?: Json
          blocked_at?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          estimated_hours?: number | null
          goal_id?: string | null
          id?: string
          priority?: number
          progress_percentage?: number
          start_date?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_funnel_projects_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "focus_funnel_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_funnel_tasks: {
        Row: {
          actual_minutes: number | null
          ai_generated: boolean
          ai_rationale: string | null
          blocked_by_task_ids: string[]
          blocks_task_ids: string[]
          business_impact_score: number
          completed_at: string | null
          computed_priority_score: number
          created_at: string
          deadline: string | null
          deferred_to: string | null
          description: string | null
          display_order: number
          effort_score: number
          estimated_minutes: number
          goal_id: string | null
          id: string
          notes: string | null
          priority: string
          project_id: string | null
          scheduled_date: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          urgency_score: number
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          ai_generated?: boolean
          ai_rationale?: string | null
          blocked_by_task_ids?: string[]
          blocks_task_ids?: string[]
          business_impact_score?: number
          completed_at?: string | null
          computed_priority_score?: number
          created_at?: string
          deadline?: string | null
          deferred_to?: string | null
          description?: string | null
          display_order?: number
          effort_score?: number
          estimated_minutes?: number
          goal_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          project_id?: string | null
          scheduled_date?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          urgency_score?: number
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          ai_generated?: boolean
          ai_rationale?: string | null
          blocked_by_task_ids?: string[]
          blocks_task_ids?: string[]
          business_impact_score?: number
          completed_at?: string | null
          computed_priority_score?: number
          created_at?: string
          deadline?: string | null
          deferred_to?: string | null
          description?: string | null
          display_order?: number
          effort_score?: number
          estimated_minutes?: number
          goal_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          project_id?: string | null
          scheduled_date?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          urgency_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_funnel_tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "focus_funnel_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_funnel_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "focus_funnel_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_analytics: {
        Row: {
          cohort_participation_rate: number | null
          community_feedback_received: number | null
          created_at: string | null
          customer_count: number | null
          id: string
          milestones_reached: number | null
          mrr_usd: number | null
          period_end: string
          period_start: string
          period_type: string
          recommendations: string[] | null
          revenue_usd: number | null
          risk_factors: Json | null
          roadmap_id: string | null
          success_indicators: Json | null
          tasks_completed: number | null
          user_id: string
          validation_score_change: number | null
          velocity_score: number | null
        }
        Insert: {
          cohort_participation_rate?: number | null
          community_feedback_received?: number | null
          created_at?: string | null
          customer_count?: number | null
          id?: string
          milestones_reached?: number | null
          mrr_usd?: number | null
          period_end: string
          period_start: string
          period_type: string
          recommendations?: string[] | null
          revenue_usd?: number | null
          risk_factors?: Json | null
          roadmap_id?: string | null
          success_indicators?: Json | null
          tasks_completed?: number | null
          user_id: string
          validation_score_change?: number | null
          velocity_score?: number | null
        }
        Update: {
          cohort_participation_rate?: number | null
          community_feedback_received?: number | null
          created_at?: string | null
          customer_count?: number | null
          id?: string
          milestones_reached?: number | null
          mrr_usd?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          recommendations?: string[] | null
          revenue_usd?: number | null
          risk_factors?: Json | null
          roadmap_id?: string | null
          success_indicators?: Json | null
          tasks_completed?: number | null
          user_id?: string
          validation_score_change?: number | null
          velocity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_analytics_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "launch_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_journey_gifs: {
        Row: {
          created_at: string | null
          gif_url: string
          id: string
          is_active: boolean | null
          position: number
          storage_path: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          gif_url: string
          id?: string
          is_active?: boolean | null
          position?: number
          storage_path: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          gif_url?: string
          id?: string
          is_active?: boolean | null
          position?: number
          storage_path?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      founder_milestones: {
        Row: {
          achieved_at: string
          created_at: string | null
          description: string | null
          id: string
          is_pinned: boolean | null
          milestone_type: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          milestone_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          milestone_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_profiles: {
        Row: {
          available_resources: Json | null
          created_at: string
          decision_making_style: string | null
          domain_expertise: string[] | null
          entrepreneurial_experience: string | null
          id: string
          key_constraints: Json | null
          last_updated: string | null
          learning_preferences: string[] | null
          preferred_detail_level: string | null
          preferred_pace: string | null
          preferred_tone: string | null
          previous_ventures: Json | null
          primary_goals: string[] | null
          profile_completeness: number | null
          risk_tolerance: string | null
          skill_gaps: string[] | null
          success_definition: string | null
          user_id: string
        }
        Insert: {
          available_resources?: Json | null
          created_at?: string
          decision_making_style?: string | null
          domain_expertise?: string[] | null
          entrepreneurial_experience?: string | null
          id?: string
          key_constraints?: Json | null
          last_updated?: string | null
          learning_preferences?: string[] | null
          preferred_detail_level?: string | null
          preferred_pace?: string | null
          preferred_tone?: string | null
          previous_ventures?: Json | null
          primary_goals?: string[] | null
          profile_completeness?: number | null
          risk_tolerance?: string | null
          skill_gaps?: string[] | null
          success_definition?: string | null
          user_id: string
        }
        Update: {
          available_resources?: Json | null
          created_at?: string
          decision_making_style?: string | null
          domain_expertise?: string[] | null
          entrepreneurial_experience?: string | null
          id?: string
          key_constraints?: Json | null
          last_updated?: string | null
          learning_preferences?: string[] | null
          preferred_detail_level?: string | null
          preferred_pace?: string | null
          preferred_tone?: string | null
          previous_ventures?: Json | null
          primary_goals?: string[] | null
          profile_completeness?: number | null
          risk_tolerance?: string | null
          skill_gaps?: string[] | null
          success_definition?: string | null
          user_id?: string
        }
        Relationships: []
      }
      founder_skills: {
        Row: {
          created_at: string | null
          id: string
          proficiency_level: string | null
          skill_category: string | null
          skill_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          proficiency_level?: string | null
          skill_category?: string | null
          skill_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          proficiency_level?: string | null
          skill_category?: string | null
          skill_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_testimonials: {
        Row: {
          author_company: string | null
          author_name: string
          author_role: string | null
          created_at: string | null
          id: string
          is_featured: boolean | null
          testimonial_text: string
          user_id: string
        }
        Insert: {
          author_company?: string | null
          author_name: string
          author_role?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          testimonial_text: string
          user_id: string
        }
        Update: {
          author_company?: string | null
          author_name?: string
          author_role?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          testimonial_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_testimonials_user_id_fkey"
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
      function_idempotency: {
        Row: {
          created_at: string
          id: string
          result: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id: string
          result?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          result?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      accelerator_views: {
        Row: {
          accelerator_id: string | null
          id: string
          subscription_tier: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          accelerator_id?: string | null
          id?: string
          subscription_tier: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          accelerator_id?: string | null
          id?: string
          subscription_tier?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accelerator_views_accelerator_id_fkey"
            columns: ["accelerator_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_opportunities: {
        Row: {
          application_deadline_info: string | null
          application_url: string | null
          cohort_geography: string[]
          created_at: string
          description: string
          equity_taken: string | null
          focus_sectors: string[]
          focus_stage: string[]
          funding_amount: string | null
          funding_offered: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          keywords: string[] | null
          location: string[] | null
          logo_url: string | null
          notable_alumni: Json
          program_duration: string | null
          program_format: string | null
          slug: string | null
          title: string
          type: string
          updated_at: string
          url: string
          website_url: string | null
        }
        Insert: {
          application_deadline_info?: string | null
          application_url?: string | null
          cohort_geography?: string[]
          created_at?: string
          description: string
          equity_taken?: string | null
          focus_sectors?: string[]
          focus_stage?: string[]
          funding_amount?: string | null
          funding_offered?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          keywords?: string[] | null
          location?: string[] | null
          logo_url?: string | null
          notable_alumni?: Json
          program_duration?: string | null
          program_format?: string | null
          slug?: string | null
          title: string
          type: string
          updated_at?: string
          url: string
          website_url?: string | null
        }
        Update: {
          application_deadline_info?: string | null
          application_url?: string | null
          cohort_geography?: string[]
          created_at?: string
          description?: string
          equity_taken?: string | null
          focus_sectors?: string[]
          focus_stage?: string[]
          funding_amount?: string | null
          funding_offered?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          keywords?: string[] | null
          location?: string[] | null
          logo_url?: string | null
          notable_alumni?: Json
          program_duration?: string | null
          program_format?: string | null
          slug?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string
          website_url?: string | null
        }
        Relationships: []
      }
      fundraising_readiness_assessments: {
        Row: {
          analysis_data: Json
          average_score: number
          business_model: string | null
          competitive_positioning_score: number | null
          created_at: string | null
          demand_validated_score: number | null
          feedback_score: number | null
          founder_experience: string | null
          founder_market_fit_score: number | null
          founder_stage: string | null
          funding_amount_needed: number | null
          funding_defined_score: number | null
          gtm_strategy_score: number | null
          id: string
          industry: string | null
          investor_network_score: number | null
          legal_readiness_score: number | null
          market_size_score: number | null
          meets_investor_threshold: boolean | null
          milestone_achieved_score: number | null
          mvp_score: number | null
          mvp_working_score: number | null
          pitch_deck_score: number | null
          pitch_summary: string | null
          primary_location: string | null
          product_live_score: number | null
          runway_score: number | null
          team_complementary_score: number | null
          team_experience_score: number | null
          team_score: number | null
          traction_revenue_score: number | null
          traction_score: number | null
          unit_economics_score: number | null
          user_id: string
          verdict: string
        }
        Insert: {
          analysis_data: Json
          average_score: number
          business_model?: string | null
          competitive_positioning_score?: number | null
          created_at?: string | null
          demand_validated_score?: number | null
          feedback_score?: number | null
          founder_experience?: string | null
          founder_market_fit_score?: number | null
          founder_stage?: string | null
          funding_amount_needed?: number | null
          funding_defined_score?: number | null
          gtm_strategy_score?: number | null
          id?: string
          industry?: string | null
          investor_network_score?: number | null
          legal_readiness_score?: number | null
          market_size_score?: number | null
          meets_investor_threshold?: boolean | null
          milestone_achieved_score?: number | null
          mvp_score?: number | null
          mvp_working_score?: number | null
          pitch_deck_score?: number | null
          pitch_summary?: string | null
          primary_location?: string | null
          product_live_score?: number | null
          runway_score?: number | null
          team_complementary_score?: number | null
          team_experience_score?: number | null
          team_score?: number | null
          traction_revenue_score?: number | null
          traction_score?: number | null
          unit_economics_score?: number | null
          user_id: string
          verdict: string
        }
        Update: {
          analysis_data?: Json
          average_score?: number
          business_model?: string | null
          competitive_positioning_score?: number | null
          created_at?: string | null
          demand_validated_score?: number | null
          feedback_score?: number | null
          founder_experience?: string | null
          founder_market_fit_score?: number | null
          founder_stage?: string | null
          funding_amount_needed?: number | null
          funding_defined_score?: number | null
          gtm_strategy_score?: number | null
          id?: string
          industry?: string | null
          investor_network_score?: number | null
          legal_readiness_score?: number | null
          market_size_score?: number | null
          meets_investor_threshold?: boolean | null
          milestone_achieved_score?: number | null
          mvp_score?: number | null
          mvp_working_score?: number | null
          pitch_deck_score?: number | null
          pitch_summary?: string | null
          primary_location?: string | null
          product_live_score?: number | null
          runway_score?: number | null
          team_complementary_score?: number | null
          team_experience_score?: number | null
          team_score?: number | null
          traction_revenue_score?: number | null
          traction_score?: number | null
          unit_economics_score?: number | null
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      gtm_plans: {
        Row: {
          created_at: string
          exported_at: string | null
          id: string
          plan_content: Json
          plan_title: string
          saved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exported_at?: string | null
          id?: string
          plan_content?: Json
          plan_title: string
          saved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exported_at?: string | null
          id?: string
          plan_content?: Json
          plan_title?: string
          saved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hero_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          position: number
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          position: number
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          position?: number
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      icp_analysis_results: {
        Row: {
          analysis_data: Json
          business_description: string
          created_at: string | null
          id: string
          industry: string | null
          niche_score: number | null
          target_audience: string | null
          updated_at: string | null
          user_id: string
          verdict: string | null
        }
        Insert: {
          analysis_data: Json
          business_description: string
          created_at?: string | null
          id?: string
          industry?: string | null
          niche_score?: number | null
          target_audience?: string | null
          updated_at?: string | null
          user_id: string
          verdict?: string | null
        }
        Update: {
          analysis_data?: Json
          business_description?: string
          created_at?: string | null
          id?: string
          industry?: string | null
          niche_score?: number | null
          target_audience?: string | null
          updated_at?: string | null
          user_id?: string
          verdict?: string | null
        }
        Relationships: []
      }
      integration_webhook_secrets: {
        Row: {
          created_at: string
          id: string
          integration_webhook_id: string
          secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_webhook_id: string
          secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_webhook_id?: string
          secret?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhook_secrets_integration_webhook_id_fkey"
            columns: ["integration_webhook_id"]
            isOneToOne: true
            referencedRelation: "integration_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhooks: {
        Row: {
          created_at: string
          event_types: string[]
          id: string
          integration_id: string
          is_active: boolean
          last_received_at: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          event_types: string[]
          id?: string
          integration_id: string
          is_active?: boolean
          last_received_at?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          event_types?: string[]
          id?: string
          integration_id?: string
          is_active?: boolean
          last_received_at?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhooks_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          angellist_url: string | null
          application_url: string | null
          contact_preference: string | null
          created_at: string | null
          crunchbase_url: string | null
          data_source: string | null
          email: string | null
          facebook_url: string | null
          firm_name: string
          firm_website: string | null
          geographic_focus: string[]
          header_image_url: string | null
          id: string
          industries: string[]
          instagram_url: string | null
          investment_stages: string[]
          investment_thesis: string | null
          investor_type: string
          is_active: boolean | null
          is_featured: boolean | null
          last_investment_date: string | null
          last_updated: string | null
          linkedin_url: string | null
          locations: string[]
          logo_url: string | null
          match_score_boost: number | null
          medium_url: string | null
          name: string
          portfolio_companies: Json | null
          recent_investments_count: number | null
          remote_friendly: boolean | null
          requires_warm_intro: boolean | null
          response_rate_percentage: number | null
          slug: string
          total_portfolio_count: number | null
          twitter_url: string | null
          typical_check_size_max: number | null
          typical_check_size_min: number | null
          typical_timeline_days: number | null
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          angellist_url?: string | null
          application_url?: string | null
          contact_preference?: string | null
          created_at?: string | null
          crunchbase_url?: string | null
          data_source?: string | null
          email?: string | null
          facebook_url?: string | null
          firm_name: string
          firm_website?: string | null
          geographic_focus?: string[]
          header_image_url?: string | null
          id?: string
          industries?: string[]
          instagram_url?: string | null
          investment_stages?: string[]
          investment_thesis?: string | null
          investor_type?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          last_investment_date?: string | null
          last_updated?: string | null
          linkedin_url?: string | null
          locations?: string[]
          logo_url?: string | null
          match_score_boost?: number | null
          medium_url?: string | null
          name: string
          portfolio_companies?: Json | null
          recent_investments_count?: number | null
          remote_friendly?: boolean | null
          requires_warm_intro?: boolean | null
          response_rate_percentage?: number | null
          slug: string
          total_portfolio_count?: number | null
          twitter_url?: string | null
          typical_check_size_max?: number | null
          typical_check_size_min?: number | null
          typical_timeline_days?: number | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          angellist_url?: string | null
          application_url?: string | null
          contact_preference?: string | null
          created_at?: string | null
          crunchbase_url?: string | null
          data_source?: string | null
          email?: string | null
          facebook_url?: string | null
          firm_name?: string
          firm_website?: string | null
          geographic_focus?: string[]
          header_image_url?: string | null
          id?: string
          industries?: string[]
          instagram_url?: string | null
          investment_stages?: string[]
          investment_thesis?: string | null
          investor_type?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          last_investment_date?: string | null
          last_updated?: string | null
          linkedin_url?: string | null
          locations?: string[]
          logo_url?: string | null
          match_score_boost?: number | null
          medium_url?: string | null
          name?: string
          portfolio_companies?: Json | null
          recent_investments_count?: number | null
          remote_friendly?: boolean | null
          requires_warm_intro?: boolean | null
          response_rate_percentage?: number | null
          slug?: string
          total_portfolio_count?: number | null
          twitter_url?: string | null
          typical_check_size_max?: number | null
          typical_check_size_min?: number | null
          typical_timeline_days?: number | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          admin_notes: string | null
          cover_message: string | null
          created_at: string
          cv_file_path: string
          email: string
          id: string
          linkedin_url: string
          name: string
          portfolio_url: string | null
          position_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          cover_message?: string | null
          created_at?: string
          cv_file_path: string
          email: string
          id?: string
          linkedin_url: string
          name: string
          portfolio_url?: string | null
          position_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          cover_message?: string | null
          created_at?: string
          cv_file_path?: string
          email?: string
          id?: string
          linkedin_url?: string
          name?: string
          portfolio_url?: string | null
          position_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          requirements: string[]
          responsibilities: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          requirements?: string[]
          responsibilities?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          requirements?: string[]
          responsibilities?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          content: string
          content_tokens: number | null
          created_at: string | null
          document_type: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          section_id: string | null
          source: string | null
          source_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          content_tokens?: number | null
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          section_id?: string | null
          source?: string | null
          source_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_tokens?: number | null
          created_at?: string | null
          document_type?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          section_id?: string | null
          source?: string | null
          source_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kpi_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          goal_name: string
          goal_type: string
          id: string
          is_active: boolean | null
          period: string | null
          target_value: number
          trend_percentage: number | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          goal_name: string
          goal_type: string
          id?: string
          is_active?: boolean | null
          period?: string | null
          target_value: number
          trend_percentage?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          goal_name?: string
          goal_type?: string
          id?: string
          is_active?: boolean | null
          period?: string | null
          target_value?: number
          trend_percentage?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      launch_cohorts: {
        Row: {
          cohort_name: string
          cohort_number: number | null
          cohort_type: string
          created_at: string | null
          demo_day_date: string | null
          end_date: string
          id: string
          member_count: number | null
          start_date: string
          status: string | null
          updated_at: string | null
          weekly_checkin_day: string | null
        }
        Insert: {
          cohort_name: string
          cohort_number?: number | null
          cohort_type: string
          created_at?: string | null
          demo_day_date?: string | null
          end_date: string
          id?: string
          member_count?: number | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          weekly_checkin_day?: string | null
        }
        Update: {
          cohort_name?: string
          cohort_number?: number | null
          cohort_type?: string
          created_at?: string | null
          demo_day_date?: string | null
          end_date?: string
          id?: string
          member_count?: number | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          weekly_checkin_day?: string | null
        }
        Relationships: []
      }
      launch_roadmaps: {
        Row: {
          business_idea: string
          completed_tasks: number | null
          created_at: string | null
          current_day: number | null
          current_week: number | null
          first_customer_date: string | null
          id: string
          progress_percentage: number | null
          session_id: string | null
          start_date: string
          status: string | null
          target_launch_date: string
          total_tasks: number | null
          updated_at: string | null
          user_id: string
          week1_validated: boolean | null
          week2_mvp_built: boolean | null
          week3_launched: boolean | null
          week4_first_customer: boolean | null
        }
        Insert: {
          business_idea: string
          completed_tasks?: number | null
          created_at?: string | null
          current_day?: number | null
          current_week?: number | null
          first_customer_date?: string | null
          id?: string
          progress_percentage?: number | null
          session_id?: string | null
          start_date: string
          status?: string | null
          target_launch_date: string
          total_tasks?: number | null
          updated_at?: string | null
          user_id: string
          week1_validated?: boolean | null
          week2_mvp_built?: boolean | null
          week3_launched?: boolean | null
          week4_first_customer?: boolean | null
        }
        Update: {
          business_idea?: string
          completed_tasks?: number | null
          created_at?: string | null
          current_day?: number | null
          current_week?: number | null
          first_customer_date?: string | null
          id?: string
          progress_percentage?: number | null
          session_id?: string | null
          start_date?: string
          status?: string | null
          target_launch_date?: string
          total_tasks?: number | null
          updated_at?: string | null
          user_id?: string
          week1_validated?: boolean | null
          week2_mvp_built?: boolean | null
          week3_launched?: boolean | null
          week4_first_customer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_roadmaps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_comments: {
        Row: {
          content: string
          context_path: string | null
          created_at: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          context_path?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          context_path?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data_sources: {
        Row: {
          api_endpoint: string | null
          created_at: string
          id: string
          is_active: boolean
          last_updated_at: string | null
          metadata: Json | null
          rate_limit_per_hour: number | null
          source_name: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_updated_at?: string | null
          metadata?: Json | null
          rate_limit_per_hour?: number | null
          source_name: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_updated_at?: string | null
          metadata?: Json | null
          rate_limit_per_hour?: number | null
          source_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_insights_cache: {
        Row: {
          cache_key: string
          confidence_score: number | null
          created_at: string
          data_sources: string[] | null
          expires_at: string
          id: string
          insights_data: Json
          query_params: Json
        }
        Insert: {
          cache_key: string
          confidence_score?: number | null
          created_at?: string
          data_sources?: string[] | null
          expires_at?: string
          id?: string
          insights_data: Json
          query_params: Json
        }
        Update: {
          cache_key?: string
          confidence_score?: number | null
          created_at?: string
          data_sources?: string[] | null
          expires_at?: string
          id?: string
          insights_data?: Json
          query_params?: Json
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          created_at: string
          data_payload: Json
          data_type: string
          expires_at: string
          freshness_score: number | null
          geographic_region: string | null
          id: string
          industry: string | null
          keywords: string[] | null
          relevance_score: number | null
          source_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_payload: Json
          data_type: string
          expires_at?: string
          freshness_score?: number | null
          geographic_region?: string | null
          id?: string
          industry?: string | null
          keywords?: string[] | null
          relevance_score?: number | null
          source_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_payload?: Json
          data_type?: string
          expires_at?: string
          freshness_score?: number | null
          geographic_region?: string | null
          id?: string
          industry?: string | null
          keywords?: string[] | null
          relevance_score?: number | null
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_intelligence_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "market_data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      market_validation_scores: {
        Row: {
          business_idea: string
          competition_score: number | null
          competitor_count: number | null
          competitor_gaps: Json | null
          confidence_level: string | null
          created_at: string | null
          data_sources: Json | null
          demand_score: number | null
          demand_trends: Json | null
          differentiation_opportunities: string[] | null
          estimated_market_size_usd: number | null
          id: string
          industry: string | null
          market_size_score: number | null
          overall_validation_score: number | null
          search_volume_data: Json | null
          session_id: string | null
          target_market: string | null
          top_competitors: Json | null
          updated_at: string | null
          user_id: string
          validation_date: string | null
        }
        Insert: {
          business_idea: string
          competition_score?: number | null
          competitor_count?: number | null
          competitor_gaps?: Json | null
          confidence_level?: string | null
          created_at?: string | null
          data_sources?: Json | null
          demand_score?: number | null
          demand_trends?: Json | null
          differentiation_opportunities?: string[] | null
          estimated_market_size_usd?: number | null
          id?: string
          industry?: string | null
          market_size_score?: number | null
          overall_validation_score?: number | null
          search_volume_data?: Json | null
          session_id?: string | null
          target_market?: string | null
          top_competitors?: Json | null
          updated_at?: string | null
          user_id: string
          validation_date?: string | null
        }
        Update: {
          business_idea?: string
          competition_score?: number | null
          competitor_count?: number | null
          competitor_gaps?: Json | null
          confidence_level?: string | null
          created_at?: string | null
          data_sources?: Json | null
          demand_score?: number | null
          demand_trends?: Json | null
          differentiation_opportunities?: string[] | null
          estimated_market_size_usd?: number | null
          id?: string
          industry?: string | null
          market_size_score?: number | null
          overall_validation_score?: number | null
          search_volume_data?: Json | null
          session_id?: string | null
          target_market?: string | null
          top_competitors?: Json | null
          updated_at?: string | null
          user_id?: string
          validation_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_validation_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_user_link_backup: {
        Row: {
          backed_up_at: string
          backup_id: number
          mentor_id: string
          mentor_name: string | null
          old_user_email: string | null
          old_user_full_name: string | null
          old_user_id: string | null
        }
        Insert: {
          backed_up_at?: string
          backup_id?: never
          mentor_id: string
          mentor_name?: string | null
          old_user_email?: string | null
          old_user_full_name?: string | null
          old_user_id?: string | null
        }
        Update: {
          backed_up_at?: string
          backup_id?: never
          mentor_id?: string
          mentor_name?: string | null
          old_user_email?: string | null
          old_user_full_name?: string | null
          old_user_id?: string | null
        }
        Relationships: []
      }
      mentors: {
        Row: {
          availability: Json | null
          bio: string
          booking_provider: string
          calendly_url: string | null
          created_at: string
          currency: string | null
          expertise: string[] | null
          hourly_rate: number
          hourly_rate_per_hour: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          linkedin_url: string | null
          name: string
          nationality: string | null
          picture: string | null
          rating: number | null
          review_count: number | null
          stripe_connected_account_id: string | null
          twitter_x_url: string | null
          universities: string[] | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          availability?: Json | null
          bio: string
          booking_provider?: string
          calendly_url?: string | null
          created_at?: string
          currency?: string | null
          expertise?: string[] | null
          hourly_rate?: number
          hourly_rate_per_hour?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          linkedin_url?: string | null
          name: string
          nationality?: string | null
          picture?: string | null
          rating?: number | null
          review_count?: number | null
          stripe_connected_account_id?: string | null
          twitter_x_url?: string | null
          universities?: string[] | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          availability?: Json | null
          bio?: string
          booking_provider?: string
          calendly_url?: string | null
          created_at?: string
          currency?: string | null
          expertise?: string[] | null
          hourly_rate?: number
          hourly_rate_per_hour?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          linkedin_url?: string | null
          name?: string
          nationality?: string | null
          picture?: string | null
          rating?: number | null
          review_count?: number | null
          stripe_connected_account_id?: string | null
          twitter_x_url?: string | null
          universities?: string[] | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      mentor_saves: {
        Row: {
          created_at: string
          id: string
          matched_sectors: string[]
          matched_support_areas: string[]
          mentor_id: string
          recommendation_reason: string | null
          recommended_at: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_sectors?: string[]
          matched_support_areas?: string[]
          mentor_id: string
          recommendation_reason?: string | null
          recommended_at?: string | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_sectors?: string[]
          matched_support_areas?: string[]
          mentor_id?: string
          recommendation_reason?: string | null
          recommended_at?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_saves_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          banner_focal_x: number | null
          banner_focal_y: number | null
          banner_url: string | null
          booking_provider: string
          booking_url: string | null
          category: string
          created_at: string
          delivered_by_picture_focal_x: number | null
          delivered_by_picture_focal_y: number | null
          delivered_by_name: string | null
          delivered_by_picture_url: string | null
          delivered_by_user_id: string | null
          delivered_by_email: string | null
          description: string
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          pitch_deck_type: string | null
          pitch_deck_url: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          banner_focal_x?: number | null
          banner_focal_y?: number | null
          banner_url?: string | null
          booking_provider?: string
          booking_url?: string | null
          category: string
          created_at?: string
          delivered_by_picture_focal_x?: number | null
          delivered_by_picture_focal_y?: number | null
          delivered_by_name?: string | null
          delivered_by_picture_url?: string | null
          delivered_by_user_id?: string | null
          delivered_by_email?: string | null
          description: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          pitch_deck_type?: string | null
          pitch_deck_url?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          banner_focal_x?: number | null
          banner_focal_y?: number | null
          banner_url?: string | null
          booking_provider?: string
          booking_url?: string | null
          category?: string
          created_at?: string
          delivered_by_picture_focal_x?: number | null
          delivered_by_picture_focal_y?: number | null
          delivered_by_name?: string | null
          delivered_by_picture_url?: string | null
          delivered_by_user_id?: string | null
          delivered_by_email?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          pitch_deck_type?: string | null
          pitch_deck_url?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_email_notifications: {
        Row: {
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          message_id: string
          metadata: Json
          net_request_id: number | null
          recipient_id: string
          resend_email_id: string | null
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          message_id: string
          metadata?: Json
          net_request_id?: number | null
          recipient_id: string
          resend_email_id?: string | null
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          message_id?: string
          metadata?: Json
          net_request_id?: number | null
          recipient_id?: string
          resend_email_id?: string | null
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_email_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_email_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_messages_conversation_id"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_builder_artifacts: {
        Row: {
          created_at: string
          id: string
          saved_at: string | null
          scope_summary: string
          scope_title: string
          spec_json: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          saved_at?: string | null
          scope_summary: string
          scope_title: string
          spec_json?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          saved_at?: string | null
          scope_summary?: string
          scope_title?: string
          spec_json?: Json
          status?: string
          updated_at?: string
          user_id?: string
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
      page_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          session_id: string
          time_spent: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          session_id: string
          time_spent?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string
          time_spent?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      page_feedback: {
        Row: {
          admin_notes: string | null
          browser_info: Json | null
          created_at: string
          feedback_type: string
          id: string
          message: string
          page_path: string | null
          page_title: string | null
          rating: number | null
          resolved_at: string | null
          screenshot_url: string | null
          session_id: string | null
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          was_helpful: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: Json | null
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          page_path?: string | null
          page_title?: string | null
          rating?: number | null
          resolved_at?: string | null
          screenshot_url?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          browser_info?: Json | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          page_path?: string | null
          page_title?: string | null
          rating?: number | null
          resolved_at?: string | null
          screenshot_url?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Relationships: []
      }
      personalized_recommendations: {
        Row: {
          action_url: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_completed: boolean | null
          is_dismissed: boolean | null
          metadata: Json | null
          priority: number | null
          reason: string | null
          recommendation_type: string
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_dismissed?: boolean | null
          metadata?: Json | null
          priority?: number | null
          reason?: string | null
          recommendation_type: string
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_dismissed?: boolean | null
          metadata?: Json | null
          priority?: number | null
          reason?: string | null
          recommendation_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pitch_deck_analyses: {
        Row: {
          analysis_version: string | null
          business_model_score: number | null
          created_at: string | null
          feedback_submitted_at: string | null
          file_name: string
          file_size: number | null
          fundraising_readiness_score: number | null
          id: string
          key_insights: Json | null
          market_opportunity_score: number | null
          overall_score: number | null
          recommendations: string[] | null
          storage_path: string | null
          story_clarity_score: number | null
          strengths: string[] | null
          team_credibility_score: number | null
          traction_proof_score: number | null
          updated_at: string | null
          user_feedback: string | null
          user_id: string
          user_rating: number | null
          verdict: string | null
          weaknesses: string[] | null
        }
        Insert: {
          analysis_version?: string | null
          business_model_score?: number | null
          created_at?: string | null
          feedback_submitted_at?: string | null
          file_name: string
          file_size?: number | null
          fundraising_readiness_score?: number | null
          id?: string
          key_insights?: Json | null
          market_opportunity_score?: number | null
          overall_score?: number | null
          recommendations?: string[] | null
          storage_path?: string | null
          story_clarity_score?: number | null
          strengths?: string[] | null
          team_credibility_score?: number | null
          traction_proof_score?: number | null
          updated_at?: string | null
          user_feedback?: string | null
          user_id: string
          user_rating?: number | null
          verdict?: string | null
          weaknesses?: string[] | null
        }
        Update: {
          analysis_version?: string | null
          business_model_score?: number | null
          created_at?: string | null
          feedback_submitted_at?: string | null
          file_name?: string
          file_size?: number | null
          fundraising_readiness_score?: number | null
          id?: string
          key_insights?: Json | null
          market_opportunity_score?: number | null
          overall_score?: number | null
          recommendations?: string[] | null
          storage_path?: string | null
          story_clarity_score?: number | null
          strengths?: string[] | null
          team_credibility_score?: number | null
          traction_proof_score?: number | null
          updated_at?: string | null
          user_feedback?: string | null
          user_id?: string
          user_rating?: number | null
          verdict?: string | null
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      pmf_validation_evidence: {
        Row: {
          checklist_saved_at: string | null
          created_at: string
          interview_notes_count: number
          required_signals: number
          survey_results_count: number
          updated_at: string
          user_id: string
          validation_checklist: Json
        }
        Insert: {
          checklist_saved_at?: string | null
          created_at?: string
          interview_notes_count?: number
          required_signals?: number
          survey_results_count?: number
          updated_at?: string
          user_id: string
          validation_checklist?: Json
        }
        Update: {
          checklist_saved_at?: string | null
          created_at?: string
          interview_notes_count?: number
          required_signals?: number
          survey_results_count?: number
          updated_at?: string
          user_id?: string
          validation_checklist?: Json
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          poll_id: string
          rating_value: number | null
          selected_options: Json
          text_response: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          poll_id: string
          rating_value?: number | null
          selected_options?: Json
          text_response?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          poll_id?: string
          rating_value?: number | null
          selected_options?: Json
          text_response?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "collaboration_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string | null
          created_at: string
          downvotes: number | null
          id: string
          image_url: string | null
          post_id: string
          updated_at: string
          upvotes: number | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          downvotes?: number | null
          id?: string
          image_url?: string | null
          post_id: string
          updated_at?: string
          upvotes?: number | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          downvotes?: number | null
          id?: string
          image_url?: string | null
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
      post_feedback_ratings: {
        Row: {
          clarity_score: number | null
          created_at: string
          id: string
          innovation_score: number | null
          market_fit_score: number | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clarity_score?: number | null
          created_at?: string
          id?: string
          innovation_score?: number | null
          market_fit_score?: number | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clarity_score?: number | null
          created_at?: string
          id?: string
          innovation_score?: number | null
          market_fit_score?: number | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_feedback_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_personality: string | null
          avatar_url: string | null
          banner_url: string | null
          billing_cycle: string | null
          bio: string | null
          bio_html: string | null
          business_stage: string | null
          cofounder_onboarding_completed: boolean | null
          country: string | null
          created_at: string
          creative_niche: string | null
          credit_balance: number
          credits: number | null
          current_focus: string | null
          date_of_birth: string | null
          dashboard_bootstrap_source: string | null
          dashboard_initialized_at: string | null
          facebook_url: string | null
          followers_count: number
          following_count: number
          founder_journey_stage: string | null
          founder_role: string | null
          friends_count: number
          full_name: string | null
          github_url: string | null
          id: string
          instagram_url: string | null
          last_active_at: string | null
          last_activity_at: string | null
          last_seen_at: string | null
          last_checkin_date: string | null
          last_credit_reset_at: string
          linkedin_url: string | null
          location: string | null
          looking_for: string[] | null
          memory_preference: string | null
          monthly_credits: number | null
          onboarding_completed: boolean | null
          onboarding_steps_completed: Json
          positioning_line: string | null
          preferred_dashboard_mode: string | null
          preferred_dashboard_view: string | null
          primary_icp_analysis_id: string | null
          profile_completion_percentage: number | null
          quiz_biggest_challenge: string | null
          quiz_completed: boolean | null
          quiz_completed_at: string | null
          quiz_current_stage: string | null
          quiz_is_first_startup: string | null
          quiz_launch_timeline: string | null
          quiz_looking_for_cofounder: string | null
	          role: string | null
	          routine_config: Json
	          routine_primary_goal: string | null
	          routine_reminder_preferences: Json
	          sidebar_preferences: Json | null
          startup_description: string | null
          startup_industry: string[] | null
          startup_links: Json | null
          startup_logo_url: string | null
          startup_name: string | null
          startup_stage: string | null
          startup_tagline: string | null
          stripe_customer_id: string | null
          subscribed: boolean | null
          subscription_end: string | null
          subscription_tier: string
          tiktok_url: string | null
          traction_metrics: Json | null
          traction_visible: boolean | null
          twitter_url: string | null
          updated_at: string
          use_classic_dashboard: boolean | null
          user_preferences: Json | null
          username: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          ai_personality?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          billing_cycle?: string | null
          bio?: string | null
          bio_html?: string | null
          business_stage?: string | null
          cofounder_onboarding_completed?: boolean | null
          country?: string | null
          created_at?: string
          creative_niche?: string | null
          credit_balance?: number
          credits?: number | null
          current_focus?: string | null
          date_of_birth?: string | null
          dashboard_bootstrap_source?: string | null
          dashboard_initialized_at?: string | null
          facebook_url?: string | null
          followers_count?: number
          following_count?: number
          founder_journey_stage?: string | null
          founder_role?: string | null
          friends_count?: number
          full_name?: string | null
          github_url?: string | null
          id: string
          instagram_url?: string | null
          last_active_at?: string | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          last_checkin_date?: string | null
          last_credit_reset_at?: string
          linkedin_url?: string | null
          location?: string | null
          looking_for?: string[] | null
          memory_preference?: string | null
          monthly_credits?: number | null
          onboarding_completed?: boolean | null
          onboarding_steps_completed?: Json
          positioning_line?: string | null
          preferred_dashboard_mode?: string | null
          preferred_dashboard_view?: string | null
          primary_icp_analysis_id?: string | null
          profile_completion_percentage?: number | null
          quiz_biggest_challenge?: string | null
          quiz_completed?: boolean | null
          quiz_completed_at?: string | null
          quiz_current_stage?: string | null
          quiz_is_first_startup?: string | null
          quiz_launch_timeline?: string | null
          quiz_looking_for_cofounder?: string | null
	          role?: string | null
	          routine_config?: Json
	          routine_primary_goal?: string | null
	          routine_reminder_preferences?: Json
	          sidebar_preferences?: Json | null
          startup_description?: string | null
          startup_industry?: string[] | null
          startup_links?: Json | null
          startup_logo_url?: string | null
          startup_name?: string | null
          startup_stage?: string | null
          startup_tagline?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_tier?: string
          tiktok_url?: string | null
          traction_metrics?: Json | null
          traction_visible?: boolean | null
          twitter_url?: string | null
          updated_at?: string
          use_classic_dashboard?: boolean | null
          user_preferences?: Json | null
          username: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          ai_personality?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          billing_cycle?: string | null
          bio?: string | null
          bio_html?: string | null
          business_stage?: string | null
          cofounder_onboarding_completed?: boolean | null
          country?: string | null
          created_at?: string
          creative_niche?: string | null
          credit_balance?: number
          credits?: number | null
          current_focus?: string | null
          date_of_birth?: string | null
          dashboard_bootstrap_source?: string | null
          dashboard_initialized_at?: string | null
          facebook_url?: string | null
          followers_count?: number
          following_count?: number
          founder_journey_stage?: string | null
          founder_role?: string | null
          friends_count?: number
          full_name?: string | null
          github_url?: string | null
          id?: string
          instagram_url?: string | null
          last_active_at?: string | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          last_checkin_date?: string | null
          last_credit_reset_at?: string
          linkedin_url?: string | null
          location?: string | null
          looking_for?: string[] | null
          memory_preference?: string | null
          monthly_credits?: number | null
          onboarding_completed?: boolean | null
          onboarding_steps_completed?: Json
          positioning_line?: string | null
          preferred_dashboard_mode?: string | null
          preferred_dashboard_view?: string | null
          primary_icp_analysis_id?: string | null
          profile_completion_percentage?: number | null
          quiz_biggest_challenge?: string | null
          quiz_completed?: boolean | null
          quiz_completed_at?: string | null
          quiz_current_stage?: string | null
          quiz_is_first_startup?: string | null
          quiz_launch_timeline?: string | null
          quiz_looking_for_cofounder?: string | null
	          role?: string | null
	          routine_config?: Json
	          routine_primary_goal?: string | null
	          routine_reminder_preferences?: Json
	          sidebar_preferences?: Json | null
          startup_description?: string | null
          startup_industry?: string[] | null
          startup_links?: Json | null
          startup_logo_url?: string | null
          startup_name?: string | null
          startup_stage?: string | null
          startup_tagline?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean | null
          subscription_end?: string | null
          subscription_tier?: string
          tiktok_url?: string | null
          traction_metrics?: Json | null
          traction_visible?: boolean | null
          twitter_url?: string | null
          updated_at?: string
          use_classic_dashboard?: boolean | null
          user_preferences?: Json | null
          username?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_icp_analysis_id_fkey"
            columns: ["primary_icp_analysis_id"]
            isOneToOne: false
            referencedRelation: "icp_analysis_results"
            referencedColumns: ["id"]
          },
        ]
      }
      project_artifacts: {
        Row: {
          created_at: string
          data: Json
          id: string
          project_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          project_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          project_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_memory: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          embedding: string | null
          id: string
          is_archived: boolean | null
          kind: string
          metadata: Json | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          is_archived?: boolean | null
          kind: string
          metadata?: Json | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          is_archived?: boolean | null
          kind?: string
          metadata?: Json | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_memory_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          project_id: string
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          project_id: string
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          idea_summary: string | null
          last_run_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_summary?: string | null
          last_run_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_summary?: string | null
          last_run_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          is_public: boolean
          name: string
          template_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_public?: boolean
          name: string
          template_config: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_public?: boolean
          name?: string
          template_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      re_engagement_emails: {
        Row: {
          id: string
          opened: boolean
          sent_at: string
          stage_at_send: Database["public"]["Enums"]["bizmap_stage"]
          user_id: string
        }
        Insert: {
          id?: string
          opened?: boolean
          sent_at?: string
          stage_at_send: Database["public"]["Enums"]["bizmap_stage"]
          user_id: string
        }
        Update: {
          id?: string
          opened?: boolean
          sent_at?: string
          stage_at_send?: Database["public"]["Enums"]["bizmap_stage"]
          user_id?: string
        }
        Relationships: []
      }
	      reputation_transactions: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reputation_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
	        ]
	      }
	      routine_task_completions: {
	        Row: {
	          completed_at: string | null
	          created_at: string
	          id: string
	          period_date: string
	          period_type: string
	          routine_task_id: string
	          status: string
	          task_title: string
	          user_id: string
	        }
	        Insert: {
	          completed_at?: string | null
	          created_at?: string
	          id?: string
	          period_date: string
	          period_type: string
	          routine_task_id: string
	          status: string
	          task_title: string
	          user_id: string
	        }
	        Update: {
	          completed_at?: string | null
	          created_at?: string
	          id?: string
	          period_date?: string
	          period_type?: string
	          routine_task_id?: string
	          status?: string
	          task_title?: string
	          user_id?: string
	        }
	        Relationships: [
	          {
	            foreignKeyName: "routine_task_completions_user_id_fkey"
	            columns: ["user_id"]
	            isOneToOne: false
	            referencedRelation: "active_subscriptions"
	            referencedColumns: ["id"]
	          },
	          {
	            foreignKeyName: "routine_task_completions_user_id_fkey"
	            columns: ["user_id"]
	            isOneToOne: false
	            referencedRelation: "profiles"
	            referencedColumns: ["id"]
	          },
	        ]
	      }
	      revenue_metrics: {
        Row: {
          active_customers: number | null
          churn_rate: number | null
          churned_customers: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          metric_date: string
          mrr: number | null
          new_customers: number | null
          total_revenue: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_customers?: number | null
          churn_rate?: number | null
          churned_customers?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          mrr?: number | null
          new_customers?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_customers?: number | null
          churn_rate?: number | null
          churned_customers?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          mrr?: number | null
          new_customers?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      roadmap_tasks: {
        Row: {
          actual_hours: number | null
          ai_generated: boolean | null
          ai_reasoning: string | null
          blocker_reason: string | null
          completed_at: string | null
          created_at: string | null
          day_number: number
          description: string | null
          due_date: string
          estimated_hours: number | null
          id: string
          is_blocked: boolean | null
          priority: string | null
          roadmap_id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          week_number: number
        }
        Insert: {
          actual_hours?: number | null
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          blocker_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          day_number: number
          description?: string | null
          due_date: string
          estimated_hours?: number | null
          id?: string
          is_blocked?: boolean | null
          priority?: string | null
          roadmap_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          week_number: number
        }
        Update: {
          actual_hours?: number | null
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          blocker_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          day_number?: number
          description?: string | null
          due_date?: string
          estimated_hours?: number | null
          id?: string
          is_blocked?: boolean | null
          priority?: string | null
          roadmap_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_tasks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "launch_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_trigger_failures: {
        Row: {
          context: Json | null
          created_at: string
          email: string | null
          error_code: string | null
          error_message: string | null
          id: number
          raw_user_meta_data: Json | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          email?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: number
          raw_user_meta_data?: Json | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          email?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: number
          raw_user_meta_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      sprint_accountability: {
        Row: {
          accountability_partner_id: string | null
          created_at: string
          daily_checkins_enabled: boolean
          id: string
          last_checkin_at: string | null
          nudge_count: number
          partnership_id: string | null
          sprint_id: string
          user_id: string
        }
        Insert: {
          accountability_partner_id?: string | null
          created_at?: string
          daily_checkins_enabled?: boolean
          id?: string
          last_checkin_at?: string | null
          nudge_count?: number
          partnership_id?: string | null
          sprint_id: string
          user_id: string
        }
        Update: {
          accountability_partner_id?: string | null
          created_at?: string
          daily_checkins_enabled?: boolean
          id?: string
          last_checkin_at?: string | null
          nudge_count?: number
          partnership_id?: string | null
          sprint_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_accountability_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_accountability_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_comments: {
        Row: {
          comment_type: string
          content: string
          created_at: string
          id: string
          sprint_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_type?: string
          content: string
          created_at?: string
          id?: string
          sprint_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_type?: string
          content?: string
          created_at?: string
          id?: string
          sprint_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_comments_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_commitments: {
        Row: {
          actual_metric_value: number | null
          commitment_text: string
          created_at: string
          credits_locked: boolean | null
          credits_staked: number
          deadline: string
          id: string
          measurable_metric: string
          metric_unit: string | null
          metric_value: number | null
          proof_notes: string | null
          proof_url: string | null
          resolved_at: string | null
          sprint_id: string
          status: Database["public"]["Enums"]["commitment_status"]
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          actual_metric_value?: number | null
          commitment_text: string
          created_at?: string
          credits_locked?: boolean | null
          credits_staked: number
          deadline: string
          id?: string
          measurable_metric: string
          metric_unit?: string | null
          metric_value?: number | null
          proof_notes?: string | null
          proof_url?: string | null
          resolved_at?: string | null
          sprint_id: string
          status?: Database["public"]["Enums"]["commitment_status"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_metric_value?: number | null
          commitment_text?: string
          created_at?: string
          credits_locked?: boolean | null
          credits_staked?: number
          deadline?: string
          id?: string
          measurable_metric?: string
          metric_unit?: string | null
          metric_value?: number | null
          proof_notes?: string | null
          proof_url?: string | null
          resolved_at?: string | null
          sprint_id?: string
          status?: Database["public"]["Enums"]["commitment_status"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_commitments_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_tasks: {
        Row: {
          actual_hours: number | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number
          id: string
          priority: string
          sprint_id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number
          id?: string
          priority?: string
          sprint_id: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number
          id?: string
          priority?: string
          sprint_id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          community_visible: boolean
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_public: boolean
          start_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_visible?: boolean
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_public?: boolean
          start_date: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_visible?: boolean
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_public?: boolean
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      startup_updates: {
        Row: {
          content: string
          created_at: string
          id: string
          media_urls: string[] | null
          title: string
          update_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_urls?: string[] | null
          title: string
          update_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_urls?: string[] | null
          title?: string
          update_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startup_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories_articles: {
        Row: {
          author_id: string
          banner_image_url: string | null
          body_content: string | null
          created_at: string
          excerpt: string | null
          hashtags: string[] | null
          id: string
          linkedin_post_url: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          banner_image_url?: string | null
          body_content?: string | null
          created_at?: string
          excerpt?: string | null
          hashtags?: string[] | null
          id?: string
          linkedin_post_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          banner_image_url?: string | null
          body_content?: string | null
          created_at?: string
          excerpt?: string | null
          hashtags?: string[] | null
          id?: string
          linkedin_post_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_connections: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          refresh_token: string | null
          stripe_account_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          refresh_token?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          subscription_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          subscription_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          billing_anchor_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
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
          billing_anchor_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
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
          billing_anchor_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
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
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
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
          stripe_payment_link: string | null
          stripe_payment_link_monthly: string | null
          stripe_payment_link_yearly: string | null
          stripe_price_id: string | null
          tier_name: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          monthly_credits?: number
          price_cents?: number
          stripe_payment_link?: string | null
          stripe_payment_link_monthly?: string | null
          stripe_payment_link_yearly?: string | null
          stripe_price_id?: string | null
          tier_name: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          monthly_credits?: number
          price_cents?: number
          stripe_payment_link?: string | null
          stripe_payment_link_monthly?: string | null
          stripe_payment_link_yearly?: string | null
          stripe_price_id?: string | null
          tier_name?: string
        }
        Relationships: []
      }
      task_recommendation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          recommendation_key: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          recommendation_key: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          recommendation_key?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_recommendation_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_stack_reports: {
        Row: {
          budget_breakdown: Json
          budget_total: number
          created_at: string
          has_variable: boolean
          id: string
          name: string | null
          selected_products: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_breakdown?: Json
          budget_total?: number
          created_at?: string
          has_variable?: boolean
          id?: string
          name?: string | null
          selected_products: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_breakdown?: Json
          budget_total?: number
          created_at?: string
          has_variable?: boolean
          id?: string
          name?: string | null
          selected_products?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_stack_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_stack_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_achievements: {
        Row: {
          achievement_title: string
          achievement_type: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          progress: number | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_title: string
          achievement_type: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          progress?: number | null
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_title?: string
          achievement_type?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          progress?: number | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          event_key: string | null
          id: string
          page_path: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          source_tool: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          event_key?: string | null
          id?: string
          page_path?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_tool?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          event_key?: string | null
          id?: string
          page_path?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          source_tool?: string | null
          user_id?: string
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
      user_funding_bookmarks: {
        Row: {
          created_at: string
          funding_opportunity_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funding_opportunity_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          funding_opportunity_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_challenge_completions: {
        Row: {
          challenge_id: string | null
          completed_at: string | null
          id: string
          points_awarded: number | null
          proof_reference_id: string | null
          proof_reference_type: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string | null
          id?: string
          points_awarded?: number | null
          proof_reference_id?: string | null
          proof_reference_type?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string | null
          id?: string
          points_awarded?: number | null
          proof_reference_id?: string | null
          proof_reference_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_community_activity: {
        Row: {
          active_cofounder_posts: number | null
          cofounder_messages_sent_this_month: number | null
          created_at: string | null
          discovery_calls_booked_this_month: number | null
          id: string
          last_reset_at: string | null
          mentor_messages_sent_this_month: number | null
          subscription_tier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_cofounder_posts?: number | null
          cofounder_messages_sent_this_month?: number | null
          created_at?: string | null
          discovery_calls_booked_this_month?: number | null
          id?: string
          last_reset_at?: string | null
          mentor_messages_sent_this_month?: number | null
          subscription_tier: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_cofounder_posts?: number | null
          cofounder_messages_sent_this_month?: number | null
          created_at?: string | null
          discovery_calls_booked_this_month?: number | null
          id?: string
          last_reset_at?: string | null
          mentor_messages_sent_this_month?: number | null
          subscription_tier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          billing_anchor_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          last_credit_grant: string | null
          last_reset_at: string
          monthly_quota: number
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          billing_anchor_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          last_credit_grant?: string | null
          last_reset_at?: string
          monthly_quota?: number
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          billing_anchor_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
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
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
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
          completed_at: string
          created_at: string
          credit_bonus_earned: number
          email: string | null
          feature_other: string | null
          id: string
          improvement_suggestion: string | null
          pricing_perception: string
          role_other: string | null
          selected_features: string[]
          session_id: string | null
          suggested_currency: string | null
          suggested_price: number | null
          user_id: string | null
          user_role: string
          website_ux_rating: number
        }
        Insert: {
          completed_at?: string
          created_at?: string
          credit_bonus_earned?: number
          email?: string | null
          feature_other?: string | null
          id?: string
          improvement_suggestion?: string | null
          pricing_perception: string
          role_other?: string | null
          selected_features?: string[]
          session_id?: string | null
          suggested_currency?: string | null
          suggested_price?: number | null
          user_id?: string | null
          user_role: string
          website_ux_rating: number
        }
        Update: {
          completed_at?: string
          created_at?: string
          credit_bonus_earned?: number
          email?: string | null
          feature_other?: string | null
          id?: string
          improvement_suggestion?: string | null
          pricing_perception?: string
          role_other?: string | null
          selected_features?: string[]
          session_id?: string | null
          suggested_currency?: string | null
          suggested_price?: number | null
          user_id?: string | null
          user_role?: string
          website_ux_rating?: number
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
      user_integrations: {
        Row: {
          access_token: string | null
          account_id: string | null
          connection_status: string
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          provider: string
          provider_name: string
          refresh_token: string | null
          sync_frequency: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider: string
          provider_name: string
          refresh_token?: string | null
          sync_frequency?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          provider?: string
          provider_name?: string
          refresh_token?: string | null
          sync_frequency?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_journey_progress: {
        Row: {
          created_at: string
          id: string
          plan_it_completed: boolean | null
          plan_it_completed_at: string | null
          propel_applied: boolean | null
          propel_applied_at: string | null
          propel_viewed: boolean | null
          propel_viewed_at: string | null
          refine_it_feedback_received: boolean | null
          refine_it_feedback_received_at: string | null
          refine_it_shared: boolean | null
          refine_it_shared_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_it_completed?: boolean | null
          plan_it_completed_at?: string | null
          propel_applied?: boolean | null
          propel_applied_at?: string | null
          propel_viewed?: boolean | null
          propel_viewed_at?: string | null
          refine_it_feedback_received?: boolean | null
          refine_it_feedback_received_at?: string | null
          refine_it_shared?: boolean | null
          refine_it_shared_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_it_completed?: boolean | null
          plan_it_completed_at?: string | null
          propel_applied?: boolean | null
          propel_applied_at?: string | null
          propel_viewed?: boolean | null
          propel_viewed_at?: string | null
          refine_it_feedback_received?: boolean | null
          refine_it_feedback_received_at?: string | null
          refine_it_shared?: boolean | null
          refine_it_shared_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          created_at: string
          cursor_position: Json | null
          id: string
          is_active: boolean
          last_seen_at: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cursor_position?: Json | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cursor_position?: Json | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaboration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          building_completed_at: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["bizmap_stage"]
          highest_unlocked_stage: Database["public"]["Enums"]["bizmap_stage"]
          identity_completed_at: string | null
          launch_completed_at: string | null
          prototype_completed_at: string | null
          updated_at: string
          user_id: string
          validating_completed_at: string | null
        }
        Insert: {
          building_completed_at?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["bizmap_stage"]
          highest_unlocked_stage?: Database["public"]["Enums"]["bizmap_stage"]
          identity_completed_at?: string | null
          launch_completed_at?: string | null
          prototype_completed_at?: string | null
          updated_at?: string
          user_id: string
          validating_completed_at?: string | null
        }
        Update: {
          building_completed_at?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["bizmap_stage"]
          highest_unlocked_stage?: Database["public"]["Enums"]["bizmap_stage"]
          identity_completed_at?: string | null
          launch_completed_at?: string | null
          prototype_completed_at?: string | null
          updated_at?: string
          user_id?: string
          validating_completed_at?: string | null
        }
        Relationships: []
      }
      user_reels: {
        Row: {
          caption: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reputation: {
        Row: {
          achievements: Json | null
          badges: Json | null
          created_at: string | null
          level: number | null
          level_name: string | null
          next_level_threshold: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements?: Json | null
          badges?: Json | null
          created_at?: string | null
          level?: number | null
          level_name?: string | null
          next_level_threshold?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements?: Json | null
          badges?: Json | null
          created_at?: string | null
          level?: number | null
          level_name?: string | null
          next_level_threshold?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reputation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reputation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          activity_type: string | null
          created_at: string
          custom_status: string | null
          id: string
          last_activity_at: string
          status: string
          status_emoji: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          created_at?: string
          custom_status?: string | null
          id?: string
          last_activity_at?: string
          status?: string
          status_emoji?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          created_at?: string
          custom_status?: string | null
          id?: string
          last_activity_at?: string
          status?: string
          status_emoji?: string | null
          updated_at?: string
          user_id?: string
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
      value_proposition_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          position: number
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          position: number
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          position?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      vc_views: {
        Row: {
          id: string
          subscription_tier: string
          user_id: string | null
          vc_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          subscription_tier: string
          user_id?: string | null
          vc_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          subscription_tier?: string
          user_id?: string | null
          vc_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vc_views_vc_id_fkey"
            columns: ["vc_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_events: {
        Row: {
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json
          occurred_at: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant: string | null
          waitlist_page_id: string
        }
        Insert: {
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          occurred_at?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant?: string | null
          waitlist_page_id: string
        }
        Update: {
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          occurred_at?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant?: string | null
          waitlist_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_events_waitlist_page_id_fkey"
            columns: ["waitlist_page_id"]
            isOneToOne: false
            referencedRelation: "waitlist_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          batch_number: number
          created_at: string
          credits_granted: number | null
          from_tier: string | null
          id: string
          referral_batch_size: number
          reward_type: string
          to_tier: string | null
          user_id: string
        }
        Insert: {
          batch_number: number
          created_at?: string
          credits_granted?: number | null
          from_tier?: string | null
          id?: string
          referral_batch_size?: number
          reward_type: string
          to_tier?: string | null
          user_id: string
        }
        Update: {
          batch_number?: number
          created_at?: string
          credits_granted?: number | null
          from_tier?: string | null
          id?: string
          referral_batch_size?: number
          reward_type?: string
          to_tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code_used: string
          created_at: string
          id: string
          referred_email: string
          referred_user_id: string
          referrer_user_id: string
          status: string
          verified_at: string | null
        }
        Insert: {
          code_used: string
          created_at?: string
          id?: string
          referred_email: string
          referred_user_id: string
          referrer_user_id: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          code_used?: string
          created_at?: string
          id?: string
          referred_email?: string
          referred_user_id?: string
          referrer_user_id?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      waitlist_pages: {
        Row: {
          ab_test_enabled: boolean | null
          accent_color: string | null
          ai_content: Json | null
          confirmation_email_enabled: boolean | null
          created_at: string
          cta_label: string
          exported_at: string | null
          headline_variant_b: string | null
          id: string
          image_url: string | null
          integration_list_id: string | null
          integration_provider: string | null
          launch_date: string | null
          layout: string | null
          logo_url: string | null
          mark_ready_at: string | null
          metadata: Json
          product_name: string | null
          published_at: string | null
          published_url: string | null
          referral_message: string | null
          slug: string | null
          social_links: Json | null
          status: string
          target_audience: string | null
          theme: string | null
          title: string
          updated_at: string
          user_id: string
          value_proposition: string
          view_count: number | null
          webhook_url: string | null
        }
        Insert: {
          ab_test_enabled?: boolean | null
          accent_color?: string | null
          ai_content?: Json | null
          confirmation_email_enabled?: boolean | null
          created_at?: string
          cta_label?: string
          exported_at?: string | null
          headline_variant_b?: string | null
          id?: string
          image_url?: string | null
          integration_list_id?: string | null
          integration_provider?: string | null
          launch_date?: string | null
          layout?: string | null
          logo_url?: string | null
          mark_ready_at?: string | null
          metadata?: Json
          product_name?: string | null
          published_at?: string | null
          published_url?: string | null
          referral_message?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          target_audience?: string | null
          theme?: string | null
          title: string
          updated_at?: string
          user_id: string
          value_proposition: string
          view_count?: number | null
          webhook_url?: string | null
        }
        Update: {
          ab_test_enabled?: boolean | null
          accent_color?: string | null
          ai_content?: Json | null
          confirmation_email_enabled?: boolean | null
          created_at?: string
          cta_label?: string
          exported_at?: string | null
          headline_variant_b?: string | null
          id?: string
          image_url?: string | null
          integration_list_id?: string | null
          integration_provider?: string | null
          launch_date?: string | null
          layout?: string | null
          logo_url?: string | null
          mark_ready_at?: string | null
          metadata?: Json
          product_name?: string | null
          published_at?: string | null
          published_url?: string | null
          referral_message?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          target_audience?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          value_proposition?: string
          view_count?: number | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          consent: boolean | null
          created_at: string | null
          email: string
          email_normalized: string
          first_name: string | null
          id: string
          ip_hash: string | null
          referral_source: string | null
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant: string | null
          waitlist_page_id: string
        }
        Insert: {
          consent?: boolean | null
          created_at?: string | null
          email: string
          email_normalized: string
          first_name?: string | null
          id?: string
          ip_hash?: string | null
          referral_source?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant?: string | null
          waitlist_page_id: string
        }
        Update: {
          consent?: boolean | null
          created_at?: string | null
          email?: string
          email_normalized?: string
          first_name?: string | null
          id?: string
          ip_hash?: string | null
          referral_source?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant?: string | null
          waitlist_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_signups_waitlist_page_id_fkey"
            columns: ["waitlist_page_id"]
            isOneToOne: false
            referencedRelation: "waitlist_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_mission_tasks: {
        Row: {
          contribution_weight: number | null
          created_at: string | null
          id: string
          is_critical: boolean | null
          task_id: string
          weekly_mission_id: string
        }
        Insert: {
          contribution_weight?: number | null
          created_at?: string | null
          id?: string
          is_critical?: boolean | null
          task_id: string
          weekly_mission_id: string
        }
        Update: {
          contribution_weight?: number | null
          created_at?: string | null
          id?: string
          is_critical?: boolean | null
          task_id?: string
          weekly_mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_mission_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_mission_tasks_weekly_mission_id_fkey"
            columns: ["weekly_mission_id"]
            isOneToOne: false
            referencedRelation: "weekly_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_missions: {
        Row: {
          commitment_outcome: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          current_value: number | null
          id: string
          mission_goal: string
          mission_type: string | null
          reflection_text: string | null
          reviewed_at: string | null
          status: string | null
          target_metric: string | null
          target_value: number | null
          updated_at: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          commitment_outcome?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          mission_goal: string
          mission_type?: string | null
          reflection_text?: string | null
          reviewed_at?: string | null
          status?: string | null
          target_metric?: string | null
          target_value?: number | null
          updated_at?: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          commitment_outcome?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          mission_goal?: string
          mission_type?: string | null
          reflection_text?: string | null
          reviewed_at?: string | null
          status?: string | null
          target_metric?: string | null
          target_value?: number | null
          updated_at?: string | null
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboard_objects: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_deleted: boolean
          object_data: Json
          object_type: string
          updated_at: string
          whiteboard_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_deleted?: boolean
          object_data: Json
          object_type: string
          updated_at?: string
          whiteboard_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_deleted?: boolean
          object_data?: Json
          object_type?: string
          updated_at?: string
          whiteboard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_objects_whiteboard_id_fkey"
            columns: ["whiteboard_id"]
            isOneToOne: false
            referencedRelation: "collaboration_whiteboards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          credits: number | null
          email: string | null
          id: string | null
          monthly_credits: number | null
          stripe_customer_id: string | null
          subscription_end: string | null
          subscription_tier: string | null
        }
        Relationships: []
      }
      admin_reputation_analytics: {
        Row: {
          action_type: string | null
          active_users: number | null
          avg_points_per_action: number | null
          date: string | null
          total_points_awarded: number | null
          total_transactions: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          creative_niche: string | null
          facebook_url: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          github_url: string | null
          id: string | null
          instagram_url: string | null
          linkedin_url: string | null
          location: string | null
          positioning_line: string | null
          startup_industry: string[] | null
          startup_name: string | null
          startup_stage: string | null
          startup_tagline: string | null
          tiktok_url: string | null
          twitter_url: string | null
          username: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Relationships: []
      }
      trending_market_topics: {
        Row: {
          avg_relevance: number | null
          data_type: string | null
          industry: string | null
          keyword: string | null
          last_seen: string | null
          mention_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_dashboard_snapshot_v1: {
        Args: { p_timezone?: string }
        Returns: Json
      }
      archive_old_memories: { Args: { days_old?: number }; Returns: number }
      apply_stripe_subscription_checkout: {
        Args: {
          p_billing_anchor_at?: string | null
          p_billing_cycle?: string
          p_current_period_end?: string | null
          p_current_period_start?: string | null
          p_email: string
          p_stripe_customer_id: string | null
          p_stripe_event_id: string
          p_stripe_event_type: string
          p_stripe_price_id: string
          p_stripe_subscription_id: string | null
          p_subscription_end?: string | null
          p_user_id: string
        }
        Returns: Json
      }
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      award_reputation_points: {
        Args: {
          p_action_type: string
          p_points: number
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_business_success_score: {
        Args: { answers: Json }
        Returns: Json
      }
      calculate_founder_profile_completeness: {
        Args: {
          profile_row: Database["public"]["Tables"]["founder_profiles"]["Row"]
        }
        Returns: number
      }
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_trending_score: {
        Args: { p_post_id: string; p_time_decay_hours?: number }
        Returns: number
      }
      calculate_user_level: {
        Args: { points: number }
        Returns: {
          level: number
          level_name: string
          next_threshold: number
        }[]
      }
      can_view_accelerator: {
        Args: { p_tier: string; p_user_id: string }
        Returns: boolean
      }
      can_view_vc: {
        Args: { p_tier: string; p_user_id: string }
        Returns: boolean
      }
      check_and_award_badges: { Args: { p_user_id: string }; Returns: Json }
      cleanup_expired_ai_cache: { Args: never; Returns: undefined }
      cleanup_expired_analytics_cache: { Args: never; Returns: undefined }
      cleanup_expired_insights: { Args: never; Returns: undefined }
      claim_referral: { Args: { p_code: string }; Returns: boolean }
      complete_daily_challenge: {
        Args: {
          p_challenge_id: string
          p_proof_reference_id?: string
          p_proof_reference_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_community_notification: {
        Args: {
          p_actor_id: string
          p_comment_id?: string
          p_metadata?: Json
          p_notification_type: string
          p_post_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_or_get_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: {
          created_at: string
          id: string
          is_group: boolean
          last_message_at: string | null
          name: string | null
          participants: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deduct_credits_atomic: {
        Args: {
          p_amount: number
          p_feature: string
          p_metadata?: Json
          p_session_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      downgrade_stripe_subscription_to_rookie: {
        Args: {
          p_stripe_customer_id?: string | null
          p_stripe_event_id?: string | null
          p_stripe_event_type?: string | null
          p_stripe_subscription_id?: string | null
          p_user_id?: string | null
        }
        Returns: Json
      }
      expire_subscriptions: { Args: never; Returns: number }
      generate_referral_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_profile_base_slug: {
        Args: { fallback_user_id: string; full_name: string }
        Returns: string
      }
      get_conversations_for_summarization: {
        Args: { days_old?: number }
        Returns: {
          conversation_id: string
          message_count: number
          newest_message: string
          oldest_message: string
          project_id: string
        }[]
      }
      get_fresh_market_insights: {
        Args: {
          p_data_types?: string[]
          p_industries: string[]
          p_keywords?: string[]
          p_limit?: number
        }
        Returns: {
          created_at: string
          data_type: string
          freshness_score: number
          id: string
          industry: string
          insights: string[]
          market_impact: string
          opportunity_score: number
          relevance_score: number
          source_name: string
          summary: string
          title: string
        }[]
      }
      get_market_intelligence_summary: {
        Args: { p_industry?: string; p_limit?: number }
        Returns: {
          avg_freshness: number
          avg_relevance: number
          data_type: string
          industry: string
          recent_insights: number
          top_sources: string[]
        }[]
      }
      get_current_billing_period_start: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_monthly_accelerator_view_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_monthly_vc_view_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_notification_actor_info: {
        Args: { actor_user_id: string }
        Returns: {
          actor_avatar: string
          actor_name: string
          actor_username: string
        }[]
      }
      get_post_author_info: {
        Args: { author_user_id: string }
        Returns: {
          author_avatar: string
          author_name: string
          author_username: string
        }[]
      }
      get_todays_challenge: {
        Args: never
        Returns: {
          challenge_description: string
          challenge_title: string
          challenge_type: string
          completion_count: number
          id: string
          participants_count: number
          reward_points: number
        }[]
      }
      get_user_email: { Args: { user_id: string }; Returns: string }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      grant_monthly_credits: { Args: never; Returns: undefined }
      has_completed_todays_challenge: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      idempotency_clear: { Args: { p_id: string }; Returns: undefined }
      idempotency_get: { Args: { p_id: string }; Returns: Json }
      idempotency_mark_completed: {
        Args: { p_id: string; p_result: Json }
        Returns: undefined
      }
      idempotency_try_begin: { Args: { p_id: string }; Returns: string }
      increment_credit_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      increment_waitlist_view: { Args: { page_id: string }; Returns: undefined }
      is_admin_user: { Args: never; Returns: boolean }
      is_community_active: { Args: { profile_id: string }; Returns: boolean }
      is_following: {
        Args: { profile_id: string; viewer_id: string }
        Returns: boolean
      }
      is_reserved_profile_slug: { Args: { v: string }; Returns: boolean }
      is_subscription_active: { Args: { user_id: string }; Returns: boolean }
      is_username_available: {
        Args: { candidate: string; current_user_id?: string }
        Returns: boolean
      }
      match_knowledge_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      normalize_profile_part: { Args: { v: string }; Returns: string }
      refresh_admin_analytics: { Args: never; Returns: undefined }
      refresh_expired_trends: { Args: never; Returns: undefined }
      reset_community_limits: { Args: never; Returns: undefined }
      reset_monthly_credits: { Args: never; Returns: number }
      search_similar_memories: {
        Args: {
          memory_kind?: string
          query_embedding: string
          target_project_id: string
          top_k?: number
        }
        Returns: {
          content: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          similarity: number
        }[]
      }
      trigger_memory_summarization: { Args: never; Returns: undefined }
      unaccent: { Args: { "": string }; Returns: string }
      update_market_data_freshness: { Args: never; Returns: undefined }
      update_user_subscription: {
        Args: {
          billing_cycle_param: string
          customer_email_param: string
          stripe_customer_id_param: string
          tier_param: string
        }
        Returns: boolean
      }
      update_user_subscription_tier: {
        Args: { is_subscribed?: boolean; new_tier: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bizmap_stage:
        | "IDENTITY"
        | "PROTOTYPE"
        | "VALIDATING"
        | "BUILDING"
        | "LAUNCH"
      commitment_status: "active" | "achieved" | "failed" | "withdrawn"
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
      app_role: ["admin", "moderator", "user"],
      bizmap_stage: [
        "IDENTITY",
        "PROTOTYPE",
        "VALIDATING",
        "BUILDING",
        "LAUNCH",
      ],
      commitment_status: ["active", "achieved", "failed", "withdrawn"],
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
