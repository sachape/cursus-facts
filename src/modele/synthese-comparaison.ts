/**
 * Synthèse d'une comparaison — des écarts constatés, jamais un gagnant.
 *
 * LA CONTRAINTE DE FOND. Ce bloc résume où les parcours divergent. Il ne dit
 * pas « le moins cher », ne met aucune colonne en avant, ne produit aucun score
 * ni aucun pourcentage de correspondance. C'est la règle de l'aide au choix
 * appliquée au tableau : nous rapprochons et nous constatons.
 *
 * Aucun NOM DE PARCOURS n'apparaît dans un énoncé d'écart. Nommer, à cet
 * endroit, c'est désigner — « LiveMentor est le moins cher » est un classement
 * déguisé en fait. « De 0 € à 1 980 € » dit la même chose sans trancher.
 *
 * AUCUNE PHRASE RÉDIGÉE AUTOMATIQUEMENT. « Ces parcours se distinguent
 * principalement par… » serait une interprétation, et nous n'en produisons pas.
 * Tout ce qui suit est un gabarit rempli par des chiffres.
 *
 * LA DISTINCTION QUI MANQUAIT LE PLUS. Une ligne peut différer pour deux
 * raisons opposées : les parcours divergent réellement, ou l'un d'eux ne publie
 * pas l'information. Le tableau affichait « Non communiqué » sans jamais dire
 * combien de fois. Confondre les deux fait passer un trou de collecte pour une
 * différence d'offre.
 */
import type { ParcoursFiche } from "@/donnees/requetes";
import { CHAMPS_INFORMATION, type ChampInformation, type EtatInformation } from "@/types/cursus";
import { LIBELLES_CHAMPS_INFORMATION } from "@/types/cursus";

/** Un écart, énoncé sans désigner personne. */
export type Ecart = { attribut: string; enonce: string };

export type Synthese = {
  /** Attributs suivis, tous parcours confondus. */
  total: number;
  /** Attributs où les valeurs PRÉSENTES divergent réellement. */
  divergences: number;
  /** Attributs qu'au moins un parcours ne renseigne pas. */
  incomparables: number;
  /** Trois à cinq écarts sur les attributs qui pèsent. */
  decisifs: Ecart[];
};

/** Un état qui porte une valeur exploitable pour comparer. */
function present(etat: EtatInformation | undefined): boolean {
  return etat === "renseigne" || etat === "a_confirmer" || etat === "derive";
}

const LIBELLES_NIVEAUX: Record<string, string> = {
  aucun_prerequis: "sans prérequis",
  bac2: "un bac+2",
  bac3: "un bac+3",
  experience: "une expérience du secteur",
};

const EN_TOUTES_LETTRES = ["aucun", "un", "deux", "trois", "quatre"] as const;

/** « deux » plutôt que « 2 » : on énonce, on ne chiffre pas un classement. */
function combien(n: number): string {
  return EN_TOUTES_LETTRES[n] ?? String(n);
}

function euros(v: number): string {
  return `${v.toLocaleString("fr-FR").replace(/ | /g, " ")} €`;
}

/** Combien de parcours ne publient pas ce champ. */
function manquants(parcours: readonly ParcoursFiche[], champ: ChampInformation): number {
  return parcours.filter((p) => !present(p.etats[champ])).length;
}

/** « un parcours ne le publie pas », ou rien s'ils le publient tous. */
function mentionManquants(n: number): string {
  if (n === 0) return "";
  return `, ${combien(n)} parcours ne ${n > 1 ? "le publient" : "le publie"} pas`;
}

function ecartPrix(parcours: readonly ParcoursFiche[]): Ecart | null {
  const valeurs = parcours.filter((p) => present(p.etats["prix"]) && p.prixMin !== null);
  if (valeurs.length < 2) return null;
  const montants = valeurs.map((p) => p.prixMin!);
  const bas = Math.min(...montants);
  const haut = Math.max(...montants);
  if (bas === haut) return null;
  return {
    attribut: "Coût pour l'apprenant",
    enonce: `de ${euros(bas)} à ${euros(haut)}, écart de ${euros(haut - bas)}${mentionManquants(manquants(parcours, "prix"))}`,
  };
}

function ecartVolume(parcours: readonly ParcoursFiche[]): Ecart | null {
  const valeurs = parcours.filter(
    (p) => present(p.etats["volume_horaire"]) && p.volumeHoraire !== null,
  );
  if (valeurs.length < 2) return null;
  const heures = valeurs.map((p) => p.volumeHoraire!);
  const bas = Math.min(...heures);
  const haut = Math.max(...heures);
  if (bas === haut) return null;
  return {
    attribut: "Volume horaire",
    enonce: `de ${bas} h à ${haut} h${mentionManquants(manquants(parcours, "volume_horaire"))}`,
  };
}

