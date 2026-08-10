/**
 * Maillage interne — quelles pages se désignent entre elles.
 *
 * POURQUOI CE N'EST PAS DE LA RECOMMANDATION. Ces liens ne classent rien et ne
 * conseillent rien. Ils disent à un robot d'exploration que 400 pages forment
 * une hiérarchie, et à un lecteur que d'autres organismes enseignent le même
 * sujet. Aucune formulation du type « formations similaires recommandées » n'a
 * sa place ici : ce serait un jugement, et le produit n'en porte aucun.
 *
 * L'ORDRE EST CELUI DU TRI PAR DÉFAUT, ET SON LIBELLÉ EST AFFICHÉ. C'est la
 * même règle que sur la liste : un ordre dont on ne publie pas la règle est un
 * classement éditorial déguisé. Aucune sélection à la main, aucune mise en
 * avant.
 *
 * LE REPLI EST MESURÉ, PAS SUPPOSÉ. Sur les 232 fiches du catalogue, 21 n'ont
 * pas trois voisins du même sujet chez un autre organisme — 10 n'en ont aucun.
 * Sans repli, ces pages resteraient orphelines, c'est-à-dire difficiles à
 * explorer et sans importance apparente. Le repli élargit au DOMAINE, et le
 * titre de la section change avec lui : annoncer « même sujet » en montrant
 * autre chose serait faux.
 *
 * Même constat côté organismes : 20 des 163 n'ont pas trois voisins partageant
 * leur catégorie ET un domaine. Le repli retire la catégorie, jamais le
 * domaine — deux organismes qui n'enseignent pas la même chose n'ont aucune
 * raison de se désigner.
 */
import type { ParcoursListe } from "@/donnees/requetes";
import type { Organisme } from "./organismes";
import { classer, LIBELLES_TRIS, TRI_PAR_DEFAUT } from "./classement";
import { LIBELLES_DOMAINES } from "./vocabulaires";

/** Combien de liens au minimum, pour qu'aucune page ne soit orpheline. */
export const MINIMUM_LIENS = 3;

/** Combien au maximum, pour que la section reste lisible. */
export const MAXIMUM_LIENS = 5;

export type CritereVoisinage = "sujet" | "domaine" | "catalogue";

export type VoisinageParcours = {
  critere: CritereVoisinage;
  parcours: ParcoursListe[];
  /** Ce que la section annonce. Décrit le critère réellement appliqué. */
  titre: string;
  /** La règle d'ordre, publiée sous la liste. */
  regleOrdre: string;
};

/**
 * Les parcours à lier depuis une fiche.
 *
 * TOUJOURS CHEZ UN AUTRE ORGANISME. Les parcours du même organisme sont déjà
 * atteignables par le lien vers sa page, qui les porte tous : les répéter ici
 * consommerait la section sans ajouter une seule adresse au maillage.
 */
