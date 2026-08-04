/**
 * File de collecte en profondeur.
 *
 * Ouvrir la page de détail de chaque parcours n'est pas une tâche de session :
 * 231 pages aujourd'hui, plusieurs milliers quand le catalogue aura sa largeur.
 * C'est un pipeline, repris lot après lot, dont l'état est persisté sur disque
 * — sans quoi chaque session recommencerait au début et le catalogue
 * n'atteindrait jamais la profondeur.
 *
 * ORDRE DE TRAITEMENT. Les fiches où le manque coûte le plus à la décision
 * passent d'abord : celles sans prix, sans programme et sans non-couvert. Une
 * fiche à qui il ne manque que la date de vérification attend son tour.
 */
import { chargerCatalogue, type OffreNormalisee } from "./catalogue";
import fileBrute from "./file-collecte.json";

export const STATUTS_COLLECTE = ["a_traiter", "traite", "injoignable"] as const;
export type StatutCollecte = (typeof STATUTS_COLLECTE)[number];

export type EntreeFile = {
  /** Identifiant de l'offre source. */
  id: number;
  nom: string;
  organisme: string;
  /** URL de la page de détail, quand elle est connue. */
  urlDetail: string | null;
  statut: StatutCollecte;
  /** Date du dernier passage, quel qu'en soit le résultat. */
  dernierPassage: string | null;
  /** Renseigné pour un échec, pour ne pas le confondre avec une absence. */
  motifEchec?: string | null;
};

/**
 * Coût décisionnel d'une fiche : plus il est haut, plus son manque pèse.
 *
 * Le prix compte double — c'est l'information sur laquelle on renonce ou on
 * poursuit, et son absence rend toute comparaison budgétaire impossible.
 */
export function coutDuManque(offre: OffreNormalisee): number {
  let cout = 0;
  if (offre.prix === null) cout += 2;
  // Un prix connu dont on ignore s'il est inter ou intra est plus coûteux
  // qu'un prix absent : il s'affiche, il trie, il filtre — et il peut être
  // trois fois trop élevé. L'incertitude silencieuse passe donc devant le
  // manque déclaré.
  if (offre.prix !== null && offre.dispoInter === null) cout += 3;
  // Une valeur déclassée est une dette contractée par nous : elle est affichée
  // sans être confirmée. Elle passe donc devant tout le reste — 4 points par
  // champ, plus qu'un prix absent.
  cout += (offre.aConfirmer?.length ?? 0) * 4;
  if (offre.programme === null || offre.programme.length === 0) cout += 1;
  if (offre.nonCouvert === null || offre.nonCouvert.length === 0) cout += 1;
  if (offre.volumeHoraire === null) cout += 1;
  if (offre.prerequis === null) cout += 1;
  return cout;
}

/** Construit la file à partir du catalogue, en conservant l'état déjà acquis. */
export function construireFile(
  catalogue: readonly OffreNormalisee[] = chargerCatalogue(),
  existante: readonly EntreeFile[] = fileBrute as EntreeFile[],
): EntreeFile[] {
  const parId = new Map(existante.map((e) => [e.id, e]));

  return catalogue
    .map((offre): EntreeFile => {
      const deja = parId.get(offre.id);
      // Le catalogue fait foi sur la profondeur : une fiche dont la page de
      // détail vient d'être lue doit sortir de la file, même si l'entrée
      // existait déjà. Conserver aveuglément l'ancien statut ferait retraiter
      // indéfiniment les mêmes pages.
      const verifie = offre.profondeur === "detail_verifie";
      if (deja) {
        return {
          ...deja,
          nom: offre.nom,
          organisme: offre.organisme,
          urlDetail: offre.urlDetail ?? deja.urlDetail,
          statut: verifie ? "traite" : deja.statut,
          dernierPassage: offre.profondeurVerifieeLe ?? deja.dernierPassage,
        };
      }
      return {
        id: offre.id,
        nom: offre.nom,
        organisme: offre.organisme,
        urlDetail: offre.urlDetail ?? null,
        statut: verifie ? "traite" : "a_traiter",
        dernierPassage: offre.profondeurVerifieeLe ?? null,
      };
    })
    .sort((a, b) => {
      // Les fiches déjà traitées sortent de la tête de file.
      if (a.statut !== b.statut) return a.statut === "a_traiter" ? -1 : 1;
      const coutA = catalogue.find((o) => o.id === a.id);
      const coutB = catalogue.find((o) => o.id === b.id);
      return (coutB ? coutDuManque(coutB) : 0) - (coutA ? coutDuManque(coutA) : 0);
    });
}

