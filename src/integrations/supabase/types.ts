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
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      artisan_profiles: {
        Row: {
          bio: string | null
          cancelled_jobs: number
          category_id: string | null
          completed_jobs: number
          created_at: string
          custom_category: string | null
          id: string
          is_available: boolean
          latitude: number
          longitude: number
          paystack_subaccount_code: string | null
          rating_avg: number
          service_radius_km: number
          total_jobs: number
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          cancelled_jobs?: number
          category_id?: string | null
          completed_jobs?: number
          created_at?: string
          custom_category?: string | null
          id?: string
          is_available?: boolean
          latitude: number
          longitude: number
          paystack_subaccount_code?: string | null
          rating_avg?: number
          service_radius_km?: number
          total_jobs?: number
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          cancelled_jobs?: number
          category_id?: string | null
          completed_jobs?: number
          created_at?: string
          custom_category?: string | null
          id?: string
          is_available?: boolean
          latitude?: number
          longitude?: number
          paystack_subaccount_code?: string | null
          rating_avg?: number
          service_radius_km?: number
          total_jobs?: number
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artisan_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      artisan_submissions: {
        Row: {
          category_id: string | null
          created_at: string
          custom_category: string | null
          email: string
          full_name: string
          id: string
          location: string | null
          metadata: Json | null
          phone: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          custom_category?: string | null
          email: string
          full_name: string
          id?: string
          location?: string | null
          metadata?: Json | null
          phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          custom_category?: string | null
          email?: string
          full_name?: string
          id?: string
          location?: string | null
          metadata?: Json | null
          phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artisan_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      artisan_violations: {
        Row: {
          artisan_id: string
          created_at: string
          id: string
          notes: string | null
          reported_by: string
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Insert: {
          artisan_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reported_by: string
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Update: {
          artisan_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reported_by?: string
          violation_type?: Database["public"]["Enums"]["violation_type"]
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_submissions: {
        Row: {
          address: string | null
          category_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          metadata: Json | null
          nin: string
          nin_encrypted: string | null
          phone: string | null
          rejection_reason: string | null
          service_description: string | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          metadata?: Json | null
          nin: string
          nin_encrypted?: string | null
          phone?: string | null
          rejection_reason?: string | null
          service_description?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          metadata?: Json | null
          nin?: string
          nin_encrypted?: string | null
          phone?: string | null
          rejection_reason?: string | null
          service_description?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      form_configs: {
        Row: {
          created_at: string
          field_schema: Json
          id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_schema?: Json
          id?: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_schema?: Json
          id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          job_id: string
          new_status: Database["public"]["Enums"]["job_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["job_status"] | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          job_id: string
          new_status: Database["public"]["Enums"]["job_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["job_status"] | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          job_id?: string
          new_status?: Database["public"]["Enums"]["job_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["job_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string
          admin_assigner_id: string | null
          artisan_id: string | null
          assigned_by: string | null
          cancellation_reason: string | null
          category_id: string | null
          commission_percent: number
          created_at: string
          customer_id: string
          description: string
          final_amount: number | null
          guarantee_expires_at: string | null
          id: string
          inspection_fee: number | null
          latitude: number
          longitude: number
          photo_after: string | null
          photo_before: string | null
          quoted_amount: number | null
          requires_inspection: boolean
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          admin_assigner_id?: string | null
          artisan_id?: string | null
          assigned_by?: string | null
          cancellation_reason?: string | null
          category_id?: string | null
          commission_percent?: number
          created_at?: string
          customer_id: string
          description: string
          final_amount?: number | null
          guarantee_expires_at?: string | null
          id?: string
          inspection_fee?: number | null
          latitude: number
          longitude: number
          photo_after?: string | null
          photo_before?: string | null
          quoted_amount?: number | null
          requires_inspection?: boolean
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          admin_assigner_id?: string | null
          artisan_id?: string | null
          assigned_by?: string | null
          cancellation_reason?: string | null
          category_id?: string | null
          commission_percent?: number
          created_at?: string
          customer_id?: string
          description?: string
          final_amount?: number | null
          guarantee_expires_at?: string | null
          id?: string
          inspection_fee?: number | null
          latitude?: number
          longitude?: number
          photo_after?: string | null
          photo_before?: string | null
          quoted_amount?: number | null
          requires_inspection?: boolean
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          artisan_amount: number
          artisan_id: string
          commission_amount: number
          created_at: string
          customer_id: string
          id: string
          job_id: string
          paid_at: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          paystack_reference: string | null
          paystack_transfer_code: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          artisan_amount?: number
          artisan_id: string
          commission_amount?: number
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          paid_at?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          paystack_reference?: string | null
          paystack_transfer_code?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          artisan_amount?: number
          artisan_id?: string
          commission_amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          paid_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          paystack_reference?: string | null
          paystack_transfer_code?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          artisan_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          job_id: string
          rating: number
        }
        Insert: {
          artisan_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          rating: number
        }
        Update: {
          artisan_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          submission_id: string
          submission_type: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          submission_id: string
          submission_type: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          submission_id?: string
          submission_type?: string
        }
        Relationships: []
      }
      submission_rate_limits: {
        Row: {
          attempt_count: number | null
          endpoint: string
          id: string
          ip_address: string
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          endpoint: string
          id?: string
          ip_address: string
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          endpoint?: string
          id?: string
          ip_address?: string
          window_start?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_nin: {
        Args: { encrypted_nin: string; encryption_key: string }
        Returns: string
      }
      encrypt_nin: {
        Args: { encryption_key: string; nin_value: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      job_status:
        | "pending"
        | "assigned"
        | "quoted"
        | "inspection_requested"
        | "inspection_paid"
        | "price_agreed"
        | "payment_escrowed"
        | "in_progress"
        | "completed"
        | "confirmed"
        | "disputed"
        | "cancelled"
      payment_status: "pending" | "paid" | "held" | "released" | "refunded"
      payment_type: "inspection_fee" | "job_payment"
      submission_status: "pending" | "confirmed" | "rejected"
      user_role: "customer" | "artisan"
      violation_type: "bypass_attempt" | "no_show" | "poor_quality" | "other"
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
      job_status: [
        "pending",
        "assigned",
        "quoted",
        "inspection_requested",
        "inspection_paid",
        "price_agreed",
        "payment_escrowed",
        "in_progress",
        "completed",
        "confirmed",
        "disputed",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "held", "released", "refunded"],
      payment_type: ["inspection_fee", "job_payment"],
      submission_status: ["pending", "confirmed", "rejected"],
      user_role: ["customer", "artisan"],
      violation_type: ["bypass_attempt", "no_show", "poor_quality", "other"],
    },
  },
} as const
