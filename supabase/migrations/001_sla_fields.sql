-- Add SLA and acceptance fields to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'none'; -- none, active, met, breached
ALTER TABLE leads ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES profiles(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_outcome TEXT; -- reached, not_reached, invalid, callback, not_interested, appointment
ALTER TABLE leads ADD COLUMN IF NOT EXISTS callback_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reassignment_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS previous_berater_ids UUID[] DEFAULT '{}';
