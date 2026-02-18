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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          activity_type: string
          badge_emoji: string | null
          badge_name: string | null
          created_at: string
          id: string
          profile_id: string
          subject_name: string | null
          topic_name: string | null
          xp_earned: number | null
        }
        Insert: {
          activity_type: string
          badge_emoji?: string | null
          badge_name?: string | null
          created_at?: string
          id?: string
          profile_id: string
          subject_name?: string | null
          topic_name?: string | null
          xp_earned?: number | null
        }
        Update: {
          activity_type?: string
          badge_emoji?: string | null
          badge_name?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          subject_name?: string | null
          topic_name?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          badge_type: string
          created_at: string
          description: string
          emoji: string
          id: string
          name: string
          threshold: number
        }
        Insert: {
          badge_type: string
          created_at?: string
          description: string
          emoji: string
          id?: string
          name: string
          threshold: number
        }
        Update: {
          badge_type?: string
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          name?: string
          threshold?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          student_id: string
          topic_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          student_id: string
          topic_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          student_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_modules: {
        Row: {
          content_json: Json
          created_at: string
          difficulty_level: string
          id: string
          topic_id: string
        }
        Insert: {
          content_json: Json
          created_at?: string
          difficulty_level?: string
          id?: string
          topic_id: string
        }
        Update: {
          content_json?: Json
          created_at?: string
          difficulty_level?: string
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_modules_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      handwriting_submissions: {
        Row: {
          composite_score: number | null
          content_feedback: string | null
          content_max_score: number | null
          content_overall_rating: string | null
          content_score: number | null
          created_at: string
          id: string
          image_path: string | null
          letter_formation: number | null
          presentation: number | null
          profile_id: string
          question: string | null
          spacing_sizing: number | null
          subject_name: string | null
          topic_name: string | null
          transcribed_text: string | null
        }
        Insert: {
          composite_score?: number | null
          content_feedback?: string | null
          content_max_score?: number | null
          content_overall_rating?: string | null
          content_score?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          letter_formation?: number | null
          presentation?: number | null
          profile_id: string
          question?: string | null
          spacing_sizing?: number | null
          subject_name?: string | null
          topic_name?: string | null
          transcribed_text?: string | null
        }
        Update: {
          composite_score?: number | null
          content_feedback?: string | null
          content_max_score?: number | null
          content_overall_rating?: string | null
          content_score?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          letter_formation?: number | null
          presentation?: number | null
          profile_id?: string
          question?: string | null
          spacing_sizing?: number | null
          subject_name?: string | null
          topic_name?: string | null
          transcribed_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handwriting_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handwriting_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_streak: number | null
          first_name: string | null
          grade_level: string | null
          id: string
          last_active_date: string | null
          last_mission_date: string | null
          last_term_replenish_date: string | null
          onboarding_completed: boolean
          stripe_customer_id: string | null
          subscription_tier: string
          total_xp: number | null
          updated_at: string
          user_id: string
          username: string | null
          vacation_passes: number | null
          week_start_date: string | null
          weekly_xp_earned: number | null
          weekly_xp_goal: number | null
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          first_name?: string | null
          grade_level?: string | null
          id?: string
          last_active_date?: string | null
          last_mission_date?: string | null
          last_term_replenish_date?: string | null
          onboarding_completed?: boolean
          stripe_customer_id?: string | null
          subscription_tier?: string
          total_xp?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          vacation_passes?: number | null
          week_start_date?: string | null
          weekly_xp_earned?: number | null
          weekly_xp_goal?: number | null
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          first_name?: string | null
          grade_level?: string | null
          id?: string
          last_active_date?: string | null
          last_mission_date?: string | null
          last_term_replenish_date?: string | null
          onboarding_completed?: boolean
          stripe_customer_id?: string | null
          subscription_tier?: string
          total_xp?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          vacation_passes?: number | null
          week_start_date?: string | null
          weekly_xp_earned?: number | null
          weekly_xp_goal?: number | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean | null
          missions_this_week: number | null
          student_id: string
          topic_id: string
          updated_at: string
          week_start_date: string | null
          weekly_xp: number | null
          xp_earned: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          missions_this_week?: number | null
          student_id: string
          topic_id: string
          updated_at?: string
          week_start_date?: string | null
          weekly_xp?: number | null
          xp_earned?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          missions_this_week?: number | null
          student_id?: string
          topic_id?: string
          updated_at?: string
          week_start_date?: string | null
          weekly_xp?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          emoji: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
          order_index: number | null
          slug: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          order_index?: number | null
          slug: string
          subject_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          order_index?: number | null
          slug?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          profile_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_profiles: {
        Row: {
          created_at: string | null
          current_streak: number | null
          first_name: string | null
          grade_level: string | null
          id: string | null
          last_active_date: string | null
          last_mission_date: string | null
          last_term_replenish_date: string | null
          onboarding_completed: boolean | null
          subscription_tier: string | null
          total_xp: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          vacation_passes: number | null
          week_start_date: string | null
          weekly_xp_earned: number | null
          weekly_xp_goal: number | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          first_name?: string | null
          grade_level?: string | null
          id?: string | null
          last_active_date?: string | null
          last_mission_date?: string | null
          last_term_replenish_date?: string | null
          onboarding_completed?: boolean | null
          subscription_tier?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          vacation_passes?: number | null
          week_start_date?: string | null
          weekly_xp_earned?: number | null
          weekly_xp_goal?: number | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          first_name?: string | null
          grade_level?: string | null
          id?: string | null
          last_active_date?: string | null
          last_mission_date?: string | null
          last_term_replenish_date?: string | null
          onboarding_completed?: boolean | null
          subscription_tier?: string | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          vacation_passes?: number | null
          week_start_date?: string | null
          weekly_xp_earned?: number | null
          weekly_xp_goal?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_profile_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
