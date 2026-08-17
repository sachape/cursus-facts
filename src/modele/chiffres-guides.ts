/**
 * Les chiffres que les guides citent — calculés à la lecture, jamais recopiés.
 *
 * C'EST LA SEULE PORTE. Un guide n'écrit aucun nombre du catalogue dans son
 * texte : il lit une propriété de cet objet. Le jour où une fiche est ajoutée,
 * corrigée ou retirée, le guide change avec elle — sans quoi il deviendrait ce
 * qu'il prétend dénoncer, un contenu qui affirme un chiffre que rien ne
 * garantit. `guides-chiffres.test.ts` vérifie mécaniquement qu'aucun guide ne
 * contourne cette porte.
 *
 * C'est aussi ce qui rend ces guides impossibles à copier : n'importe qui peut
 * reprendre une phrase, personne ne peut reprendre un catalogue relevé à la
 * source avec ses dates de vérification.
 *
 * FONCTION PURE. La date de calcul est passée en paramètre, jamais lue ici :
 * `new Date()` au rendu produirait un HTML serveur différent du client, et
 * React jetterait l'arbre entier — le défaut documenté dans `nombres.ts`.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import { prixAffichable } from "./modalite-commerciale";
import {
  LIBELLES_MODALITES,
  MODALITES_ACCES,
  PARTIELLEMENT_GRATUIT,
  SANS_FRAIS,
} from "./modalite-acces";
import { LIBELLES_CATEGORIES } from "./vocabulaires";
import type { CategorieOrganisme } from "@/types/cursus";

/** Une fiche citée nommément, parce qu'elle illustre un fait vérifiable. */
export type Reference = {
  slug: string;
  nom: string;
  organisme: string;
  prix: number;
};

export type LigneRepartition = {
  cle: string;
  libelle: string;
  nombre: number;
};

export type LigneCategorie = LigneRepartition & {
  /** Médiane des tarifs payants de la catégorie. */
  mediane: number | null;
  min: number | null;
  max: number | null;
  /** Fiches de la catégorie portant un tarif payant. */
  payants: number;
  /** Fiches de la catégorie sans frais pour l'apprenant. */
  gratuits: number;
};

export type ChiffresGuides = {
  /** Horodatage du calcul, fourni par l'appelant. */
  calculeLe: string;

  parcours: number;
  organismes: number;

  /* Prix — toujours le tarif individuel, jamais le tarif de groupe. */
  prixEtabli: number;
  prixNonEtabli: number;
  partPrixEtabli: number;
  partPrixNonEtabli: number;
  /*
    LA FOURCHETTE PORTE SUR LES PARCOURS PAYANTS, et c'est une décision.

    Mélanger gratuits et payants dans une même distribution fait tomber la
    médiane à zéro dès que la moitié du catalogue ne coûte rien — un chiffre
    exact et parfaitement inutile, sous une phrase qui promet que « la moitié
    coûte moins que cela ». Rien ne coûte moins que zéro.

    La gratuité n'est pas un petit prix, c'est une autre situation : elle a sa
    propre section et ses propres chiffres.
  */
  prixMinPayant: number | null;
  prixMaxPayant: number | null;
  medianePayant: number | null;
  moinsChere: Reference | null;
  plusChere: Reference | null;
  parCategorie: LigneCategorie[];

  /* Gratuité — un montant nul ne se suffit jamais à lui-même. */
  sansFrais: number;
  accesPartiel: number;
  prixNul: number;
  parModalite: LigneRepartition[];
  modaliteNonQualifiee: number;
  /** Les modalités déclarées, plus l'état « non qualifiée ». */
  etatsModalite: number;

  /* Financement. */
  eligiblesCpf: number;
  cpfNonTranche: number;
  financementPublie: number;
  alternance: number;
  /*
    Les deux autres formats, au même titre que l'alternance. Ils alimentent le
    maillage de l'accueil vers les pages de croisement par format ; les compter
    là-bas aurait créé une seconde source pour un chiffre que ce module produit
    déjà — et deux sources finissent toujours par diverger.
  */
  distanciel: number;
  presentiel: number;

  /* Certification. */
  rncp: number;
  rs: number;
  certifiants: number;
  certificationSansCode: number;
  aucuneCertification: number;

  /* Disponibilité commerciale. */
  interConstate: number;
  intraSeul: number;
  disponibiliteNonTranchee: number;
};

/** Médiane d'une liste non vide, moyenne des deux centrales si le compte est pair. */
function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const tries = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tries.length / 2);
  if (tries.length % 2 === 1) return tries[milieu]!;
  return Math.round((tries[milieu - 1]! + tries[milieu]!) / 2);
}

/**
 * Part en pourcentage, arrondie.
 *
 * Sur un dénominateur nul, `0` et non `NaN` : un guide qui affiche « NaN % »
 * détruit plus de crédibilité qu'il n'en gagne à afficher le chiffre.
 */
function part(nombre: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((nombre / total) * 100);
}

function reference(p: ParcoursListe, prix: number): Reference {
  return { slug: p.slug, nom: p.nom, organisme: p.organismeNom, prix };
}

