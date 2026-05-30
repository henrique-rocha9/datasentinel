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
      alert_recommendations: {
        Row: {
          alert_id: string
          category: string | null
          generated_at: string
          id: string
          priority: number
          recommendation_text: string
        }
        Insert: {
          alert_id: string
          category?: string | null
          generated_at?: string
          id?: string
          priority?: number
          recommendation_text: string
        }
        Update: {
          alert_id?: string
          category?: string | null
          generated_at?: string
          id?: string
          priority?: number
          recommendation_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_recommendations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          message: string
          model_id: string
          resolved_at: string | null
          risk_history_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message: string
          model_id: string
          resolved_at?: string | null
          risk_history_id?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string
          model_id?: string
          resolved_at?: string | null
          risk_history_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_risk_history_id_fkey"
            columns: ["risk_history_id"]
            isOneToOne: false
            referencedRelation: "risk_history"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_current: {
        Row: {
          cluster_characteristics: Json | null
          cluster_id: number
          cluster_label: string
          inferred_at: string
          model_id: string
          model_version: string
        }
        Insert: {
          cluster_characteristics?: Json | null
          cluster_id: number
          cluster_label: string
          inferred_at?: string
          model_id: string
          model_version: string
        }
        Update: {
          cluster_characteristics?: Json | null
          cluster_id?: number
          cluster_label?: string
          inferred_at?: string
          model_id?: string
          model_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_current_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_history: {
        Row: {
          id: string
          inferred_at: string
          model_id: string
          model_version: string
          new_cluster: number
          new_label: string
          previous_cluster: number | null
          previous_label: string | null
        }
        Insert: {
          id?: string
          inferred_at?: string
          model_id: string
          model_version: string
          new_cluster: number
          new_label: string
          previous_cluster?: number | null
          previous_label?: string | null
        }
        Update: {
          id?: string
          inferred_at?: string
          model_id?: string
          model_version?: string
          new_cluster?: number
          new_label?: string
          previous_cluster?: number | null
          previous_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cluster_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          error_count: number
          finished_at: string | null
          id: string
          notes: string | null
          row_count: number
          source_filename: string | null
          source_kind: Database["public"]["Enums"]["import_kind"]
          started_at: string
          started_by: string | null
          status: Database["public"]["Enums"]["import_status"]
          success_count: number
        }
        Insert: {
          error_count?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          row_count?: number
          source_filename?: string | null
          source_kind: Database["public"]["Enums"]["import_kind"]
          started_at?: string
          started_by?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          success_count?: number
        }
        Update: {
          error_count?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          row_count?: number
          source_filename?: string | null
          source_kind?: Database["public"]["Enums"]["import_kind"]
          started_at?: string
          started_by?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          success_count?: number
        }
        Relationships: []
      }
      import_errors: {
        Row: {
          batch_id: string
          created_at: string
          error_message: string
          id: string
          raw_row: Json | null
          row_number: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_message: string
          id?: string
          raw_row?: Json | null
          row_number?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_message?: string
          id?: string
          raw_row?: Json | null
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_logs: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          investigation_id: string
          log_type: Database["public"]["Enums"]["investigation_log_type"]
          metadata: Json | null
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          investigation_id: string
          log_type: Database["public"]["Enums"]["investigation_log_type"]
          metadata?: Json | null
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          investigation_id?: string
          log_type?: Database["public"]["Enums"]["investigation_log_type"]
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "investigation_logs_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      investigations: {
        Row: {
          assigned_analyst_id: string | null
          closed_at: string | null
          description: string | null
          id: string
          model_id: string
          opened_at: string
          opened_by: string | null
          reason: string
          status: Database["public"]["Enums"]["investigation_status"]
          triggering_alert_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_analyst_id?: string | null
          closed_at?: string | null
          description?: string | null
          id?: string
          model_id: string
          opened_at?: string
          opened_by?: string | null
          reason: string
          status?: Database["public"]["Enums"]["investigation_status"]
          triggering_alert_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_analyst_id?: string | null
          closed_at?: string | null
          description?: string | null
          id?: string
          model_id?: string
          opened_at?: string
          opened_by?: string | null
          reason?: string
          status?: Database["public"]["Enums"]["investigation_status"]
          triggering_alert_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investigations_triggering_alert_id_fkey"
            columns: ["triggering_alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_aggregates: {
        Row: {
          avg_defects: number
          avg_resolution_time: number
          avg_retrabalho: number
          high_os_count: number
          high_os_percentage: number
          last_metric_at: string | null
          model_id: string
          parts_replaced_total: number
          sum_defects: number
          sum_resolution_hours: number
          sum_retrabalho: number
          total_os: number
          total_os_log: number
          updated_at: string
        }
        Insert: {
          avg_defects?: number
          avg_resolution_time?: number
          avg_retrabalho?: number
          high_os_count?: number
          high_os_percentage?: number
          last_metric_at?: string | null
          model_id: string
          parts_replaced_total?: number
          sum_defects?: number
          sum_resolution_hours?: number
          sum_retrabalho?: number
          total_os?: number
          total_os_log?: number
          updated_at?: string
        }
        Update: {
          avg_defects?: number
          avg_resolution_time?: number
          avg_retrabalho?: number
          high_os_count?: number
          high_os_percentage?: number
          last_metric_at?: string | null
          model_id?: string
          parts_replaced_total?: number
          sum_defects?: number
          sum_resolution_hours?: number
          sum_retrabalho?: number
          total_os?: number
          total_os_log?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_aggregates_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
        ]
      }
      product_families: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_metrics: {
        Row: {
          defect_count: number
          id: string
          import_batch_id: string | null
          is_high_os: boolean
          model_id: string
          parts_replaced: number
          raw_payload: Json | null
          resolution_time_hours: number
          retrabalho: number
          source: Database["public"]["Enums"]["metric_source"]
          state_code: string
          submitted_at: string
          submitted_by: string | null
          warranty_status: string
        }
        Insert: {
          defect_count: number
          id?: string
          import_batch_id?: string | null
          is_high_os?: boolean
          model_id: string
          parts_replaced: number
          raw_payload?: Json | null
          resolution_time_hours: number
          retrabalho: number
          source?: Database["public"]["Enums"]["metric_source"]
          state_code: string
          submitted_at?: string
          submitted_by?: string | null
          warranty_status: string
        }
        Update: {
          defect_count?: number
          id?: string
          import_batch_id?: string | null
          is_high_os?: boolean
          model_id?: string
          parts_replaced?: number
          raw_payload?: Json | null
          resolution_time_hours?: number
          retrabalho?: number
          source?: Database["public"]["Enums"]["metric_source"]
          state_code?: string
          submitted_at?: string
          submitted_by?: string | null
          warranty_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_metrics_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_metrics_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "product_states"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_metrics_warranty_status_fkey"
            columns: ["warranty_status"]
            isOneToOne: false
            referencedRelation: "warranty_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      product_models: {
        Row: {
          created_at: string
          external_product_id: string
          family_id: string
          id: string
          name: string
          sku: string | null
          state_code: string | null
          updated_at: string
          warranty_default: string | null
        }
        Insert: {
          created_at?: string
          external_product_id: string
          family_id: string
          id?: string
          name: string
          sku?: string | null
          state_code?: string | null
          updated_at?: string
          warranty_default?: string | null
        }
        Update: {
          created_at?: string
          external_product_id?: string
          family_id?: string
          id?: string
          name?: string
          sku?: string | null
          state_code?: string | null
          updated_at?: string
          warranty_default?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_models_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_models_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "product_states"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_models_warranty_default_fkey"
            columns: ["warranty_default"]
            isOneToOne: false
            referencedRelation: "warranty_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      product_states: {
        Row: {
          active: boolean
          code: string
          created_at: string
          label_pt: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          label_pt: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          label_pt?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      risk_current: {
        Row: {
          confidence: number
          inferred_at: string
          model_id: string
          model_version: string
          prob_high: number
          prob_low: number
          prob_medium: number
          risk_class: Database["public"]["Enums"]["risk_level"]
          risk_score: number
        }
        Insert: {
          confidence: number
          inferred_at?: string
          model_id: string
          model_version: string
          prob_high: number
          prob_low: number
          prob_medium: number
          risk_class: Database["public"]["Enums"]["risk_level"]
          risk_score: number
        }
        Update: {
          confidence?: number
          inferred_at?: string
          model_id?: string
          model_version?: string
          prob_high?: number
          prob_low?: number
          prob_medium?: number
          risk_class?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "risk_current_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_history: {
        Row: {
          id: string
          inferred_at: string
          model_id: string
          model_version: string
          new_class: Database["public"]["Enums"]["risk_level"]
          new_score: number
          previous_class: Database["public"]["Enums"]["risk_level"] | null
          previous_score: number | null
          source_metric_id: string | null
          transition: Database["public"]["Enums"]["risk_transition"] | null
        }
        Insert: {
          id?: string
          inferred_at?: string
          model_id: string
          model_version: string
          new_class: Database["public"]["Enums"]["risk_level"]
          new_score: number
          previous_class?: Database["public"]["Enums"]["risk_level"] | null
          previous_score?: number | null
          source_metric_id?: string | null
          transition?: Database["public"]["Enums"]["risk_transition"] | null
        }
        Update: {
          id?: string
          inferred_at?: string
          model_id?: string
          model_version?: string
          new_class?: Database["public"]["Enums"]["risk_level"]
          new_score?: number
          previous_class?: Database["public"]["Enums"]["risk_level"] | null
          previous_score?: number | null
          source_metric_id?: string | null
          transition?: Database["public"]["Enums"]["risk_transition"] | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_history_source_metric_id_fkey"
            columns: ["source_metric_id"]
            isOneToOne: false
            referencedRelation: "product_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: unknown
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
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
      warranty_statuses: {
        Row: {
          active: boolean
          code: string
          created_at: string
          label_pt: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          label_pt: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          label_pt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_rebuild_aggregates: { Args: { _model_id: string }; Returns: undefined }
      fn_record_cluster_change: {
        Args: {
          _characteristics: Json
          _model_id: string
          _model_version: string
          _new_cluster: number
          _new_label: string
        }
        Returns: string
      }
      fn_record_risk_change: {
        Args: {
          _confidence: number
          _model_id: string
          _model_version: string
          _new_class: Database["public"]["Enums"]["risk_level"]
          _new_score: number
          _prob_high: number
          _prob_low: number
          _prob_medium: number
          _source_metric_id?: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "medium" | "high" | "critical"
      alert_status: "open" | "acknowledged" | "resolved"
      app_role: "admin" | "analyst" | "viewer"
      import_kind: "products" | "metrics"
      import_status: "pending" | "running" | "completed" | "failed"
      investigation_log_type:
        | "comment"
        | "status_change"
        | "assignment"
        | "attachment"
      investigation_status: "open" | "in_progress" | "closed"
      metric_source: "manual" | "import" | "api"
      risk_level: "low" | "medium" | "high"
      risk_transition:
        | "low_to_medium"
        | "low_to_high"
        | "medium_to_high"
        | "medium_to_low"
        | "high_to_medium"
        | "high_to_low"
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
      alert_severity: ["medium", "high", "critical"],
      alert_status: ["open", "acknowledged", "resolved"],
      app_role: ["admin", "analyst", "viewer"],
      import_kind: ["products", "metrics"],
      import_status: ["pending", "running", "completed", "failed"],
      investigation_log_type: [
        "comment",
        "status_change",
        "assignment",
        "attachment",
      ],
      investigation_status: ["open", "in_progress", "closed"],
      metric_source: ["manual", "import", "api"],
      risk_level: ["low", "medium", "high"],
      risk_transition: [
        "low_to_medium",
        "low_to_high",
        "medium_to_high",
        "medium_to_low",
        "high_to_medium",
        "high_to_low",
      ],
    },
  },
} as const
