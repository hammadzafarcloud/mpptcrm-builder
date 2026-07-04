
CREATE TABLE public.booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Book a Service',
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_links TO authenticated;
GRANT ALL ON public.booking_links TO service_role;
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active links" ON public.booking_links FOR SELECT TO anon USING (active = true);
CREATE POLICY "Owner can view own links" ON public.booking_links FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own links" ON public.booking_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own links" ON public.booking_links FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own links" ON public.booking_links FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.booking_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  client_address text,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.booking_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_submissions TO authenticated;
GRANT ALL ON public.booking_submissions TO service_role;
ALTER TABLE public.booking_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit booking on active link" ON public.booking_submissions FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.booking_links l WHERE l.id = link_id AND l.owner_id = booking_submissions.owner_id AND l.active = true));
CREATE POLICY "Auth can submit booking on active link" ON public.booking_submissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.booking_links l WHERE l.id = link_id AND l.owner_id = booking_submissions.owner_id AND l.active = true));
CREATE POLICY "Owner can view own submissions" ON public.booking_submissions FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can update own submissions" ON public.booking_submissions FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own submissions" ON public.booking_submissions FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_booking_links_updated_at BEFORE UPDATE ON public.booking_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_booking_submissions_updated_at BEFORE UPDATE ON public.booking_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