export function voisinsDeParcours(
  candidats: readonly ParcoursListe[],
  fiche: ParcoursListe,
): VoisinageParcours {
  const autres = candidats.filter(
    (p) => p.slug !== fiche.slug && p.organismeNom !== fiche.organismeNom,
  );
  const memeSujet = autres.filter((p) => p.sujetPrincipal === fiche.sujetPrincipal);
  const memeDomaine = autres.filter((p) => p.domaine === fiche.domaine);
  /*
    TROIS NIVEAUX, PARCE QUE DEUX NE SUFFISAIENT PAS. Après le repli par
    domaine, l'invariant comptait encore 21 pages sous le seuil : des sujets et
    des domaines trop petits pour fournir trois voisins chez d'autres
    organismes. Le dernier repli prend le catalogue entier.

    Un lien vers un parcours d'un autre domaine apporte peu — mais une page que
    rien ne désigne n'apporte rien du tout, et le titre dit exactement ce qui
    est montré. Ce repli ne concerne qu'une quinzaine de fiches.
  */

  /*
    Le groupe de référence contient TOUT LE MONDE, y compris les parcours du
    même organisme et la fiche courante. Ils ne seront pas liés — ils sont
    écartés pendant le parcours de l'anneau — mais ils occupent une place dans
    l'ordre, et c'est cette place qui rend l'anneau identique pour tous les
    membres du groupe. C'est la condition de la réciprocité.
  */
  /*
    Le modèle refait lui-même le filtrage, sans s'appuyer sur celui de la
    requête qui l'alimente : une règle de sélection doit tenir seule.
  */
  const groupe = [fiche, ...candidats.filter((p) => p.slug !== fiche.slug)];

  /*
    LA SÉLECTION ET L'ORDRE SONT DEUX QUESTIONS DISTINCTES, et les confondre
    était un défaut. Prendre les cinq premiers du tri par défaut revenait à ne
    jamais désigner que les fiches les mieux renseignées : l'invariant a compté
    151 pages ne recevant qu'un seul lien, celui de leur organisme. Un ordre
    neutre, tronqué, cesse d'être neutre — c'est une sélection éditoriale par
    la complétude, exactement ce que le produit s'interdit.

    La sélection se fait donc par ROTATION : chaque fiche désigne les cinq qui
    la suivent dans l'ordre alphabétique de ses pairs, en repartant au début.
    Personne n'est privilégié, et chacun reçoit autant de liens qu'il en donne.

    L'AFFICHAGE, lui, suit bien le tri par défaut, dont le libellé est publié
    sous la liste. C'est la règle demandée, appliquée là où elle a un sens :
    l'ordre de lecture des cinq retenus.
  */
  const anneau = anneauEntrelace(groupe);
  const depart = anneau.findIndex((p) => p.slug === fiche.slug);
  const choisis: ParcoursListe[] = [];
  for (let i = 1; i < anneau.length && choisis.length < MAXIMUM_LIENS; i++) {
    const candidat = anneau[(depart + i) % anneau.length]!;
    // Écarté EN CHEMIN, et non retiré de l'anneau : c'est ce qui garde le même
    // ordre de référence pour tout le groupe, donc la réciprocité des liens.
    // Retirer d'abord donnait à chaque fiche un anneau différent, et
    // 46 parcours ne recevaient plus qu'un seul lien.
    if (candidat.organismeNom === fiche.organismeNom) continue;
    choisis.push(candidat);
  }

  /*
    LE CRITÈRE SE CONSTATE, IL NE SE DÉCIDE PAS. Il décrit ce que l'anneau a
    réellement rendu, et le titre en découle : annoncer « même sujet » puis
    afficher autre chose serait faux, et c'est le seul risque que porte une
    section de maillage.
  */
  const critere: CritereVoisinage = choisis.every(
    (p) => p.sujetPrincipal === fiche.sujetPrincipal,
  )
    ? "sujet"
    : choisis.every((p) => p.domaine === fiche.domaine)
      ? "domaine"
      : "catalogue";

  return {
    critere,
    parcours: classer(choisis, TRI_PAR_DEFAUT),
    titre:
      critere === "sujet"
        ? `Parcours du même sujet : ${fiche.sujetPrincipal}`
        : critere === "domaine"
          ? `Parcours du même domaine : ${LIBELLES_DOMAINES[fiche.domaine as keyof typeof LIBELLES_DOMAINES] ?? fiche.domaine}`
          : "Autres parcours du catalogue",
    regleOrdre: LIBELLES_TRIS[TRI_PAR_DEFAUT],
  };
}

/**
 * L'ordre de référence de l'anneau : domaine, puis sujet, puis intitulé.
 *
 * UN SEUL ORDRE POUR TOUT LE MONDE, et c'est ce qui rend les liens
 * réciproques. Trois constructions successives ont échoué faute de cette
 * propriété — 151, puis 46, puis 24 pages sous le seuil de trois liens. Chaque
 * fois, la cause était la même : deux fiches du même groupe ne parcouraient pas
 * la même liste, donc l'une pouvait désigner l'autre sans que la réciproque
 * soit vraie.
 *
 * Ranger d'abord par domaine puis par sujet garde les voisins topiquement
 * proches : les cinq qui suivent une fiche partagent son sujet tant qu'il en
 * reste, son domaine ensuite.
 */
function ordreDeReference(a: ParcoursListe, b: ParcoursListe): number {
  if (a.domaine !== b.domaine) return a.domaine.localeCompare(b.domaine);
  if (a.sujetPrincipal !== b.sujetPrincipal) {
    return a.sujetPrincipal.localeCompare(b.sujetPrincipal, "fr");
  }
  return a.nom.localeCompare(b.nom, "fr");
}

/**
 * Un anneau où deux voisins ne viennent jamais du même organisme.
 *
 * L'ORDRE ALPHABÉTIQUE SEUL NE SUFFISAIT PAS, et l'invariant l'a montré : un
 * organisme dont les intitulés se suivent — « Formation X, module 1 » à
 * « module 20 » — occupe une plage entière de l'alphabet. Chaque fiche écartant
 * celles de son propre organisme, les fiches au milieu de cette plage
 * n'étaient atteintes par personne : 39 pages ne recevaient qu'un seul lien.
 *
 * Les organismes sont donc servis à tour de rôle : le premier parcours de
 * chacun, puis le deuxième, et ainsi de suite. Chaque rang reste trié
 * alphabétiquement, donc la construction est entièrement déterministe et ne
 * privilégie personne — c'est un ordre de distribution, pas un jugement.
 */
