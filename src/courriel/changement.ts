/**
 * L'email qui annonce un changement — rendu pur.
 *
 * IL MONTRE L'AVANT ET L'APRÈS, TOUJOURS LES DEUX. « Le prix a changé » oblige
 * à rouvrir le site pour savoir dans quel sens ; « 1 890 € → 1 690 € » se lit
 * dans la notification et suffit souvent à décider. Sans l'ancienne valeur, la
 * personne ne peut pas vérifier que le changement est bien celui qu'elle
 * attendait, et l'email devient une invitation à cliquer plutôt qu'une
 * information — ce que ce produit refuse d'être.
 *
 * IL N'INTERPRÈTE PAS. Une baisse de prix n'est pas une bonne nouvelle : elle
 * peut accompagner un programme raccourci. On énonce le fait, jamais son sens.
 */
import { motsInterditsPresents } from "@/modele/adequation";

/** Ce qui a bougé sur un parcours, mis en forme pour la lecture. */
export type ChangementLisible = {
  /** Le libellé du champ, en langue de l'interface. */
  champ: string;
  avant: string;
  apres: string;
};

export type ParcoursChange = {
  nom: string;
  organisme: string;
  changements: ChangementLisible[];
  /** La fiche sur le site. */
  url: string;
};

export type DonneesChangement = {
  parcours: ParcoursChange[];
  urlDesabonnement: string;
  envoyeLe: string;
};

/** Ce qu'on écrit quand la valeur n'existait pas, ou n'existe plus. */
export const ABSENT = "Non communiqué";

const LIMITE_OBJET = 70;

/** Libellés des champs suivis. Ceux de l'interface, jamais ceux de la base. */
export const LIBELLES_CHAMPS: Record<string, string> = {
  cout_apprenant: "Prix",
  duree: "Durée",
  programme: "Programme",
  certification: "Certification",
};

export function objetChangement(parcours: ParcoursChange[]): string {
  if (parcours.length === 0) return "Une information a changé";

  const prefixe = "A changé — ";
  const abreger = (nom: string, max: number) =>
    nom.length <= max ? nom : `${nom.slice(0, max - 1).trimEnd()}…`;

  if (parcours.length === 1) {
    return prefixe + abreger(parcours[0]!.nom, LIMITE_OBJET - prefixe.length);
  }
  const autres = parcours.length - 1;
  const suffixe = autres === 1 ? " et 1 autre" : ` et ${autres} autres`;
  return prefixe + abreger(parcours[0]!.nom, LIMITE_OBJET - prefixe.length - suffixe.length) + suffixe;
}

function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MENTION =
  "Vous recevez cet email parce que vous suivez ces formations. Chaque information est relevée " +
  "sur le site de l'organisme, avec sa date de vérification. Formlist ne note pas, ne classe pas " +
  "par qualité et ne touche aucune commission.";

export function rendreTexte(donnees: DonneesChangement): string {
  const blocs = donnees.parcours.map((p) =>
    [
      p.nom,
      p.organisme,
      ...p.changements.map((c) => `${c.champ} : ${c.avant} → ${c.apres}`),
      `Voir la fiche : ${p.url}`,
    ].join("\n"),
  );

  return [
    "Une information a changé sur ce que vous suivez.",
    "",
    blocs.join("\n\n"),
    "",
    "—",
    `Envoyé le ${donnees.envoyeLe}.`,
    MENTION,
    `Se désabonner : ${donnees.urlDesabonnement}`,
  ].join("\n");
}

export function rendreHtml(donnees: DonneesChangement): string {
  const blocs = donnees.parcours
    .map((p) => {
      const lignes = p.changements
        .map(
          (c) =>
            `<tr>` +
            `<td style="padding:2px 12px 2px 0;color:#666;font-size:13px;vertical-align:top">${echapper(c.champ)}</td>` +
            `<td style="padding:2px 0;color:#111;font-size:13px">` +
            `<span style="color:#666;text-decoration:line-through">${echapper(c.avant)}</span>` +
            ` → <strong>${echapper(c.apres)}</strong></td>` +
            `</tr>`,
        )
        .join("");

      return (
        `<div style="padding:16px 0;border-top:1px solid #e5e5e5">` +
        `<p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#111">${echapper(p.nom)}</p>` +
        `<p style="margin:0 0 10px;font-size:13px;color:#666">${echapper(p.organisme)}</p>` +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${lignes}</table>` +
        `<p style="margin:10px 0 0;font-size:13px">` +
        `<a href="${echapper(p.url)}" style="color:#111">Voir la fiche</a></p>` +
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
    `<p style="margin:0 0 4px;font-size:14px;color:#111">Une information a changé sur ce que vous suivez.</p>` +
    blocs +
    `<hr style="margin:24px 0 12px;border:0;border-top:1px solid #e5e5e5">` +
    `<p style="margin:0 0 6px;font-size:12px;color:#666">Envoyé le ${echapper(donnees.envoyeLe)}.</p>` +
    `<p style="margin:0 0 6px;font-size:12px;color:#666">${echapper(MENTION)}</p>` +
    `<p style="margin:0;font-size:12px;color:#666">` +
    `<a href="${echapper(donnees.urlDesabonnement)}" style="color:#666">Se désabonner</a></p>` +
    `</div></body></html>`
  );
}

/** Même garde-fou que le comparatif : on refuse plutôt que d'envoyer. */
export function motsInterditsDuChangement(donnees: DonneesChangement): string[] {
  return motsInterditsPresents(`${objetChangement(donnees.parcours)}\n${rendreTexte(donnees)}`);
}
