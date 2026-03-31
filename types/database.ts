export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ad_creatives: {
        Row: {
          id: string
          name: string
          description: string | null
          media_type: string
          media_url: string | null
          thumbnail_url: string | null
          supabase_path: string | null
          is_active: boolean
          leads_count: number
          facebook_ad_id: string | null
          facebook_url: string | null
          ad_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          media_type?: string
          media_url?: string | null
          thumbnail_url?: string | null
          supabase_path?: string | null
          is_active?: boolean
          leads_count?: number
          facebook_ad_id?: string | null
          facebook_url?: string | null
          ad_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          media_type?: string
          media_url?: string | null
          thumbnail_url?: string | null
          supabase_path?: string | null
          is_active?: boolean
          leads_count?: number
          facebook_ad_id?: string | null
          facebook_url?: string | null
          ad_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_pakete: {
        Row: {
          id: string
          name: string
          beschreibung: string | null
          leads_pro_monat: number
          preis_pro_lead_cents: number
          gesamtpreis_cents: number
          mindestlaufzeit_monate: number
          setter_aufpreis_cents: number
          stripe_price_id: string | null
          stripe_price_id_mit_setter: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          beschreibung?: string | null
          leads_pro_monat: number
          preis_pro_lead_cents: number
          mindestlaufzeit_monate?: number
          setter_aufpreis_cents?: number
          stripe_price_id?: string | null
          stripe_price_id_mit_setter?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          beschreibung?: string | null
          leads_pro_monat?: number
          preis_pro_lead_cents?: number
          mindestlaufzeit_monate?: number
          setter_aufpreis_cents?: number
          stripe_price_id?: string | null
          stripe_price_id_mit_setter?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      nachkauf_pakete: {
        Row: {
          id: string
          name: string
          anzahl_leads: number
          preis_pro_lead_cents: number
          gesamtpreis_cents: number
          setter_aufpreis_cents: number
          stripe_price_id: string | null
          stripe_price_id_mit_setter: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          anzahl_leads: number
          preis_pro_lead_cents: number
          setter_aufpreis_cents?: number
          stripe_price_id?: string | null
          stripe_price_id_mit_setter?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          anzahl_leads?: number
          preis_pro_lead_cents?: number
          setter_aufpreis_cents?: number
          stripe_price_id?: string | null
          stripe_price_id_mit_setter?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: Database["public"]["Enums"]["user_role"]
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: Database["public"]["Enums"]["user_role"]
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      berater: {
        Row: {
          id: string
          profile_id: string
          lead_paket_id: string | null
          status: Database["public"]["Enums"]["berater_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"] | null
          abo_start: string | null
          abo_mindestende: string | null
          hat_setter: boolean
          assigned_setter_id: string | null
          leads_kontingent: number
          leads_geliefert: number
          nachkauf_leads_offen: number
          leads_gesamt: number
          umsatz_gesamt_cents: number
          pausiert_seit: string | null
          letzte_zuweisung: string | null
          kontingent_reset_at: string | null
          availability_status: string | null
          availability_override: boolean | null
          availability_override_until: string | null
          do_not_disturb: boolean | null
          leads_pro_monat: number
          preis_pro_lead_cents: number
          setter_typ: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          lead_paket_id?: string | null
          status?: Database["public"]["Enums"]["berater_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          abo_start?: string | null
          abo_mindestende?: string | null
          hat_setter?: boolean
          assigned_setter_id?: string | null
          leads_kontingent?: number
          leads_geliefert?: number
          nachkauf_leads_offen?: number
          leads_gesamt?: number
          umsatz_gesamt_cents?: number
          pausiert_seit?: string | null
          letzte_zuweisung?: string | null
          kontingent_reset_at?: string | null
          availability_status?: string | null
          availability_override?: boolean | null
          availability_override_until?: string | null
          do_not_disturb?: boolean | null
          leads_pro_monat?: number
          preis_pro_lead_cents?: number
          setter_typ?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          lead_paket_id?: string | null
          status?: Database["public"]["Enums"]["berater_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          abo_start?: string | null
          abo_mindestende?: string | null
          hat_setter?: boolean
          assigned_setter_id?: string | null
          leads_kontingent?: number
          leads_geliefert?: number
          nachkauf_leads_offen?: number
          leads_gesamt?: number
          umsatz_gesamt_cents?: number
          pausiert_seit?: string | null
          letzte_zuweisung?: string | null
          kontingent_reset_at?: string | null
          availability_status?: string | null
          availability_override?: boolean | null
          availability_override_until?: string | null
          do_not_disturb?: boolean | null
          leads_pro_monat?: number
          preis_pro_lead_cents?: number
          setter_typ?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "berater_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "berater_lead_paket_id_fkey"
            columns: ["lead_paket_id"]
            isOneToOne: false
            referencedRelation: "lead_pakete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "berater_assigned_setter_id_fkey"
            columns: ["assigned_setter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          id: string
          vorname: string | null
          nachname: string | null
          email: string | null
          telefon: string | null
          status: Database["public"]["Enums"]["lead_status"]
          source: Database["public"]["Enums"]["lead_source"]
          campaign: string | null
          adset: string | null
          ad_name: string | null
          form_id: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          custom_fields: Json | null
          berater_id: string | null
          setter_id: string | null
          zugewiesen_am: string | null
          is_nachkauf: boolean
          erster_kontakt_am: string | null
          termin_am: string | null
          abschluss_am: string | null
          kontaktversuche: number
          rueckvergabe_count: number
          naechste_erinnerung: string | null
          meta_lead_id: string | null
          opt_in_email: boolean | null
          opt_in_whatsapp: boolean | null
          opt_in_telefon: boolean | null
          sla_deadline: string | null
          sla_status: string | null
          accepted_at: string | null
          accepted_by: string | null
          first_contact_at: string | null
          contact_outcome: string | null
          callback_at: string | null
          reassignment_count: number
          previous_berater_ids: string[] | null
          queue_status: string | null
          lead_ready_at: string | null
          holding_reason: string | null
          max_kontaktversuche: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vorname?: string | null
          nachname?: string | null
          email?: string | null
          telefon?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          source?: Database["public"]["Enums"]["lead_source"]
          campaign?: string | null
          adset?: string | null
          ad_name?: string | null
          form_id?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          custom_fields?: Json | null
          berater_id?: string | null
          setter_id?: string | null
          zugewiesen_am?: string | null
          is_nachkauf?: boolean
          erster_kontakt_am?: string | null
          termin_am?: string | null
          abschluss_am?: string | null
          kontaktversuche?: number
          rueckvergabe_count?: number
          naechste_erinnerung?: string | null
          meta_lead_id?: string | null
          opt_in_email?: boolean | null
          opt_in_whatsapp?: boolean | null
          opt_in_telefon?: boolean | null
          sla_deadline?: string | null
          sla_status?: string | null
          accepted_at?: string | null
          accepted_by?: string | null
          first_contact_at?: string | null
          contact_outcome?: string | null
          callback_at?: string | null
          reassignment_count?: number
          previous_berater_ids?: string[] | null
          queue_status?: string | null
          lead_ready_at?: string | null
          holding_reason?: string | null
          max_kontaktversuche?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vorname?: string | null
          nachname?: string | null
          email?: string | null
          telefon?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          source?: Database["public"]["Enums"]["lead_source"]
          campaign?: string | null
          adset?: string | null
          ad_name?: string | null
          form_id?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          custom_fields?: Json | null
          berater_id?: string | null
          setter_id?: string | null
          zugewiesen_am?: string | null
          is_nachkauf?: boolean
          erster_kontakt_am?: string | null
          termin_am?: string | null
          abschluss_am?: string | null
          kontaktversuche?: number
          rueckvergabe_count?: number
          naechste_erinnerung?: string | null
          meta_lead_id?: string | null
          opt_in_email?: boolean | null
          opt_in_whatsapp?: boolean | null
          opt_in_telefon?: boolean | null
          sla_deadline?: string | null
          sla_status?: string | null
          accepted_at?: string | null
          accepted_by?: string | null
          first_contact_at?: string | null
          contact_outcome?: string | null
          callback_at?: string | null
          reassignment_count?: number
          previous_berater_ids?: string[] | null
          queue_status?: string | null
          lead_ready_at?: string | null
          holding_reason?: string | null
          max_kontaktversuche?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_berater_id_fkey"
            columns: ["berater_id"]
            isOneToOne: false
            referencedRelation: "berater"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          id: string
          berater_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          berater_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          berater_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_berater_id_fkey"
            columns: ["berater_id"]
            isOneToOne: false
            referencedRelation: "berater"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          id: string
          lead_id: string
          type: Database["public"]["Enums"]["activity_type"]
          title: string
          description: string | null
          old_value: string | null
          new_value: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          type: Database["public"]["Enums"]["activity_type"]
          title: string
          description?: string | null
          old_value?: string | null
          new_value?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          title?: string
          description?: string | null
          old_value?: string | null
          new_value?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          id: string
          lead_id: string
          berater_id: string
          pacing_snapshot: Json | null
          reason: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          berater_id: string
          pacing_snapshot?: Json | null
          reason?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          berater_id?: string
          pacing_snapshot?: Json | null
          reason?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_berater_id_fkey"
            columns: ["berater_id"]
            isOneToOne: false
            referencedRelation: "berater"
            referencedColumns: ["id"]
          },
        ]
      }
      termine: {
        Row: {
          id: string
          lead_id: string
          berater_id: string
          datum: string
          dauer_minuten: number
          status: string
          notizen: string | null
          calendar_event_id: string | null
          erstellt_von: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          berater_id: string
          datum: string
          dauer_minuten?: number
          status?: string
          notizen?: string | null
          calendar_event_id?: string | null
          erstellt_von?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          berater_id?: string
          datum?: string
          dauer_minuten?: number
          status?: string
          notizen?: string | null
          calendar_event_id?: string | null
          erstellt_von?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "termine_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termine_berater_id_fkey"
            columns: ["berater_id"]
            isOneToOne: false
            referencedRelation: "berater"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termine_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nachrichten: {
        Row: {
          id: string
          lead_id: string
          channel: Database["public"]["Enums"]["nachricht_channel"]
          direction: string
          subject: string | null
          body: string | null
          template_id: string | null
          whatsapp_message_id: string | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          error: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          channel?: Database["public"]["Enums"]["nachricht_channel"]
          direction?: string
          subject?: string | null
          body?: string | null
          template_id?: string | null
          whatsapp_message_id?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          channel?: Database["public"]["Enums"]["nachricht_channel"]
          direction?: string
          subject?: string | null
          body?: string | null
          template_id?: string | null
          whatsapp_message_id?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachrichten_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachrichten_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zahlungen: {
        Row: {
          id: string
          berater_id: string
          stripe_payment_intent_id: string | null
          stripe_invoice_id: string | null
          typ: string
          betrag_cents: number
          leads_gutgeschrieben: number
          paket_name: string | null
          preis_pro_lead_cents: number | null
          hat_setter: boolean
          created_at: string
        }
        Insert: {
          id?: string
          berater_id: string
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          typ: string
          betrag_cents: number
          leads_gutgeschrieben?: number
          paket_name?: string | null
          preis_pro_lead_cents?: number | null
          hat_setter?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          berater_id?: string
          stripe_payment_intent_id?: string | null
          stripe_invoice_id?: string | null
          typ?: string
          betrag_cents?: number
          leads_gutgeschrieben?: number
          paket_name?: string | null
          preis_pro_lead_cents?: number | null
          hat_setter?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zahlungen_berater_id_fkey"
            columns: ["berater_id"]
            isOneToOne: false
            referencedRelation: "berater"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_config: {
        Row: {
          id: string
          key: string
          value: number
          label: string | null
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: number
          label?: string | null
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: number
          label?: string | null
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_config: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json | null
          urgency: string
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json | null
          urgency?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          data?: Json | null
          urgency?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          id: string
          key: string
          value: number
          label: string | null
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: number
          label?: string | null
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: number
          label?: string | null
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      setter_abrechnungen: {
        Row: {
          id: string
          setter_id: string
          monat: string
          leads_bearbeitet: number
          verguetung_pro_lead_cents: number
          gesamt_cents: number
          ausgezahlt: boolean
          ausgezahlt_am: string | null
          created_at: string
        }
        Insert: {
          id?: string
          setter_id: string
          monat: string
          leads_bearbeitet?: number
          verguetung_pro_lead_cents?: number
          ausgezahlt?: boolean
          ausgezahlt_am?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          setter_id?: string
          monat?: string
          leads_bearbeitet?: number
          verguetung_pro_lead_cents?: number
          ausgezahlt?: boolean
          ausgezahlt_am?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setter_abrechnungen_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          lead_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          lead_id?: string
          tag_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_prospects: {
        Row: {
          id: string
          full_name: string
          company: string | null
          position: string | null
          linkedin_url: string | null
          email: string | null
          phone: string | null
          city: string | null
          notes: string | null
          source: string | null
          status: string
          lost_reason: string | null
          next_followup_at: string | null
          last_contacted_at: string | null
          contact_count: number
          assigned_to: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          company?: string | null
          position?: string | null
          linkedin_url?: string | null
          email?: string | null
          phone?: string | null
          city?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          lost_reason?: string | null
          next_followup_at?: string | null
          last_contacted_at?: string | null
          contact_count?: number
          assigned_to?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          company?: string | null
          position?: string | null
          linkedin_url?: string | null
          email?: string | null
          phone?: string | null
          city?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          lost_reason?: string | null
          next_followup_at?: string | null
          last_contacted_at?: string | null
          contact_count?: number
          assigned_to?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_prospects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_activities: {
        Row: {
          id: string
          prospect_id: string
          type: string
          title: string
          description: string | null
          template_used: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prospect_id: string
          type: string
          title: string
          description?: string | null
          template_used?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prospect_id?: string
          type?: string
          title?: string
          description?: string | null
          template_used?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "outreach_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_templates: {
        Row: {
          id: string
          name: string
          type: string
          subject: string | null
          body: string
          variables: string[]
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          subject?: string | null
          body: string
          variables?: string[]
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          subject?: string | null
          body?: string
          variables?: string[]
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          entity: string
          entity_id: string
          action: string
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          entity: string
          entity_id: string
          action: string
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          entity?: string
          entity_id?: string
          action?: string
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "admin" | "teamleiter" | "setter" | "berater"
      lead_status:
        | "neu"
        | "zugewiesen"
        | "kontaktversuch"
        | "nicht_erreicht"
        | "qualifiziert"
        | "termin"
        | "show"
        | "no_show"
        | "nachfassen"
        | "abschluss"
        | "verloren"
        | "warteschlange"
      lead_source: "meta_lead_ad" | "landingpage" | "manuell" | "import"
      activity_type:
        | "status_change"
        | "anruf"
        | "email"
        | "whatsapp"
        | "notiz"
        | "zuweisung"
        | "rueckvergabe"
        | "termin_gebucht"
        | "termin_abgesagt"
        | "nachkauf"
        | "system"
      berater_status: "aktiv" | "pausiert" | "inaktiv" | "pending"
      nachricht_channel: "email" | "whatsapp" | "sms"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "trialing"
        | "incomplete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
