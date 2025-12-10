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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_time: string | null
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          registration_enabled: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          activity_date: string
          activity_time?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          registration_enabled?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_time?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          registration_enabled?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_registrations: {
        Row: {
          activity_id: string
          id: string
          registered_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          id?: string
          registered_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          id?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_registrations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          importance: string
          title: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          importance?: string
          title: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          importance?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          activity_id: string | null
          id: string
          marked_at: string
          marked_by: string | null
          meeting_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          id?: string
          marked_at?: string
          marked_by?: string | null
          meeting_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          id?: string
          marked_at?: string
          marked_by?: string | null
          meeting_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_url: string | null
          created_at: string
          created_by: string | null
          event_name: string
          id: string
          issue_date: string
          name: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          created_by?: string | null
          event_name: string
          id?: string
          issue_date: string
          name: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          created_by?: string | null
          event_name?: string
          id?: string
          issue_date?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          admin_comment: string | null
          created_at: string
          from_date: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_date: string
          user_id: string
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string
          from_date: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_date: string
          user_id: string
        }
        Update: {
          admin_comment?: string | null
          created_at?: string
          from_date?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_date?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_time: string | null
          mom_url: string | null
          title: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_time?: string | null
          mom_url?: string | null
          title: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string | null
          mom_url?: string | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhaar_number: string | null
          blood_group: string | null
          class_coordinator_name: string | null
          college_name: string | null
          course_duration: string | null
          created_at: string
          current_semester: number | null
          date_of_birth: string | null
          enrollment_number: string | null
          first_name: string
          gender: string | null
          hod_name: string | null
          id: string
          last_name: string
          middle_name: string | null
          principal_name: string | null
          profile_photo_url: string | null
          status: string
          uid: string
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          blood_group?: string | null
          class_coordinator_name?: string | null
          college_name?: string | null
          course_duration?: string | null
          created_at?: string
          current_semester?: number | null
          date_of_birth?: string | null
          enrollment_number?: string | null
          first_name: string
          gender?: string | null
          hod_name?: string | null
          id?: string
          last_name: string
          middle_name?: string | null
          principal_name?: string | null
          profile_photo_url?: string | null
          status?: string
          uid: string
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          blood_group?: string | null
          class_coordinator_name?: string | null
          college_name?: string | null
          course_duration?: string | null
          created_at?: string
          current_semester?: number | null
          date_of_birth?: string | null
          enrollment_number?: string | null
          first_name?: string
          gender?: string | null
          hod_name?: string | null
          id?: string
          last_name?: string
          middle_name?: string | null
          principal_name?: string | null
          profile_photo_url?: string | null
          status?: string
          uid?: string
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      resource_assignments: {
        Row: {
          assigned_at: string
          id: string
          quantity: number
          resource_id: string
          returned_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          quantity?: number
          resource_id: string
          returned_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          quantity?: number
          resource_id?: string
          returned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          available_quantity: number
          category: string
          created_at: string
          id: string
          name: string
          total_quantity: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          category: string
          created_at?: string
          id?: string
          name: string
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          category?: string
          created_at?: string
          id?: string
          name?: string
          total_quantity?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_next_uid: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_coordinator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      user_role: "admin" | "coordinator" | "executive" | "core" | "member"
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
      user_role: ["admin", "coordinator", "executive", "core", "member"],
    },
  },
} as const
