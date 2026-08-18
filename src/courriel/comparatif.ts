/**
 * L'email de comparatif — rendu pur, sans aucune entrée/sortie.
 *
 * CE QU'IL EST, ET CE QU'IL N'EST PAS. Il restitue ce que la personne a
 * comparé. Il ne conclut pas, ne classe pas, ne relance pas. La sortie est
 * vérifiée contre `MOTS_INTERDITS` comme celle de l'assistant d'adéquation :
 * un email est le seul endroit du produit qui parle sans que personne ne soit
 * devant l'écran pour le contredire.
 *
 * LE PRIX ARRIVE DÉJÀ QUALIFIÉ, et ce module ne le recalcule jamais. La chaîne
 * est produite par `libellePrixQualifie`, la même que celle du tableau —
 * « 4 990 € » et « 4 990 € par année » ne décrivent pas la même dépense, et
 * c'est le défaut que le catalogue a corrigé le 3 août. Reconstruire le prix
 * ici rouvrirait la porte : deux chemins de calcul finissent toujours par
 * diverger, et c'est l'email qui aurait tort sans que personne ne le voie.
 *
 * SANS IMAGE, et pas seulement par sobriété : une image distante fait fuiter
 * l'ouverture vers un serveur tiers et se bloque par défaut dans la plupart des
 * clients, laissant un email troué.
 */
import { motsInterditsPresents } from "@/modele/adequation";

/** Les six faits restitués par parcours, déjà mis en forme. */
export type LigneComparatif = {
  nom: string;
  organisme: string;
  /** Déjà qualifié, unité comprise. Jamais un nombre nu. */
  prix: string;
  /** « Sous réserve de signer un contrat d'alternance », par exemple. */
  conditionPrix: string | null;
  duree: string;
  format: string;
  certification: string;
};

export type DonneesComparatif = {
  lignes: LigneComparatif[];
  /** Rouvre la comparaison sur le site. */
  urlComparaison: string;
  /** Obligatoire. Porte un jeton, jamais l'adresse en clair. */
  urlDesabonnement: string;
  /** Date d'envoi, au format long français déjà calculé par l'appelant. */
  envoyeLe: string;
};

/** Aucune valeur ne manque jamais : l'absence est un fait, elle se dit. */
const NON_COMMUNIQUE = "Non communiqué";

/**
 * Plafond de l'objet, en caractères.
 *
 * Gmail coupe autour de 70 sur bureau et 35 sur mobile, sans dire qu'il coupe.
 * Abréger nous-mêmes n'a de sens que si le TOTAL tient : la première version
 * plafonnait chaque nom et laissait passer 98 caractères à deux parcours.
 */
const LIMITE_OBJET = 70;

/**
 * L'objet, avec les intitulés abrégés.
 *
 * Un objet qui déborde est tronqué par le client de messagerie au milieu d'un
 * mot, et la troncature ne dit pas qu'elle a eu lieu. On abrège donc nous-mêmes,
 * en annonçant le reste : « et 2 autres » est une information, « Licence pro
 * E-commerce et mark… » n'en est pas une.
 */
export function objetComparatif(lignes: LigneComparatif[]): string {
  if (lignes.length === 0) return "Votre comparatif";

  const prefixe = "Votre comparatif — ";
  const abreger = (nom: string, max: number) =>
    nom.length <= max ? nom : `${nom.slice(0, max - 1).trimEnd()}…`;

  const [premier] = lignes;
  if (lignes.length === 1) {
    return prefixe + abreger(premier!.nom, LIMITE_OBJET - prefixe.length);
  }

  /*
    UN SEUL NOM AU-DELÀ D'UN PARCOURS, et le reste annoncé en nombre.

    Nommer les deux tenait sur le papier et donnait 98 caractères en pratique —
    mesuré sur un envoi réel. Deux noms abrégés assez court pour tenir ne se
    lisent plus ; un nom entier suivi de « et 2 autres » se lit, et dit la même
    chose. La contrainte est le PLAFOND TOTAL, jamais la longueur d'un nom
    isolé : c'est l'erreur que la première version faisait.
  */
  const autres = lignes.length - 1;
  const suffixe = autres === 1 ? " et 1 autre" : ` et ${autres} autres`;
  return prefixe + abreger(premier!.nom, LIMITE_OBJET - prefixe.length - suffixe.length) + suffixe;
}

/** Échappement HTML. Toute valeur dynamique y passe, sans exception. */
function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CHAMPS: Array<{ cle: keyof LigneComparatif; libelle: string }> = [
  { cle: "prix", libelle: "Prix" },
  { cle: "duree", libelle: "Durée" },
  { cle: "format", libelle: "Format" },
  { cle: "certification", libelle: "Certification" },
];

