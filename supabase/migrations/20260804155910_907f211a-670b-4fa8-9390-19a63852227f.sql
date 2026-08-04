ALTER TABLE public.parcours
  DROP COLUMN IF EXISTS modalite_commerciale,
  ADD COLUMN IF NOT EXISTS dispo_inter boolean,
  ADD COLUMN IF NOT EXISTS dispo_intra boolean,
  ADD COLUMN IF NOT EXISTS prix_intra integer,
  ADD COLUMN IF NOT EXISTS profondeur text NOT NULL DEFAULT 'catalogue_seul',
  ADD COLUMN IF NOT EXISTS profondeur_verifiee_le date;

NOTIFY pgrst, 'reload schema';