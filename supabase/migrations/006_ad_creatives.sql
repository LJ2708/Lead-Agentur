CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  media_type TEXT NOT NULL DEFAULT 'image', -- 'image' or 'video'
  media_url TEXT, -- external URL (YouTube, direct link, etc.)
  thumbnail_url TEXT, -- thumbnail for videos
  supabase_path TEXT, -- path in Supabase Storage if uploaded
  is_active BOOLEAN NOT NULL DEFAULT true,
  leads_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_creatives_name ON ad_creatives(name);

ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_creatives_select" ON ad_creatives FOR SELECT USING (true);
CREATE POLICY "ad_creatives_admin" ON ad_creatives FOR ALL USING (get_user_role() = 'admin');

-- Trigger to update updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ad_creatives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
