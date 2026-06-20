-- Site-wide key/value settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default WhatsApp contact number (international format, no + or spaces)
INSERT INTO public.site_settings (key, value)
VALUES ('whatsapp_number', '2349018681499')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings
CREATE POLICY "Public read site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Only admins can write
CREATE POLICY "Admin write site_settings"
  ON public.site_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );
