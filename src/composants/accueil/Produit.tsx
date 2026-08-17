/**
 * 02 — La preuve par le produit, et 03 — les trois portes d'entrée.
 *
 * CES DEUX SECTIONS MONTRENT LE PRODUIT, ELLES NE LE DÉCRIVENT PAS. Tout ce
 * qu'elles affichent vient du catalogue réel : les trois fiches comparées, les
 * valeurs de chaque ligne, les compteurs des raccourcis. Une capture d'écran ou
 * un exemple inventé serait plus facile à composer et invérifiable — sur un
 * produit dont la valeur est la vérifiabilité, ce serait la pire des économies.
 *
 * AUCUNE MISE EN AVANT. Les trois fiches sont prises dans l'ordre alphabétique
 * du catalogue, sur trois organismes différents, et rien à l'écran ne suggère
 * qu'une colonne vaut mieux qu'une autre : ni couleur positive, ni coche verte,
 * ni ordre de mérite. La ligne survolée est mise en relief, c'est tout.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ParcoursListe } from "@/donnees/requetes";
import type { ChiffresGuides } from "@/modele/chiffres-guides";
import { formaterNombre } from "@/modele/nombres";
import { OrganizationMark } from "@/composants/OrganizationMark";
import { Entete, LienAction, Reveal, Section, Titre } from "./pieces";
import {
  certificationLisible,
  cpfLisible,
  dureeLisible,
  formatsLisibles,
  prixLisible,
} from "./format-donnees";

/* -------------------------------------------------------------------------- */
/* Choix des fiches montrées                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Trois fiches réelles, choisies par une règle publiable.
 *
 * L'ordre est alphabétique et les organismes sont distincts : c'est une règle
 * de LISIBILITÉ — trois colonnes du même organisme ne comparent rien — pas un
 * critère de mérite. Elle est déterministe, donc le rendu serveur et le rendu
 * client montrent les mêmes fiches.
 */
export function troisFiches(parcours: readonly ParcoursListe[]): ParcoursListe[] {
  const tries = [...parcours].sort((a, b) => a.slug.localeCompare(b.slug));
  const vus = new Set<string>();
  const retenues: ParcoursListe[] = [];
  for (const p of tries) {
    if (vus.has(p.organismeNom)) continue;
    vus.add(p.organismeNom);
    retenues.push(p);
    if (retenues.length === 3) break;
  }
  return retenues;
}

/* -------------------------------------------------------------------------- */
/* 02 — Comparez les faits                                                    */
/* -------------------------------------------------------------------------- */

type Ligne = { cle: string; libelle: string; valeur: (p: ParcoursListe) => string };

const LIGNES: Ligne[] = [
  { cle: "prix", libelle: "Prix", valeur: prixLisible },
  { cle: "duree", libelle: "Durée", valeur: dureeLisible },
  { cle: "format", libelle: "Format", valeur: formatsLisibles },
  { cle: "cpf", libelle: "CPF", valeur: cpfLisible },
  { cle: "certification", libelle: "Certification", valeur: certificationLisible },
];

