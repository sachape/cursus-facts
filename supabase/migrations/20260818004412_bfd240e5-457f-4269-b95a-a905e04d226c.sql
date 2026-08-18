CREATE TABLE public.abonnements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  cree_le timestamp with time zone NOT NULL DEFAULT now(),
  consentement boolean NOT NULL DEFAULT false,
  consentement_le timestamp with time zone,
  source text NOT NULL,
  parcours_ids text[] NOT NULL DEFAULT '{}',
  jeton_desabonnement uuid NOT NULL DEFAULT gen_random_uuid(),
  desabonne_le timestamp with time zone,
  UNIQUE (jeton_desabonnement)
);

CREATE INDEX idx_abonnements_email ON public.abonnements (email);
CREATE INDEX idx_abonnements_jeton_desabonnement ON public.abonnements (jeton_desabonnement);

GRANT ALL ON public.abonnements TO service_role;

ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;