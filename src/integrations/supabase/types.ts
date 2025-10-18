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
          created_at: string
          id: string
          metadata: Json | null
          notification_type: string
          post_id: string | null
          read: boolean
          user_id: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type: string
          post_id?: string | null
          read?: boolean
          user_id: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          post_id?: string | null
          read?: boolean
          user_id?: string
        }
        Relationships: [
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
          created_at: string
          downvotes: number | null
          featured_on_propel: boolean | null
          feedback_category: string[] | null
          feedback_requested: boolean | null
          feedback_status: string | null
          id: string
          is_repost: boolean | null
          location: string | null
          original_post_id: string | null
          repost_count: number | null
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
          created_at?: string
          downvotes?: number | null
          featured_on_propel?: boolean | null
          feedback_category?: string[] | null
          feedback_requested?: boolean | null
          feedback_status?: string | null
          id?: string
          is_repost?: boolean | null
          location?: string | null
          original_post_id?: string | null
          repost_count?: number | null
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
          created_at?: string
          downvotes?: number | null
          featured_on_propel?: boolean | null
          feedback_category?: string[] | null
          feedback_requested?: boolean | null
          feedback_status?: string | null
          id?: string
          is_repost?: boolean | null
          location?: string | null
          original_post_id?: string | null
          repost_count?: number | null
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
          goal_achieved: boolean | null
          id: string
          mood_rating: number | null
          photo_url: string | null
          progress_summary: string
          reflection_note: string | null
          sprint_id: string
          streak_count: number | null
          updated_at: string
          user_id: string
          what_went_well: string | null
        }
        Insert: {
          blockers?: string | null
          check_in_date?: string
          completed_tasks?: string[] | null
          created_at?: string
          energy_level?: number | null
          goal_achieved?: boolean | null
          id?: string
          mood_rating?: number | null
          photo_url?: string | null
          progress_summary: string
          reflection_note?: string | null
          sprint_id: string
          streak_count?: number | null
          updated_at?: string
          user_id: string
          what_went_well?: string | null
        }
        Update: {
          blockers?: string | null
          check_in_date?: string
          completed_tasks?: string[] | null
          created_at?: string
          energy_level?: number | null
          goal_achieved?: boolean | null
          id?: string
          mood_rating?: number | null
          photo_url?: string | null
          progress_summary?: string
          reflection_note?: string | null
          sprint_id?: string
          streak_count?: number | null
          updated_at?: string
          user_id?: string
          what_went_well?: string | null
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
      daily_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          priority: string | null
          task_date: string
          task_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          task_date: string
          task_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          task_date?: string
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
          bio: string | null
          business_stage: string | null
          created_at: string
          creative_niche: string | null
          credit_balance: number
          facebook_url: string | null
          followers_count: number
          following_count: number
          friends_count: number
          full_name: string | null
          github_url: string | null
          id: string
          instagram_url: string | null
          last_credit_reset_at: string
          linkedin_url: string | null
          memory_preference: string | null
          onboarding_completed: boolean | null
          preferred_dashboard_view: string | null
          subscription_tier: string
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          user_preferences: Json | null
          username: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          ai_personality?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_stage?: string | null
          created_at?: string
          creative_niche?: string | null
          credit_balance?: number
          facebook_url?: string | null
          followers_count?: number
          following_count?: number
          friends_count?: number
          full_name?: string | null
          github_url?: string | null
          id: string
          instagram_url?: string | null
          last_credit_reset_at?: string
          linkedin_url?: string | null
          memory_preference?: string | null
          onboarding_completed?: boolean | null
          preferred_dashboard_view?: string | null
          subscription_tier?: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_preferences?: Json | null
          username?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          ai_personality?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_stage?: string | null
          created_at?: string
          creative_niche?: string | null
          credit_balance?: number
          facebook_url?: string | null
          followers_count?: number
          following_count?: number
          friends_count?: number
          full_name?: string | null
          github_url?: string | null
          id?: string
          instagram_url?: string | null
          last_credit_reset_at?: string
          linkedin_url?: string | null
          memory_preference?: string | null
          onboarding_completed?: boolean | null
          preferred_dashboard_view?: string | null
          subscription_tier?: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_preferences?: Json | null
          username?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          page_path: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          page_path?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          page_path?: string | null
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
            referencedRelation: "profiles"
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
      user_presence: {
        Row: {
          created_at: string
          cursor_position: Json | null
          id: string
          is_active: boolean
          last_seen_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cursor_position?: Json | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          cursor_position?: Json | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          session_id?: string
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
      archive_old_memories: {
        Args: { days_old?: number }
        Returns: number
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
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_business_success_score: {
        Args: { answers: Json }
        Returns: Json
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
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: Json
      }
      cleanup_expired_ai_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_analytics_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_insights: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
        Args: Record<PropertyKey, never>
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
      grant_monthly_credits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
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
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      refresh_admin_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_expired_trends: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      trigger_memory_summarization: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_market_data_freshness: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_subscription_tier: {
        Args: { is_subscribed?: boolean; new_tier: string; user_email: string }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
