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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_credit_usage: {
        Row: {
          created_at: string
          day: string
          id: string
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          credits_cost: number
          endpoint: string
          error_message: string | null
          id: string
          latency_ms: number | null
          method: string
          status: number
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          credits_cost?: number
          endpoint: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          method: string
          status: number
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          credits_cost?: number
          endpoint?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          method?: string
          status?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_downloads: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_downloads_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_saves: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_saves_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          id: string
          mime_type: string | null
          premium_only: boolean
          size_bytes: number | null
          storage_path: string
          tags: string[]
          thumbnail_path: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          premium_only?: boolean
          size_bytes?: number | null
          storage_path: string
          tags?: string[]
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          premium_only?: boolean
          size_bytes?: number | null
          storage_path?: string
          tags?: string[]
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      auth_failures: {
        Row: {
          created_at: string
          email_lower: string
          id: string
        }
        Insert: {
          created_at?: string
          email_lower: string
          id?: string
        }
        Update: {
          created_at?: string
          email_lower?: string
          id?: string
        }
        Relationships: []
      }
      batch_items: {
        Row: {
          batch_id: string
          created_at: string
          credits_cost: number | null
          error: string | null
          generation_id: string | null
          id: string
          output_image: string | null
          output_text: string | null
          position: number
          prompt: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          credits_cost?: number | null
          error?: string | null
          generation_id?: string | null
          id?: string
          output_image?: string | null
          output_text?: string | null
          position: number
          prompt: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          credits_cost?: number | null
          error?: string | null
          generation_id?: string | null
          id?: string
          output_image?: string | null
          output_text?: string | null
          position?: number
          prompt?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_jobs: {
        Row: {
          aspect_ratio: string | null
          completed: number
          created_at: string
          error: string | null
          failed: number
          id: string
          kind: string
          name: string
          status: string
          system_prompt: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          completed?: number
          created_at?: string
          error?: string | null
          failed?: number
          id?: string
          kind: string
          name: string
          status?: string
          system_prompt?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          completed?: number
          created_at?: string
          error?: string | null
          failed?: number
          id?: string
          kind?: string
          name?: string
          status?: string
          system_prompt?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_preferences: {
        Row: {
          created_at: string
          creator_type: Database["public"]["Enums"]["creator_type"] | null
          goals: string[]
          interests: string[]
          niche: string | null
          platforms: string[]
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_type?: Database["public"]["Enums"]["creator_type"] | null
          goals?: string[]
          interests?: string[]
          niche?: string | null
          platforms?: string[]
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_type?: Database["public"]["Enums"]["creator_type"] | null
          goals?: string[]
          interests?: string[]
          niche?: string | null
          platforms?: string[]
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_public: boolean
          kind: string
          likes_count: number
          output_text: string | null
          prompt: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          kind: string
          likes_count?: number
          output_text?: string | null
          prompt: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          kind?: string
          likes_count?: number
          output_text?: string | null
          prompt?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          credits_cost: number | null
          folder_id: string | null
          id: string
          input: string | null
          is_favorite: boolean
          kind: string
          output_image: string | null
          output_text: string | null
          parent_id: string | null
          prompt: string
          system_prompt: string | null
          tool_id: string
          tool_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          credits_cost?: number | null
          folder_id?: string | null
          id?: string
          input?: string | null
          is_favorite?: boolean
          kind: string
          output_image?: string | null
          output_text?: string | null
          parent_id?: string | null
          prompt: string
          system_prompt?: string | null
          tool_id: string
          tool_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          credits_cost?: number | null
          folder_id?: string | null
          id?: string
          input?: string | null
          is_favorite?: boolean
          kind?: string
          output_image?: string | null
          output_text?: string | null
          parent_id?: string | null
          prompt?: string
          system_prompt?: string | null
          tool_id?: string
          tool_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "generation_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bonus_credits: number
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bonus_credits?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bonus_credits?: number
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          count?: number
          window_start?: string
        }
        Relationships: []
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
      referrals: {
        Row: {
          awarded_at: string | null
          created_at: string
          credits_referee: number
          credits_referrer: number
          id: string
          referee_id: string
          referrer_id: string
        }
        Insert: {
          awarded_at?: string | null
          created_at?: string
          credits_referee?: number
          credits_referrer?: number
          id?: string
          referee_id: string
          referrer_id: string
        }
        Update: {
          awarded_at?: string | null
          created_at?: string
          credits_referee?: number
          credits_referrer?: number
          id?: string
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      scheduled_jobs: {
        Row: {
          active: boolean
          aspect_ratio: string | null
          cadence: string
          created_at: string
          hour_utc: number
          id: string
          kind: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          prompts: Json
          system_prompt: string | null
          updated_at: string
          user_id: string
          weekday: number | null
        }
        Insert: {
          active?: boolean
          aspect_ratio?: string | null
          cadence: string
          created_at?: string
          hour_utc?: number
          id?: string
          kind: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          prompts?: Json
          system_prompt?: string | null
          updated_at?: string
          user_id: string
          weekday?: number | null
        }
        Update: {
          active?: boolean
          aspect_ratio?: string | null
          cadence?: string
          created_at?: string
          hour_utc?: number
          id?: string
          kind?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          prompts?: Json
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
          weekday?: number | null
        }
        Relationships: []
      }
      status_checks: {
        Row: {
          created_at: string
          id: string
          latency_ms: number | null
          message: string | null
          service: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          message?: string | null
          service: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          message?: string | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          description: string
          id: string
          kind: string
          prompt: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          cover_image_url?: string | null
          created_at?: string
          description: string
          id?: string
          kind: string
          prompt: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: string
          prompt?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      thumbnail_usage: {
        Row: {
          count: number
          created_at: string
          day: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          day?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          day?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_activity: {
        Row: {
          id: string
          last_viewed_at: string
          pack_category: string | null
          pack_slug: string
          pack_title: string
          progress: number | null
          user_id: string
        }
        Insert: {
          id?: string
          last_viewed_at?: string
          pack_category?: string | null
          pack_slug: string
          pack_title: string
          progress?: number | null
          user_id: string
        }
        Update: {
          id?: string
          last_viewed_at?: string
          pack_category?: string | null
          pack_slug?: string
          pack_title?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_referral_bonus: { Args: { _referee: string }; Returns: boolean }
      check_signin_lockout: {
        Args: { _email: string }
        Returns: {
          attempts: number
          locked: boolean
          unlock_at: string
        }[]
      }
      claim_asset_download: {
        Args: { _asset_id: string; _daily_limit?: number }
        Returns: {
          allowed: boolean
          daily_limit: number
          downloads_remaining: number
          downloads_used: number
          message: string
          reset_at: string
        }[]
      }
      clear_signin_failures: { Args: { _email: string }; Returns: undefined }
      consume_bonus_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: number
      }
      consume_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      ensure_referral_code: { Args: { _user_id: string }; Returns: string }
      get_referrer_by_code: {
        Args: { _code: string }
        Returns: {
          display_name: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      record_referral: {
        Args: { _code: string; _referee: string }
        Returns: boolean
      }
      record_signin_failure: { Args: { _email: string }; Returns: undefined }
    }
    Enums: {
      app_role: "free" | "premium" | "admin"
      creator_type:
        | "video_editor"
        | "designer"
        | "content_creator"
        | "freelancer"
        | "entrepreneur"
        | "photographer"
        | "developer"
        | "other"
      skill_level: "beginner" | "intermediate" | "advanced" | "pro"
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
      app_role: ["free", "premium", "admin"],
      creator_type: [
        "video_editor",
        "designer",
        "content_creator",
        "freelancer",
        "entrepreneur",
        "photographer",
        "developer",
        "other",
      ],
      skill_level: ["beginner", "intermediate", "advanced", "pro"],
    },
  },
} as const
