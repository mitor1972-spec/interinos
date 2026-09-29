CREATE TABLE public.portal_auth_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  email_hash text NOT NULL,
  outcome text NOT NULL
);
CREATE INDEX portal_auth_attempts_email_idx ON public.portal_auth_attempts (email_hash, created_at);
CREATE INDEX portal_auth_attempts_created_idx ON public.portal_auth_attempts (created_at);
GRANT ALL ON public.portal_auth_attempts TO service_role;
GRANT SELECT ON public.portal_auth_attempts TO authenticated;
ALTER TABLE public.portal_auth_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read portal auth attempts" ON public.portal_auth_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));