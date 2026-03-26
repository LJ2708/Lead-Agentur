-- ============================================================
-- LeadSolution Phase 1 – Complete Database Schema
-- ============================================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'teamleiter', 'setter', 'berater');
CREATE TYPE lead_status AS ENUM ('neu','zugewiesen','kontaktversuch','nicht_erreicht','qualifiziert','termin','show','no_show','nachfassen','abschluss','verloren','warteschlange');
CREATE TYPE lead_source AS ENUM ('meta_lead_ad', 'landingpage', 'manuell', 'import');
CREATE TYPE activity_type AS ENUM ('status_change','anruf','email','whatsapp','notiz','zuweisung','rueckvergabe','termin_gebucht','termin_abgesagt','nachkauf','system');
CREATE TYPE berater_status AS ENUM ('aktiv', 'pausiert', 'inaktiv', 'pending');
CREATE TYPE nachricht_channel AS ENUM ('email', 'whatsapp', 'sms');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');

-- ============================================================
-- LEAD-PAKETE (Admin-konfigurierbar)
-- ============================================================
CREATE TABLE lead_pakete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  beschreibung TEXT,
  leads_pro_monat INTEGER NOT NULL,
  preis_pro_lead_cents INTEGER NOT NULL,
  gesamtpreis_cents INTEGER GENERATED ALWAYS AS (leads_pro_monat * preis_pro_lead_cents) STORED,
  mindestlaufzeit_monate INTEGER NOT NULL DEFAULT 3,
  setter_aufpreis_cents INTEGER NOT NULL DEFAULT 1000,
  stripe_price_id TEXT,
  stripe_price_id_mit_setter TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NACHKAUF-PAKETE (Einmalkauf)
-- ============================================================
CREATE TABLE nachkauf_pakete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  anzahl_leads INTEGER NOT NULL,
  preis_pro_lead_cents INTEGER NOT NULL,
  gesamtpreis_cents INTEGER GENERATED ALWAYS AS (anzahl_leads * preis_pro_lead_cents) STORED,
  setter_aufpreis_cents INTEGER NOT NULL DEFAULT 1000,
  stripe_price_id TEXT,
  stripe_price_id_mit_setter TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'berater',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BERATER
