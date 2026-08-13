/**
 * Aide au choix — un moteur d'adéquation, pas de recommandation.
 *
 * La distinction est affichée à l'écran, pas seulement respectée dans le code :
 * l'utilisateur doit savoir que le résultat décrit une adéquation avec sa
 * situation, et non un niveau de qualité. Les écarts sont affichés au même rang
 * que les correspondances — c'est souvent l'information la plus utile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { libellePrixQualifie } from "@/modele/modalite-acces";
import { createFileRoute } from "@tanstack/react-router";
import { FilAriane } from "@/composants/FilAriane";
import { chargerListe } from "@/donnees/requetes";
import {
  questionsApplicables,
  situationComplete,
  resultatsAdequation,
  type Adequation,
  type ResultatsAdequation,
  type Situation,
} from "@/modele/adequation";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";

import { redigerAdequation, type PhraseRedigee } from "@/ingestion/adequation.functions";
import { Button } from "@/components/ui/button";
import { useOuvertureFiche, validerFiche } from "@/composants/ouverture-fiche";
import { declarerVue, mesurer } from "@/composants/mesure";
import { PanneauFiche } from "@/composants/PanneauFiche";
import { BulleEntrante, BulleSortante, Compteur } from "@/composants/Bulle";
import {
  construireFil,
  memoriserConversation,
  relireConversation,
  reprendreDepuis,
} from "@/composants/conversation";
import { TrainingResultCard } from "@/composants/TrainingResultCard";

export const Route = createFileRoute("/aide-au-choix")({
  /*
    `?fiche=` ouvre le panneau PAR-DESSUS le questionnaire. Sans ce validateur,
    le paramètre serait effacé à la première navigation et le panneau se
    refermerait seul — et surtout, un clic sur une correspondance renverrait à
    la page dédiée, d'où le retour ramenait à l'accueil : réponses et
    correspondances perdues.
  */
  validateSearch: validerFiche,
  loader: () => chargerListe(),
  component: AideAuChoix,
  head: () => ({
    meta: [
      { title: "Aide au choix — quelle formation pour votre situation | Formlist" },
      {
        name: "description",
        content:
          "Quatre questions, puis tous les parcours qui réunissent vos réponses. Une adéquation avec votre situation, pas une évaluation de qualité.",
      },
    ],
  }),
});

