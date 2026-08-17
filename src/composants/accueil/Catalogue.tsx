/**
 * 04 — Le paysage du catalogue, et 05 — les organismes couverts.
 *
 * CE SONT DES CHIFFRES DE COUVERTURE, PAS DES ARGUMENTS. Chacun décrit l'état
 * du catalogue à l'instant du rendu ; aucun ne qualifie une formation, un
 * organisme ni une catégorie. Le nombre affiché sur une tuile est le nombre de
 * fiches qu'elle ouvre — c'est un décompte, pas une recommandation.
 *
 * TOUT EST DÉRIVÉ, RIEN N'EST ÉCRIT. Les tuiles disparaissent quand leur
 * décompte tombe à zéro, la fourchette de prix s'efface quand aucune médiane
 * n'est établie, et la bande d'organismes se construit à partir des fiches. Un
 * chiffre écrit à la main mentirait au premier parcours ajouté.
 */
import { Link } from "@tanstack/react-router";
import type { ChiffresGuides } from "@/modele/chiffres-guides";
import { formaterNombre } from "@/modele/nombres";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import { pagePlanifiee } from "@/modele/plan-pages";
import type { ParametresFiltres } from "@/modele/filtres-url";

import { BandeOrganismes } from "@/composants/BandeOrganismes";
import type { CategorieOrganisme } from "@/types/cursus";
import { Entete, LienAction, Reveal, Section } from "./pieces";

/* -------------------------------------------------------------------------- */
/* 04 — Le paysage                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Une mesure du catalogue, en grand.
 *
 * `note` porte ce que le nombre ne dit pas : un décompte nu ne se rapporte à
 * rien, et « 40 » n'apprend rien tant qu'on ignore sur quoi il porte.
 */
function Mesure({
  valeur,
  libelle,
  note,
}: {
  valeur: string;
  libelle: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-(--space-1) border-t border-(--border-default) pt-(--space-4)">
      <span className="t-data-lg text-(--text-primary)">{valeur}</span>
      <span className="t-body-sm text-(--text-secondary)">{libelle}</span>
      {note !== undefined && <span className="t-caption text-(--text-tertiary)">{note}</span>}
    </div>
  );
}

/** Une tuile de croisement — lien seulement si la page est au plan. */
function Tuile({
  parametres,
  libelle,
  nombre,
  accent = false,
}: {
  parametres: ParametresFiltres;
  libelle: string;
  nombre: number;
  accent?: boolean;
}) {
  const contenu = (
    <>
      <span
        className={`block t-display-2 tabular-nums transition-colors duration-(--motion-fast) ${
          accent
            ? "text-(--accent-default)"
            : "text-(--text-primary) group-hover/tuile:text-(--accent-default)"
        }`}
      >
        {formaterNombre(nombre)}
      </span>
      <span className="mt-(--space-1) block t-body-sm text-(--text-secondary)">{libelle}</span>
    </>
  );
  const base = `block h-full rounded-(--carte-rayon) border p-(--space-5) shadow-(--elevation-2) ${
    accent
      ? "border-(--accent-border) bg-(--accent-surface)"
      : "border-(--border-default) bg-(--surface-raised)"
  }`;
  if (pagePlanifiee(parametres) === undefined) return <li className={base}>{contenu}</li>;
  return (
    <li>
      <Link
        to="/catalogue"
        search={parametres}
        className={`group/tuile ${base} transition-[border-color,box-shadow,transform] duration-(--motion-fast) hover:border-(--accent-default) hover:shadow-(--elevation-3) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) motion-safe:hover:-translate-y-px`}
      >
        {contenu}
      </Link>
    </li>
  );
}

