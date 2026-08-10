-- profils
CREATE TABLE public.profils (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now(),
  derniere_connexion timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profils TO authenticated;
GRANT ALL ON public.profils TO service_role;
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture de son propre profil" ON public.profils FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Modification de son propre profil" ON public.profils FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.creer_profil_a_inscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profils (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.creer_profil_a_inscription();

-- sauvegardes
CREATE TABLE public.sauvegardes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('parcours','organisme')),
  cible_id text NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now(),
  UNIQUE (utilisateur_id, type, cible_id)
);
CREATE INDEX sauvegardes_utilisateur_id_idx ON public.sauvegardes (utilisateur_id);
CREATE INDEX sauvegardes_cible_id_idx ON public.sauvegardes (cible_id);
GRANT SELECT, INSERT, DELETE ON public.sauvegardes TO authenticated;
GRANT ALL ON public.sauvegardes TO service_role;
ALTER TABLE public.sauvegardes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture de ses sauvegardes" ON public.sauvegardes FOR SELECT TO authenticated USING (auth.uid() = utilisateur_id);
CREATE POLICY "Ajout de ses sauvegardes" ON public.sauvegardes FOR INSERT TO authenticated WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY "Retrait de ses sauvegardes" ON public.sauvegardes FOR DELETE TO authenticated USING (auth.uid() = utilisateur_id);

-- comparaisons
CREATE TABLE public.comparaisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  nom text,
  parcours_ids text[] NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now(),
  consulte_le timestamptz,
  CONSTRAINT comparaisons_taille CHECK (array_length(parcours_ids, 1) BETWEEN 2 AND 4)
);
CREATE INDEX comparaisons_utilisateur_id_idx ON public.comparaisons (utilisateur_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comparaisons TO authenticated;
GRANT ALL ON public.comparaisons TO service_role;
ALTER TABLE public.comparaisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture de ses comparaisons" ON public.comparaisons FOR SELECT TO authenticated USING (auth.uid() = utilisateur_id);
CREATE POLICY "Ajout de ses comparaisons" ON public.comparaisons FOR INSERT TO authenticated WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY "Modification de ses comparaisons" ON public.comparaisons FOR UPDATE TO authenticated USING (auth.uid() = utilisateur_id) WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY "Suppression de ses comparaisons" ON public.comparaisons FOR DELETE TO authenticated USING (auth.uid() = utilisateur_id);

-- alertes
CREATE TABLE public.alertes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  parcours_id text NOT NULL,
  champs_surveilles text[] NOT NULL DEFAULT '{cout_apprenant}',
  active boolean NOT NULL DEFAULT true,
  cree_le timestamptz NOT NULL DEFAULT now(),
  derniere_notification timestamptz,
  UNIQUE (utilisateur_id, parcours_id)
);
CREATE INDEX alertes_parcours_id_idx ON public.alertes (parcours_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertes TO authenticated;
GRANT ALL ON public.alertes TO service_role;
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture de ses alertes" ON public.alertes FOR SELECT TO authenticated USING (auth.uid() = utilisateur_id);
CREATE POLICY "Ajout de ses alertes" ON public.alertes FOR INSERT TO authenticated WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY "Modification de ses alertes" ON public.alertes FOR UPDATE TO authenticated USING (auth.uid() = utilisateur_id) WITH CHECK (auth.uid() = utilisateur_id);
CREATE POLICY "Suppression de ses alertes" ON public.alertes FOR DELETE TO authenticated USING (auth.uid() = utilisateur_id);

-- historique_champs
CREATE TABLE public.historique_champs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_id text NOT NULL,
  champ text NOT NULL,
  valeur_precedente text,
  valeur_nouvelle text,
  etat_precedent text,
  etat_nouveau text,
  origine text NOT NULL CHECK (origine IN ('extraction_automatique','correction_manuelle','declaration_organisme','signalement_utilisateur')),
  source_url text,
  citation text,
  modifie_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historique_champs_parcours_modifie_idx ON public.historique_champs (parcours_id, modifie_le DESC);
GRANT SELECT ON public.historique_champs TO anon, authenticated;
GRANT ALL ON public.historique_champs TO service_role;
ALTER TABLE public.historique_champs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique de l'historique" ON public.historique_champs FOR SELECT TO anon, authenticated USING (true);

-- notifications_envoyees
CREATE TABLE public.notifications_envoyees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerte_id uuid NOT NULL REFERENCES public.alertes(id) ON DELETE CASCADE,
  historique_id uuid NOT NULL REFERENCES public.historique_champs(id),
  envoye_le timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alerte_id, historique_id)
);
GRANT ALL ON public.notifications_envoyees TO service_role;
ALTER TABLE public.notifications_envoyees ENABLE ROW LEVEL SECURITY;