export function PreuveParLeProduit({ parcours }: { parcours: readonly ParcoursListe[] }) {
  /*
    Trois colonnes exactement : la grille est écrite en dur dans la feuille de
    styles, une classe construite à la volée ne serait jamais générée.
  */
  const fiches = useMemo(() => troisFiches(parcours).slice(0, 3), [parcours]);
  const [ligneActive, setLigneActive] = useState<string | null>(null);
  if (fiches.length < 3) return null;

  return (
    <Section>
      <Reveal>
        <Entete
          index={{ numero: "02", libelle: "Le produit" }}
          titre={
            <>
              Comparez les faits.
              <br />
              Pas les promesses.
            </>
          }
          appui="Prix, durée, format, programme, financement, certification : les mêmes critères pour chaque parcours, relevés sur le site de l'organisme."
        />
      </Reveal>

      <Reveal delai={80}>
        <div className="mt-(--space-10) overflow-hidden rounded-(--carte-rayon) border border-(--border-default) bg-(--surface-raised) shadow-(--elevation-2)">
          {/* La barre d'en-tête : les trois fiches, avec leur organisme. */}
          <div
            className={`grid gap-(--space-4) border-b border-(--border-subtle) bg-(--surface-sunken) px-(--space-5) py-(--space-4) max-[767px]:grid-cols-1 min-[768px]:grid-cols-[7.5rem_repeat(3,minmax(0,1fr))]`}
          >
            <p className="t-label text-(--text-tertiary) max-[767px]:hidden">Critère</p>
            {fiches.map((p) => (
              <div key={p.id} className="flex min-w-0 items-center gap-(--space-3)">
                <OrganizationMark categorie={p.organismeCategorie} nom={p.organismeNom} />
                <span className="min-w-0">
                  <Link
                    to="/parcours/$slug"
                    params={{ slug: p.slug }}
                    className="block truncate t-body-sm font-medium text-(--text-primary) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
                  >
                    {p.nom}
                  </Link>
                  <span className="block truncate t-caption text-(--text-tertiary)">
                    {p.organismeNom}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <dl>
            {LIGNES.map((ligne) => (
              <div
                key={ligne.cle}
                onMouseEnter={() => setLigneActive(ligne.cle)}
                onMouseLeave={() => setLigneActive(null)}
                className={`grid items-baseline gap-(--space-4) border-b border-(--border-subtle) px-(--space-5) py-(--space-4) transition-colors duration-(--motion-fast) last:border-b-0 max-[767px]:grid-cols-2 min-[768px]:grid-cols-[7.5rem_repeat(3,minmax(0,1fr))] ${
                  ligneActive === ligne.cle ? "bg-(--surface-hover)" : ""
                }`}
              >
                <dt className="t-body-sm text-(--text-secondary) max-[767px]:col-span-2 max-[767px]:t-label">
                  {ligne.libelle}
                </dt>
                {fiches.map((p) => (
                  <dd key={p.id} className="t-data text-(--text-primary)">
                    {ligne.valeur(p)}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      <div className="mt-(--space-5) flex flex-wrap items-center justify-between gap-(--space-4)">
        <p className="t-caption text-(--text-tertiary)">
          Trois fiches du catalogue, prises dans l&apos;ordre alphabétique, sur trois organismes
          différents. Aucune n&apos;est mise en avant.
        </p>
        <LienAction to="/comparer">Ouvrir le comparateur</LienAction>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 03 — Les trois portes d'entrée                                             */
/* -------------------------------------------------------------------------- */

/** Le cadre d'un aperçu produit : même matière que les cartes du catalogue. */
function Apercu({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-(--carte-rayon) border border-(--border-default) bg-(--surface-raised) p-(--space-5) shadow-(--elevation-2)">
      {children}
    </div>
  );
}

function Porte({
  numero,
  titre,
  description,
  apercu,
  action,
  inverse = false,
}: {
  numero: string;
  titre: string;
  description: string;
  apercu: React.ReactNode;
  action: React.ReactNode;
  /** Aperçu à gauche, texte à droite. Alterné d'une porte à l'autre. */
  inverse?: boolean;
}) {
  return (
    <Reveal className="border-t border-(--border-default) py-(--space-10) first:border-t-0">
      {/*
        `min-w-0` SUR LES DEUX ÉLÉMENTS, ET PAS SEULEMENT DANS LE GABARIT.
        Un élément de grille vaut `min-width: auto` : il refuse de descendre
        sous la largeur mini de son contenu. Le `minmax(0, …)` ci-dessous ne
        désamorce le piège qu'au-delà de 900 px ; en dessous, la grille passe
        à une colonne et l'aperçu imposait 332 px là où 272 étaient offerts.
        Mesuré à 320 px : le document défilait sur 356 px.
      */}
      <div className="grid items-center gap-(--space-8) min-[900px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] min-[900px]:gap-(--space-16)">
        <div className={`min-w-0 ${inverse ? "min-[900px]:order-2" : ""}`}>
          <p className="t-data-sm text-(--text-tertiary)">{numero}</p>
          <h3 className="mt-(--space-2) text-balance t-heading-1 text-(--text-primary) max-[767px]:t-heading-2">
            {titre}
          </h3>
          <p className="mt-(--space-3) max-w-[46ch] t-body text-(--text-secondary)">
            {description}
          </p>
          <div className="mt-(--space-5)">{action}</div>
        </div>
        <div className={`min-w-0 ${inverse ? "min-[900px]:order-1" : ""}`}>{apercu}</div>
      </div>
    </Reveal>
  );
}

/** Une pastille de filtre réelle : elle mène au catalogue déjà filtré. */
function Filtre({
  libelle,
  nombre,
  search,
}: {
  libelle: string;
  nombre: number;
  search: Record<string, string>;
}) {
  return (
    <Link
      to="/catalogue"
      search={search}
      className="inline-flex items-center gap-(--space-2) rounded-(--radius-full) border border-(--border-default) bg-(--surface-raised) px-(--space-3) py-(--space-1) t-body-sm text-(--text-secondary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
    >
      {libelle}
      <span className="chiffre text-(--text-tertiary)">{formaterNombre(nombre)}</span>
    </Link>
  );
}

export function TroisPortes({
  parcours,
  chiffres,
}: {
  parcours: readonly ParcoursListe[];
  chiffres: ChiffresGuides;
}) {
  const fiches = useMemo(() => troisFiches(parcours), [parcours]);

  return (
    <Section fond="creuse">
      <Reveal>
        <Entete
          index={{ numero: "03", libelle: "Trois façons d'entrer" }}
          titre="Commencez comme vous voulez."
          appui="Trois expériences distinctes, selon ce que vous savez déjà de ce que vous cherchez."
        />
      </Reveal>

      <div className="mt-(--space-10)">
        <Porte
          numero="A"
          titre="Je sais ce que je cherche"
          description="Parcourez le catalogue, recherchez un sujet et filtrez selon vos critères."
          action={<LienAction to="/catalogue">Explorer le catalogue</LienAction>}
          apercu={
            <Apercu>
              {/* Une barre de recherche figurative, annoncée comme telle : le
                  vrai champ est en haut de page, le dupliquer ici créerait deux
                  champs concurrents sur la même valeur. */}
              <Link
                to="/catalogue"
                className="flex h-(--bouton-hauteur-tactile) items-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-page) px-(--space-4) t-body-sm text-(--text-tertiary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                Rechercher une formation, un organisme, un code RNCP…
              </Link>
              <div className="mt-(--space-4) flex flex-wrap gap-(--space-2)">
                <Filtre
                  libelle="À distance"
                  nombre={chiffres.distanciel}
                  search={{ format: "distanciel" }}
                />
                <Filtre libelle="Éligible CPF" nombre={chiffres.eligiblesCpf} search={{ cpf: "1" }} />
                <Filtre
                  libelle="Certifiant"
                  nombre={chiffres.certifiants}
                  search={{ certifiant: "1" }}
                />
              </div>
              <ul className="mt-(--space-5) flex flex-col divide-y divide-(--border-subtle) border-t border-(--border-subtle)">
                {fiches.slice(0, 2).map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/parcours/$slug"
                      params={{ slug: p.slug }}
                      className="flex items-center justify-between gap-(--space-4) py-(--space-3) transition-colors duration-(--motion-fast) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
                    >
                      <span className="min-w-0">
                        <span className="block truncate t-body-sm text-(--text-primary)">
                          {p.nom}
                        </span>
                        <span className="block truncate t-caption text-(--text-tertiary)">
                          {p.organismeNom}
                        </span>
                      </span>
                      <span className="shrink-0 t-data text-(--text-primary)">{prixLisible(p)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Apercu>
          }
        />

        <Porte
          numero="B"
          inverse
          titre="J'hésite entre plusieurs formations"
          description="Placez plusieurs parcours côte à côte et comparez uniquement les critères qui comptent."
          action={<LienAction to="/comparer">Comparer des formations</LienAction>}
          apercu={
            <Apercu>
              <div className="grid grid-cols-[6rem_1fr_1fr] gap-(--space-3) border-b border-(--border-subtle) pb-(--space-3)">
                <span className="t-label text-(--text-tertiary)">Critère</span>
                {fiches.slice(0, 2).map((p) => (
                  <span key={p.id} className="truncate t-caption font-medium text-(--text-primary)">
                    {p.organismeNom}
                  </span>
                ))}
              </div>
              {LIGNES.slice(0, 3).map((ligne) => (
                <div
                  key={ligne.cle}
                  className="grid grid-cols-[6rem_1fr_1fr] gap-(--space-3) border-b border-(--border-subtle) py-(--space-3) last:border-b-0"
                >
                  <span className="t-body-sm text-(--text-secondary)">{ligne.libelle}</span>
                  {fiches.slice(0, 2).map((p) => (
                    <span key={p.id} className="truncate t-data text-(--text-primary)">
                      {ligne.valeur(p)}
                    </span>
                  ))}
                </div>
              ))}
            </Apercu>
          }
        />

        <Porte
          numero="C"
          titre="Je ne sais pas encore quoi choisir"
          description="Décrivez votre situation. Formlist fait ressortir les parcours qui correspondent à vos critères, et les écarts à connaître."
          action={<LienAction to="/aide-au-choix">Démarrer l&apos;aide au choix</LienAction>}
          apercu={
            <Apercu>
              <p className="t-label text-(--text-tertiary)">Ce qui est pris en compte</p>
              <ul className="mt-(--space-4) flex flex-col gap-(--space-3)">
                {[
                  ["Budget", "Ce que vous pouvez engager"],
                  ["Disponibilité", "Le temps dont vous disposez"],
                  ["Format", "À distance, en présentiel, en alternance"],
                  ["Niveau", "Ce que le parcours exige à l'entrée"],
                  ["Objectif", "Le sujet que vous voulez travailler"],
                ].map(([critere, detail]) => (
                  <li
                    key={critere}
                    className="grid grid-cols-[8rem_1fr] items-baseline gap-(--space-3) border-b border-(--border-subtle) pb-(--space-3) last:border-b-0 last:pb-0 max-[479px]:grid-cols-1"
                  >
                    <span className="t-body-sm font-medium text-(--text-primary)">{critere}</span>
                    <span className="t-body-sm text-(--text-secondary)">{detail}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-(--space-4) t-caption text-(--text-tertiary)">
                Aucun score de compatibilité : des correspondances et des écarts, énoncés tels
                quels.
              </p>
            </Apercu>
          }
        />
      </div>
    </Section>
  );
}
