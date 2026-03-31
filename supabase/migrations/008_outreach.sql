-- Outreach CRM for Berater acquisition
CREATE TABLE IF NOT EXISTS outreach_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company TEXT,
  position TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  notes TEXT,
  source TEXT DEFAULT 'linkedin',
  status TEXT NOT NULL DEFAULT 'neu',
  lost_reason TEXT,
  next_followup_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  contact_count INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES profiles(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  template_used TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_prospects_status ON outreach_prospects(status);
CREATE INDEX idx_outreach_activities_prospect ON outreach_activities(prospect_id, created_at DESC);

ALTER TABLE outreach_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_prospects_admin" ON outreach_prospects FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "outreach_activities_admin" ON outreach_activities FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "outreach_templates_admin" ON outreach_templates FOR ALL USING (get_user_role() = 'admin');

CREATE TRIGGER set_updated_at BEFORE UPDATE ON outreach_prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON outreach_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO outreach_templates (name, type, body, variables, sort_order) VALUES
('LinkedIn Vernetzungsanfrage', 'linkedin_connect', 'Hi {{name}}, ich bin auf dein Profil gestoßen und sehe, dass du als Finanzberater tätig bist. Wir helfen Beratern wie dir, planbar neue Kunden zu gewinnen — mit qualifizierten Leads ab 39€. Würde mich freuen, uns zu vernetzen!', '{name,company}', 1),
('Follow-up 1 (nach Vernetzung)', 'linkedin_followup_1', E'Hey {{name}}, danke fürs Vernetzen! 🙌\n\nKurze Frage: Wie gewinnst du aktuell neue Kunden? Wir arbeiten mit über 50 Finanzberatern zusammen und liefern qualifizierte Leads aus Meta-Kampagnen — gleichmäßig über den Monat verteilt.\n\nHättest du Lust auf einen kurzen Austausch? Dauert max. 15 Min.', '{name}', 2),
('Follow-up 2 (kein Reply)', 'linkedin_followup_2', E'Hi {{name}}, wollte nochmal kurz nachhaken. Viele Berater in {{city}} nutzen bereits unser System für planbare Terminierung.\n\nFalls du dir das mal anschauen willst: hub.leadsolution.de\n\nKein Druck — nur falls es gerade passt! 😊', '{name,city}', 3),
('Follow-up 3 (letzte Nachricht)', 'linkedin_followup_3', E'Hey {{name}}, ich möchte nicht nerven — aber falls du irgendwann das Thema Lead-Generierung optimieren willst, meld dich gerne. Ich lösch dich nicht 😄\n\nAlles Gute und viel Erfolg!', '{name}', 4),
('E-Mail Erstansprache', 'email_intro', E'Hi {{name}},\n\nich schreibe dir, weil ich gesehen habe, dass du als {{position}} bei {{company}} tätig bist.\n\nWir helfen Finanzberatern, planbar neue Kunden zu gewinnen:\n• Qualifizierte Leads ab 39€\n• Automatische Verteilung über den Monat\n• SLA: Jeder Lead wird innerhalb von 30 Min. kontaktiert\n\nHättest du diese Woche 15 Minuten für einen kurzen Austausch?\n\nBeste Grüße', '{name,position,company}', 5);
