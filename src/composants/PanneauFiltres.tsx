/**
 * Panneau de filtres.
 *
 * Chaque option affiche son décompte, calculé avec les autres filtres actifs :
 * un filtre dont on ignore le rendement se coche à l'aveugle, et une option à
 * zéro résultat doit se voir avant d'être cliquée.
 *
 * Les groupes sont des accordéons, repliés par défaut. Vingt-neuf sujets et
 * dix-huit compétences déroulés en permanence noient tous les autres groupes.
 * Un groupe portant un filtre actif s'ouvre de lui-même et porte un badge de
 * décompte qui reste visible une fois replié — sans quoi un filtre actif
 * deviendrait invisible, ce qui est le pire état possible pour un filtre.
 *
 * Le domaine ne figure pas ici : c'est le premier niveau de la hiérarchie, et
 * il se lit comme une navigation en pleine largeur (voir `OngletsDomaines`).
 */
import { useState } from "react";
import type { ParcoursListe } from "@/donnees/requetes";
import {
  compterAvec,
  LIBELLES_DUREES,
  TRANCHES_DUREE,
  type Filtres,
  type TrancheDuree,
} from "@/modele/filtres";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import type { CategorieOrganisme, FormatParcours, NiveauEntree } from "@/types/cursus";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

type Props = {
  parcours: readonly ParcoursListe[];
  filtres: Filtres;
  modifier: (patch: Partial<Filtres>) => void;
};

/** Plafond du curseur de budget. Au-delà, le filtre est retiré. */
const BUDGET_MAX = 5000;
const BUDGET_PAS = 250;

/*
 * Pas vertical d'une option : 32 px de zone cliquable + 8 px d'écart.
 * Le plafond des listes longues est un multiple exact de ce pas, pour que la
 * découpe tombe toujours entre deux lignes et jamais au milieu de l'une.
 */
const PAS_OPTION = 40;
const LIGNES_VISIBLES = 6;
const HAUTEUR_LISTE = PAS_OPTION * LIGNES_VISIBLES;

const LIBELLES_FORMATS: Record<FormatParcours, string> = {
  distanciel: "Distanciel",
  presentiel: "Présentiel",
  alternance: "Alternance",
};

const LIBELLES_NIVEAUX: Record<NiveauEntree, string> = {
  aucun_prerequis: "Aucun prérequis",
  bac2: "Bac+2",
  bac3: "Bac+3",
  experience: "Expérience",
};

