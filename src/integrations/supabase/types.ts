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
      agency_packages: {
        Row: {
          analytics_access: boolean | null
          created_at: string
          dedicated_support: boolean | null
          id: string
          is_active: boolean | null
          max_listings: number | null
          monthly_price: number
          name: string
          name_ar: string
          priority_display: boolean | null
          verified_badge: boolean | null
        }
        Insert: {
          analytics_access?: boolean | null
          created_at?: string
          dedicated_support?: boolean | null
          id?: string
          is_active?: boolean | null
          max_listings?: number | null
          monthly_price: number
          name: string
          name_ar: string
          priority_display?: boolean | null
          verified_badge?: boolean | null
        }
        Update: {
          analytics_access?: boolean | null
          created_at?: string
          dedicated_support?: boolean | null
          id?: string
          is_active?: boolean | null
          max_listings?: number | null
          monthly_price?: number
          name?: string
          name_ar?: string
          priority_display?: boolean | null
          verified_badge?: boolean | null
        }
        Relationships: []
      }
      agency_subscriptions: {
        Row: {
          agency_address: string | null
          agency_logo_url: string | null
          agency_name: string
          agency_phone: string | null
          auto_renew: boolean | null
          commercial_register: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_payment_at: string | null
          next_payment_at: string | null
          package_id: string
          payment_method: string | null
          rejection_reason: string | null
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          agency_address?: string | null
          agency_logo_url?: string | null
          agency_name: string
          agency_phone?: string | null
          auto_renew?: boolean | null
          commercial_register?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_payment_at?: string | null
          next_payment_at?: string | null
          package_id: string
          payment_method?: string | null
          rejection_reason?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          agency_address?: string | null
          agency_logo_url?: string | null
          agency_name?: string
          agency_phone?: string | null
          auto_renew?: boolean | null
          commercial_register?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_payment_at?: string | null
          next_payment_at?: string | null
          package_id?: string
          payment_method?: string | null
          rejection_reason?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "agency_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          landlord_consented_at: string | null
          landlord_id: string
          landlord_phone_consent: boolean | null
          landlord_signature_data: string | null
          landlord_signed: boolean | null
          landlord_signed_at: string | null
          monthly_amount: number | null
          property_id: string | null
          start_date: string
          status: string
          tenant_consented_at: string | null
          tenant_id: string
          tenant_phone_consent: boolean | null
          tenant_signature_data: string | null
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
          landlord_consented_at?: string | null
          landlord_id: string
          landlord_phone_consent?: boolean | null
          landlord_signature_data?: string | null
          landlord_signed?: boolean | null
          landlord_signed_at?: string | null
          monthly_amount?: number | null
          property_id?: string | null
          start_date: string
          status?: string
          tenant_consented_at?: string | null
          tenant_id: string
          tenant_phone_consent?: boolean | null
          tenant_signature_data?: string | null
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
          landlord_consented_at?: string | null
          landlord_id?: string
          landlord_phone_consent?: boolean | null
          landlord_signature_data?: string | null
          landlord_signed?: boolean | null
          landlord_signed_at?: string | null
          monthly_amount?: number | null
          property_id?: string | null
          start_date?: string
          status?: string
          tenant_consented_at?: string | null
          tenant_id?: string
          tenant_phone_consent?: boolean | null
          tenant_signature_data?: string | null
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
      demand_analytics: {
        Row: {
          avg_price: number | null
          city: string
          created_at: string | null
          id: string
          inquiry_count: number | null
          latitude: number | null
          longitude: number | null
          period_date: string
          property_type: string | null
          search_count: number | null
          view_count: number | null
        }
        Insert: {
          avg_price?: number | null
          city: string
          created_at?: string | null
          id?: string
          inquiry_count?: number | null
          latitude?: number | null
          longitude?: number | null
          period_date: string
          property_type?: string | null
          search_count?: number | null
          view_count?: number | null
        }
        Update: {
          avg_price?: number | null
          city?: string
          created_at?: string | null
          id?: string
          inquiry_count?: number | null
          latitude?: number | null
          longitude?: number | null
          period_date?: string
          property_type?: string | null
          search_count?: number | null
          view_count?: number | null
        }
        Relationships: []
      }
      encrypted_data_vault: {
        Row: {
          created_at: string | null
          data_hash: string
          data_type: string
          encrypted_data: string
          encryption_version: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_hash: string
          data_type: string
          encrypted_data: string
          encryption_version?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_hash?: string
          data_type?: string
          encrypted_data?: string
          encryption_version?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_listings: {
        Row: {
          created_at: string
          duration_days: number
          expires_at: string | null
          feature_type: string
          id: string
          payment_method: string
          payment_proof_url: string | null
          payment_reference: string | null
          price_paid: number
          property_id: string
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          duration_days: number
          expires_at?: string | null
          feature_type?: string
          id?: string
          payment_method: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          price_paid: number
          property_id: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          duration_days?: number
          expires_at?: string | null
          feature_type?: string
          id?: string
          payment_method?: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          price_paid?: number
          property_id?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_pricing: {
        Row: {
          created_at: string
          discount_percentage: number | null
          duration_days: number
          id: string
          is_active: boolean | null
          price: number
        }
        Insert: {
          created_at?: string
          discount_percentage?: number | null
          duration_days: number
          id?: string
          is_active?: boolean | null
          price: number
        }
        Update: {
          created_at?: string
          discount_percentage?: number | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          price?: number
        }
        Relationships: []
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
      kyc_access_audit: {
        Row: {
          accessed_at: string
          action: string
          admin_user_id: string
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          action: string
          admin_user_id: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          action?: string
          admin_user_id?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string
          user_agent?: string | null
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
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          payment_method: string
          payment_proof_url: string | null
          payment_reference: string | null
          payment_type: string
          reference_id: string
          rejection_reason: string | null
          status: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_method: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_type: string
          reference_id: string
          rejection_reason?: string | null
          status?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_method?: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_type?: string
          reference_id?: string
          rejection_reason?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
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
      property_views: {
        Row: {
          id: string
          ip_hash: string | null
          property_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          property_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          ip_hash?: string | null
          property_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_info: Json | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_info?: Json | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rating_analytics: {
        Row: {
          avg_rating: number | null
          badges_earned: string[] | null
          computed_at: string | null
          id: string
          negative_reviews: number | null
          period_start: string
          period_type: string
          positive_reviews: number | null
          total_reviews: number | null
          user_id: string
        }
        Insert: {
          avg_rating?: number | null
          badges_earned?: string[] | null
          computed_at?: string | null
          id?: string
          negative_reviews?: number | null
          period_start: string
          period_type: string
          positive_reviews?: number | null
          total_reviews?: number | null
          user_id: string
        }
        Update: {
          avg_rating?: number | null
          badges_earned?: string[] | null
          computed_at?: string | null
          id?: string
          negative_reviews?: number | null
          period_start?: string
          period_type?: string
          positive_reviews?: number | null
          total_reviews?: number | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_id: string
          reported_type: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_id: string
          reported_type: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reported_type?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reputation_badges_config: {
        Row: {
          badge_id: string
          category: string
          color: string | null
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          min_rating: number | null
          min_reviews: number | null
          name_ar: string
          name_en: string
        }
        Insert: {
          badge_id: string
          category: string
          color?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_rating?: number | null
          min_reviews?: number | null
          name_ar: string
          name_en: string
        }
        Update: {
          badge_id?: string
          category?: string
          color?: string | null
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_rating?: number | null
          min_reviews?: number | null
          name_ar?: string
          name_en?: string
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
      security_audit_log: {
        Row: {
          action_type: string
          additional_data: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          is_suspicious: boolean | null
          location_data: Json | null
          resource_id: string | null
          resource_type: string | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          additional_data?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_suspicious?: boolean | null
          location_data?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          additional_data?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_suspicious?: boolean | null
          location_data?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          address: string | null
          cancellation_reason: string | null
          client_id: string
          client_rating: number | null
          client_review: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_price: number | null
          final_price: number | null
          handyman_id: string
          handyman_rating: number | null
          handyman_review: string | null
          id: string
          latitude: number | null
          longitude: number | null
          preferred_date: string
          preferred_time: string | null
          service_type: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cancellation_reason?: string | null
          client_id: string
          client_rating?: number | null
          client_review?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          final_price?: number | null
          handyman_id: string
          handyman_rating?: number | null
          handyman_review?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_date: string
          preferred_time?: string | null
          service_type: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cancellation_reason?: string | null
          client_id?: string
          client_rating?: number | null
          client_review?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number | null
          final_price?: number | null
          handyman_id?: string
          handyman_rating?: number | null
          handyman_review?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_date?: string
          preferred_time?: string | null
          service_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          from_role: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          request_type: string
          status: string
          to_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          from_role?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          request_type: string
          status?: string
          to_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          from_role?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          request_type?: string
          status?: string
          to_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      threat_detection: {
        Row: {
          action_taken: string | null
          created_at: string | null
          details: Json
          id: string
          ip_address: unknown
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          threat_type: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          details: Json
          id?: string
          ip_address?: unknown
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          threat_type: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          details?: Json
          id?: string
          ip_address?: unknown
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          threat_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      two_factor_auth: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_used_at: string | null
          secret_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          secret_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          secret_key?: string
          updated_at?: string | null
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
      user_sessions_enhanced: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          device_info: Json | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          location_data: Json | null
          session_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          location_data?: Json | null
          session_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          location_data?: Json | null
          session_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string
          payment_proof_url: string | null
          payment_reference: string | null
          preferred_date: string | null
          price_paid: number
          property_id: string
          report_summary: string | null
          report_url: string | null
          requester_id: string
          service_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          preferred_date?: string | null
          price_paid: number
          property_id: string
          report_summary?: string | null
          report_url?: string | null
          requester_id: string
          service_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          preferred_date?: string | null
          price_paid?: number
          property_id?: string
          report_summary?: string | null
          report_url?: string | null
          requester_id?: string
          service_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "verification_services"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_services: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          estimated_days: number | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          price?: number
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          pending_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      appointment_partner_profiles: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          full_name: string | null
          kyc_verified: boolean | null
          reputation_badges: string[] | null
          role_type: string | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      contract_partner_profiles: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          full_name: string | null
          kyc_verified: boolean | null
          reputation_badges: string[] | null
          role_type: string | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_partner_profiles: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          full_name: string | null
          kyc_verified: boolean | null
          reputation_badges: string[] | null
          role_type: string | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      historical_contract_partners: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          full_name: string | null
          kyc_verified: boolean | null
          role_type: string | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_handymen: {
        Row: {
          approximate_latitude: number | null
          approximate_longitude: number | null
          created_at: string | null
          description: string | null
          id: string | null
          is_available: boolean | null
          rate_range: string | null
          rating: number | null
          service_area_km: number | null
          specialty: string[] | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          approximate_latitude?: never
          approximate_longitude?: never
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_available?: boolean | null
          rate_range?: never
          rating?: number | null
          service_area_km?: number | null
          specialty?: string[] | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          approximate_latitude?: never
          approximate_longitude?: never
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_available?: boolean | null
          rate_range?: never
          rating?: number | null
          service_area_km?: number | null
          specialty?: string[] | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          full_name: string | null
          kyc_verified: boolean | null
          reputation_badges: string[] | null
          role_type: string | null
          total_reviews: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number | null
          full_name?: string | null
          kyc_verified?: boolean | null
          reputation_badges?: string[] | null
          role_type?: string | null
          total_reviews?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      safe_featured_listings: {
        Row: {
          created_at: string | null
          duration_days: number | null
          expires_at: string | null
          feature_type: string | null
          id: string | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          price_paid: number | null
          property_id: string | null
          starts_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          feature_type?: string | null
          id?: string | null
          payment_method?: never
          payment_proof_url?: never
          payment_reference?: never
          price_paid?: never
          property_id?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          feature_type?: string | null
          id?: string | null
          payment_method?: never
          payment_proof_url?: never
          payment_reference?: never
          price_paid?: never
          property_id?: string | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_kyc_verification: {
        Args: { target_user_id: string }
        Returns: {
          id: string
          id_back_url: string
          id_front_url: string
          id_type: string
          rejection_reason: string
          selfie_url: string
          status: string
          submitted_at: string
          user_id: string
          verified_at: string
        }[]
      }
      admin_verify_kyc: {
        Args: { new_status: string; reason?: string; target_user_id: string }
        Returns: boolean
      }
      assign_admin_role: { Args: { target_email: string }; Returns: boolean }
      calculate_weighted_rating: {
        Args: { p_user_id: string }
        Returns: number
      }
      cleanup_old_ai_conversations: { Args: never; Returns: undefined }
      ensure_user_wallet: { Args: never; Returns: string }
      generate_2fa_secret: { Args: never; Returns: string }
      get_handyman_details: {
        Args: { handyman_user_id: string }
        Returns: {
          description: string
          hourly_rate: number
          id: string
          is_available: boolean
          latitude: number
          longitude: number
          rating: number
          service_area_km: number
          specialty: string[]
          total_reviews: number
          user_id: string
        }[]
      }
      get_profile_kyc_data: { Args: { target_user_id: string }; Returns: Json }
      get_safe_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          avg_rating: number
          full_name: string
          kyc_verified: boolean
          phone: string
          reputation_badges: string[]
          role_type: string
          total_reviews: number
          user_id: string
        }[]
      }
      give_phone_consent: { Args: { contract_id: string }; Returns: boolean }
      has_agency_subscription: { Args: { user_uuid: string }; Returns: boolean }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_verified_contract_with: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      hold_escrow: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id: string
          p_wallet_id: string
        }
        Returns: boolean
      }
      is_property_featured: {
        Args: { property_uuid: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_action_type: string
          p_additional_data?: Json
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_security_event_secure: {
        Args: {
          p_action_type: string
          p_additional_data?: Json
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      pay_for_featured_listing: {
        Args: {
          p_duration_days: number
          p_feature_type?: string
          p_property_id: string
        }
        Returns: string
      }
      release_escrow: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id: string
          p_to_user_id: string
          p_wallet_id: string
        }
        Returns: boolean
      }
      revoke_phone_consent: { Args: { contract_id: string }; Returns: boolean }
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
