CREATE TABLE public.export_nonces (
  nonce text PRIMARY KEY,
  key_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX export_nonces_created_at_idx ON public.export_nonces (created_at);
CREATE TABLE public.export_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  key_id text,
  action text,
  rows_returned integer,
  status integer NOT NULL
);
GRANT ALL ON public.export_nonces TO service_role;
GRANT ALL ON public.export_log TO service_role;
GRANT SELECT ON public.export_log TO authenticated;
ALTER TABLE public.export_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read export log" ON public.export_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));