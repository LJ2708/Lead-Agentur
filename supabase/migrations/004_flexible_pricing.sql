-- New pricing_config table
CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  label TEXT,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pricing_config (key, value, label, description) VALUES
  ('min_leads', 10, 'Minimum Leads', 'Mindestanzahl pro Monat'),
  ('max_leads_self_service', 50, 'Max Leads Self-Service', 'Maximum ohne Enterprise'),
  ('preis_bei_min_cents', 5900, 'Preis bei Min', '59 EUR bei 10 Leads'),
  ('preis_bei_max_cents', 3900, 'Preis bei Max', '39 EUR bei 50 Leads'),
  ('setter_aufpreis_cents', 1000, 'Setter-Aufpreis', '+10 EUR pro Lead'),
  ('setter_verguetung_cents', 800, 'Setter-Verguetung', '8 EUR pro Lead an Setter'),
  ('mindestlaufzeit_monate', 3, 'Mindestlaufzeit', 'Monate'),
  ('max_kontaktversuche_setter', 5, 'Max Kontaktversuche', 'Pro Lead fuer Setter')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_select" ON pricing_config FOR SELECT USING (true);
CREATE POLICY "pricing_admin" ON pricing_config FOR ALL USING (get_user_role() = 'admin');

-- Add setter_typ enum
DO $$ BEGIN
  CREATE TYPE setter_typ AS ENUM ('pool', 'eigen', 'keiner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update berater table: add flexible pricing fields
ALTER TABLE berater ADD COLUMN IF NOT EXISTS leads_pro_monat INTEGER NOT NULL DEFAULT 10;
ALTER TABLE berater ADD COLUMN IF NOT EXISTS preis_pro_lead_cents INTEGER NOT NULL DEFAULT 5900;
ALTER TABLE berater ADD COLUMN IF NOT EXISTS setter_typ TEXT DEFAULT 'keiner';

-- Setter abrechnungen table
CREATE TABLE IF NOT EXISTS setter_abrechnungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id UUID NOT NULL REFERENCES profiles(id),
  monat DATE NOT NULL,
  leads_bearbeitet INTEGER NOT NULL DEFAULT 0,
  verguetung_pro_lead_cents INTEGER NOT NULL DEFAULT 800,
  gesamt_cents INTEGER GENERATED ALWAYS AS (leads_bearbeitet * verguetung_pro_lead_cents) STORED,
  ausgezahlt BOOLEAN NOT NULL DEFAULT false,
  ausgezahlt_am TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE setter_abrechnungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setter_abr_select" ON setter_abrechnungen FOR SELECT USING (get_user_role() = 'admin' OR setter_id = auth.uid());
CREATE POLICY "setter_abr_admin" ON setter_abrechnungen FOR ALL USING (get_user_role() = 'admin');

-- Update leads: add max_kontaktversuche
ALTER TABLE leads ADD COLUMN IF NOT EXISTS max_kontaktversuche INTEGER NOT NULL DEFAULT 5;

-- Update zahlungen: add pricing info
ALTER TABLE zahlungen ADD COLUMN IF NOT EXISTS preis_pro_lead_cents INTEGER;
ALTER TABLE zahlungen ADD COLUMN IF NOT EXISTS hat_setter BOOLEAN NOT NULL DEFAULT false;

-- Update nachkauf_pakete: remove price (use berater's current price)
-- Keep the table but simplify - just anzahl_leads matters