function AideAuChoix() {
  const { fiche } = Route.useSearch();
  /*
    Repli de focus : le titre des résultats. Il est présent dès qu'une fiche a
    pu être ouverte depuis cette vue, et c'est là qu'on revient — aux
    correspondances, pas en haut de la conversation.
  */
  const titreResultats = useRef<HTMLHeadingElement | null>(null);
  const { proprietesLien, fermer: fermerPanneau } = useOuvertureFiche({
    retourParDefaut: titreResultats,
  });
  useEffect(() => declarerVue("aide_au_choix"), []);

  const parcours = Route.useLoaderData();
  const [reponses, setReponses] = useState<Partial<Situation>>({});
  const [resultats, setResultats] = useState<ResultatsAdequation | null>(null);
  const [phrases, setPhrases] = useState<Map<string, PhraseRedigee>>(new Map());
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  /*
    La question courante n'apparaît qu'après un délai. C'est le seul état de
    mise en scène : tout le reste se dérive des réponses.
  */
  const [questionVisible, setQuestionVisible] = useState(true);

  /*
    REPRISE APRÈS RECHARGEMENT. Lue au montage, jamais au premier rendu : le
    stockage n'existe pas côté serveur, et le lire tout de suite produirait un
    HTML différent de celui du client.
  */
  useEffect(() => {
    const reprise = relireConversation();
    if (reprise !== null) setReponses(reprise);
  }, []);
  useEffect(() => memoriserConversation(reponses), [reponses]);

  /*
    TOUT SE DÉRIVE DU FIL : les messages, les compteurs, la question posée, et
    le fait qu'il n'en reste aucune. Rien n'est mémorisé en double.
  */
  const fil = useMemo(() => construireFil(parcours, reponses), [parcours, reponses]);
  const termine = fil.courante === null;
  const restants = fil.echanges.at(-1)?.apres ?? parcours.length;
  const impasse = restants === 0;

  /* Le défilement suit le dernier message, jamais brutalement. */
  const bas = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bas.current?.scrollIntoView({ behavior: doux ? "smooth" : "auto", block: "end" });
  }, [fil.echanges.length, questionVisible, resultats]);

  /* La question suivante entre après un temps, réglé par un jeton. */
  useEffect(() => {
    if (termine) return;
    setQuestionVisible(false);
    const attente = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--conversation-attente"),
      10,
    );
    const minuterie = setTimeout(() => setQuestionVisible(true), Number.isNaN(attente) ? 0 : attente);
    return () => clearTimeout(minuterie);
  }, [fil.echanges.length, termine]);

  function repondre(cle: keyof Situation, valeur: string) {
    if (fil.echanges.length === 0) mesurer("aide_au_choix_demarree");
    mesurer("aide_au_choix_question_repondue", {
      question: cle,
      reponse: valeur,
      nombre: fil.echanges.length + 1,
    });
    setReponses((actuelles) => ({ ...actuelles, [cle]: valeur }));
    setResultats(null);
  }

  /* Retirer une réponse retire aussi les suivantes : elles ont été données
     dans un contexte qui n'existe plus. */
  function modifier(cle: keyof Situation) {
    setReponses(reprendreDepuis(fil, cle));
    setResultats(null);
    setPhrases(new Map());
    setAvertissement(null);
  }

  function recommencer() {
    setReponses({});
    setResultats(null);
    setPhrases(new Map());
    setAvertissement(null);
  }

  async function chercher() {
    if (!situationComplete(fil.retenues)) return;
    setEnCours(true);
    setPhrases(new Map());
    setAvertissement(null);

    const retenus = resultatsAdequation(parcours, fil.retenues);
    setResultats(retenus);
    /*
      Mesuré sur le CALCUL, avant la rédaction : celle-ci passe par un service
      externe qui peut échouer, et un questionnaire mené jusqu'au bout reste
      terminé même sans phrase rédigée.
    */
    mesurer("aide_au_choix_terminee", {
      nombre: retenus.exactes.length,
      /* `correspond` est une LISTE de critères satisfaits, jamais un booléen :
         la filtrer sur sa seule présence comptait tous les résultats, à chaque
         fois — le code tournait, ne plantait pas, et mesurait autre chose. */
      quasi: retenus.quasi.length,
    });

    try {
      const resume = fil.echanges.map((e) => `${e.intitule} ${e.libelle}`).join(" ");
      const resultat = await redigerAdequation({
        data: {
          situation: resume,
          /* Les deux sections passent à la rédaction : une quasi-correspondance
             mérite sa phrase autant qu'une correspondance exacte. */
          candidats: [...retenus.exactes, ...retenus.quasi].map((a) => ({
            slug: a.parcours.slug,
            nom: a.parcours.nom,
            organisme: a.parcours.organismeNom,
            domaine: LIBELLES_DOMAINES[a.parcours.domaine],
            sujetPrincipal: a.parcours.sujetPrincipal,
            prix: libellePrixQualifie(a.parcours.prixMin, a.parcours.prixMax, a.parcours.modaliteAcces),
            duree: a.parcours.duree ?? "Non communiquée",
            correspond: a.correspond,
            ecarts: a.ecarts,
          })),
        },
      });
      setPhrases(new Map(resultat.phrases.map((p) => [p.slug, p])));
      setAvertissement(resultat.avertissement);
    } catch (e) {
      setAvertissement(
        `La rédaction automatique est indisponible (${e instanceof Error ? e.message : String(e)}). Les correspondances et les écarts ci-dessous restent calculés et exacts.`,
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-10)">
      <div className="mx-auto max-w-(--conversation-largeur)">
        <FilAriane miettes={[{ libelle: "Accueil", chemin: "/" }, { libelle: "Aide au choix" }]} />
        <h1 className="font-titre text-2xl font-semibold sm:text-3xl">Aide au choix</h1>
        <p className="mt-(--space-3) t-body-sm text-(--text-secondary)">
          Quelques questions sur votre situation, puis tous les parcours qui y correspondent —
          aucun n&apos;est écarté pour tenir dans une liste. Nous n&apos;évaluons aucun organisme
          et ne classons rien par qualité.
        </p>

        {/*
          LA CONVERSATION. Elle se remplit du haut vers le bas, et `space-6`
          sépare un échange du suivant là où `space-4` sépare deux messages du
          même échange : c'est l'espacement qui groupe, pas un cadre.
        */}
        <div
          aria-live="polite"
          className="mt-(--space-8) flex flex-col gap-(--space-6)"
        >
          {fil.echanges.map((echange) => (
            <div key={echange.cle} className="flex flex-col gap-(--space-4)">
              <BulleEntrante>{echange.intitule}</BulleEntrante>
              <div className="flex flex-col gap-(--space-1)">
                <BulleSortante
                  modifier={() => modifier(echange.cle)}
                  libelleModification={`Modifier : ${echange.intitule}`}
                >
                  {echange.libelle}
                </BulleSortante>
                <Compteur avant={echange.avant} apres={echange.apres} />
              </div>
            </div>
          ))}

          {/*
            L'IMPASSE SE DIT TOUT DE SUITE. Laisser dérouler jusqu'au bout pour
            n'afficher aucun résultat fait perdre trois écrans avant d'annoncer
            une absence connue dès la réponse précédente.
          */}
          {impasse && fil.echanges.length > 0 && (
            <div className="flex flex-col gap-(--space-4)">
              <BulleEntrante>
                <p>Aucun parcours du catalogue ne réunit ces réponses.</p>
                <p className="mt-(--space-2) t-body-sm text-(--text-secondary)">
                  Ce n&apos;est pas un manque de résultats : c&apos;est un fait sur le catalogue
                  tel qu&apos;il est publié aujourd&apos;hui.
                </p>
                <button
                  type="button"
                  onClick={() => modifier(fil.echanges.at(-1)!.cle)}
                  className="mt-(--space-3) rounded-(--radius-sm) t-body-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
                >
                  Revenir sur la réponse précédente
                </button>
              </BulleEntrante>
            </div>
          )}

          {!termine && !impasse && questionVisible && fil.courante !== null && (
            <div className="flex flex-col gap-(--space-4)">
              <BulleEntrante>{fil.courante.intitule}</BulleEntrante>
              {/*
                AUCUN CHAMP DE SAISIE, NULLE PART. Ce n'est pas un assistant :
                c'est un questionnaire dans une forme conversationnelle, et un
                champ libre laisserait croire qu'on peut lui parler.
              */}
              <div className="flex flex-wrap gap-(--space-2)">
                {Object.entries(fil.courante.options as Record<string, string>).map(
                  ([valeur, libelle]) => (
                    <button
                      key={valeur}
                      type="button"
                      onClick={() => repondre(fil.courante!.cle as keyof Situation, valeur)}
                      className="inline-flex h-(--conversation-pastille-hauteur) items-center rounded-(--radius-full) border border-(--border-default) bg-(--surface-raised) px-(--space-4) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
                    >
                      {libelle}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {termine && !impasse && resultats === null && (
            <div className="flex flex-col gap-(--space-4)">
              <BulleEntrante>
                <span className="chiffre">{restants}</span>{" "}
                {restants > 1 ? "parcours correspondent" : "parcours correspond"} à ce que vous
                m&apos;avez dit. Je vous {restants > 1 ? "les montre tous" : "le montre"}.
              </BulleEntrante>
              <div className="flex justify-start">
                <Button onClick={() => void chercher()} disabled={enCours}>
                  {enCours ? "Recherche en cours…" : "Voir les correspondances"}
                </Button>
              </div>
            </div>
          )}

          {resultats !== null && (
            <BulleEntrante>
              {resultats.exactes.length > 1
                ? "Voici les parcours qui réunissent ce que vous m'avez dit."
                : resultats.exactes.length === 1
                  ? "Voici le parcours qui réunit ce que vous m'avez dit."
                  : "Aucun parcours ne réunit tout, mais certains en sont proches."}
            </BulleEntrante>
          )}

          <div ref={bas} />
        </div>

        {fil.echanges.length > 0 && (
          <div className="mt-(--space-6) flex justify-start">
            <button
              type="button"
              onClick={recommencer}
              className="rounded-(--radius-sm) t-body-sm text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
            >
              Recommencer
            </button>
          </div>
        )}

        <p className="mt-(--space-6) t-caption text-(--text-secondary)">
          Le résultat indique une adéquation avec votre situation, pas un niveau de qualité. Nous
          n&apos;évaluons aucun organisme.
        </p>

        {avertissement !== null && (
          <p className="mt-(--space-6) rounded-(--radius-md) border border-(--border-subtle) p-(--space-3) t-caption text-(--text-secondary)">
            {avertissement}
          </p>
        )}
      </div>

      {/*
        LES RÉSULTATS SORTENT DE LA CONVERSATION. Une fiche de parcours dans une
        bulle serait illisible : elle porte un coût, une certification, un
        compteur d'informations. Ils s'affichent donc en pleine largeur, dans la
        carte de l'explorateur — la même partout.
      */}
      {resultats !== null && (
        <section className="mt-(--space-10)">
          <h2 ref={titreResultats} tabIndex={-1} className="font-titre text-xl font-medium">
            <span className="chiffre">{resultats.exactes.length}</span>{" "}
            {resultats.exactes.length > 1 ? "correspondances" : "correspondance"}
            {resultats.quasiTotal > 0 && (
              <>
                {" · "}
                <span className="chiffre">{resultats.quasiTotal}</span> à un écart près
              </>
            )}
          </h2>

          {/*
            PLEINE LARGEUR, SANS COLONNE D'ÉCARTS. Une carte de cette section
            n'a par construction aucun écart : afficher « aucun écart constaté »
            douze fois de suite, c'est une colonne qui ne dit jamais rien, et une
            mise en garde répétée douze fois n'est plus une mise en garde.

            Le fait d'être ICI dit déjà tout ce que la colonne disait.
          */}
          <ul className="mt-(--space-6) flex flex-col gap-(--space-8)">
            {resultats.exactes.map((a) => (
              <li key={a.parcours.slug}>
                <ul className="flex flex-col gap-(--space-4)">
                  <TrainingResultCard parcours={a.parcours} />
                </ul>

                {phrases.has(a.parcours.slug) && (
                  <p className="mt-(--space-3) t-body-sm text-(--text-secondary)">
                    {phrases.get(a.parcours.slug)!.phrase}
                  </p>
                )}

                <div className="mt-(--space-4)">
                  <h3 className="t-caption font-medium uppercase tracking-wide text-atteste">
                    ✓ Ce qui correspond
                  </h3>
                  <ul className="mt-(--space-2) space-y-(--space-1) t-body-sm">
                    {a.correspond.length === 0 ? (
                      <li className="text-(--text-secondary)">Aucun critère satisfait</li>
                    ) : (
                      a.correspond.map((c) => <li key={c}>{c}</li>)
                    )}
                  </ul>
                </div>
              </li>
            ))}
          </ul>

          {/*
            LES QUASI-CORRESPONDANCES — c'est ici, et NULLE PART AILLEURS, que
            la notion d'écart a un sens. Personne n'a une contrainte absolue sur
            les quatre critères : effacer ces parcours au motif qu'il leur manque
            une réponse ferait passer l'assistant à côté de son propre objet.

            « Ce qui ne colle pas » est l'information la plus honnête du produit,
            et la seule qui distingue une adéquation d'une recommandation.
          */}
          {resultats.quasi.length > 0 && (
            <div className="mt-(--space-12) border-t border-(--border-subtle) pt-(--space-8)">
              <h2 className="font-titre text-xl font-medium">À un écart près</h2>
              <p className="mt-(--space-2) t-body-sm text-(--text-secondary)">
                Ces parcours réunissent toutes vos réponses sauf une, nommée sous chacun.
                {resultats.quasiTotal > resultats.quasi.length && (
                  <>
                    {" "}
                    Les <span className="chiffre">{resultats.quasi.length}</span> plus proches sont
                    affichés, sur <span className="chiffre">{resultats.quasiTotal}</span>.
                  </>
                )}
              </p>

              <ul className="mt-(--space-6) flex flex-col gap-(--space-8)">
                {resultats.quasi.map((a) => (
                  <li key={a.parcours.slug}>
                    <ul className="flex flex-col gap-(--space-4)">
                      <TrainingResultCard parcours={a.parcours} />
                    </ul>

                    {phrases.has(a.parcours.slug) && (
                      <p className="mt-(--space-3) t-body-sm text-(--text-secondary)">
                        {phrases.get(a.parcours.slug)!.phrase}
                      </p>
                    )}

                    {/* L'écart, nommé. Il n'y en a qu'un — c'est la définition
                        de la section, pas une troncature de la liste. */}
                    <p className="mt-(--space-4) t-body-sm text-absent">
                      <span className="font-medium uppercase tracking-wide t-caption">≠ </span>
                      {a.ecarts[0]}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-(--space-8) border-t border-(--border-subtle) pt-(--space-4) t-caption text-(--text-secondary)">
            Un écart n'est pas un défaut : c'est un fait utile pour décider. Et une correspondance
            sans aucun écart signale parfois une fiche trop peu renseignée pour qu'un écart ait pu
            être constaté, pas un parcours sans compromis.
          </p>
        </section>
      )}

      {fiche !== undefined && (
        <PanneauFiche slug={fiche} autresParcours={parcours} fermer={fermerPanneau} />
      )}
    </main>
  );
}