-- ============================================================
CREATE TABLE berater (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_paket_id UUID REFERENCES lead_pakete(id),
  status berater_status NOT NULL DEFAULT 'pending',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status subscription_status,
  abo_start TIMESTAMPTZ,
  abo_mindestende TIMESTAMPTZ,
  hat_setter BOOLEAN NOT NULL DEFAULT false,
  assigned_setter_id UUID REFERENCES profiles(id),
  leads_kontingent INTEGER NOT NULL DEFAULT 0,
  leads_geliefert INTEGER NOT NULL DEFAULT 0,
  nachkauf_leads_offen INTEGER NOT NULL DEFAULT 0,
  leads_gesamt INTEGER NOT NULL DEFAULT 0,
  umsatz_gesamt_cents INTEGER NOT NULL DEFAULT 0,
  pausiert_seit TIMESTAMPTZ,
  letzte_zuweisung TIMESTAMPTZ,
  kontingent_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_berater_status ON berater(status);
CREATE INDEX idx_berater_profile ON berater(profile_id);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vorname TEXT,
  nachname TEXT,
  email TEXT,
  telefon TEXT,
  status lead_status NOT NULL DEFAULT 'neu',
  source lead_source NOT NULL DEFAULT 'meta_lead_ad',
  campaign TEXT,
  adset TEXT,
  ad_name TEXT,
  form_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  custom_fields JSONB DEFAULT '{}',
  berater_id UUID REFERENCES berater(id),
  setter_id UUID REFERENCES profiles(id),
  zugewiesen_am TIMESTAMPTZ,
  is_nachkauf BOOLEAN NOT NULL DEFAULT false,
  erster_kontakt_am TIMESTAMPTZ,
  termin_am TIMESTAMPTZ,
  abschluss_am TIMESTAMPTZ,
  kontaktversuche INTEGER NOT NULL DEFAULT 0,
  rueckvergabe_count INTEGER NOT NULL DEFAULT 0,
  naechste_erinnerung TIMESTAMPTZ,
  meta_lead_id TEXT,
  opt_in_email BOOLEAN DEFAULT false,
  opt_in_whatsapp BOOLEAN DEFAULT false,
  opt_in_telefon BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_leads_meta_lead_id ON leads(meta_lead_id) WHERE meta_lead_id IS NOT NULL;
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_telefon ON leads(telefon) WHERE telefon IS NOT NULL;
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_berater ON leads(berater_id);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- ============================================================
-- LEAD ACTIVITIES
-- ============================================================
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_lead ON lead_activities(lead_id, created_at DESC);

-- ============================================================
-- LEAD ASSIGNMENTS
-- ============================================================
CREATE TABLE lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  berater_id UUID NOT NULL REFERENCES berater(id),
  pacing_snapshot JSONB,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_lead ON lead_assignments(lead_id, is_active);

-- ============================================================
-- TERMINE
-- ============================================================
CREATE TABLE termine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  berater_id UUID NOT NULL REFERENCES berater(id),
  datum TIMESTAMPTZ NOT NULL,
  dauer_minuten INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'geplant',
  notizen TEXT,
  calendar_event_id TEXT,
  erstellt_von UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_termine_berater ON termine(berater_id, datum);
CREATE INDEX idx_termine_lead ON termine(lead_id);

-- ============================================================
-- NACHRICHTEN
-- ============================================================
CREATE TABLE nachrichten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel nachricht_channel NOT NULL DEFAULT 'email',
  direction TEXT NOT NULL DEFAULT 'outbound',
  subject TEXT,
  body TEXT,
  template_id TEXT,
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nachrichten_lead ON nachrichten(lead_id, created_at DESC);
CREATE INDEX idx_nachrichten_wa_id ON nachrichten(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;

-- ============================================================
-- ZAHLUNGEN
-- ============================================================
CREATE TABLE zahlungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  berater_id UUID NOT NULL REFERENCES berater(id),
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  typ TEXT NOT NULL,
  betrag_cents INTEGER NOT NULL,
  leads_gutgeschrieben INTEGER NOT NULL DEFAULT 0,
  paket_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zahlungen_berater ON zahlungen(berater_id, created_at DESC);

-- ============================================================
-- BUDGET CONFIG
-- ============================================================
CREATE TABLE budget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  label TEXT,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO budget_config (key, value, label, description) VALUES
  ('meta_cpl_cents', 2000, 'Meta CPL (€)', 'Durchschnittliche Kosten pro Lead bei Meta in Cent'),
  ('agentur_kosten_cents', 300000, 'Agenturkosten (€/Monat)', 'Feste monatliche Agenturkosten in Cent'),
  ('setter_kosten_pro_lead_cents', 500, 'Setter-Kosten/Lead (€)', 'Interne Kosten pro Lead für Setter in Cent');

-- ============================================================
-- ROUTING CONFIG
-- ============================================================
CREATE TABLE routing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO routing_config (key, value, description) VALUES
  ('reminder_minutes', '30', 'Minuten bis Push-Reminder an Berater'),
  ('auto_reassign_minutes', '120', 'Minuten bis automatische Umverteilung'),
  ('admin_alert_minutes', '300', 'Minuten bis Admin-Alert'),
  ('max_kontaktversuche', '5', 'Max. Kontaktversuche bevor Lead verloren');

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON berater FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON lead_pakete FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON termine FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Monatliches Kontingent-Reset
CREATE OR REPLACE FUNCTION reset_monatskontingent()
RETURNS void AS $$
BEGIN
  UPDATE berater
  SET
    leads_geliefert = 0,
    leads_kontingent = COALESCE(
      (SELECT leads_pro_monat FROM lead_pakete WHERE id = berater.lead_paket_id),
      0
    ),
    kontingent_reset_at = now()
  WHERE status = 'aktiv'
    AND subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE berater ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE termine ENABLE ROW LEVEL SECURITY;
ALTER TABLE nachrichten ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pakete ENABLE ROW LEVEL SECURITY;
ALTER TABLE nachkauf_pakete ENABLE ROW LEVEL SECURITY;
ALTER TABLE zahlungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_berater_id()
RETURNS UUID AS $$
  SELECT id FROM berater WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid() OR get_user_role() IN ('admin', 'teamleiter'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (get_user_role() = 'admin');

-- BERATER
CREATE POLICY "berater_select" ON berater FOR SELECT USING (profile_id = auth.uid() OR get_user_role() IN ('admin', 'teamleiter'));
CREATE POLICY "berater_admin" ON berater FOR ALL USING (get_user_role() = 'admin');

-- LEADS
CREATE POLICY "leads_select" ON leads FOR SELECT USING (get_user_role() IN ('admin', 'teamleiter') OR berater_id = get_berater_id() OR setter_id = auth.uid());
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (get_user_role() IN ('admin', 'teamleiter') OR berater_id = get_berater_id() OR setter_id = auth.uid());
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_delete" ON leads FOR DELETE USING (get_user_role() = 'admin');

-- LEAD_ACTIVITIES
CREATE POLICY "activities_select" ON lead_activities FOR SELECT USING (get_user_role() IN ('admin', 'teamleiter') OR lead_id IN (SELECT id FROM leads WHERE berater_id = get_berater_id() OR setter_id = auth.uid()));
CREATE POLICY "activities_insert" ON lead_activities FOR INSERT WITH CHECK (true);

-- LEAD_ASSIGNMENTS
CREATE POLICY "assignments_select" ON lead_assignments FOR SELECT USING (get_user_role() IN ('admin', 'teamleiter') OR berater_id = get_berater_id());
CREATE POLICY "assignments_insert" ON lead_assignments FOR INSERT WITH CHECK (true);

-- TERMINE
CREATE POLICY "termine_select" ON termine FOR SELECT USING (get_user_role() IN ('admin', 'teamleiter') OR berater_id = get_berater_id() OR erstellt_von = auth.uid());
CREATE POLICY "termine_insert" ON termine FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'teamleiter', 'setter') OR berater_id = get_berater_id());
CREATE POLICY "termine_update" ON termine FOR UPDATE USING (get_user_role() IN ('admin', 'teamleiter') OR berater_id = get_berater_id() OR erstellt_von = auth.uid());

-- NACHRICHTEN
CREATE POLICY "nachrichten_select" ON nachrichten FOR SELECT USING (get_user_role() IN ('admin', 'teamleiter') OR lead_id IN (SELECT id FROM leads WHERE berater_id = get_berater_id() OR setter_id = auth.uid()));
CREATE POLICY "nachrichten_insert" ON nachrichten FOR INSERT WITH CHECK (true);

-- PAKETE
CREATE POLICY "pakete_select" ON lead_pakete FOR SELECT USING (true);
CREATE POLICY "pakete_admin" ON lead_pakete FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "nachkauf_select" ON nachkauf_pakete FOR SELECT USING (true);
CREATE POLICY "nachkauf_admin" ON nachkauf_pakete FOR ALL USING (get_user_role() = 'admin');

-- ZAHLUNGEN
CREATE POLICY "zahlungen_select" ON zahlungen FOR SELECT USING (get_user_role() = 'admin' OR berater_id = get_berater_id());
CREATE POLICY "zahlungen_insert" ON zahlungen FOR INSERT WITH CHECK (true);

-- CONFIG
CREATE POLICY "config_select" ON routing_config FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "config_admin" ON routing_config FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "budget_select" ON budget_config FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "budget_admin" ON budget_config FOR ALL USING (get_user_role() = 'admin');

-- AUDIT
CREATE POLICY "audit_select" ON audit_log FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "audit_insert" ON audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO lead_pakete (name, beschreibung, leads_pro_monat, preis_pro_lead_cents, mindestlaufzeit_monate, setter_aufpreis_cents, sort_order) VALUES
  ('Starter', '10 Leads pro Monat – ideal zum Einstieg', 10, 5900, 3, 1000, 1),
  ('Standard', '20 Leads pro Monat – für aktive Berater', 20, 5500, 3, 1000, 2),
  ('Premium', '20 Leads pro Monat – bester Preis pro Lead', 20, 4900, 3, 1000, 3);

INSERT INTO nachkauf_pakete (name, anzahl_leads, preis_pro_lead_cents, setter_aufpreis_cents, sort_order) VALUES
  ('5er Pack', 5, 5900, 1000, 1),
  ('10er Pack', 10, 5500, 1000, 2);
