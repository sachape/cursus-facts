/**
 * Extraction — une requête par page, jamais une lecture à la main.
 *
 * Le texte principal de la page part au modèle avec le schéma des dix-neuf
 * champs. Le modèle ne décide rien : il localise. Chaque valeur qu'il renvoie
 * doit s'accompagner de l'extrait exact du texte d'où elle provient, et cet
 * extrait est vérifié **programmatiquement** en aval (`filtrerParCitation`).
 * Ce que le modèle affirme sans pouvoir le citer n'entre jamais au catalogue.
 *
 * La sortie n'est pas une écriture : c'est une proposition. L'arbitrage entre
 * écrire, déclasser et effacer appartient à `provenance.ts`, qui n'a qu'un seul
 * chemin vers l'effacement — une page lue où l'information ne figure pas.
 */
import Anthropic from "@anthropic-ai/sdk";
import { filtrerParCitation, type Filtrage, type ValeurCitee } from "./citation";

/**
 * Modèle d'extraction, configurable sans toucher au code.
 *
 * MESURÉ LE 6 AOÛT 2026 : Haiku rend 59 % de citations valides contre 71 % pour
 * Opus, sur le même lot figé. L'écart tient sur cinq strates, et il ne vient pas
 * de la longueur des citations — les borner à 200 caractères n'a rien changé.
 * La tâche paraît mécanique, mais localiser une valeur puis la recopier sans
 * dériver ne l'est pas.
 *
 * À 59 %, quatre extractions sur dix sont perdues : l'économie par appel ne
 * compense pas le travail à refaire. Le paramètre reste configurable — la
 * mesure sera à refaire quand les modèles évolueront.
 *
 * Seule l'extraction bascule : l'assistant d'adéquation, qui rédige une phrase
 * à partir de listes déjà établies, garde son propre modèle.
 */
export const MODELE = process.env["MODELE_EXTRACTION"] ?? "claude-opus-5";

/**
 * La réflexion adaptative n'existe pas sur toute la gamme.
 *
 * Haiku la refuse en 400, et l'envoyer quand même faisait échouer les trente
 * pages d'un coup. On ne la retire pas partout pour autant : sur un modèle qui
 * la prend, elle améliore le repérage dans une page longue. Le paramètre suit
 * donc le modèle, au lieu d'être posé une fois pour toutes.
 */
const REFLECHIT = !MODELE.includes("haiku");

/** Les dix-neuf champs extraits d'une page de détail. */
export const CHAMPS_EXTRAITS = [
  "prix",
  "prixIntra",
  "modaliteAcces",
  "duree",
  "volumeHoraire",
  "formats",
  "region",
  "niveauEntree",
  "prerequis",
  "cpf",
  "financements",
  "certification",
  "codeRncpRs",
  "outils",
  "programme",
  "nonCouvert",
  "dispoInter",
  "dispoIntra",
  "dateVerification",
] as const;
export type ChampExtrait = (typeof CHAMPS_EXTRAITS)[number];

/**
 * Champs qui QUALIFIENT une valeur sans en être une.
 *
 * `unitePrix` n'est pas une donnée du catalogue : c'est ce qui rend le prix
 * interprétable. Il ne s'écrit donc jamais comme un champ, et son absence ne
 * compte pas comme une information manquante — elle invalide le prix.
 */
export const QUALIFIANTS: Record<string, string> = {
  unitePrix: "prix",
  uniteIntra: "prixIntra",
};

/** Un champ du schéma : une valeur, et l'extrait qui l'atteste. */
function champCite(type: Record<string, unknown>, description: string) {
  return {
    type: "object",
    description,
    properties: {
      valeur: { ...type, description: "La valeur telle que la page l'écrit." },
      extrait: {
        type: "string",
        description:
          "Copie littérale de la phrase de la page qui porte cette valeur. " +
          "Copier-coller exact, sans reformuler, sans corriger, sans abréger. " +
          "Si aucune phrase ne porte littéralement la valeur, renvoyer null pour tout le champ.",
      },
    },
    required: ["valeur", "extrait"],
    additionalProperties: false,
  };
}

const nombre = { type: "number" };
const texte = { type: "string" };
const booleen = { type: "boolean" };
const liste = { type: "array", items: { type: "string" } };

