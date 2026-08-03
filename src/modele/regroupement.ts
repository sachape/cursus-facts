/**
 * Regroupement des offres en parcours — hiérarchie de preuves.
 *
 * Une fiche = un parcours pédagogique distinct. Pas une session, pas un
 * organisme, pas une déclinaison marketing.
 *
 * LE POINT LE PLUS IMPORTANT DE CE FICHIER.
 * Le tronc pédagogique à 80 % est un VETO, pas une précondition.
 *
 * La formulation naïve serait « je fusionne si je peux prouver que les
 * programmes sont similaires ». Elle produit une incitation inversée :
 * organisme transparent, programme publié, fusion ; organisme opaque, programme
 * absent, quinze fiches. Le manque d'information devient rentable.
 *
 * La règle retenue est l'inverse : on regroupe par défaut, on ne refuse qu'avec
 * la preuve d'une divergence réelle. L'absence de données ne peut jamais faire
 * gagner de place dans les résultats.
 *
 * Toute inversion de cette asymétrie est une régression produit, pas un détail
 * d'implémentation.
 */

/** Seuil de proximité des intitulés, après retrait du suffixe de formule. */
export const SEUIL_PROXIMITE_INTITULE = 0.7;

/** Seuil du tronc pédagogique commun, en deçà duquel la fusion est refusée. */
export const SEUIL_TRONC_COMMUN = 0.8;

/**
 * Suffixes de formule commerciale, retirés avant comparaison des intitulés.
 * « Amazon Incubator — Premium » et « Amazon Incubator — Elite » partagent le
 * même socle : « Amazon Incubator ».
 */
export const SUFFIXE_FORMULE =
  /\s*[—-]?\s*(formule\s+)?(builder|premium\s*\+\s*coaching|premium|elite|starter|débutant|intermédiaire|avancé|essentiel|pro|expert|part[- ]time|niveau\s*\d)\s*$/i;

/** Ce que le regroupement a besoin de connaître d'une offre. */
export type OffreRegroupable = {
  nom: string;
  organisme: string;
  /** Le public visé. Deux publics différents ne fusionnent jamais. */
  niveauEntree: string | null;
  sujetPrincipal: string;
  /** Titres des modules publiés. Vide ou absent = programme non publié. */
  modules?: readonly string[];
};

/** Les trois issues possibles. Jamais une règle binaire. */
export type IssueRegroupement =
  /** Une seule offre : rien à regrouper. */
  | "unique"
  /** Quatre conditions réunies, aucune preuve de divergence. */
  | "fusion"
  /** Programmes publiés partageant moins de 80 % de leurs modules. */
  | "refus"
  /** Preuves insuffisantes : part en file d'arbitrage, replié dans la liste. */
  | "ambigu";

export type GroupeRegroupe<T> = {
  /** Intitulé commun, suffixe de formule retiré. */
  socle: string;
  issue: IssueRegroupement;
  /**
   * En cas de refus, chaque offre forme sa propre fiche : le groupe est alors
   * éclaté en autant d'entrées à une offre.
   */
  offres: T[];
  /** Renseigné pour les groupes ambigus : rattache à la file d'arbitrage. */
  arbitrageId?: number;
};

export type Arbitrage = {
  id: number;
  organisme: string;
  socle: string;
  sujetPrincipal: string;
  offres: number;
  programmesPublies: number;
  /** La règle restée muette, telle qu'affichée publiquement. */
  motif: string;
};

/* -------------------------------------------------------------------------- */
/* Comparaison des intitulés                                                  */
/* -------------------------------------------------------------------------- */

/** Retire le suffixe de formule commerciale d'un intitulé. */
export function socle(nom: string): string {
  return nom.replace(SUFFIXE_FORMULE, "").trim();
}

/** Mots significatifs d'un intitulé : plus de deux caractères, accents conservés. */
export function motsSignificatifs(nom: string): Set<string> {
  return new Set(
    socle(nom)
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9 ]/g, " ")
      .split(/\s+/)
      .filter((mot) => mot.length > 2),
  );
}

/**
 * Deux intitulés sont très proches s'ils partagent au moins 70 % de leurs mots
 * significatifs, rapportés au plus long des deux.
 */
export function intitulesProches(a: string, b: string): boolean {
  const motsA = motsSignificatifs(a);
  const motsB = motsSignificatifs(b);
  const communs = [...motsA].filter((mot) => motsB.has(mot)).length;
  return communs / Math.max(motsA.size, motsB.size) >= SEUIL_PROXIMITE_INTITULE;
}

