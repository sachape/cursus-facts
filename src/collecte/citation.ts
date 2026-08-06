/**
 * Citation obligatoire — le garde-fou d'extraction.
 *
 * Sans lui, le pipeline hallucinerait à l'échelle ce que nous corrigeons à la
 * main. Chaque valeur extraite doit s'accompagner de l'extrait exact du texte
 * source d'où elle provient ; si l'extrait ne contient pas littéralement la
 * valeur, elle est rejetée et le champ reste `non_collecte`.
 *
 * VÉRIFICATION PROGRAMMATIQUE, PAS DÉCLARATIVE. On ne demande jamais au modèle
 * s'il a bien cité : on compare la valeur à l'extrait par correspondance de
 * chaîne après normalisation. Un modèle qui s'auto-évalue valide ses propres
 * hallucinations.
 *
 * DEUXIÈME VÉRIFICATION, moins évidente et tout aussi nécessaire : l'extrait
 * doit lui-même figurer dans la page. Un modèle peut fabriquer une citation
 * plausible autant qu'une valeur. Sans ancrage dans le texte réellement
 * récupéré, la citation ne prouve rien — elle déplace seulement l'invention
 * d'un champ à l'autre.
 *
 * « Aucune information déduite » cesse ainsi d'être un principe écrit pour
 * devenir une contrainte technique.
 */

/** Diacritiques Unicode, à neutraliser avant comparaison. */
const DIACRITIQUES = /[̀-ͯ]/g;
/** Espaces insécables et fines, que les pages de prix emploient sans règle. */
const ESPACES_SPECIAUX = /[   ]/g;

/**
 * Normalise pour la comparaison, sans jamais rendre deux valeurs différentes
 * égales.
 *
 * Casse, accents, espaces multiples et espaces insécables sont neutralisés —
 * ce sont des variations de rendu, pas de contenu. La typographie des
 * apostrophes et des tirets aussi : une page qui écrit « l'essentiel » avec une
 * apostrophe courbe dit la même chose que notre catalogue avec une droite.
 */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(DIACRITIQUES, "")
    .toLowerCase()
    .replace(ESPACES_SPECIAUX, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Variantes acceptables d'un nombre tel qu'une page peut l'écrire.
 *
 * « 1 495 € », « 1495€ », « 1.495 » et « 1 495,00 » sont le même prix. Exiger
 * une forme unique ferait rejeter des extractions correctes — et un rejet
 * injustifié coûte autant qu'une acceptation injustifiée, puisqu'il laisse le
 * champ vide alors que l'information était publiée.
 */
function formesDuNombre(valeur: number): string[] {
  const entier = String(Math.round(valeur));
  const formes = new Set([entier, valeur.toFixed(2).replace(".", ",")]);
  if (entier.length > 3) {
    const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    for (const separateur of [" ", ".", "'", ""]) {
      formes.add(groupe.replaceAll(" ", separateur));
    }
  }
  return [...formes].map(normaliser);
}

export type MotifRejet =
  | "extrait_trop_long"
  | "extrait_vide"
  | "extrait_absent_de_la_page"
  | "valeur_absente_de_l_extrait";

export type Rejet = {
  champ: string;
  motif: MotifRejet;
  valeur: unknown;
  extrait: string;
};

export type Verdict = { valide: true } | ({ valide: false } & Omit<Rejet, "champ">);

/** Marqueurs acceptés pour attester un booléen, faute de forme littérale. */
const MARQUEURS_VRAI = ["oui", "eligible", "inclus", "disponible", "certifiant", "yes", "free"];
const MARQUEURS_FAUX = ["non", "aucun", "aucune", "sans", "not", "no "];

/**
 * Vérifie qu'une valeur est littéralement attestée par son extrait, et que
 * l'extrait est littéralement présent dans la page.
 *
 * Les listes exigent que **chaque** élément soit attesté. Accepter une liste
 * dont un seul élément est cité laisserait passer un programme à moitié
 * inventé — pire qu'un programme absent, parce qu'il a l'air complet.
 */
export function verifierCitation(
  valeur: unknown,
  extrait: string,
  page: string,
  maxLongueur = Number.POSITIVE_INFINITY,
): Verdict {
  if (extrait.trim() === "") return { valide: false, motif: "extrait_vide", valeur, extrait };
  /*
    Un extrait trop long est rejeté AVANT d'être comparé : au-delà d'une phrase,
    la recopie dérive mécaniquement, et le rejet arriverait de toute façon —
    mais sous un motif qui ferait croire à une citation fabriquée.
  */
  if (extrait.length > maxLongueur) {
    return { valide: false, motif: "extrait_trop_long", valeur, extrait };
  }

  const extraitNormalise = normaliser(extrait);
  if (!normaliser(page).includes(extraitNormalise)) {
    return { valide: false, motif: "extrait_absent_de_la_page", valeur, extrait };
  }

  const echoue = (): Verdict => ({
    valide: false,
    motif: "valeur_absente_de_l_extrait",
    valeur,
    extrait,
  });

  if (typeof valeur === "number") {
    return formesDuNombre(valeur).some((forme) => extraitNormalise.includes(forme))
      ? { valide: true }
      : echoue();
  }

  if (typeof valeur === "string") {
    return extraitNormalise.includes(normaliser(valeur)) ? { valide: true } : echoue();
  }

  if (typeof valeur === "boolean") {
    // Un booléen n'a pas de forme littérale dans une page. On exige donc que
    // l'extrait porte un marqueur explicite ; sinon la valeur est une lecture
    // du modèle, c'est-à-dire une déduction, et non une citation.
    const marqueurs = valeur ? MARQUEURS_VRAI : MARQUEURS_FAUX;
    return marqueurs.some((m) => extraitNormalise.includes(m)) ? { valide: true } : echoue();
  }

  if (Array.isArray(valeur)) {
    if (valeur.length === 0) return echoue();
    const tousAttestes = valeur.every((v) => verifierCitation(v, extrait, page).valide);
    return tousAttestes ? { valide: true } : echoue();
  }

  return echoue();
}

/** Une valeur extraite, telle que le modèle doit la rendre. */
export type ValeurCitee = { valeur: unknown; extrait: string };

export type Filtrage = {
  /** Champs retenus : valeur attestée par une citation vérifiée. */
  retenus: Record<string, ValeurCitee>;
  /** Champs rejetés, avec le motif. Ils restent `non_collecte`. */
  rejets: Rejet[];
};

/**
 * Filtre une extraction complète : ne laisse passer que ce qui est cité.
 *
 * C'est le seul point d'entrée des données extraites vers le catalogue. Rien
 * n'écrit dans le catalogue sans être passé par ici — et un champ rejeté reste
 * `non_collecte`, jamais `non_communique` : le modèle n'a pas su citer, ce qui
 * ne dit rien de ce que l'organisme publie.
 */
export function filtrerParCitation(
  extraction: Record<string, ValeurCitee | null | undefined>,
  page: string,
  maxLongueur?: number,
): Filtrage {
  const retenus: Record<string, ValeurCitee> = {};
  const rejets: Rejet[] = [];

  for (const [champ, cite] of Object.entries(extraction)) {
    if (cite === null || cite === undefined) continue;
    if (cite.valeur === null || cite.valeur === undefined) continue;

    const verdict = verifierCitation(cite.valeur, cite.extrait ?? "", page, maxLongueur);
    if (verdict.valide) {
      retenus[champ] = cite;
    } else {
      rejets.push({
        champ,
        motif: verdict.motif,
        valeur: verdict.valeur,
        extrait: verdict.extrait,
      });
    }
  }

  return { retenus, rejets };
}