/**
 * Le schéma est scindé en deux appels.
 *
 * Dix-neuf champs, chacun un objet `{valeur, extrait}`, plusieurs avec
 * énumérations et tableaux : la compilation de grammaire échouait — « Schema is
 * too complex » sur 14 pages, « Grammar compilation timed out » sur 6. Les
 * énumérations sont remplacées par du texte libre, normalisé en aval : le
 * modèle localise, il ne classe pas, et une valeur hors vocabulaire vaut mieux
 * qu'une extraction perdue.
 */
export const GROUPES_EXTRACTION = [
  ["prix", "unitePrix", "prixIntra", "uniteIntra", "modaliteAcces", "duree", "volumeHoraire", "formats", "region", "dispoInter", "dispoIntra"],
  ["niveauEntree", "prerequis", "cpf", "financements", "certification", "codeRncpRs", "outils", "programme", "nonCouvert", "dateVerification"],
] as const;

export const SCHEMA_EXTRACTION = {
  type: "object",
  properties: {
    prix: champCite(nombre, "Tarif pour une personne (inter-entreprises), en euros. 0 si gratuit."),
    /*
      L'unité est OBLIGATOIRE dès qu'un prix est extrait. Un tarif journalier
      écrit comme un total ment d'un facteur égal à la durée : Dawan publie
      « 875,00 € HT / jour » et 875 allait remplacer un total de 1 500 €.
    */
    unitePrix: champCite(
      texte,
      "OBLIGATOIRE si un prix est donné. Unité exacte du tarif telle que la page l'écrit : " +
        "total, journalier, mensuel, annuel, ou horaire. Cite le passage qui porte la mention " +
        "(« / jour », « par mois », « par personne »). Ne devine pas : sans mention, laisse vide.",
    ),
    prixIntra: champCite(nombre, "Tarif de groupe (intra-entreprise), en euros."),
    uniteIntra: champCite(texte, "Unité du tarif intra, mêmes règles que unitePrix."),
    modaliteAcces: champCite(
      texte,
      "Comment on accède au parcours quand il est gratuit : accès libre, compte requis, " +
        "compte produit requis, certificat payant, freemium, ou pris en charge.",
    ),
    duree: champCite(texte, "Durée telle qu'écrite : « 3 jours », « 6 mois »."),
    volumeHoraire: champCite(nombre, "Nombre total d'heures de formation."),
    formats: champCite(liste, "Modalités pédagogiques : Présentiel, Distanciel, Alternance."),
    region: champCite(texte, "Région ou ville où la formation a lieu."),
    niveauEntree: champCite(
      texte,
      "Niveau d'entrée exigé : Aucun prérequis, Bac+2, Bac+3, ou Expérience.",
    ),
    prerequis: champCite(texte, "Prérequis, tels qu'énoncés."),
    cpf: champCite(booleen, "Éligibilité au CPF, si la page le dit explicitement."),
    financements: champCite(liste, "Financements acceptés : CPF, OPCO, France Travail, paiement en plusieurs fois."),
    certification: champCite(texte, "Certification délivrée, telle qu'écrite. « Aucune » si la page le dit."),
    codeRncpRs: champCite(texte, "Code RNCP ou RS, forme « RNCP12345 » ou « RS1234 »."),
    outils: champCite(liste, "Outils et logiciels enseignés."),
    programme: champCite(liste, "Modules du programme, un par entrée, dans l'ordre de la page."),
    nonCouvert: champCite(liste, "Ce que la formation annonce explicitement ne PAS couvrir."),
    dispoInter: champCite(booleen, "Sessions ouvertes à une inscription individuelle."),
    dispoIntra: champCite(booleen, "Intervention en entreprise, facturée au groupe."),
    dateVerification: champCite(
      texte,
      "Date de mise à jour, RECOPIÉE TELLE QUE LA PAGE L'ÉCRIT — « 18 juillet 2026 », " +
        "pas « 2026-07-18 ». La conversion est faite par le code : convertir toi-même " +
        "produit une valeur que ta citation ne porte pas, et le champ est alors rejeté.",
    ),
  },
  required: [],
  additionalProperties: false,
} as const;

