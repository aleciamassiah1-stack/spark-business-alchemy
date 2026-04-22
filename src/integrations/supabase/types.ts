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
      aggregated_accounts: {
        Row: {
          available_balance: number | null
          created_at: string
          current_balance: number | null
          id: string
          iso_currency_code: string | null
          item_id: string
          last_synced_at: string
          mask: string | null
          name: string
          official_name: string | null
          plaid_account_id: string
          subtype: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          available_balance?: number | null
          created_at?: string
          current_balance?: number | null
          id?: string
          iso_currency_code?: string | null
          item_id: string
          last_synced_at?: string
          mask?: string | null
          name: string
          official_name?: string | null
          plaid_account_id: string
          subtype?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          available_balance?: number | null
          created_at?: string
          current_balance?: number | null
          id?: string
          iso_currency_code?: string | null
          item_id?: string
          last_synced_at?: string
          mask?: string | null
          name?: string
          official_name?: string | null
          plaid_account_id?: string
          subtype?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregated_accounts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      aggregated_holdings: {
        Row: {
          account_id: string
          cost_basis: number | null
          created_at: string
          id: string
          institution_price: number | null
          institution_value: number | null
          iso_currency_code: string | null
          last_synced_at: string
          name: string | null
          quantity: number | null
          security_id: string | null
          ticker: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          institution_price?: number | null
          institution_value?: number | null
          iso_currency_code?: string | null
          last_synced_at?: string
          name?: string | null
          quantity?: number | null
          security_id?: string | null
          ticker?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          institution_price?: number | null
          institution_value?: number | null
          iso_currency_code?: string | null
          last_synced_at?: string
          name?: string | null
          quantity?: number | null
          security_id?: string | null
          ticker?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregated_holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "aggregated_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      aggregated_transactions: {
        Row: {
          account_id: string
          amount: number
          applied_rule_id: string | null
          category: string | null
          category_detailed: string | null
          created_at: string
          custom_category: string | null
          date: string
          id: string
          iso_currency_code: string | null
          last_synced_at: string
          logo_url: string | null
          merchant_name: string | null
          name: string
          payment_channel: string | null
          pending: boolean | null
          plaid_transaction_id: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          applied_rule_id?: string | null
          category?: string | null
          category_detailed?: string | null
          created_at?: string
          custom_category?: string | null
          date: string
          id?: string
          iso_currency_code?: string | null
          last_synced_at?: string
          logo_url?: string | null
          merchant_name?: string | null
          name: string
          payment_channel?: string | null
          pending?: boolean | null
          plaid_transaction_id: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          applied_rule_id?: string | null
          category?: string | null
          category_detailed?: string | null
          created_at?: string
          custom_category?: string | null
          date?: string
          id?: string
          iso_currency_code?: string | null
          last_synced_at?: string
          logo_url?: string | null
          merchant_name?: string | null
          name?: string
          payment_channel?: string | null
          pending?: boolean | null
          plaid_transaction_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      estate_documents: {
        Row: {
          created_at: string
          document_path: string | null
          document_type: string
          document_url: string | null
          expiration_date: string | null
          id: string
          notes: string | null
          signed_date: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          document_type: string
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          signed_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_path?: string | null
          document_type?: string
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          notes?: string | null
          signed_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          accounts: Json
          age: number | null
          created_at: string
          id: string
          initials: string | null
          iso_currency_code: string | null
          name: string
          net_worth: number
          relationship: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accounts?: Json
          age?: number | null
          created_at?: string
          id?: string
          initials?: string | null
          iso_currency_code?: string | null
          name: string
          net_worth?: number
          relationship: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accounts?: Json
          age?: number | null
          created_at?: string
          id?: string
          initials?: string | null
          iso_currency_code?: string | null
          name?: string
          net_worth?: number
          relationship?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          beneficiaries: Json | null
          coverage_amount: number | null
          created_at: string
          document_path: string | null
          document_url: string | null
          id: string
          insurer_name: string
          iso_currency_code: string | null
          parsed_by_ai: boolean | null
          policy_number: string | null
          policy_type: string
          premium_amount: number | null
          premium_frequency: string | null
          raw_extraction: Json | null
          renewal_date: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          beneficiaries?: Json | null
          coverage_amount?: number | null
          created_at?: string
          document_path?: string | null
          document_url?: string | null
          id?: string
          insurer_name: string
          iso_currency_code?: string | null
          parsed_by_ai?: boolean | null
          policy_number?: string | null
          policy_type: string
          premium_amount?: number | null
          premium_frequency?: string | null
          raw_extraction?: Json | null
          renewal_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          beneficiaries?: Json | null
          coverage_amount?: number | null
          created_at?: string
          document_path?: string | null
          document_url?: string | null
          id?: string
          insurer_name?: string
          iso_currency_code?: string | null
          parsed_by_ai?: boolean | null
          policy_number?: string | null
          policy_type?: string
          premium_amount?: number | null
          premium_frequency?: string | null
          raw_extraction?: Json | null
          renewal_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      manual_access: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plaid_items: {
        Row: {
          access_token: string
          created_at: string
          id: string
          institution_id: string | null
          institution_name: string | null
          item_id: string
          last_synced_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id: string
          last_synced_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id?: string
          last_synced_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          created_at: string
          estimated_value: number
          id: string
          iso_currency_code: string | null
          last_valued_at: string | null
          mortgage_balance: number | null
          name: string
          property_type: string | null
          purchase_date: string | null
          purchase_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string
          estimated_value?: number
          id?: string
          iso_currency_code?: string | null
          last_valued_at?: string | null
          mortgage_balance?: number | null
          name: string
          property_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          estimated_value?: number
          id?: string
          iso_currency_code?: string | null
          last_valued_at?: string | null
          mortgage_balance?: number | null
          name?: string
          property_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      property_valuations: {
        Row: {
          assumptions: string | null
          comps: Json
          confidence: string
          created_at: string
          estimated_value: number
          id: string
          input_address: string | null
          input_baths: number | null
          input_beds: number | null
          input_sqft: number | null
          market_summary: string | null
          price_per_sqft: number | null
          property_id: string
          source: string
          user_id: string
          value_high: number
          value_low: number
        }
        Insert: {
          assumptions?: string | null
          comps?: Json
          confidence: string
          created_at?: string
          estimated_value: number
          id?: string
          input_address?: string | null
          input_baths?: number | null
          input_beds?: number | null
          input_sqft?: number | null
          market_summary?: string | null
          price_per_sqft?: number | null
          property_id: string
          source?: string
          user_id: string
          value_high: number
          value_low: number
        }
        Update: {
          assumptions?: string | null
          comps?: Json
          confidence?: string
          created_at?: string
          estimated_value?: number
          id?: string
          input_address?: string | null
          input_baths?: number | null
          input_beds?: number | null
          input_sqft?: number | null
          market_summary?: string | null
          price_per_sqft?: number | null
          property_id?: string
          source?: string
          user_id?: string
          value_high?: number
          value_low?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          accounts_updated: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          holdings_updated: number | null
          id: string
          item_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          accounts_updated?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          holdings_updated?: number | null
          id?: string
          item_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          accounts_updated?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          holdings_updated?: number | null
          id?: string
          item_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_rules: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          category: string
          created_at: string
          description_keyword: string | null
          enabled: boolean
          id: string
          match_type: string
          merchant_pattern: string | null
          name: string
          priority: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          category: string
          created_at?: string
          description_keyword?: string | null
          enabled?: boolean
          id?: string
          match_type?: string
          merchant_pattern?: string | null
          name: string
          priority?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          category?: string
          created_at?: string
          description_keyword?: string | null
          enabled?: boolean
          id?: string
          match_type?: string
          merchant_pattern?: string | null
          name?: string
          priority?: number
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_transaction_rules: {
        Args: { target_rule_id?: string }
        Returns: number
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
