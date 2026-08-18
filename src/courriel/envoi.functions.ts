/**
 * L'envoi du comparatif — serveur uniquement.
 *
 * LA CLÉ NE TOUCHE JAMAIS LE NAVIGATEUR. Une clé d'API exposée au client est
 * utilisable par n'importe qui pour envoyer du courrier sous notre domaine, ce
 * qui brûlerait la réputation d'expédition en quelques heures. Elle est lue
 * dans `process.env`, ici, et `supabaseAdmin` n'est importé qu'à l'intérieur du
 * handler : un import de tête de fichier partirait dans le bundle client.
 *
 * LE CONTENU N'EST PAS FOURNI PAR LE CLIENT, il est reconstruit ici depuis le
 * catalogue à partir des seuls slugs. Accepter des lignes toutes faites
 * reviendrait à laisser n'importe qui faire envoyer le texte de son choix
 * depuis notre adresse d'expédition.
 */
import { createServerFn } from "@tanstack/react-start";
import { LIBELLES_FORMATS } from "@/modele/vocabulaires";
import { ADRESSE_CONTACT } from "@/modele/contact";
import { libellePrixQualifie } from "@/modele/modalite-acces";
import { coutDuParcours } from "@/modele/condition-cout";
import {
  motsInterditsDuComparatif,
  objetComparatif,
  rendreHtml,
  rendreTexte,
  type DonneesComparatif,
  type LigneComparatif,
} from "./comparatif";

const SITE = "https://formlist.fr";
/* L'adresse appartient à `modele/contact.ts` : une boîte écrite en dur ici
   survivrait à un changement d'adresse, et `contact.test.ts` l'interdit. */
const EXPEDITEUR = `Formlist <${ADRESSE_CONTACT}>`;

/** Bornes de la comparaison, alignées sur l'interface. */
const MIN_PARCOURS = 2;
const MAX_PARCOURS = 4;

export type ResultatEnvoi =
  /** Parti et accepté par Resend. `id` sert à retrouver l'envoi côté service. */
  | { statut: "ok"; id: string }
  /** Aucune clé côté serveur : l'interface ne doit pas proposer l'envoi. */
  | { statut: "non_configure" }
  /** Tout le reste. La raison est affichable telle quelle. */
  | { statut: "echec"; raison: string };

/**
 * L'interface a besoin de savoir si l'envoi est possible AVANT d'afficher quoi
 * que ce soit. Un bouton qui échouera toujours vaut moins qu'un bouton absent.
 */
export const configurationCourriel = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ actif: boolean }> => ({
    actif: Boolean(process.env["RESEND_API_KEY"]),
  }),
);

/** Contrôle de forme, volontairement permissif : seul l'envoi tranche vraiment. */
function adresseValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

type Entree = { email: string; consentement: boolean; slugs: string[] };

export const envoyerComparatif = createServerFn({ method: "POST" })
  .validator((donnees: Entree) => donnees)
  .handler(async ({ data }): Promise<ResultatEnvoi> => {
    const cle = process.env["RESEND_API_KEY"];
    if (!cle) return { statut: "non_configure" };

    const email = data.email.trim();
    if (!adresseValide(email)) {
      return { statut: "echec", raison: "Cette adresse ne semble pas valide." };
    }

    const slugs = [...new Set(data.slugs)].slice(0, MAX_PARCOURS);
    if (slugs.length < MIN_PARCOURS) {
      return { statut: "echec", raison: "Il faut au moins deux parcours à comparer." };
    }

    try {
      const { chargerFiche } = await import("@/donnees/requetes");
      const fiches = (await Promise.all(slugs.map((s) => chargerFiche(s)))).filter(
        (f): f is NonNullable<typeof f> => f !== null,
      );

      if (fiches.length < MIN_PARCOURS) {
        return { statut: "echec", raison: "Ces parcours ne sont plus disponibles." };
      }

      /*
        LES MÊMES FONCTIONS QUE L'ÉCRAN. `coutDuParcours` puis
        `libellePrixQualifie` : c'est l'expression exacte de la cellule « Prix »
        du tableau. Recomposer le prix autrement ferait diverger l'email de ce
        que la personne a vu, et c'est l'email qui aurait tort en silence.
      */
      const lignes: LigneComparatif[] = fiches.map((f) => {
        const cout = coutDuParcours(f);
        return {
          nom: f.nom,
          organisme: f.organismeNom,
          prix: cout.valeur ?? libellePrixQualifie(cout.montant, f.prixMax, f.modaliteAcces, f.unitePrix),
          conditionPrix: cout.condition ?? null,
          duree: f.duree ?? "",
          format: f.formats.map((x) => LIBELLES_FORMATS[x]).join(", "),
          certification: f.certification ?? "",
        };
      });

      /*
        LA LIGNE EST ÉCRITE AVANT L'ENVOI, et pas seulement pour conserver
        l'adresse : le lien de désabonnement porte un jeton, et ce jeton naît
        avec la ligne. Sans écriture préalable, l'email partirait sans moyen de
        s'en défaire — ce qui est interdit.
      */
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: abonnement, error } = await supabaseAdmin
        .from("abonnements")
        .insert({
          email,
          consentement: data.consentement,
          consentement_le: data.consentement ? new Date().toISOString() : null,
          source: "comparatif",
          parcours_ids: fiches.map((f) => f.slug),
        })
        .select("jeton_desabonnement")
        .single();

      if (error !== null || abonnement === null) {
        console.error("[courriel] écriture de l'abonnement refusée", error);
        return { statut: "echec", raison: "L'envoi n'a pas pu être enregistré. Réessayez." };
      }

      const donnees: DonneesComparatif = {
        lignes,
        urlComparaison: `${SITE}/comparer?ids=${fiches.map((f) => f.slug).join(",")}`,
        urlDesabonnement: `${SITE}/desabonnement/${abonnement.jeton_desabonnement}`,
        envoyeLe: new Date().toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };

      /*
        DERNIER CONTRÔLE AVANT LE DÉPART. Un mot de jugement dans un email est
        irrattrapable : il est parti, il porte la marque du produit, et personne
        ne peut le reprendre. On refuse plutôt que d'envoyer.
      */
      const interdits = motsInterditsDuComparatif(donnees);
      if (interdits.length > 0) {
        console.error("[courriel] vocabulaire de jugement, envoi refusé", interdits);
        return { statut: "echec", raison: "L'envoi a été refusé par un contrôle interne." };
      }

      const reponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EXPEDITEUR,
          to: [email],
          subject: objetComparatif(lignes),
          html: rendreHtml(donnees),
          text: rendreTexte(donnees),
          /*
            `List-Unsubscribe` double le lien du pied. Les messageries en font
            un bouton natif, et son absence pèse sur le classement en
            indésirables — le lien seul ne suffit pas à le leur signaler.
          */
          headers: {
            "List-Unsubscribe": `<${donnees.urlDesabonnement}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });

      if (!reponse.ok) {
        const detail = await reponse.text();
        console.error(`[courriel] Resend a refusé l'envoi (${reponse.status})`, detail);
        return { statut: "echec", raison: "L'email n'a pas pu être envoyé. Réessayez plus tard." };
      }

      const { id } = (await reponse.json()) as { id?: string };
      return { statut: "ok", id: id ?? "" };
    } catch (erreur) {
      console.error("[courriel] échec inattendu", erreur);
      return { statut: "echec", raison: "L'email n'a pas pu être envoyé. Réessayez plus tard." };
    }
  });