const CONSIGNE = `Tu localises des informations dans la page d'une formation. Tu n'en déduis aucune.

RÈGLE ABSOLUE — la citation. Pour chaque champ que tu renseignes, « extrait » doit être
une copie littérale d'une phrase de la page, contenant la valeur. Copier-coller exact :
sans reformuler, sans corriger l'orthographe, sans abréger, sans traduire.

Si aucune phrase de la page ne porte littéralement la valeur, omets le champ entièrement.
Un champ omis est un résultat correct. Un champ inventé est une faute grave — la citation
sera vérifiée par comparaison de chaînes, et toute valeur non attestée sera rejetée.

CITE COURT. Un extrait dépasse rarement une phrase, et jamais 200 caractères.
Choisis la phrase la plus courte qui contient la valeur — pas le paragraphe qui
l'entoure. Un extrait long est recopié de moins en moins fidèlement, et il est
rejeté dès qu'un caractère diverge.

Ne calcule rien. « 3 jours » ne devient pas 21 heures si la page n'écrit pas 21 heures.
Ne complète rien par ce que tu sais de l'organisme.
Ne confonds pas le tarif d'une personne (inter) et le tarif d'un groupe (intra).`;

export type Extraction = {
  url: string;
  filtrage: Filtrage;
  /** Champs proposés par le modèle, avant vérification. */
  proposes: number;
};

export type ClientExtraction = {
  extraire(texte: string, url: string): Promise<Record<string, ValeurCitee | null>>;
  /**
   * Compteur de dépense, lisible en fin de passe.
   *
   * Les JETONS viennent de `usage` renvoyé par l'API, pas d'une division des
   * caractères par quatre. L'estimation à 4 caractères par jeton se trompe
   * surtout là où on l'utilise — une page HTML nettoyée porte des nombres, des
   * euros et des mots composés, qui se découpent plus finement que de la prose.
   * Un coût en euros calculé sur une estimation n'est pas un coût mesuré.
   */
  depense(): {
    appels: number;
    caracteresEnvoyes: number;
    jetonsEntree: number;
    jetonsSortie: number;
  };
};

/**
 * Plafond d'appels par passe.
 *
 * Une erreur de configuration a consommé quarante appels avant d'être vue, puis
 * trente sur un paramètre refusé. Le plafond interrompt là où le regard
 * n'arrive plus : au-delà, la passe s'arrête au lieu de continuer à payer.
 */
export const PLAFOND_APPELS = Number(process.env["PLAFOND_APPELS"] ?? 200);

/**
 * Longueur maximale d'une citation.
 *
 * Un extrait de 769 caractères n'est pas une citation, c'est un paragraphe
 * recopié — et la dérive au milieu devient mécanique. Les extraits fautifs
 * avaient une médiane de 406 caractères contre 117 pour ceux qui passaient.
 * Rien dans la consigne ne demandait de citer court.
 */
export const MAX_CITATION = Number(process.env["MAX_CITATION"] ?? 200);

/**
 * Client réel, adossé à l'API Claude.
 *
 * `groupes` restreint les champs demandés. Le crawl de prix n'a besoin que du
 * premier groupe : demander les dix-neuf champs quand on mesure le taux de
 * récupération du prix double le nombre d'appels et rend le coût mesuré
 * inutilisable pour décider d'une passe de prix. Par défaut, rien ne change.
 */