/** Le prochain lot à traiter, dans l'ordre de priorité. */
export function prochainLot(file: readonly EntreeFile[], taille = 20): EntreeFile[] {
  return file.filter((e) => e.statut === "a_traiter").slice(0, taille);
}

export type Avancement = {
  total: number;
  traites: number;
  injoignables: number;
  restants: number;
  /** Part du catalogue vérifiée en profondeur, en pourcentage entier. */
  pourcentage: number;
  /**
   * Part vérifiée **depuis moins de six mois**. C'est ce chiffre qui est publié.
   *
   * « 100 % vérifié » commence à mentir le jour où il est atteint : il dira que
   * tout a été vérifié alors qu'une partie l'aura été il y a un an. Cette
   * mesure-ci redescend toute seule si l'entretien cesse, reste vraie en
   * permanence, et se défend publiquement — personne ne peut reprocher un 82 %
   * daté, quand un 100 % figé serait attaquable au premier prix périmé.
   */
  pourcentageFrais: number;
};

/** Au-delà, une vérification ne prouve plus l'état actuel de la page. */
export const FRAICHEUR_MOIS = 6;

/** Vrai si la vérification est encore fraîche à la date donnée. */
export function estFraiche(verifieeLe: string | null, aujourdhui: string): boolean {
  if (verifieeLe === null) return false;
  const limite = new Date(aujourdhui);
  limite.setMonth(limite.getMonth() - FRAICHEUR_MOIS);
  return new Date(verifieeLe) >= limite;
}

/**
 * Avancement de la collecte en profondeur.
 *
 * Ce chiffre est publié dans la vue Méthode : aucun comparatif rémunéré à la
 * commission n'affichera jamais quelle part de son catalogue il a réellement
 * vérifiée.
 */
export function avancement(
  file: readonly EntreeFile[],
  aujourdhui = new Date().toISOString().slice(0, 10),
): Avancement {
  const total = file.length;
  const traites = file.filter((e) => e.statut === "traite").length;
  const injoignables = file.filter((e) => e.statut === "injoignable").length;
  const frais = file.filter(
    (e) => e.statut === "traite" && estFraiche(e.dernierPassage, aujourdhui),
  ).length;
  return {
    total,
    traites,
    injoignables,
    restants: total - traites - injoignables,
    pourcentage: total === 0 ? 0 : Math.round((traites / total) * 100),
    pourcentageFrais: total === 0 ? 0 : Math.round((frais / total) * 100),
  };
}

/**
 * Taux de fiches dont le prix ou la modalité d'accès est vérifié.
 *
 * L'indicateur d'ouverture au public, publié à côté de la fraîcheur : c'est le
 * champ dont l'absence fait réellement partir un utilisateur.
 */
export function tauxPrixVerifie(catalogue: readonly OffreNormalisee[]): number {
  if (catalogue.length === 0) return 0;
  const ouverts = catalogue.filter(
    (o) => (o.prix !== null || o.modaliteAcces !== null) && !o.aConfirmer.includes("prix"),
  ).length;
  return Math.round((ouverts / catalogue.length) * 100);
}

export const fileDeCollecte = fileBrute as EntreeFile[];