/* -------------------------------------------------------------------------- */
/* Comparaison des programmes                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Part de modules communs entre deux offres.
 *
 * Renvoie `null` quand la comparaison est impossible — au moins un programme
 * non publié. C'est ce `null` qui envoie le cas en arbitrage plutôt que de le
 * trancher, et qui empêche l'opacité de produire des fiches supplémentaires.
 */
export function tauxTroncCommun(a: OffreRegroupable, b: OffreRegroupable): number | null {
  const modulesA = a.modules ?? [];
  const modulesB = b.modules ?? [];
  if (modulesA.length === 0 || modulesB.length === 0) return null;

  const ensembleA = new Set(modulesA.map((m) => m.toLowerCase()));
  const communs = modulesB.filter((m) => ensembleA.has(m.toLowerCase())).length;
  return communs / Math.max(ensembleA.size, modulesB.length);
}

/* -------------------------------------------------------------------------- */
/* Regroupement                                                               */
/* -------------------------------------------------------------------------- */

export type ResultatRegroupement<T> = {
  groupes: GroupeRegroupe<T>[];
  /** File de revue manuelle, journalisée et publique. */
  arbitrages: Arbitrage[];
};

/**
 * Applique la hiérarchie de preuves à un catalogue d'offres.
 *
 * Candidates à la fusion : même organisme, même public, même sujet principal.
 * Parmi elles, celles dont les intitulés sont très proches forment un groupe.
 * Chaque groupe reçoit ensuite l'une des trois issues.
 */
export function regrouper<T extends OffreRegroupable>(
  offres: readonly T[],
): ResultatRegroupement<T> {
  // Même organisme + même public + même sujet principal.
  const candidats = new Map<string, T[]>();
  for (const offre of offres) {
    const cle = `${offre.organisme}§${offre.niveauEntree ?? ""}§${offre.sujetPrincipal}`;
    const existant = candidats.get(cle);
    if (existant) existant.push(offre);
    else candidats.set(cle, [offre]);
  }

  const groupes: GroupeRegroupe<T>[] = [];
  const arbitrages: Arbitrage[] = [];
  let prochainArbitrageId = 0;

  for (const liste of candidats.values()) {
    // Intitulés très proches : on rattache au premier membre de chaque groupe.
    // Le type garantit qu'un groupe n'est jamais vide — son premier membre sert
    // à la fois de référence de comparaison et de source du socle.
    const parIntitule: Array<[T, ...T[]]> = [];
    for (const offre of liste) {
      const groupe = parIntitule.find((g) => intitulesProches(g[0].nom, offre.nom));
      if (groupe) groupe.push(offre);
      else parIntitule.push([offre]);
    }

    for (const groupe of parIntitule) {
      const premier = groupe[0];
      const socleCommun = socle(premier.nom);

      if (groupe.length === 1) {
        groupes.push({ socle: socleCommun, issue: "unique", offres: groupe });
        continue;
      }

      const publies = groupe.filter((o) => (o.modules?.length ?? 0) > 0);

      // Preuves insuffisantes : au moins un programme non publié.
      if (publies.length !== groupe.length) {
        const id = ++prochainArbitrageId;
        const nonPublies = groupe.length - publies.length;
        arbitrages.push({
          id,
          organisme: premier.organisme,
          socle: socleCommun,
          sujetPrincipal: premier.sujetPrincipal,
          offres: groupe.length,
          programmesPublies: publies.length,
          motif: `Tronc pédagogique incomparable : ${nonPublies} programme(s) non publié(s).`,
        });
        // Fiches distinctes, mais repliées en une seule entrée dans la liste.
        groupes.push({
          socle: socleCommun,
          issue: "ambigu",
          offres: groupe,
          arbitrageId: id,
        });
        continue;
      }

      // Tous les programmes sont publiés : le tronc commun peut opposer son veto.
      // `publies` a ici la taille de `groupe`, donc au moins deux membres.
      const reference = publies[0] ?? premier;
      const divergence = publies
        .slice(1)
        .some((autre) => (tauxTroncCommun(reference, autre) ?? 0) < SEUIL_TRONC_COMMUN);

      if (divergence) {
        // Refus : chaque offre redevient une fiche autonome.
        for (const offre of groupe) {
          groupes.push({ socle: socle(offre.nom), issue: "refus", offres: [offre] });
        }
        continue;
      }

      groupes.push({ socle: socleCommun, issue: "fusion", offres: groupe });
    }
  }

  return { groupes, arbitrages };
}
