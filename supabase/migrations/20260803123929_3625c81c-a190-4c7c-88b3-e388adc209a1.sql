-- Enums
CREATE TYPE public.categorie_organisme AS ENUM ('universite','ecole','bootcamp','formation_professionnelle','certification_editeur','mooc_plateforme','formation_independante');
CREATE TYPE public.domaine_parcours AS ENUM ('ecommerce','marketplaces','publicite_payante','referencement','email_crm','data_conversion','creation_site','marketing_digital','commerce_vente');
CREATE TYPE public.format_parcours AS ENUM ('distanciel','presentiel','alternance','hybride');
CREATE TYPE public.niveau_entree AS ENUM ('aucun_prerequis','bac2','bac3','experience');
CREATE TYPE public.etat_information AS ENUM ('renseigne','non_communique','non_applicable','a_confirmer');
CREATE TYPE public.statut_regroupement AS ENUM ('autonome','fusionne','replie_arbitrage');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- organismes
CREATE TABLE public.organismes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  site text,
  categorie public.categorie_organisme NOT NULL,
  certifications_qualite text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organismes TO anon, authenticated;
GRANT ALL ON public.organismes TO service_role;
ALTER TABLE public.organismes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des organismes" ON public.organismes FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER organismes_set_updated_at BEFORE UPDATE ON public.organismes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- parcours
CREATE TABLE public.parcours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisme_id uuid NOT NULL REFERENCES public.organismes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  domaine public.domaine_parcours NOT NULL,
  sujet_principal text NOT NULL,
  competences_couvertes text[] NOT NULL DEFAULT '{}',

  -- 1..18 champs d'information
  prix_min numeric,
  prix_max numeric,
  modalites_paiement text,
  duree text,
  volume_horaire integer,
  format public.format_parcours,
  lieu text,
  niveau_entree public.niveau_entree,
  prerequis text,
  eligible_cpf boolean,
  financements_acceptes text[],
  certification text,
  code_rncp_rs text,
  outils_enseignes text[],
  programme jsonb,
  non_couvert text[],
  site_officiel text,
  source_information text,
  date_verification date,

  etats jsonb NOT NULL DEFAULT '{
    "prix": "non_communique",
    "modalites_paiement": "non_communique",
    "duree": "non_communique",
    "volume_horaire": "non_communique",
    "format": "non_communique",
    "lieu": "non_communique",
    "niveau_entree": "non_communique",
    "prerequis": "non_communique",
    "eligible_cpf": "non_communique",
    "financements_acceptes": "non_communique",
    "certification": "non_communique",
    "code_rncp_rs": "non_communique",
    "outils_enseignes": "non_communique",
    "programme": "non_communique",
    "non_couvert": "non_communique",
    "site_officiel": "non_communique",
    "source_information": "non_communique",
    "date_verification": "non_communique"
  }'::jsonb,

  infos_renseignees integer NOT NULL DEFAULT 0,
  infos_applicables integer NOT NULL DEFAULT 18,

  statut_regroupement public.statut_regroupement NOT NULL DEFAULT 'autonome',
  parcours_parent_id uuid REFERENCES public.parcours(id) ON DELETE SET NULL,
  motif_regroupement text,
  ecart_classification text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parcours TO anon, authenticated;
GRANT ALL ON public.parcours TO service_role;
ALTER TABLE public.parcours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des parcours" ON public.parcours FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER parcours_set_updated_at BEFORE UPDATE ON public.parcours FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_parcours_organisme_id ON public.parcours(organisme_id);
CREATE INDEX idx_parcours_domaine ON public.parcours(domaine);
CREATE INDEX idx_parcours_parent_id ON public.parcours(parcours_parent_id);

-- variantes
CREATE TABLE public.variantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_id uuid NOT NULL REFERENCES public.parcours(id) ON DELETE CASCADE,
  label text NOT NULL,
  prix numeric,
  duree text,
  volume_horaire integer,
  accompagnement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.variantes TO anon, authenticated;
GRANT ALL ON public.variantes TO service_role;
ALTER TABLE public.variantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des variantes" ON public.variantes FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER variantes_set_updated_at BEFORE UPDATE ON public.variantes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_variantes_parcours_id ON public.variantes(parcours_id);

-- sessions (hors perimetre fonctionnel)
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variante_id uuid NOT NULL REFERENCES public.variantes(id) ON DELETE CASCADE,
  date_debut date,
  ville text,
  places integer,
  tarif_promotionnel numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sessions TO anon, authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des sessions" ON public.sessions FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_sessions_variante_id ON public.sessions(variante_id);

-- arbitrages
CREATE TABLE public.arbitrages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_ids uuid[] NOT NULL DEFAULT '{}',
  regle_muette text,
  preuve_retenue text,
  decision text,
  auteur text,
  date_decision timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.arbitrages TO anon, authenticated;
GRANT ALL ON public.arbitrages TO service_role;
ALTER TABLE public.arbitrages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique des arbitrages" ON public.arbitrages FOR SELECT TO anon, authenticated USING (true);