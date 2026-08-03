/**
 * Panneau de filtres.
 *
 * Chaque option affiche son décompte, calculé avec les autres filtres actifs :
 * un filtre dont on ignore le rendement se coche à l'aveugle, et une option à
 * zéro résultat doit se voir avant d'être cliquée.
 *
 * Le domaine ne figure pas ici : c'est le premier niveau de la hiérarchie, et
 * il se lit comme une navigation en pleine largeur (voir `OngletsDomaines`).
 */
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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type Props = {
  parcours: readonly ParcoursListe[];
  filtres: Filtres;
  modifier: (patch: Partial<Filtres>) => void;
};

/** Plafond du curseur de budget. Au-delà, le filtre est retiré. */
const BUDGET_MAX = 5000;
const BUDGET_PAS = 250;

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

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </h2>
      <div className="space-y-2">{children}</div>
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
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={coche} onCheckedChange={basculer} disabled={nombre === 0 && !coche} />
      <Label
        htmlFor={id}
        className={`flex-1 justify-between gap-2 font-normal ${nombre === 0 && !coche ? "text-muted-foreground/50" : ""}`}
      >
        <span>{libelle}</span>
        <span className="chiffre text-xs text-muted-foreground">{nombre}</span>
      </Label>
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

  return (
    <div className="text-sm">
      <Groupe titre="Sujet principal">
        <p className="mb-2 text-xs text-muted-foreground">
          Les parcours dont c&apos;est réellement l&apos;objet.
        </p>
        <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        </div>
      </Groupe>

      <Groupe titre="Compétence abordée">
        <p className="mb-2 text-xs text-muted-foreground">
          Les parcours qui l&apos;abordent, sans en faire leur objet.
        </p>
        <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        </div>
      </Groupe>

      <Groupe titre="Catégorie">
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
      </Groupe>

      <Groupe titre="Budget maximum">
        <div className="flex items-baseline justify-between">
          <span className="chiffre text-sm">
            {filtres.budget === null
              ? "Sans limite"
              : `${filtres.budget.toLocaleString("fr-FR")} €`}
          </span>
          <span className="chiffre text-xs text-muted-foreground">
            {compterAvec(parcours, filtres, {})}
          </span>
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
        <p className="pt-2 text-xs text-muted-foreground">
          Les parcours dont le prix n&apos;est pas publié restent affichés quel que soit le
          budget : ne pas publier son prix ne doit ni profiter ni nuire.
        </p>
      </Groupe>

      <Groupe titre="Durée">
        <p className="mb-2 text-xs text-muted-foreground">
          Volume horaire total publié. La tranche « Non communiqué » se sélectionne comme les
          autres.
        </p>
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
      </Groupe>

      <Groupe titre="Financement">
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
        <p className="pt-2 text-xs text-muted-foreground">
          Une gratuité dont la modalité n&apos;a pas été vérifiée sur le site de l&apos;organisme
          ne remonte dans aucun de ces deux filtres.
        </p>
      </Groupe>

      <Groupe titre="Format">
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
      </Groupe>

      <Groupe titre="Niveau d'entrée">
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
      </Groupe>

      <Groupe titre="Certification">
        <Option
          id="f-certif"
          libelle="Certifiant (RNCP ou RS)"
          coche={filtres.certifiantSeulement}
          nombre={compterAvec(parcours, filtres, { certifiantSeulement: true })}
          basculer={() => modifier({ certifiantSeulement: !filtres.certifiantSeulement })}
        />
      </Groupe>
    </div>
  );
}
