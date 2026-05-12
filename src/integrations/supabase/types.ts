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
      aggregated_liabilities: {
        Row: {
          account_id: string
          apr: number | null
          created_at: string
          details: Json
          escrow_balance: number | null
          expected_payoff_date: string | null
          id: string
          interest_rate_percentage: number | null
          interest_rate_type: string | null
          iso_currency_code: string | null
          last_payment_amount: number | null
          last_payment_date: string | null
          last_statement_balance: number | null
          last_statement_issue_date: string | null
          last_synced_at: string
          liability_type: string
          loan_name: string | null
          loan_status: string | null
          minimum_payment_amount: number | null
          next_payment_due_date: string | null
          origination_date: string | null
          user_id: string
          ytd_interest_paid: number | null
          ytd_principal_paid: number | null
        }
        Insert: {
          account_id: string
          apr?: number | null
          created_at?: string
          details?: Json
          escrow_balance?: number | null
          expected_payoff_date?: string | null
          id?: string
          interest_rate_percentage?: number | null
          interest_rate_type?: string | null
          iso_currency_code?: string | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_balance?: number | null
          last_statement_issue_date?: string | null
          last_synced_at?: string
          liability_type: string
          loan_name?: string | null
          loan_status?: string | null
          minimum_payment_amount?: number | null
          next_payment_due_date?: string | null
          origination_date?: string | null
          user_id: string
          ytd_interest_paid?: number | null
          ytd_principal_paid?: number | null
        }
        Update: {
          account_id?: string
          apr?: number | null
          created_at?: string
          details?: Json
          escrow_balance?: number | null
          expected_payoff_date?: string | null
          id?: string
          interest_rate_percentage?: number | null
          interest_rate_type?: string | null
          iso_currency_code?: string | null
          last_payment_amount?: number | null
          last_payment_date?: string | null
          last_statement_balance?: number | null
          last_statement_issue_date?: string | null
          last_synced_at?: string
          liability_type?: string
          loan_name?: string | null
          loan_status?: string | null
          minimum_payment_amount?: number | null
          next_payment_due_date?: string | null
          origination_date?: string | null
          user_id?: string
          ytd_interest_paid?: number | null
          ytd_principal_paid?: number | null
        }
        Relationships: []
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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      family_link_requests: {
        Row: {
          admin_notes: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          created_at: string
          dob_match: boolean | null
          id: string
          message: string | null
          recipient_dob: string
          recipient_email: string
          recipient_last_four_ssn_hash: string | null
          recipient_responded_at: string | null
          recipient_user_id: string | null
          requester_user_id: string
          status: Database["public"]["Enums"]["family_link_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          created_at?: string
          dob_match?: boolean | null
          id?: string
          message?: string | null
          recipient_dob: string
          recipient_email: string
          recipient_last_four_ssn_hash?: string | null
          recipient_responded_at?: string | null
          recipient_user_id?: string | null
          requester_user_id: string
          status?: Database["public"]["Enums"]["family_link_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          created_at?: string
          dob_match?: boolean | null
          id?: string
          message?: string | null
          recipient_dob?: string
          recipient_email?: string
          recipient_last_four_ssn_hash?: string | null
          recipient_responded_at?: string | null
          recipient_user_id?: string | null
          requester_user_id?: string
          status?: Database["public"]["Enums"]["family_link_status"]
          updated_at?: string
        }
        Relationships: []
      }
      family_links: {
        Row: {
          created_at: string
          id: string
          request_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_links_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "family_link_requests"
            referencedColumns: ["id"]
          },
        ]
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
      pending_account_deletions: {
        Row: {
          created_at: string
          email: string | null
          purge_after: string
          reason: string | null
          requested_by: string | null
          scheduled_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          purge_after?: string
          reason?: string | null
          requested_by?: string | null
          scheduled_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          purge_after?: string
          reason?: string | null
          requested_by?: string | null
          scheduled_at?: string
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
          new_accounts_available: boolean
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
          new_accounts_available?: boolean
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
          new_accounts_available?: boolean
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plaid_link_events: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          error_type: string | null
          event_name: string
          exit_status: string | null
          id: string
          institution_id: string | null
          institution_name: string | null
          is_update_mode: boolean
          link_session_id: string | null
          metadata: Json | null
          request_id: string | null
          user_id: string | null
          view_name: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          error_type?: string | null
          event_name: string
          exit_status?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          is_update_mode?: boolean
          link_session_id?: string | null
          metadata?: Json | null
          request_id?: string | null
          user_id?: string | null
          view_name?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          error_type?: string | null
          event_name?: string
          exit_status?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          is_update_mode?: boolean
          link_session_id?: string | null
          metadata?: Json | null
          request_id?: string | null
          user_id?: string | null
          view_name?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          baths: number | null
          beds: number | null
          created_at: string
          estimated_value: number
          id: string
          image_url: string | null
          iso_currency_code: string | null
          last_valued_at: string | null
          mortgage_balance: number | null
          name: string
          property_type: string | null
          purchase_date: string | null
          purchase_price: number | null
          sqft: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          baths?: number | null
          beds?: number | null
          created_at?: string
          estimated_value?: number
          id?: string
          image_url?: string | null
          iso_currency_code?: string | null
          last_valued_at?: string | null
          mortgage_balance?: number | null
          name: string
          property_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          sqft?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          baths?: number | null
          beds?: number | null
          created_at?: string
          estimated_value?: number
          id?: string
          image_url?: string | null
          iso_currency_code?: string | null
          last_valued_at?: string | null
          mortgage_balance?: number | null
          name?: string
          property_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          sqft?: number | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      user_consents: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          kind: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          kind: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          kind?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_intake: {
        Row: {
          advisor_email: string | null
          advisor_firm: string | null
          advisor_name: string | null
          billing_interval: string
          completed_at: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          has_advisor: boolean | null
          id: string
          last_four_ssn_hash: string | null
          net_worth_band: string | null
          plan: string
          primary_goal: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_email?: string | null
          advisor_firm?: string | null
          advisor_name?: string | null
          billing_interval?: string
          completed_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          has_advisor?: boolean | null
          id?: string
          last_four_ssn_hash?: string | null
          net_worth_band?: string | null
          plan: string
          primary_goal?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_email?: string | null
          advisor_firm?: string | null
          advisor_name?: string | null
          billing_interval?: string
          completed_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          has_advisor?: boolean | null
          id?: string
          last_four_ssn_hash?: string | null
          net_worth_band?: string | null
          plan?: string
          primary_goal?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_purge_user_by_email: {
        Args: { target_email: string }
        Returns: Json
      }
      apply_transaction_rules: {
        Args: { target_rule_id?: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_plaid_items: {
        Args: never
        Returns: {
          created_at: string
          id: string
          institution_id: string
          institution_name: string
          item_id: string
          last_synced_at: string
          status: string
          updated_at: string
          user_id: string
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
      is_admin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purge_expired_account_deletions: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      family_link_status:
        | "pending_recipient"
        | "declined_recipient"
        | "pending_admin"
        | "approved"
        | "declined_admin"
        | "cancelled"
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
      family_link_status: [
        "pending_recipient",
        "declined_recipient",
        "pending_admin",
        "approved",
        "declined_admin",
        "cancelled",
      ],
    },
  },
} as const
