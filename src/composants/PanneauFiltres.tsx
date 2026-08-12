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
import { useEffect, useState } from "react";
import type { ParcoursListe } from "@/donnees/requetes";
import {
  BUDGET_PLAFOND,
  compterAvec,
  compterPrixInconnu,
  FILTRES_VIDES,
  libelleBudget,
  LIBELLES_DUREES,
  normaliserBudget,
  plageBudgetActive,
  TRANCHES_BUDGET,
  TRANCHES_DUREE,
  type Filtres,
  type TrancheDuree,
} from "@/modele/filtres";
import { LIBELLES_CATEGORIES } from "@/modele/vocabulaires";
import type { CategorieOrganisme, FormatParcours, NiveauEntree } from "@/types/cursus";
import { FILTRES_CONDITION, LIBELLES_FILTRES_CONDITION } from "@/modele/condition-cout";
import { IconeCategorie } from "./OrganizationMark";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Props = {
  parcours: readonly ParcoursListe[];
  filtres: Filtres;
  modifier: (patch: Partial<Filtres>) => void;
};

/**
 * Délai avant application d'une saisie de budget.
 *
 * Appliquer à chaque caractère fait filtrer sur « 5 », puis « 50 », puis
 * « 500 » : deux listes fausses pour une juste, et un catalogue qui clignote
 * pendant qu'on tape. La sortie du champ applique immédiatement — quelqu'un qui
 * a fini de saisir n'a pas à attendre.
 */
const DELAI_SAISIE = 400;

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
    <span className="chiffre shrink-0 rounded-(--radius-sm) bg-muted px-1.5 py-0.5 t-data-sm text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * FilterAccordion — un groupe de filtres repliable.
 *
 * Il porte un **résumé des sélections** plutôt qu'un simple compteur : replié,
 * « Sujet · Amazon FBA, Shopify » dit ce qui est filtré, là où « 2 » oblige à
 * déplier pour le savoir. Le compteur seul transforme chaque vérification en
 * ouverture d'accordéon.
 */
