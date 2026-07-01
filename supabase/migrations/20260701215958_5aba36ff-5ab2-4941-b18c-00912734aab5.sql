CREATE TABLE public.user_kv (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_kv TO authenticated;
GRANT ALL ON public.user_kv TO service_role;
ALTER TABLE public.user_kv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kv owner all" ON public.user_kv FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);