export function clientAnthropic(
  cle = process.env["ANTHROPIC_API_KEY"],
  groupes: readonly (readonly string[])[] = GROUPES_EXTRACTION,
): ClientExtraction {
  if (!cle) {
    throw new Error(
      "ANTHROPIC_API_KEY absente. L'extraction ne fonctionne pas sans clé — et deviner " +
        "les valeurs à sa place produirait exactement ce que ce pipeline existe pour empêcher.",
    );
  }
  const client = new Anthropic({ apiKey: cle });
  let appels = 0;
  let caracteres = 0;
  let jetonsEntree = 0;
  let jetonsSortie = 0;

  return {
    depense: () => ({ appels, caracteresEnvoyes: caracteres, jetonsEntree, jetonsSortie }),
    async extraire(texte, url) {
      /*
        PAS DE SORTIE STRUCTURÉE. La grammaire d'un schéma à champs cités ne
        compile pas — « Schema is too complex » à 19 champs, « Grammar
        compilation timed out » à 10 : chaque champ est un objet imbriqué
        {valeur, extrait}, et le coût de compilation explose.

        Ce n'est pas une perte de garantie. La sortie structurée n'aurait
        garanti que la *forme* ; ce qui protège le catalogue est la
        vérification programmatique des citations, qui s'applique de la même
        façon à un JSON libre. Un champ mal formé se perd, ce qui est le
        comportement voulu : pas de citation, pas d'écriture.
      */
      if (appels + groupes.length > PLAFOND_APPELS) {
        throw new Error(
          `Plafond de ${PLAFOND_APPELS} appels atteint (${appels} effectués). ` +
            `Relancer avec PLAFOND_APPELS plus haut si c'est voulu.`,
        );
      }

      const resultats = await Promise.all(
        groupes.map(async (groupe) => {
          appels += 1;
          caracteres += texte.length;
          const proprietes = Object.fromEntries(
            groupe.map((champ) => [
              champ,
              SCHEMA_EXTRACTION.properties[champ as keyof typeof SCHEMA_EXTRACTION.properties],
            ]),
          );
          const message = await client.messages.create({
            model: MODELE,
            max_tokens: 8_000,
            ...(REFLECHIT ? { thinking: { type: "adaptive" as const } } : {}),
            system: CONSIGNE,
            messages: [
              {
                role: "user",
                content:
                  `Champs à localiser, au format JSON :\n${JSON.stringify(proprietes, null, 1)}\n\n` +
                  `Réponds UNIQUEMENT par un objet JSON dont chaque clé est un champ ci-dessus ` +
                  `et chaque valeur un objet {"valeur": ..., "extrait": "..."}. ` +
                  `Omets tout champ que la page ne porte pas littéralement.\n\n` +
                  `URL : ${url}\n\n---\n${texte}`,
              },
            ],
          });
          jetonsEntree += message.usage.input_tokens;
          jetonsSortie += message.usage.output_tokens;
          const bloc = message.content.find((c) => c.type === "text");
          if (!bloc || !("text" in bloc)) return {};
          // Un JSON mal formé se perd sans bruit : pas de citation, pas
          // d'écriture. C'est le comportement voulu, pas une dégradation.
          const json = bloc.text.match(/\{[\s\S]*\}/)?.[0];
          try {
            return json ? JSON.parse(json) : {};
          } catch {
            return {};
          }
        }),
      );
      return Object.assign({}, ...resultats);
    },
  };
}

/**
 * Extrait une page et ne retient que ce qui est cité.
 *
 * Le texte passé à la vérification est **exactement** celui envoyé au modèle :
 * comparer à un texte retraité rendrait le garde-fou inopérant, puisque la
 * citation serait confrontée à une page que le modèle n'a jamais vue.
 */
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

/**
 * Convertit une date écrite en toutes lettres, APRÈS vérification de citation.
 *
 * L'ordre compte : normaliser avant la vérification rendrait la valeur
 * introuvable dans la citation, ce qui est exactement le rejet qu'on corrige.
 * Le modèle cite la forme de la page, le code produit la forme du catalogue.
 */
export function normaliserDate(valeur: unknown): unknown {
  if (typeof valeur !== "string") return valeur;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return valeur;
  const m = valeur.toLowerCase().match(/(\d{1,2})\s+([a-zéûôà]+)\s+(\d{4})/);
  if (!m) return valeur;
  const mois = MOIS.findIndex((x) => x.startsWith(m[2]!.slice(0, 4)));
  if (mois < 0) return valeur;
  return `${m[3]}-${String(mois + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

export async function extrairePage(
  client: ClientExtraction,
  texte: string,
  url: string,
): Promise<Extraction> {
  const brut = await client.extraire(texte, url);
  const proposes = Object.values(brut).filter(
    (v) => v !== null && v !== undefined && v.valeur !== null && v.valeur !== undefined,
  ).length;
  const filtrage = filtrerParCitation(brut, texte);
  const date = filtrage.retenus["dateVerification"];
  if (date) date.valeur = normaliserDate(date.valeur);
  return { url, filtrage, proposes };
}
