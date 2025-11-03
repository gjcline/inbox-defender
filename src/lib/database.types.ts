export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string
          name: string
          plan: 'personal' | 'business'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          plan?: 'personal' | 'business'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          plan?: 'personal' | 'business'
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          org_id: string | null
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          email?: string
          created_at?: string
        }
      }
      mailboxes: {
        Row: {
          id: string
          org_id: string
          user_id: string
          provider: string
          email_address: string
          refresh_secret_key: string
          outreach_label_id: string | null
          last_history_id: string | null
          watch_expiration: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          provider?: string
          email_address: string
          refresh_secret_key: string
          outreach_label_id?: string | null
          last_history_id?: string | null
          watch_expiration?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          provider?: string
          email_address?: string
          refresh_secret_key?: string
          outreach_label_id?: string | null
          last_history_id?: string | null
          watch_expiration?: string | null
          created_at?: string
        }
      }
      decisions: {
        Row: {
          id: string
          mailbox_id: string
          gmail_msg_id: string
          from_email: string | null
          from_domain: string | null
          subject_hash: string | null
          received_at: string | null
          decision: 'unclassified' | 'outreach' | 'keep'
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          mailbox_id: string
          gmail_msg_id: string
          from_email?: string | null
          from_domain?: string | null
          subject_hash?: string | null
          received_at?: string | null
          decision?: 'unclassified' | 'outreach' | 'keep'
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          mailbox_id?: string
          gmail_msg_id?: string
          from_email?: string | null
          from_domain?: string | null
          subject_hash?: string | null
          received_at?: string | null
          decision?: 'unclassified' | 'outreach' | 'keep'
          score?: number | null
          created_at?: string
        }
      }
      usage_counters: {
        Row: {
          org_id: string
          period: string
          emails_scanned: number
          ai_calls: number
          ai_input_tokens: number
          ai_output_tokens: number
        }
        Insert: {
          org_id: string
          period: string
          emails_scanned?: number
          ai_calls?: number
          ai_input_tokens?: number
          ai_output_tokens?: number
        }
        Update: {
          org_id?: string
          period?: string
          emails_scanned?: number
          ai_calls?: number
          ai_input_tokens?: number
          ai_output_tokens?: number
        }
      }
      settings: {
        Row: {
          org_id: string
          digest_frequency: 'weekly' | 'monthly'
          retention_days: number
          aggressiveness: number
        }
        Insert: {
          org_id: string
          digest_frequency?: 'weekly' | 'monthly'
          retention_days?: number
          aggressiveness?: number
        }
        Update: {
          org_id?: string
          digest_frequency?: 'weekly' | 'monthly'
          retention_days?: number
          aggressiveness?: number
        }
      }
      waitlist: {
        Row: {
          id: string
          name: string
          email: string
          mobile: string | null
          interest: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          mobile?: string | null
          interest: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          mobile?: string | null
          interest?: string
          created_at?: string
          updated_at?: string
        }
      }
      lead_form_submissions: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          email_volume: string
          biggest_challenge: string | null
          source: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          email_volume: string
          biggest_challenge?: string | null
          source?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          company?: string | null
          email_volume?: string
          biggest_challenge?: string | null
          source?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
