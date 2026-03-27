-- Working hours per berater (weekly schedule)
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  berater_id UUID NOT NULL REFERENCES berater(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(berater_id, day_of_week, start_time)
);

CREATE INDEX idx_working_hours_berater ON working_hours(berater_id, day_of_week);

ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "working_hours_select" ON working_hours FOR SELECT USING (true);
CREATE POLICY "working_hours_admin" ON working_hours FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "working_hours_own" ON working_hours FOR ALL USING (
  berater_id = get_berater_id()
);

-- Add availability fields to berater
ALTER TABLE berater ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'offline'; -- offline, available, busy, on_call
ALTER TABLE berater ADD COLUMN IF NOT EXISTS availability_override BOOLEAN DEFAULT false;
ALTER TABLE berater ADD COLUMN IF NOT EXISTS availability_override_until TIMESTAMPTZ;
ALTER TABLE berater ADD COLUMN IF NOT EXISTS do_not_disturb BOOLEAN DEFAULT false;

-- Add queue fields to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS queue_status TEXT DEFAULT 'none'; -- none, holding, ready, assigned, expired
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_ready_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS holding_reason TEXT;