function anneauEntrelace(groupe: readonly ParcoursListe[]): ParcoursListe[] {
  const parOrganisme = new Map<string, ParcoursListe[]>();
  for (const p of [...groupe].sort(ordreDeReference)) {
    const liste = parOrganisme.get(p.organismeNom) ?? [];
    liste.push(p);
    parOrganisme.set(p.organismeNom, liste);
  }

  const files = [...parOrganisme.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(([, liste]) => liste);


  const anneau: ParcoursListe[] = [];
  const plusLongue = Math.max(0, ...files.map((f) => f.length));
  for (let rang = 0; rang < plusLongue; rang++) {
    for (const file of files) {
      const p = file[rang];
      if (p !== undefined) anneau.push(p);
    }
  }
  return anneau;
}

export type VoisinageOrganisme = {
  critere: "categorie" | "domaine" | "catalogue";
  organismes: Organisme[];
  titre: string;
  regleOrdre: string;
};

/**
 * Les organismes à lier depuis une page organisme.
 *
 * UN ANNEAU, PAS UN PALMARÈS. La première version prenait les cinq premiers
 * dans l'ordre alphabétique. L'invariant a montré ce que ça produisait :
 * 20 organismes ne recevaient que deux liens — leur propre fiche et la vue
 * Organismes — parce qu'un nom en fin d'alphabet n'entre jamais dans les cinq
 * premiers de personne. Un ordre neutre tronqué cesse d'être neutre.
 *
 * Chaque organisme désigne donc les cinq QUI LE SUIVENT dans l'ordre
 * alphabétique, en repartant au début quand on atteint la fin. La conséquence
 * est arithmétique : chacun reçoit exactement autant de liens qu'il en donne,
 * et aucune page ne peut rester orpheline. C'est aussi la seule construction
 * qui ne privilégie personne — ni les A, ni les gros catalogues, ni les fiches
 * les mieux renseignées.
 *
 * Le tri par défaut du catalogue n'a rien à faire ici : il classe par nombre
 * d'informations disponibles, et l'appliquer à des organismes reviendrait à
 * les ordonner selon l'étendue de NOTRE collecte, ce qui se lirait comme un
 * jugement sur eux.
 */
export function voisinsDOrganisme(
  tous: readonly Organisme[],
  domainesPar: ReadonlyMap<string, ReadonlySet<string>>,
  organisme: Organisme,
): VoisinageOrganisme {
  const siens = domainesPar.get(organisme.nom) ?? new Set<string>();
  const partageUnDomaine = (autre: Organisme) => {
    const leurs = domainesPar.get(autre.nom) ?? new Set<string>();
    for (const d of leurs) if (siens.has(d)) return true;
    return false;
  };

  /*
    UN SEUL ANNEAU, POUR LA MÊME RAISON QUE CÔTÉ PARCOURS. Filtrer d'abord sur
    la catégorie puis sur le domaine donnait à chaque organisme une liste
    différente, donc des liens non réciproques : 7 pages ne recevaient que deux
    liens — leur propre fiche et la vue Organismes.

    L'ordre de référence range par catégorie, puis par domaines couverts, puis
    par nom. Les cinq qui suivent partagent donc la catégorie tant qu'il en
    reste, et un domaine le plus souvent. Chacun reçoit exactement autant de
    liens qu'il en donne.
  */
  const cle = (o: Organisme) =>
    `${o.categorie}\u0000${[...(domainesPar.get(o.nom) ?? [])].sort().join(",")}\u0000${o.nom}`;
  const anneau = [...tous].sort((a, b) => cle(a).localeCompare(cle(b), "fr"));
  const depart = anneau.findIndex((o) => o.nom === organisme.nom);
  const suivants: Organisme[] = [];
  for (let i = 1; i < anneau.length && suivants.length < MAXIMUM_LIENS; i++) {
    suivants.push(anneau[(depart + i) % anneau.length]!);
  }

  /* Le critère se constate, comme côté parcours : le titre décrit ce qui est
     réellement montré, jamais ce qu'on espérait montrer. */
  const memeCategorie = suivants.every((o) => o.categorie === organisme.categorie);
  const memesDomaines = suivants.every(partageUnDomaine);
  const critere =
    memeCategorie && memesDomaines ? "categorie" : memesDomaines ? "domaine" : "catalogue";

  return {
    critere,
    organismes: suivants,
    titre:
      critere === "categorie"
        ? "Organismes de la même catégorie, sur les mêmes domaines"
        : critere === "domaine"
          ? "Organismes sur les mêmes domaines"
          : "Autres organismes du catalogue",
    regleOrdre:
      "Ordre alphabétique, à partir de cet organisme. Chacun en désigne cinq autres et reçoit autant de liens qu'il en donne. Aucun classement : ni par nombre de parcours, ni par informations disponibles.",
  };
}

/** Les domaines couverts par chaque organisme, dérivés du catalogue. */
export function domainesParOrganisme(
  parcours: readonly ParcoursListe[],
): Map<string, Set<string>> {
  const par = new Map<string, Set<string>>();
  for (const p of parcours) {
    const set = par.get(p.organismeNom) ?? new Set<string>();
    set.add(p.domaine);
    par.set(p.organismeNom, set);
  }
  return par;
}
