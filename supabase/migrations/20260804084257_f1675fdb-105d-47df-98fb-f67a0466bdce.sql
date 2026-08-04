ALTER TABLE public.parcours
  ADD COLUMN profondeur text NOT NULL DEFAULT 'catalogue_seul'
    CHECK (profondeur IN ('catalogue_seul', 'detail_verifie')),
  ADD COLUMN profondeur_verifiee_le date,
  ADD COLUMN modalite_commerciale text
    CHECK (modalite_commerciale IN ('inter', 'intra', 'les_deux')),
  ADD COLUMN prix_intra integer;