function ecartDuree(parcours: readonly ParcoursFiche[]): Ecart | null {
  const valeurs = [
    ...new Set(
      parcours.filter((p) => present(p.etats["duree"]) && p.duree !== null).map((p) => p.duree!),
    ),
  ];
  if (valeurs.length < 2) return null;
  return {
    attribut: "Durée",
    enonce: `${combien(valeurs.length)} durées différentes — ${valeurs.join(", ")}${mentionManquants(manquants(parcours, "duree"))}`,
  };
}

function ecartNiveau(parcours: readonly ParcoursFiche[]): Ecart | null {
  const valeurs = parcours
    .filter((p) => present(p.etats["niveau_entree"]) && p.niveauEntree !== null)
    .map((p) => p.niveauEntree!);
  if (new Set(valeurs).size < 2) return null;
  const groupes = new Map<string, number>();
  for (const v of valeurs) groupes.set(v, (groupes.get(v) ?? 0) + 1);
  const enonce = [...groupes.entries()]
    .map(([niveau, n]) => `${combien(n)} ${n > 1 ? "exigent" : "exige"} ${LIBELLES_NIVEAUX[niveau] ?? niveau}`)
    .join(", ");
  return {
    attribut: "Niveau d'entrée",
    enonce: enonce + mentionManquants(manquants(parcours, "niveau_entree")),
  };
}

function ecartCertification(parcours: readonly ParcoursFiche[]): Ecart | null {
  const avec = parcours.filter((p) => p.codeRncpRs !== null).length;
  const sans = parcours.length - avec;
  if (avec === 0 || sans === 0) return null;
  return {
    attribut: "Certification",
    enonce: `${combien(avec)} ${avec > 1 ? "portent" : "porte"} une certification enregistrée, ${combien(sans)} ${sans > 1 ? "n'en portent" : "n'en porte"} pas`,
  };
}

/**
 * Calcule la synthèse. Déterministe, sans aucun appel de langage.
 *
 * Les états font foi, jamais les valeurs affichées : c'est `etats` qui distingue
 * « l'organisme ne publie pas » de « nous n'avons pas lu la page », et cette
 * distinction est toute la valeur du bloc.
 */
export function synthetiser(parcours: readonly ParcoursFiche[]): Synthese {
  const champs = CHAMPS_INFORMATION as readonly ChampInformation[];

  let divergences = 0;
  let incomparables = 0;
  for (const champ of champs) {
    const complet = parcours.every((p) => present(p.etats[champ]));
    if (!complet) {
      incomparables += 1;
      continue;
    }
    // Tous renseignés : reste à savoir si les valeurs diffèrent.
    const brutes = parcours.map((p) => JSON.stringify(valeurBrute(p, champ)));
    if (new Set(brutes).size > 1) divergences += 1;
  }

  const decisifs = [
    ecartPrix(parcours),
    ecartDuree(parcours),
    ecartVolume(parcours),
    ecartNiveau(parcours),
    ecartCertification(parcours),
  ].filter((e): e is Ecart => e !== null);

  return {
    total: champs.length,
    divergences,
    incomparables,
    // Cinq au plus : au-delà, ce n'est plus une synthèse, c'est le tableau.
    decisifs: decisifs.slice(0, 5),
  };
}

/** La valeur d'un champ, sous une forme comparable. */
function valeurBrute(p: ParcoursFiche, champ: ChampInformation): unknown {
  switch (champ) {
    case "prix":
      return [p.prixMin, p.prixMax];
    case "duree":
      return p.duree;
    case "volume_horaire":
      return p.volumeHoraire;
    case "format":
      return [...p.formats].sort();
    case "lieu":
      return p.lieu;
    case "niveau_entree":
      return p.niveauEntree;
    case "eligible_cpf":
      return p.eligibleCpf;
    case "certification":
      return p.certification;
    default:
      // Un champ sans accesseur dédié ne peut pas être déclaré divergent :
      // l'ignorer est plus honnête que de le compter au hasard.
      return null;
  }
}

/** Le libellé public d'un champ, pour la mention d'incomparabilité. */
export function libelleChamp(champ: ChampInformation): string {
  return LIBELLES_CHAMPS_INFORMATION[champ] ?? champ;
}