/** Le décompte, en badge aligné à droite plutôt qu'accolé au libellé. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="chiffre shrink-0 rounded-[4px] bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
      {children}
    </span>
  );
}

function Groupe({
  titre,
  description,
  actifs,
  children,
}: {
  titre: string;
  description?: string;
  /** Nombre de sélections actives dans ce groupe. */
  actifs: number;
  children: React.ReactNode;
}) {
  // `null` tant que l'utilisateur n'a rien décidé : le groupe suit alors la
  // présence d'un filtre actif.
  const [choixManuel, setChoixManuel] = useState<boolean | null>(null);
  const ouvert = choixManuel ?? actifs > 0;

  return (
    <section className="border-t border-border">
      <h2>
        <button
          type="button"
          onClick={() => setChoixManuel(!ouvert)}
          aria-expanded={ouvert}
          className="flex min-h-10 w-full items-center justify-between gap-2 py-2.5 text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {titre}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {/* Le badge survit au repli : un filtre actif ne doit jamais
                disparaître de la vue. */}
            {actifs > 0 && (
              <span className="chiffre rounded-[4px] bg-foreground px-1.5 py-0.5 text-[10.5px] text-background">
                {actifs}
              </span>
            )}
            <span
              aria-hidden
              className={`text-muted-foreground transition-transform motion-safe:duration-150 ${
                ouvert ? "rotate-180" : ""
              }`}
            >
              ⌄
            </span>
          </span>
        </button>
      </h2>

      {ouvert && (
        <div className="pb-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150">
          {description !== undefined && (
            /* 8 px sous l'intitulé : les deux étaient collés. */
            <p className="mb-3 mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
          {children}
        </div>
      )}
    </section>
  );
}

function Option({
  id,
  libelle,
  coche,
  nombre,
  basculer,
}: {
  id: string;
  libelle: string;
  coche: boolean;
  nombre: number;
  basculer: () => void;
}) {
  const inactive = nombre === 0 && !coche;
  return (
    /*
     * Toute la ligne est cliquable, pas seulement la case : 40 px sur mobile,
     * où le pointage est moins précis, 32 px sur bureau.
     */
    <label
      htmlFor={id}
      className={`flex min-h-10 cursor-pointer items-center gap-2 sm:min-h-8 ${
        inactive ? "cursor-not-allowed text-muted-foreground/50" : ""
      }`}
    >
      <Checkbox id={id} checked={coche} onCheckedChange={basculer} disabled={inactive} />
      <span className="flex-1 text-sm">{libelle}</span>
      <Badge>{nombre}</Badge>
    </label>
  );
}

/** Liste longue : défilement interne, découpe entre deux lignes. */
function ListeDefilante({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ maxHeight: `${HAUTEUR_LISTE}px` }}
      className="space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

/** Ajoute ou retire une valeur d'une liste de filtre. */
function basculer<T>(liste: T[], valeur: T): T[] {
  return liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

export function PanneauFiltres({ parcours, filtres, modifier }: Props) {
  const sujets = [...new Set(parcours.map((p) => p.sujetPrincipal))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const competences = [...new Set(parcours.flatMap((p) => p.competencesCouvertes))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const categories = Object.keys(LIBELLES_CATEGORIES) as CategorieOrganisme[];

  const financementsActifs =
    Number(filtres.eligibleCpf) +
    Number(filtres.sansFrais) +
    Number(filtres.accesPartiel) +
    Number(filtres.financementEntreprise) +
    Number(filtres.prixCommunique);

  return (
    <div className="text-sm">
      <Groupe
        titre="Sujet principal"
        description="Les parcours dont c'est réellement l'objet."
        actifs={filtres.sujets.length}
      >
        <ListeDefilante>
          {sujets.map((sujet) => (
            <Option
              key={sujet}
              id={`sujet-${sujet}`}
              libelle={sujet}
              coche={filtres.sujets.includes(sujet)}
              nombre={compterAvec(parcours, filtres, { sujets: [sujet] })}
              basculer={() => modifier({ sujets: basculer(filtres.sujets, sujet) })}
            />
          ))}
        </ListeDefilante>
      </Groupe>

      <Groupe
        titre="Compétence abordée"
        description="Les parcours qui l'abordent, sans en faire leur objet."
        actifs={filtres.competences.length}
      >
        <ListeDefilante>
          {competences.map((competence) => (
            <Option
              key={competence}
              id={`comp-${competence}`}
              libelle={competence}
              coche={filtres.competences.includes(competence)}
              nombre={compterAvec(parcours, filtres, { competences: [competence] })}
              basculer={() => modifier({ competences: basculer(filtres.competences, competence) })}
            />
          ))}
        </ListeDefilante>
      </Groupe>

      <Groupe titre="Catégorie" actifs={filtres.categories.length}>
        <div className="space-y-2">
          {categories.map((categorie) => (
            <Option
              key={categorie}
              id={`cat-${categorie}`}
              libelle={LIBELLES_CATEGORIES[categorie]}
              coche={filtres.categories.includes(categorie)}
              nombre={compterAvec(parcours, filtres, { categories: [categorie] })}
              basculer={() => modifier({ categories: basculer(filtres.categories, categorie) })}
            />
          ))}
        </div>
      </Groupe>

      <Groupe
        titre="Budget maximum"
        description="Les parcours dont le prix n'est pas publié restent affichés quel que soit le budget : ne pas publier son prix ne doit ni profiter ni nuire."
        actifs={filtres.budget === null ? 0 : 1}
      >
        <div className="flex items-baseline justify-between">
          <span className="chiffre text-sm">
            {filtres.budget === null ? "Sans limite" : `${filtres.budget.toLocaleString("fr-FR")} €`}
          </span>
          <Badge>{compterAvec(parcours, filtres, {})}</Badge>
        </div>
        <Slider
          value={[filtres.budget ?? BUDGET_MAX]}
          min={0}
          max={BUDGET_MAX}
          step={BUDGET_PAS}
          onValueChange={([valeur]) =>
            modifier({ budget: valeur === undefined || valeur >= BUDGET_MAX ? null : valeur })
          }
          aria-label="Budget maximum"
          className="mt-3"
        />
      </Groupe>

      <Groupe
        titre="Durée"
        description="Volume horaire total publié. La tranche « Non communiqué » se sélectionne comme les autres."
        actifs={filtres.durees.length}
      >
        <div className="space-y-2">
          {TRANCHES_DUREE.map((tranche) => (
            <Option
              key={tranche}
              id={`duree-${tranche}`}
              libelle={LIBELLES_DUREES[tranche]}
              coche={filtres.durees.includes(tranche)}
              nombre={compterAvec(parcours, filtres, { durees: [tranche] })}
              basculer={() => modifier({ durees: basculer<TrancheDuree>(filtres.durees, tranche) })}
            />
          ))}
        </div>
      </Groupe>

      <Groupe
        titre="Financement"
        description="Une gratuité dont la modalité n'a pas été vérifiée sur le site de l'organisme ne remonte dans aucun des filtres de gratuité."
        actifs={financementsActifs}
      >
        <div className="space-y-2">
          <Option
            id="f-cpf"
            libelle="Éligible CPF"
            coche={filtres.eligibleCpf}
            nombre={compterAvec(parcours, filtres, { eligibleCpf: true })}
            basculer={() => modifier({ eligibleCpf: !filtres.eligibleCpf })}
          />
          <Option
            id="f-sans-frais"
            libelle="Sans frais pour l'apprenant"
            coche={filtres.sansFrais}
            nombre={compterAvec(parcours, filtres, { sansFrais: true })}
            basculer={() => modifier({ sansFrais: !filtres.sansFrais })}
          />
          <Option
            id="f-entreprise"
            libelle="Financé par l'entreprise"
            coche={filtres.financementEntreprise}
            nombre={compterAvec(parcours, filtres, { financementEntreprise: true })}
            basculer={() => modifier({ financementEntreprise: !filtres.financementEntreprise })}
          />
          <Option
            id="f-prix-communique"
            libelle="Prix communiqué"
            coche={filtres.prixCommunique}
            nombre={compterAvec(parcours, filtres, { prixCommunique: true })}
            basculer={() => modifier({ prixCommunique: !filtres.prixCommunique })}
          />
          <Option
            id="f-partiel"
            libelle="Accès partiel gratuit"
            coche={filtres.accesPartiel}
            nombre={compterAvec(parcours, filtres, { accesPartiel: true })}
            basculer={() => modifier({ accesPartiel: !filtres.accesPartiel })}
          />
        </div>
      </Groupe>

      {/*
        L'accessibilité précède le format : savoir si l'on peut acheter le
        parcours soi-même conditionne tout le reste. Un parcours réservé aux
        entreprises reste au catalogue et reste visible sans ce filtre — il
        intéresse un dirigeant qui forme son équipe.
      */}
      <Groupe titre="Accessibilité" actifs={filtres.accessibleIndividuellement ? 1 : 0}>
        <div className="space-y-2">
          <Option
            id="f-individuel"
            libelle="Accessible à titre individuel"
            coche={filtres.accessibleIndividuellement}
            nombre={compterAvec(parcours, filtres, { accessibleIndividuellement: true })}
            basculer={() =>
              modifier({ accessibleIndividuellement: !filtres.accessibleIndividuellement })
            }
          />
        </div>
      </Groupe>

      <Groupe titre="Format" actifs={filtres.formats.length}>
        <div className="space-y-2">
          {(Object.keys(LIBELLES_FORMATS) as FormatParcours[]).map((format) => (
            <Option
              key={format}
              id={`fmt-${format}`}
              libelle={LIBELLES_FORMATS[format]}
              coche={filtres.formats.includes(format)}
              nombre={compterAvec(parcours, filtres, { formats: [format] })}
              basculer={() => modifier({ formats: basculer(filtres.formats, format) })}
            />
          ))}
        </div>
      </Groupe>

      <Groupe titre="Niveau d'entrée" actifs={filtres.niveaux.length}>
        <div className="space-y-2">
          {(Object.keys(LIBELLES_NIVEAUX) as NiveauEntree[]).map((niveau) => (
            <Option
              key={niveau}
              id={`niv-${niveau}`}
              libelle={LIBELLES_NIVEAUX[niveau]}
              coche={filtres.niveaux.includes(niveau)}
              nombre={compterAvec(parcours, filtres, { niveaux: [niveau] })}
              basculer={() => modifier({ niveaux: basculer(filtres.niveaux, niveau) })}
            />
          ))}
        </div>
      </Groupe>

      <Groupe titre="Certification" actifs={filtres.certifiantSeulement ? 1 : 0}>
        <div className="space-y-2">
          <Option
            id="f-certif"
            libelle="Certifiant (RNCP ou RS)"
            coche={filtres.certifiantSeulement}
            nombre={compterAvec(parcours, filtres, { certifiantSeulement: true })}
            basculer={() => modifier({ certifiantSeulement: !filtres.certifiantSeulement })}
          />
        </div>
      </Groupe>
    </div>
  );
}