function Groupe({
  titre,
  description,
  actifs,
  resume,
  children,
}: {
  titre: string;
  description?: string;
  /** Nombre de sélections actives dans ce groupe. */
  actifs: number;
  /** Ce qui est sélectionné, en clair. Affiché quand le groupe est replié. */
  resume?: string;
  children: React.ReactNode;
}) {
  // `null` tant que l'utilisateur n'a rien décidé : le groupe suit alors la
  // présence d'un filtre actif.
  const [choixManuel, setChoixManuel] = useState<boolean | null>(null);
  const ouvert = choixManuel ?? actifs > 0;

  return (
    <section className="border-t border-(--border-subtle) first:border-t-0">
      <h2>
        <button
          type="button"
          onClick={() => setChoixManuel(!ouvert)}
          aria-expanded={ouvert}
          className="flex w-full items-start justify-between gap-(--space-3) py-(--space-3) text-left transition-colors duration-(--motion-fast) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          <span className="min-w-0 flex-1">
            <span className="block t-label text-(--text-tertiary)">{titre}</span>
            {/* Le résumé ne s'affiche que replié : déplié, la liste le dit
                déjà, et le répéter doublerait l'information. */}
            {!ouvert && resume !== undefined && resume !== "" && (
              <span className="mt-(--space-1) block truncate t-body-sm text-(--text-primary)">
                {resume}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-(--space-2) pt-(--space-1)">
            {/* Le compteur survit au repli : un filtre actif ne doit jamais
                disparaître de la vue. */}
            {actifs > 0 && (
              <span className="rounded-(--radius-sm) bg-(--accent-surface) px-(--space-2) py-(--space-1) t-data-sm text-(--accent-default)">
                {actifs}
              </span>
            )}
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              aria-hidden
              className={`text-(--text-tertiary) transition-transform duration-(--motion-base) ease-(--ease-standard) ${
                ouvert ? "rotate-180" : ""
              }`}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </span>
        </button>
      </h2>

      {ouvert && (
        <div className="pb-(--space-5) motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-(--motion-base)">
          {description !== undefined && (
            <p className="mb-(--space-3) t-caption text-(--text-secondary)">{description}</p>
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
  icone,
}: {
  id: string;
  libelle: string;
  coche: boolean;
  nombre: number;
  basculer: () => void;
  /** Même icône que la marque d'organisme : la correspondance est le propos. */
  icone?: React.ReactNode;
}) {
  const inactive = nombre === 0 && !coche;
  return (
    /*
     * Toute la ligne est cliquable, pas seulement la case : 40 px sur mobile,
     * où le pointage est moins précis, 32 px sur bureau.
     */
    <label
      htmlFor={id}
      className={`flex min-h-(--cible-hauteur-min-tactile) cursor-pointer items-center gap-(--space-3) rounded-(--radius-sm) px-(--space-2) transition-colors duration-(--motion-fast) sm:min-h-(--cible-hauteur-min) ${
        inactive
          ? "cursor-not-allowed text-(--text-disabled)"
          : coche
            ? "bg-(--accent-surface) text-(--text-primary)"
            : "text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
      }`}
    >
      <Checkbox id={id} checked={coche} onCheckedChange={basculer} disabled={inactive} />
      {icone !== undefined && (
        <span className="shrink-0 text-(--text-tertiary)">{icone}</span>
      )}
      <span className="flex-1 t-body-sm">{libelle}</span>
      <span className="t-data-sm text-(--text-tertiary)">{nombre}</span>
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

/* -------------------------------------------------------------------------- */
/* Budget — deux champs, quatre tranches, et le sort des prix inconnus        */
/* -------------------------------------------------------------------------- */

function texte(valeur: number | null): string {
  return valeur === null ? "" : String(valeur);
}

function nombre(saisie: string): number | null {
  const nettoye = saisie.trim();
  if (nettoye === "") return null;
  const valeur = Number(nettoye);
  return Number.isFinite(valeur) ? valeur : null;
}

/**
 * Un champ de montant, avec son unité posée dedans.
 *
 * SAISIE RESTREINTE AUX CHIFFRES plutôt qu'un `type="number"` : à 96 px, les
 * flèches natives se disputent la place avec le suffixe « € », et le signe
 * moins n'a aucune raison d'être saisissable dans un budget.
 */
function ChampEuro({
  id,
  etiquette,
  invite,
  valeur,
  changer,
  appliquer,
}: {
  id: string;
  etiquette: string;
  invite: string;
  valeur: string;
  changer: (v: string) => void;
  appliquer: () => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={etiquette}
        placeholder={invite}
        value={valeur}
        maxLength={String(BUDGET_PLAFOND).length}
        onChange={(evenement) => changer(evenement.target.value.replace(/\D/g, ""))}
        onBlur={appliquer}
        className="chiffre w-24 pr-(--space-6)"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-(--space-2) flex items-center t-body-sm text-(--text-tertiary)"
      >
        €
      </span>
    </div>
  );
}

/**
 * La plage de budget.
 *
 * DEUX CHAMPS ET NON UN CURSEUR À DEUX POIGNÉES. Un curseur ne se vise pas au
 * doigt, se règle mal au clavier, et n'atteint jamais une valeur ronde : il
 * demande de la précision à l'entrée et n'en rend aucune. Deux champs sont
 * exacts, dictables, et lisibles une fois remplis.
 *
 * LES DEUX SONT FACULTATIFS. « à » seul redonne le plafond d'avant, « de » seul
 * donne un plancher que le curseur ne savait pas exprimer.
 */
function PlageBudget({ parcours, filtres, modifier }: Props) {
  const [bas, setBas] = useState(() => texte(filtres.budgetMin));
  const [haut, setHaut] = useState(() => texte(filtres.budgetMax));

  const appliquer = () => {
    const { budgetMin, budgetMax } = normaliserBudget(nombre(bas), nombre(haut));
    /*
      Les champs reçoivent la valeur NORMALISÉE, pas celle qui a été tapée.
      C'est ainsi que l'interversion se voit : « de 2 500 à 500 » devient « de
      500 à 2 500 » sous les yeux, sans message d'erreur à lire ni saisie à
      reprendre. Une valeur refusée s'efface, ce qui est plus clair qu'un
      libellé rouge sous un champ.
    */
    setBas(texte(budgetMin));
    setHaut(texte(budgetMax));
    if (budgetMin !== filtres.budgetMin || budgetMax !== filtres.budgetMax) {
      modifier({ budgetMin, budgetMax });
    }
  };

  // Application différée. La dépendance est la saisie, jamais le rendu : le
  // minuteur repart à chaque frappe et n'aboutit qu'une fois la frappe finie.
  useEffect(() => {
    const minuterie = setTimeout(appliquer, DELAI_SAISIE);
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bas, haut]);

  /*
    Les tranches rapides et « Réinitialiser » écrivent la plage sans passer par
    les champs. Sans cette reprise, cliquer « 500 à 2 500 € » filtrerait juste
    en laissant les champs vides — l'interface contredirait son propre état.

    Conditionnée à un écart réel, pour ne jamais réécrire une saisie en cours.
  */
  useEffect(() => {
    const pose = normaliserBudget(nombre(bas), nombre(haut));
    if (pose.budgetMin !== filtres.budgetMin) setBas(texte(filtres.budgetMin));
    if (pose.budgetMax !== filtres.budgetMax) setHaut(texte(filtres.budgetMax));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtres.budgetMin, filtres.budgetMax]);

  const inconnus = compterPrixInconnu(parcours, {
    ...filtres,
    // Compté sur une plage forcément posée : hors plage, aucun prix inconnu
    // n'est écarté, et le nombre affiché à côté de la case serait zéro alors
    // que la case, elle, garde tout son sens.
    ...(plageBudgetActive(filtres) ? {} : { budgetMax: BUDGET_PLAFOND }),
  });

  return (
    <>
      {/*
        LES TRANCHES D'ABORD, LES CHAMPS ENSUITE. Presque personne ne connaît
        son budget au centime ; presque tout le monde sait s'il cherche à moins
        de 500 € ou au-delà de 2 500 €. Les champs servent le cas précis, pas
        le cas courant — les placer en premier ferait payer à tous le coût
        d'une saisie que peu ont besoin de faire.
      */}
      <div className="flex flex-wrap gap-(--space-2)">
        {TRANCHES_BUDGET.map((tranche) => {
          /*
            Compté prix inconnus EXCLUS, quelle que soit la case : sinon les
            quatre tranches afficheraient à peu près le même nombre — celui des
            fiches sans prix, qui appartiennent à toutes — et un décompte qui ne
            discrimine pas n'aide à choisir aucune tranche.
          */
          const combien = compterAvec(parcours, filtres, {
            budgetMin: tranche.min,
            budgetMax: tranche.max,
            inclurePrixInconnu: false,
          });
          const posee =
            filtres.budgetMin === tranche.min && filtres.budgetMax === tranche.max;
          return (
            <button
              key={tranche.cle}
              type="button"
              aria-pressed={posee}
              disabled={combien === 0 && !posee}
              onClick={() =>
                modifier(
                  posee
                    ? { budgetMin: null, budgetMax: null }
                    : { budgetMin: tranche.min, budgetMax: tranche.max },
                )
              }
              className={`inline-flex items-center gap-(--space-2) rounded-(--radius-full) border px-(--space-3) py-(--space-1) t-body-sm transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) ${
                posee
                  ? "border-(--accent-border) bg-(--accent-surface) text-(--accent-default)"
                  : combien === 0
                    ? "cursor-not-allowed border-(--border-subtle) text-(--text-disabled)"
                    : "border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
              }`}
            >
              {tranche.libelle}
              <Badge>{combien}</Badge>
            </button>
          );
        })}
      </div>

      <div className="mt-(--space-4) flex items-center gap-(--space-2)">
        <ChampEuro
          id="budget-min"
          etiquette="Budget minimum, en euros"
          invite="De"
          valeur={bas}
          changer={setBas}
          appliquer={appliquer}
        />
        <span aria-hidden="true" className="t-body-sm text-(--text-tertiary)">
          –
        </span>
        <ChampEuro
          id="budget-max"
          etiquette="Budget maximum, en euros"
          invite="à"
          valeur={haut}
          changer={setHaut}
          appliquer={appliquer}
        />
      </div>

      {/*
        LA CASE QUI DÉCIDE DE TOUT. Une plage de prix écarte mécaniquement tout
        ce dont le prix n'est pas établi — la majorité du catalogue. Cochée par
        défaut, elle rend ce sort visible et réversible ; sans elle, le compteur
        s'effondre et rien ne dit pourquoi.

        Elle n'est pas un `Option` : celui-ci se désactive à zéro résultat, et
        une case décochée dont le décompte tombe à zéro deviendrait
        impossible à recocher.
      */}
      <label
        htmlFor="f-prix-inconnu"
        className="mt-(--space-4) flex min-h-(--cible-hauteur-min-tactile) cursor-pointer items-center gap-(--space-3) rounded-(--radius-sm) px-(--space-2) text-(--text-secondary) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) hover:text-(--text-primary) sm:min-h-(--cible-hauteur-min)"
      >
        <Checkbox
          id="f-prix-inconnu"
          checked={filtres.inclurePrixInconnu}
          onCheckedChange={() => modifier({ inclurePrixInconnu: !filtres.inclurePrixInconnu })}
        />
        <span className="flex-1 t-body-sm">Inclure les parcours dont le prix n&apos;est pas connu</span>
        <span className="t-data-sm text-(--text-tertiary)">{inconnus}</span>
      </label>
    </>
  );
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

  /* Nombre total de sélections, tous groupes confondus. */
  const totalActifs =
    filtres.sujets.length +
    filtres.competences.length +
    filtres.categories.length +
    filtres.formats.length +
    filtres.niveaux.length +
    filtres.durees.length +
    filtres.conditionsAcces.length +
    financementsActifs +
    Number(filtres.certifiantSeulement) +
    Number(filtres.accessibleIndividuellement) +
    Number(plageBudgetActive(filtres)) +
    Number(filtres.recherche.trim() !== "");

  return (
    <div className="rounded-(--carte-rayon) border border-(--border-subtle) bg-(--surface-raised) px-(--space-4) py-(--space-2)">
      {/*
        En-tête du panneau : compteur global et réinitialisation. Sans lui, le
        seul moyen de savoir combien de filtres sont posés est de déplier chaque
        groupe — et le seul moyen de tout retirer est de les décocher un par un.
      */}
      <div className="flex items-center justify-between gap-(--space-3) border-b border-(--border-subtle) py-(--space-3)">
        <p className="t-body-sm font-medium text-(--text-primary)">
          Filtres
          {totalActifs > 0 && (
            <span className="ml-(--space-2) rounded-(--radius-sm) bg-(--accent-surface) px-(--space-2) py-(--space-1) t-data-sm text-(--accent-default)">
              {totalActifs}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => modifier(FILTRES_VIDES)}
          disabled={totalActifs === 0}
          className="rounded-(--radius-sm) px-(--space-2) py-(--space-1) t-body-sm text-(--text-secondary) transition-colors duration-(--motion-fast) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:text-(--text-disabled) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          Réinitialiser
        </button>
      </div>

      <Groupe
        titre="Sujet principal"
        description="Les parcours dont c'est réellement l'objet."
        actifs={filtres.sujets.length}
        resume={filtres.sujets.join(", ")}
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
        resume={filtres.competences.join(", ")}
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

      <Groupe
        titre="Catégorie"
        actifs={filtres.categories.length}
        resume={filtres.categories.map((c) => LIBELLES_CATEGORIES[c]).join(", ")}
      >
        <div className="space-y-2">
          {categories.map((categorie) => (
            <Option
              key={categorie}
              id={`cat-${categorie}`}
              libelle={LIBELLES_CATEGORIES[categorie]}
              icone={<IconeCategorie categorie={categorie} />}
              coche={filtres.categories.includes(categorie)}
              nombre={compterAvec(parcours, filtres, { categories: [categorie] })}
              basculer={() => modifier({ categories: basculer(filtres.categories, categorie) })}
            />
          ))}
        </div>
      </Groupe>

      <Groupe
        titre="Budget"
        description="Le prix retenu est celui que vous déboursez, pas le coût du parcours. Un parcours facturé au groupe n'a pas de tarif individuel : son prix compte comme non connu, jamais comme élevé."
        actifs={plageBudgetActive(filtres) ? 1 : 0}
        resume={libelleBudget(filtres.budgetMin, filtres.budgetMax) ?? ""}
      >
        <PlageBudget parcours={parcours} filtres={filtres} modifier={modifier} />
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

      <Groupe
        titre="Condition d'accès"
        actifs={filtres.conditionsAcces.length}
        resume={filtres.conditionsAcces.map((c) => LIBELLES_FILTRES_CONDITION[c]).join(", ")}
      >
        <div className="space-y-2">
          {FILTRES_CONDITION.map((condition) => (
            <Option
              key={condition}
              id={`cond-${condition}`}
              libelle={LIBELLES_FILTRES_CONDITION[condition]}
              coche={filtres.conditionsAcces.includes(condition)}
              nombre={compterAvec(parcours, filtres, { conditionsAcces: [condition] })}
              basculer={() =>
                modifier({ conditionsAcces: basculer(filtres.conditionsAcces, condition) })
              }
            />
          ))}
        </div>
      </Groupe>

      <Groupe
        titre="Format"
        actifs={filtres.formats.length}
        resume={filtres.formats.map((f) => LIBELLES_FORMATS[f]).join(", ")}
      >
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

      <Groupe
        titre="Niveau d'entrée"
        actifs={filtres.niveaux.length}
        resume={filtres.niveaux.map((n) => LIBELLES_NIVEAUX[n]).join(", ")}
      >
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
