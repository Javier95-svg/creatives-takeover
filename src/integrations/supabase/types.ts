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
          is_repost: boolean | null
          location: string | null
          original_post_id: string | null
          repost_count: number | null
          share_count: number | null
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
          is_repost?: boolean | null
          location?: string | null
          original_post_id?: string | null
          repost_count?: number | null
          share_count?: number | null
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
          is_repost?: boolean | null
          location?: string | null
          original_post_id?: string | null
          repost_count?: number | null
          share_count?: number | null
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
      daily_check_ins: {
        Row: {
          blockers: string | null
          check_in_date: string
          completed_tasks: string[] | null
          created_at: string
          energy_level: number | null
          id: string
          mood_rating: number | null
          photo_url: string | null
          progress_summary: string
          sprint_id: string
          streak_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blockers?: string | null
          check_in_date?: string
          completed_tasks?: string[] | null
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_rating?: number | null
          photo_url?: string | null
          progress_summary: string
          sprint_id: string
          streak_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blockers?: string | null
          check_in_date?: string
          completed_tasks?: string[] | null
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_rating?: number | null
          photo_url?: string | null
          progress_summary?: string
          sprint_id?: string
          streak_count?: number | null
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
      calculate_business_success_score: {
        Args: { answers: Json }
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
      update_market_data_freshness: {
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