export function PaysageDuCatalogue({
  chiffres,
  informationsVerifiees,
}: {
  chiffres: ChiffresGuides;
  /** Somme des champs renseignés, calculée là où le catalogue est chargé. */
  informationsVerifiees: number;
}) {
  const euros = (v: number | null) => (v === null ? null : `${formaterNombre(v)} €`);

  const formats = [
    { cle: "distanciel", libelle: "À distance", nombre: chiffres.distanciel },
    { cle: "alternance", libelle: "En alternance", nombre: chiffres.alternance },
    { cle: "presentiel", libelle: "En présentiel", nombre: chiffres.presentiel },
  ].filter((f) => f.nombre > 0);

  return (
    <Section>
      <Reveal>
        <Entete
          index={{ numero: "04", libelle: "Le catalogue" }}
          titre="Ce que le catalogue contient aujourd'hui."
          appui="Ces chiffres décrivent l'état des fiches, jamais leur qualité. Ils changent quand le catalogue change."
        />
      </Reveal>

      <Reveal delai={60}>
        <div className="mt-(--space-10) grid gap-x-(--space-8) gap-y-(--space-6) min-[640px]:grid-cols-2 min-[1000px]:grid-cols-4">
          <Mesure
            valeur={formaterNombre(chiffres.parcours)}
            libelle="parcours au catalogue"
            note={`${formaterNombre(chiffres.organismes)} organismes`}
          />
          <Mesure
            valeur={formaterNombre(informationsVerifiees)}
            libelle="informations vérifiées"
            note="relevées une par une, à la source"
          />
          <Mesure
            valeur={formaterNombre(chiffres.prixEtabli)}
            libelle="prix établis"
            note={`${formaterNombre(chiffres.prixNonEtabli)} non communiqués`}
          />
          {/* La fourchette n'apparaît que si une médiane existe. Sinon, la
              gratuité — un fait, lui aussi mesuré. */}
          {chiffres.medianePayant !== null ? (
            <Mesure
              valeur={euros(chiffres.medianePayant) ?? ""}
              libelle="prix médian des parcours payants"
              note={`de ${euros(chiffres.prixMinPayant)} à ${euros(chiffres.prixMaxPayant)}`}
            />
          ) : (
            <Mesure
              valeur={formaterNombre(chiffres.sansFrais)}
              libelle="sans frais pour l'apprenant"
              note={`${formaterNombre(chiffres.accesPartiel)} en accès partiel gratuit`}
            />
          )}
        </div>
      </Reveal>

      <Reveal delai={120}>
        <ul className="mt-(--space-10) grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-(--space-4)">
          {formats.map((f) => (
            <Tuile
              key={f.cle}
              parametres={{ format: f.cle }}
              libelle={f.libelle}
              nombre={f.nombre}
              accent
            />
          ))}
          {chiffres.parCategorie.map((ligne) => (
            <Tuile
              key={ligne.cle}
              parametres={{ categorie: ligne.cle }}
              libelle={
                LIBELLES_CATEGORIES[ligne.cle as keyof typeof LIBELLES_CATEGORIES] ?? ligne.libelle
              }
              nombre={ligne.nombre}
            />
          ))}
        </ul>
      </Reveal>

      <div className="mt-(--space-6)">
        <LienAction to="/catalogue">Voir tout le catalogue</LienAction>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 05 — Les organismes couverts                                               */
/* -------------------------------------------------------------------------- */

export type OrganismeBande = {
  nom: string;
  categorie: CategorieOrganisme;
  parcours: number;
};

/**
 * La bande d'organismes.
 *
 * ELLE N'EST PAS UNE VITRINE DE PARTENAIRES, et le texte le dit explicitement :
 * aucun de ces organismes ne nous rémunère, aucun n'a demandé à figurer là. Sans
 * cette phrase, un défilé de noms se lit exactement comme un bandeau de
 * sponsors — c'est la convention visuelle du web, et elle jouerait contre le
 * seul argument du produit.
 */
export function OrganismesCouverts({ organismes }: { organismes: OrganismeBande[] }) {
  if (organismes.length === 0) return null;

  return (
    <Section fond="creuse">
      <Reveal>
        <div className="grid items-end gap-(--space-5) min-[900px]:grid-cols-[1.35fr_1fr] min-[900px]:gap-(--space-12)">
          <Entete
            index={{ numero: "05", libelle: "Les organismes" }}
            titre={
              <>
                <span className="chiffre">{formaterNombre(organismes.length)}</span> organismes
                couverts.
              </>
            }
          />
          <p className="t-body text-(--text-secondary)">
            Universités, écoles, plateformes, indépendants. Aucun ne nous rémunère, aucun n&apos;a
            demandé à figurer ici : ils sont au catalogue parce qu&apos;ils publient une formation
            e-commerce.
          </p>
        </div>
      </Reveal>

      <div className="-mx-(--space-6) mt-(--space-8)">
        <BandeOrganismes organismes={organismes} />
      </div>

      <div className="mt-(--space-8)">
        <LienAction to="/organismes">Voir tous les organismes</LienAction>
      </div>
    </Section>
  );
}