/**
 * Le pied, identique dans les deux versions.
 *
 * Il porte la date d'envoi — un comparatif se périme, et sans date on ne sait
 * pas de quand datent les chiffres qu'on relit six mois plus tard — la règle de
 * vérification, et le désabonnement. Ce dernier n'est pas une politesse : il est
 * obligatoire, et il doit être atteignable sans répondre à l'email.
 */
const MENTION_VERIFICATION =
  "Chaque information est relevée sur le site de l'organisme, avec sa date de vérification. " +
  "Formlist ne note pas, ne classe pas par qualité et ne touche aucune commission.";

export function rendreTexte(donnees: DonneesComparatif): string {
  const blocs = donnees.lignes.map((ligne) => {
    const lignes = [
      ligne.nom,
      ligne.organisme,
      ...CHAMPS.map(({ cle, libelle }) => `${libelle} : ${ligne[cle] || NON_COMMUNIQUE}`),
    ];
    if (ligne.conditionPrix !== null) lignes.splice(3, 0, `  ${ligne.conditionPrix}`);
    return lignes.join("\n");
  });

  return [
    "Voici les formations que vous avez comparées sur Formlist.",
    "",
    blocs.join("\n\n"),
    "",
    `Rouvrir la comparaison : ${donnees.urlComparaison}`,
    "",
    "—",
    `Envoyé le ${donnees.envoyeLe}.`,
    MENTION_VERIFICATION,
    `Se désabonner : ${donnees.urlDesabonnement}`,
  ].join("\n");
}

export function rendreHtml(donnees: DonneesComparatif): string {
  const parcours = donnees.lignes
    .map((ligne) => {
      const faits = CHAMPS.map(
        ({ cle, libelle }) =>
          `<tr>` +
          `<td style="padding:2px 12px 2px 0;color:#666;font-size:13px;vertical-align:top">${echapper(libelle)}</td>` +
          `<td style="padding:2px 0;color:#111;font-size:13px">${echapper(ligne[cle] || NON_COMMUNIQUE)}</td>` +
          `</tr>`,
      ).join("");

      const condition =
        ligne.conditionPrix === null
          ? ""
          : `<p style="margin:6px 0 0;color:#666;font-size:12px">${echapper(ligne.conditionPrix)}</p>`;

      return (
        `<div style="padding:16px 0;border-top:1px solid #e5e5e5">` +
        `<p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#111">${echapper(ligne.nom)}</p>` +
        `<p style="margin:0 0 10px;font-size:13px;color:#666">${echapper(ligne.organisme)}</p>` +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${faits}</table>` +
        condition +
        `</div>`
      );
    })
    .join("");

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body style="margin:0;padding:24px;background:#fafafa">` +
    `<div style="max-width:560px;margin:0 auto;background:#fff;padding:24px;` +
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">` +
    `<p style="margin:0 0 4px;font-size:14px;color:#111">Voici les formations que vous avez comparées sur Formlist.</p>` +
    parcours +
    `<p style="margin:20px 0 0;font-size:14px">` +
    `<a href="${echapper(donnees.urlComparaison)}" style="color:#111">Rouvrir la comparaison</a></p>` +
    `<hr style="margin:24px 0 12px;border:0;border-top:1px solid #e5e5e5">` +
    `<p style="margin:0 0 6px;font-size:12px;color:#666">Envoyé le ${echapper(donnees.envoyeLe)}.</p>` +
    `<p style="margin:0 0 6px;font-size:12px;color:#666">${echapper(MENTION_VERIFICATION)}</p>` +
    `<p style="margin:0;font-size:12px;color:#666">` +
    `<a href="${echapper(donnees.urlDesabonnement)}" style="color:#666">Se désabonner</a></p>` +
    `</div></body></html>`
  );
}

/**
 * Le garde-fou de vocabulaire, appliqué à l'email complet.
 *
 * Il ne corrige pas : il REFUSE. Une phrase de jugement dans un email est
 * irrattrapable — l'email est parti, personne ne peut le reprendre, et il porte
 * la marque du produit dans une boîte de réception. L'appelant traite un refus
 * comme un échec d'envoi, jamais comme un avertissement.
 */
export function motsInterditsDuComparatif(donnees: DonneesComparatif): string[] {
  return motsInterditsPresents(`${objetComparatif(donnees.lignes)}\n${rendreTexte(donnees)}`);
}
