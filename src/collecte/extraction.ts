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

export const MODELE = "claude-opus-5";

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

export const SCHEMA_EXTRACTION = {
  type: "object",
  properties: {
    prix: champCite(nombre, "Tarif pour une personne (inter-entreprises), en euros. 0 si gratuit."),
    prixIntra: champCite(nombre, "Tarif de groupe (intra-entreprise), en euros."),
    modaliteAcces: champCite(
      { type: "string", enum: ["libre", "compte_requis", "compte_produit_requis", "certificat_payant", "freemium", "pris_en_charge"] },
      "Comment on accède au parcours quand il est gratuit ou partiellement gratuit.",
    ),
    duree: champCite(texte, "Durée telle qu'écrite : « 3 jours », « 6 mois »."),
    volumeHoraire: champCite(nombre, "Nombre total d'heures de formation."),
    formats: champCite(
      { type: "array", items: { type: "string", enum: ["Présentiel", "Distanciel", "Alternance"] } },
      "Modalités pédagogiques proposées.",
    ),
    region: champCite(texte, "Région ou ville où la formation a lieu."),
    niveauEntree: champCite(
      { type: "string", enum: ["Aucun prérequis", "Bac+2", "Bac+3", "Expérience"] },
      "Niveau d'entrée exigé.",
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
    dateVerification: champCite(texte, "Date de mise à jour affichée par la page, format AAAA-MM-JJ."),
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
};

/** Client réel, adossé à l'API Claude. */
export function clientAnthropic(cle = process.env["ANTHROPIC_API_KEY"]): ClientExtraction {
  if (!cle) {
    throw new Error(
      "ANTHROPIC_API_KEY absente. L'extraction ne fonctionne pas sans clé — et deviner " +
        "les valeurs à sa place produirait exactement ce que ce pipeline existe pour empêcher.",
    );
  }
  const client = new Anthropic({ apiKey: cle });

  return {
    async extraire(texte, url) {
      const message = await client.messages.create({
        model: MODELE,
        max_tokens: 8_000,
        thinking: { type: "adaptive" },
        system: CONSIGNE,
        output_config: { format: { type: "json_schema", schema: SCHEMA_EXTRACTION } },
        messages: [{ role: "user", content: `URL : ${url}\n\n---\n${texte}` }],
      });
      const bloc = message.content.find((c) => c.type === "text");
      return bloc && "text" in bloc ? JSON.parse(bloc.text) : {};
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
export async function extrairePage(
  client: ClientExtraction,
  texte: string,
  url: string,
): Promise<Extraction> {
  const brut = await client.extraire(texte, url);
  const proposes = Object.values(brut).filter(
    (v) => v !== null && v !== undefined && v.valeur !== null && v.valeur !== undefined,
  ).length;
  return { url, filtrage: filtrerParCitation(brut, texte), proposes };
}
