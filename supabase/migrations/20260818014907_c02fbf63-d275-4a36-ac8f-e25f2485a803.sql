ALTER TABLE public.notifications_envoyees
  ALTER COLUMN alerte_id DROP NOT NULL,
  ADD COLUMN abonnement_id uuid NULL
    REFERENCES public.abonnements(id) ON DELETE CASCADE;

ALTER TABLE public.notifications_envoyees
  ADD CONSTRAINT notifications_une_seule_source
  CHECK ((alerte_id IS NOT NULL) <> (abonnement_id IS NOT NULL));

CREATE UNIQUE INDEX notifications_alerte_unique
  ON public.notifications_envoyees (alerte_id, historique_id)
  WHERE alerte_id IS NOT NULL;

CREATE UNIQUE INDEX notifications_abonnement_unique
  ON public.notifications_envoyees (abonnement_id, historique_id)
  WHERE abonnement_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';