export function chiffresGuides(
  parcours: readonly ParcoursListe[],
  calculeLe: string,
): ChiffresGuides {
  /*
    Le prix retenu est celui que la personne débourse. `prixAffichable` renvoie
    `null` pour un parcours en intra seul : facturé au groupe, il n'a pas de
    tarif individuel, et le faire entrer dans une fourchette destinée à un
    particulier gonflerait le haut de gamme d'un chiffre qui ne le concerne pas.
  */
  const avecPrix = parcours
    .map((p) => ({ p, prix: prixAffichable(p.prixMin, p, p.unitePrix) }))
    .filter((x): x is { p: ParcoursListe; prix: number } => x.prix !== null);

  const payants = avecPrix.filter((x) => x.prix > 0);

  /*
    Les extrêmes cités sont pris parmi les parcours PAYANTS. « La moins chère du
    catalogue » à 0 € désignerait n'importe laquelle des dizaines de fiches
    gratuites : le lecteur n'apprendrait rien, et le choix de celle qu'on montre
    deviendrait éditorial. La gratuité a sa propre section.
  */
  const parPrix = [...payants].sort((a, b) => a.prix - b.prix);
  const bas = parPrix[0];
  const haut = parPrix.at(-1);

  const categories = Object.keys(LIBELLES_CATEGORIES) as CategorieOrganisme[];

  return {
    calculeLe,

    parcours: parcours.length,
    organismes: new Set(parcours.map((p) => p.organismeNom)).size,

    prixEtabli: avecPrix.length,
    prixNonEtabli: parcours.length - avecPrix.length,
    partPrixEtabli: part(avecPrix.length, parcours.length),
    partPrixNonEtabli: part(parcours.length - avecPrix.length, parcours.length),
    prixMinPayant: bas?.prix ?? null,
    prixMaxPayant: haut?.prix ?? null,
    medianePayant: mediane(payants.map((x) => x.prix)),
    moinsChere: bas === undefined ? null : reference(bas.p, bas.prix),
    plusChere: haut === undefined ? null : reference(haut.p, haut.prix),

    parCategorie: categories
      .map((cle) => {
        const duGroupe = parcours.filter((p) => p.organismeCategorie === cle);
        const prixDuGroupe = duGroupe
          .map((p) => prixAffichable(p.prixMin, p, p.unitePrix))
          .filter((v): v is number => v !== null);
        const payantsDuGroupe = prixDuGroupe.filter((v) => v > 0);
        return {
          cle,
          libelle: LIBELLES_CATEGORIES[cle],
          nombre: duGroupe.length,
          payants: payantsDuGroupe.length,
          gratuits: prixDuGroupe.length - payantsDuGroupe.length,
          mediane: mediane(payantsDuGroupe),
          min: payantsDuGroupe.length > 0 ? Math.min(...payantsDuGroupe) : null,
          max: payantsDuGroupe.length > 0 ? Math.max(...payantsDuGroupe) : null,
        };
      })
      .filter((ligne) => ligne.nombre > 0),

    sansFrais: parcours.filter(
      (p) => p.modaliteAcces !== null && SANS_FRAIS.includes(p.modaliteAcces),
    ).length,
    accesPartiel: parcours.filter(
      (p) => p.modaliteAcces !== null && PARTIELLEMENT_GRATUIT.includes(p.modaliteAcces),
    ).length,
    prixNul: avecPrix.filter((x) => x.prix === 0).length,
    parModalite: MODALITES_ACCES.map((cle) => ({
      cle,
      libelle: LIBELLES_MODALITES[cle],
      nombre: parcours.filter((p) => p.modaliteAcces === cle).length,
    })),
    modaliteNonQualifiee: parcours.filter((p) => p.modaliteAcces === null).length,
    /* Les modalités déclarées PLUS l'état non qualifié : celui-ci est une
       information sur notre collecte, pas une septième façon d'être gratuit,
       mais il occupe bien une case du champ. */
    etatsModalite: MODALITES_ACCES.length + 1,

    eligiblesCpf: parcours.filter((p) => p.eligibleCpf === true).length,
    cpfNonTranche: parcours.filter((p) => p.eligibleCpf === null).length,
    financementPublie: parcours.filter((p) => (p.financements ?? []).length > 0).length,
    alternance: parcours.filter((p) => p.formats.includes("alternance")).length,
    distanciel: parcours.filter((p) => p.formats.includes("distanciel")).length,
    presentiel: parcours.filter((p) => p.formats.includes("presentiel")).length,

    rncp: parcours.filter((p) => (p.codeRncpRs ?? "").startsWith("RNCP")).length,
    rs: parcours.filter((p) => (p.codeRncpRs ?? "").startsWith("RS")).length,
    certifiants: parcours.filter((p) => p.codeRncpRs !== null).length,
    /* Une certification annoncée sans code enregistré. C'est le cas le plus
       fréquent, et le plus mal compris : le libellé existe, l'enregistrement
       national non. */
    certificationSansCode: parcours.filter(
      (p) => p.certification !== null && p.codeRncpRs === null,
    ).length,
    aucuneCertification: parcours.filter(
      (p) => p.certification === null && p.codeRncpRs === null,
    ).length,

    interConstate: parcours.filter((p) => p.dispoInter === true).length,
    intraSeul: parcours.filter((p) => p.dispoInter === false && p.dispoIntra === true).length,
    disponibiliteNonTranchee: parcours.filter((p) => p.dispoInter === null).length,
  };
}
