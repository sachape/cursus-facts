/**
 * Rédaction des phrases d'adéquation.
 *
 * RÉPARTITION DES RÔLES, VOLONTAIRE ET STRUCTURANTE.
 * Le choix des trois parcours, les correspondances et les écarts sont calculés
 * de façon déterministe par `src/modele/adequation.ts`. Le modèle de langage
 * n'intervient que pour rédiger UNE phrase factuelle par correspondance, à
 * partir de faits qu'on lui fournit.
 *
 * Il ne sélectionne rien, ne classe rien, et surtout n'invente aucun écart :
 * un écart halluciné serait une information déduite, ce que l'invariant 2
 * interdit. La sortie est en outre vérifiée contre le vocabulaire de jugement
 * avant d'être renvoyée — si le modèle écrit « la meilleure », la phrase est
 * remplacée par la version déterministe plutôt que corrigée.
 */
import { createServerFn } from "@tanstack/react-start";

export type CandidatRedaction = {
  slug: string;
  nom: string;
  organisme: string;
  domaine: string;
  sujetPrincipal: string;
  prix: string;
  duree: string;
  correspond: string[];
  ecarts: string[];
};

export type PhraseRedigee = {
  slug: string;
  phrase: string;
  /** Vrai si la phrase vient du repli déterministe et non du modèle. */
  repli: boolean;
};

export type ResultatRedaction = {
  phrases: PhraseRedigee[];
  /** Renseigné quand le modèle n'a pas pu être appelé. */
  avertissement: string | null;
};

/**
 * Phrase de repli, strictement factuelle, assemblée sans modèle.
 * Sert quand la clé API est absente, quand l'appel échoue, ou quand la sortie
 * du modèle contient du vocabulaire de jugement.
 */
function phraseDeterministe(candidat: CandidatRedaction): string {
  const morceaux = [
    `${candidat.sujetPrincipal}, dispensé par ${candidat.organisme}`,
    `prix : ${candidat.prix}`,
    `durée : ${candidat.duree}`,
  ];
  return `${morceaux.join(" · ")}. ${candidat.correspond.length} critère(s) de votre situation sont satisfaits, ${candidat.ecarts.length} écart(s) sont constatés.`;
}

const CONSIGNES = `Tu rédiges une phrase factuelle pour un comparateur de formations qui ne note rien et ne classe rien par qualité.

CONTRAINTES ABSOLUES :
- Les mots « meilleure », « meilleur », « top », « recommandée », « recommandé », « idéale » et « idéal » sont INTERDITS.
- N'exprime aucun jugement de valeur, aucune évaluation de qualité, aucune préférence entre les parcours.
- N'invente aucun fait. Utilise uniquement les informations fournies pour ce parcours.
- N'invente aucun écart et n'en atténue aucun : les écarts fournis sont calculés, pas suggérés.
- Ne compare pas les parcours entre eux.
- Ne t'adresse pas à l'utilisateur à la deuxième personne du singulier.

Ce que tu produis décrit une ADÉQUATION avec une situation, jamais un NIVEAU DE QUALITÉ.

Pour chaque parcours, écris UNE seule phrase de 25 mots maximum qui énonce ce que le parcours est, factuellement, au regard de la situation décrite. Pas d'introduction, pas de conclusion.`;

const SCHEMA_SORTIE = {
  type: "object",
  properties: {
    phrases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string" },
          phrase: { type: "string" },
        },
        required: ["slug", "phrase"],
        additionalProperties: false,
      },
    },
  },
  required: ["phrases"],
  additionalProperties: false,
} as const;

export const redigerAdequation = createServerFn({ method: "POST" })
  .validator((donnees: { situation: string; candidats: CandidatRedaction[] }) => donnees)
  .handler(async ({ data }): Promise<ResultatRedaction> => {
    const { motsInterditsPresents } = await import("@/modele/adequation");

    const repli = (avertissement: string | null): ResultatRedaction => ({
      phrases: data.candidats.map((c) => ({
        slug: c.slug,
        phrase: phraseDeterministe(c),
        repli: true,
      })),
      avertissement,
    });

    const cle = process.env["ANTHROPIC_API_KEY"];
    if (!cle) {
      return repli(
        "Les phrases sont assemblées automatiquement : la clé ANTHROPIC_API_KEY n'est pas configurée côté serveur. Les correspondances et les écarts, eux, sont calculés et exacts.",
      );
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: cle });

      const description = data.candidats
        .map((c) =>
          [
            `### ${c.slug}`,
            `Intitulé : ${c.nom}`,
            `Organisme : ${c.organisme}`,
            `Domaine : ${c.domaine} · Sujet principal : ${c.sujetPrincipal}`,
            `Prix : ${c.prix} · Durée : ${c.duree}`,
            `Ce qui correspond : ${c.correspond.join(" ; ") || "aucun critère satisfait"}`,
            `Ce qui ne correspond pas : ${c.ecarts.join(" ; ") || "aucun écart constaté"}`,
          ].join("\n"),
        )
        .join("\n\n");

      const reponse = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 4096,
        system: CONSIGNES,
        output_config: { format: { type: "json_schema", schema: SCHEMA_SORTIE } },
        messages: [
          {
            role: "user",
            content: `Situation de la personne : ${data.situation}\n\nParcours à décrire :\n\n${description}`,
          },
        ],
      });

      const bloc = reponse.content.find((b) => b.type === "text");
      if (!bloc || bloc.type !== "text") return repli("Le modèle n'a renvoyé aucun texte.");

      const analyse = JSON.parse(bloc.text) as { phrases: Array<{ slug: string; phrase: string }> };
      const parSlug = new Map(analyse.phrases.map((p) => [p.slug, p.phrase]));

      return {
        phrases: data.candidats.map((c) => {
          const redigee = parSlug.get(c.slug);
          // Une phrase contenant du vocabulaire de jugement est remplacée, pas
          // corrigée : on ne négocie pas avec l'invariant 6.
          if (!redigee || motsInterditsPresents(redigee).length > 0) {
            return { slug: c.slug, phrase: phraseDeterministe(c), repli: true };
          }
          return { slug: c.slug, phrase: redigee, repli: false };
        }),
        avertissement: null,
      };
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      return repli(`La rédaction automatique a échoué (${message}). Les faits restent exacts.`);
    }
  });
