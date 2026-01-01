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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          property_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          property_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          property_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      arrabons: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          payment_method: string
          payment_proof_url: string | null
          payment_reference: string | null
          rejection_reason: string | null
          released_at: string | null
          status: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          rejection_reason?: string | null
          released_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          rejection_reason?: string | null
          released_at?: string | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arrabons_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_reminders: {
        Row: {
          bill_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_reminded_at: string | null
          remind_days_before: number
          user_id: string
        }
        Insert: {
          bill_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_reminded_at?: string | null
          remind_days_before?: number
          user_id: string
        }
        Update: {
          bill_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_reminded_at?: string | null
          remind_days_before?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_reminders_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          bill_type: string
          contract_id: string | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          property_id: string | null
          recurring: boolean | null
          recurring_day: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bill_type: string
          contract_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          property_id?: string | null
          recurring?: boolean | null
          recurring_day?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_type?: string
          contract_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          property_id?: string | null
          recurring?: boolean | null
          recurring_day?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_type: string
          created_at: string | null
          description: string | null
          end_date: string | null
          handyman_id: string | null
          id: string
          landlord_id: string
          landlord_signed: boolean | null
          landlord_signed_at: string | null
          monthly_amount: number | null
          property_id: string | null
          start_date: string
          status: string
          tenant_id: string
          tenant_signed: boolean | null
          tenant_signed_at: string | null
          terms: string | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          contract_type: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          handyman_id?: string | null
          id?: string
          landlord_id: string
          landlord_signed?: boolean | null
          landlord_signed_at?: string | null
          monthly_amount?: number | null
          property_id?: string | null
          start_date: string
          status?: string
          tenant_id: string
          tenant_signed?: boolean | null
          tenant_signed_at?: string | null
          terms?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          contract_type?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          handyman_id?: string | null
          id?: string
          landlord_id?: string
          landlord_signed?: boolean | null
          landlord_signed_at?: string | null
          monthly_amount?: number | null
          property_id?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          tenant_signed?: boolean | null
          tenant_signed_at?: string | null
          terms?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
          property_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
          property_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      handymen: {
        Row: {
          created_at: string | null
          description: string | null
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          latitude: number | null
          longitude: number | null
          rating: number | null
          service_area_km: number | null
          specialty: string[]
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          rating?: number | null
          service_area_km?: number | null
          specialty: string[]
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          rating?: number | null
          service_area_km?: number | null
          specialty?: string[]
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          created_at: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_type: string | null
          rejection_reason: string | null
          selfie_url: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_type?: string | null
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_type?: string | null
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
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
          avatar_url: string | null
          avg_rating: number | null
          created_at: string | null
          full_name: string | null
          id: string
          kyc_data: Json | null
          kyc_verified: boolean | null
          phone: string | null
          reputation_badges: string[] | null
          role_type: string | null
          settings: Json | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          kyc_data?: Json | null
          kyc_verified?: boolean | null
          phone?: string | null
          reputation_badges?: string[] | null
          role_type?: string | null
          settings?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          kyc_data?: Json | null
          kyc_verified?: boolean | null
          phone?: string | null
          reputation_badges?: string[] | null
          role_type?: string | null
          settings?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          amenities: string[] | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_available: boolean | null
          latitude: number | null
          longitude: number | null
          owner_id: string
          price: number
          price_period: string | null
          property_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          owner_id: string
          price: number
          price_period?: string | null
          property_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string
          price?: number
          price_period?: string | null
          property_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          badges: string[] | null
          comment: string | null
          contract_id: string
          created_at: string
          id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
          reviewer_role: string
          updated_at: string
        }
        Insert: {
          badges?: string[] | null
          comment?: string | null
          contract_id: string
          created_at?: string
          id?: string
          rating: number
          reviewed_id: string
          reviewer_id: string
          reviewer_role: string
          updated_at?: string
        }
        Update: {
          badges?: string[] | null
          comment?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
          reviewer_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      search_alerts: {
        Row: {
          amenities: string[] | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_notified_at: string | null
          max_bedrooms: number | null
          max_price: number | null
          min_bedrooms: number | null
          min_price: number | null
          name: string
          property_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amenities?: string[] | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          max_bedrooms?: number | null
          max_price?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          name: string
          property_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amenities?: string[] | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          max_bedrooms?: number | null
          max_price?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          name?: string
          property_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
