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
      archives: {
        Row: {
          created_at: string
          date: string | null
          enterprise_key: string | null
          guild_id: string
          id: string
          montant: number | null
          payload: Json | null
          statut: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          enterprise_key?: string | null
          guild_id: string
          id?: string
          montant?: number | null
          payload?: Json | null
          statut?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          enterprise_key?: string | null
          guild_id?: string
          id?: string
          montant?: number | null
          payload?: Json | null
          statut?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      auth_credentials: {
        Row: {
          created_at: string | null
          email: string
          hwid: string | null
          hwid_reset_count: number | null
          id: string
          is_superstaff: boolean | null
          last_hwid_reset: string | null
          password_hash: string
          registration_date: string | null
          unique_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          hwid?: string | null
          hwid_reset_count?: number | null
          id?: string
          is_superstaff?: boolean | null
          last_hwid_reset?: string | null
          password_hash: string
          registration_date?: string | null
          unique_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          hwid?: string | null
          hwid_reset_count?: number | null
          id?: string
          is_superstaff?: boolean | null
          last_hwid_reset?: string | null
          password_hash?: string
          registration_date?: string | null
          unique_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auth_temp_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      discord_config: {
        Row: {
          client_id: string | null
          created_at: string
          data: Json
          id: string
          principal_guild_id: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          principal_guild_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          principal_guild_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          enterprise_id: string
          grade: string
          id: string
          is_active: boolean
          profile_id: string
          salary: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enterprise_id: string
          grade?: string
          id?: string
          is_active?: boolean
          profile_id: string
          salary?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enterprise_id?: string
          grade?: string
          id?: string
          is_active?: boolean
          profile_id?: string
          salary?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprises: {
        Row: {
          config: Json
          created_at: string
          discord_guild_id: string | null
          discord_role_id: string | null
          guild_id: string
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          discord_guild_id?: string | null
          discord_role_id?: string | null
          guild_id: string
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          discord_guild_id?: string | null
          discord_role_id?: string | null
          guild_id?: string
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprises_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          config: Json
          created_at: string
          discord_id: string
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          discord_id: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          discord_id?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hwid_audit: {
        Row: {
          attempted_at: string | null
          auth_credential_id: string | null
          created_at: string | null
          hwid: string
          id: string
          profile_id: string | null
          reason: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          auth_credential_id?: string | null
          created_at?: string | null
          hwid: string
          id?: string
          profile_id?: string | null
          reason?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          auth_credential_id?: string | null
          created_at?: string | null
          hwid?: string
          id?: string
          profile_id?: string | null
          reason?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hwid_audit_auth_credential_id_fkey"
            columns: ["auth_credential_id"]
            isOneToOne: false
            referencedRelation: "auth_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hwip_audit_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          base_salary: number
          bonus: number
          created_at: string
          data: Json
          deductions: number
          employee_id: string
          hours_worked: number | null
          id: string
          net_amount: number
          report_id: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          created_at?: string
          data?: Json
          deductions?: number
          employee_id: string
          hours_worked?: number | null
          id?: string
          net_amount?: number
          report_id: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          created_at?: string
          data?: Json
          deductions?: number
          employee_id?: string
          hours_worked?: number | null
          id?: string
          net_amount?: number
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "payroll_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_reports: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          employee_count: number
          enterprise_id: string
          id: string
          period_end: string
          period_start: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          employee_count?: number
          enterprise_id: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          employee_count?: number
          enterprise_id?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_reports_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          discord_id: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      salary_access_audit: {
        Row: {
          accessed_at: string | null
          enterprise_id: string
          id: string
          ip_address: unknown | null
          operation: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          enterprise_id: string
          id?: string
          ip_address?: unknown | null
          operation: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          enterprise_id?: string
          id?: string
          ip_address?: unknown | null
          operation?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_hwid_access_secure: {
        Args: { target_hwid: string; target_user_id: string }
        Returns: Json
      }
      check_hwip_access: {
        Args: { target_hwip: string; target_profile_id: string }
        Returns: Json
      }
      cleanup_expired_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_my_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          is_superstaff: boolean
          registration_date: string
          unique_id: string
        }[]
      }
      get_safe_user_credentials: {
        Args: { target_user_id?: string }
        Returns: {
          email: string
          has_hwid_registered: boolean
          hwid_reset_count: number
          id: string
          is_superstaff: boolean
          last_hwid_reset: string
          registration_date: string
          unique_id: string
          user_id: string
        }[]
      }
      get_user_security_info: {
        Args: { target_user_id?: string }
        Returns: {
          email: string
          hwid_registered: boolean
          is_superstaff: boolean
          registration_date: string
          reset_count: number
          unique_id: string
          user_id: string
        }[]
      }
      list_users_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          has_hwid_registered: boolean
          is_superstaff: boolean
          registration_date: string
          unique_id: string
        }[]
      }
      reset_hwid_secure: {
        Args: { target_user_id: string }
        Returns: Json
      }
      reset_hwip: {
        Args: { target_profile_id: string }
        Returns: Json
      }
      user_can_access_enterprise: {
        Args: { target_enterprise_id: string }
        Returns: boolean
      }
      verify_user_hwid_secure: {
        Args: { target_hwid: string }
        Returns: Json
      }
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
