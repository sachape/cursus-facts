/**
 * Aide au choix — un moteur d'adéquation, pas de recommandation.
 *
 * La distinction est affichée à l'écran, pas seulement respectée dans le code :
 * l'utilisateur doit savoir que le résultat décrit une adéquation avec sa
 * situation, et non un niveau de qualité. Les écarts sont affichés au même rang
 * que les correspondances — c'est souvent l'information la plus utile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { chargerListe } from "@/donnees/requetes";
import {
  compterCandidats,
  questionsApplicables,
  situationComplete,
  troisCorrespondances,
  type Adequation,
  type Situation,
} from "@/modele/adequation";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { libellePrix } from "@/composants/RangeeParcours";
import { redigerAdequation, type PhraseRedigee } from "@/ingestion/adequation.functions";
import { Button } from "@/components/ui/button";
import { useOuvertureFiche, validerFiche } from "@/composants/ouverture-fiche";
import { declarerVue, mesurer } from "@/composants/mesure";
import { PanneauFiche } from "@/composants/PanneauFiche";

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
          "Quatre questions, trois correspondances avec leurs écarts explicites. Une adéquation avec votre situation, pas une évaluation de qualité.",
      },
    ],
  }),
});

function AideAuChoix() {
  const { fiche } = Route.useSearch();
  /*
    Repli de focus : le titre des résultats. Il est présent dès qu'une fiche a
    pu être ouverte depuis cette vue, et c'est là qu'on revient — à la liste des
    correspondances, pas en haut du questionnaire.
  */
  const titreResultats = useRef<HTMLHeadingElement | null>(null);
  const { proprietesLien, fermer: fermerPanneau } = useOuvertureFiche({
    retourParDefaut: titreResultats,
  });
  useEffect(() => declarerVue("aide_au_choix"), []);
  const parcours = Route.useLoaderData();
  const [reponses, setReponses] = useState<Partial<Situation>>({});
  /** Index dans la liste des questions APPLICABLES, jamais dans `QUESTIONS`. */
  const [rang, setRang] = useState(0);
  const [sens, setSens] = useState<"avant" | "arriere">("avant");
  const [resultats, setResultats] = useState<Adequation[] | null>(null);
  const [phrases, setPhrases] = useState<Map<string, PhraseRedigee>>(new Map());
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  /*
    La liste des questions dépend des réponses : viser un diplôme ou un emploi
    retire celle du canal. Elle est donc recalculée à chaque réponse, et
    l'indicateur de progression compte dessus — annoncer « sur 4 » pour un
    parcours qui s'arrête à 3 ferait attendre un écran qui ne viendra pas.
  */
  const questions = useMemo(() => questionsApplicables(reponses), [reponses]);
  const question = questions[Math.min(rang, questions.length - 1)]!;
  const derniere = rang >= questions.length - 1;

  /*
    Le catalogue qui se réduit, sous chaque question. C'est ce qui transforme un
    questionnaire en exploration : on voit le catalogue travailler au lieu de
    répondre à l'aveugle.

    Compté par le modèle sur la situation partielle — jamais par une règle
    écrite ici, qui aurait fini par annoncer un nombre que les trois
    correspondances démentent.
  */
  const candidats = useMemo(() => compterCandidats(parcours, reponses), [parcours, reponses]);
  const aucunCandidat = candidats === 0;

  const repondre = (cle: keyof Situation, valeur: string) => {
    const suite = { ...reponses, [cle]: valeur } as Partial<Situation>;
    setReponses(suite);
    setRefus(null);
    /*
      LE DÉMARRAGE EST LA PREMIÈRE RÉPONSE, pas l'arrivée sur la page. Arriver
      sur le questionnaire et repartir n'est pas l'avoir commencé ; compter
      l'arrivée gonflerait le dénominateur avec des gens qui n'ont rien fait, et
      le taux d'abandon deviendrait illisible.
    */
    if (Object.keys(reponses).length === 0) mesurer("aide_au_choix_demarree");
    /*
      `question` et `reponse` portent les CLÉS, pas les intitulés : un intitulé
      reformulé casserait la continuité des rapports, alors que la clé survit à
      la réécriture. C'est aussi ce qui rend l'abandon lisible question par
      question — on voit à laquelle les gens s'arrêtent.
    */
    mesurer("aide_au_choix_question_repondue", { question: cle, reponse: valeur, nombre: rang + 1 });
    /*
      Avance automatique : un bouton de validation par écran ajoute un geste par
      question sans rien décider. Seule la dernière en porte un, parce qu'elle
      déclenche un calcul et non un passage.

      Le rang se recale sur la liste RECALCULÉE : répondre « diplôme reconnu »
      retire la question du canal, et un index figé aurait sauté une question ou
      pointé au-delà de la fin.
    */
    const suivantes = questionsApplicables(suite);
    if (rang < suivantes.length - 1) {
      setSens("avant");
      setRang(rang + 1);
    }
  };

  const revenir = () => {
    setSens("arriere");
    setRang((r) => Math.max(0, r - 1));
  };

  async function chercher() {
    if (!situationComplete(reponses)) {
      const manquantes = questions.filter((q) => reponses[q.cle as keyof Situation] === undefined);
      setRefus(
        `Il manque ${manquantes.length} réponse${manquantes.length > 1 ? "s" : ""} : ${manquantes.map((q) => q.intitule.replace(/\s*\?$/, "").toLowerCase()).join(", ")}.`,
      );
      return;
    }
    setRefus(null);
    setEnCours(true);
    setPhrases(new Map());
    setAvertissement(null);

    const trois = troisCorrespondances(parcours, reponses);
    setResultats(trois);
    /*
      Mesuré sur le CALCUL, avant la rédaction : celle-ci passe par un service
      externe qui peut échouer, et un questionnaire mené jusqu'au bout reste
      terminé même sans phrase rédigée. L'attacher à la réussite du service
      ferait baisser le taux d'achèvement quand c'est le service qui tombe.
    */
    mesurer("aide_au_choix_terminee", {
      nombre: trois.length,
      resultats: trois.filter((a) => a.correspond).length,
    });

    try {
      const resume = questions.map((q) => {
        const options = q.options as Record<string, string>;
        return `${q.intitule} ${options[reponses[q.cle as keyof Situation] as string]}`;
      }).join(" ");

      const resultat = await redigerAdequation({
        data: {
          situation: resume,
          candidats: trois.map((a) => ({
            slug: a.parcours.slug,
            nom: a.parcours.nom,
            organisme: a.parcours.organismeNom,
            domaine: LIBELLES_DOMAINES[a.parcours.domaine],
            sujetPrincipal: a.parcours.sujetPrincipal,
            prix: libellePrix(a.parcours.prixMin, a.parcours.prixMax, a.parcours.modaliteAcces),
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
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="font-titre text-2xl font-semibold sm:text-3xl">Aide au choix</h1>
      <p className="mt-3 max-w-2xl t-body-sm text-(--text-secondary)">
        Quelques questions sur votre situation, trois parcours qui y correspondent — avec ce qui ne
        correspond pas. Nous n&apos;évaluons aucun organisme et ne classons rien par qualité.
      </p>

      {/* Progression discrète : elle situe, elle ne presse pas. */}
      <div className="mt-(--space-8)">
        <p className="t-label text-(--text-tertiary)">
          Question <span className="chiffre">{rang + 1}</span> sur{" "}
          <span className="chiffre">{questions.length}</span>
        </p>
        <div className="mt-(--space-2) h-(--space-1) w-full overflow-hidden rounded-(--radius-full) bg-(--surface-sunken)">
          <div
            className="h-full rounded-(--radius-full) bg-(--interactive-default) transition-[width] duration-(--motion-base)"
            style={{ width: `${((rang + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/*
        Un écran, une question. `key` sur la clé de question : c'est ce qui
        rejoue l'animation d'entrée à chaque passage — sans elle React réutilise
        le nœud et le glissement ne se produit qu'une fois.
      */}
      <fieldset
        key={question.cle}
        className={`mt-(--space-6) motion-safe:animate-in motion-safe:duration-(--motion-base) ${
          sens === "avant"
            ? "motion-safe:slide-in-from-right-4"
            : "motion-safe:slide-in-from-left-4"
        }`}
      >
        <legend className="t-heading-2 text-(--text-primary)">{question.intitule}</legend>

        <div className="mt-(--space-5) flex flex-wrap gap-(--space-2)">
          {Object.entries(question.options as Record<string, string>).map(([valeur, libelle]) => {
            const cle = question.cle as keyof Situation;
            const choisi = reponses[cle] === valeur;
            return (
              <button
                key={valeur}
                type="button"
                aria-pressed={choisi}
                onClick={() => repondre(cle, valeur)}
                className={`rounded-(--radius-md) border px-(--space-4) py-(--space-2) t-body-sm transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) ${
                  choisi
                    ? "border-(--interactive-default) bg-(--interactive-default) text-(--text-on-inverse)"
                    : "border-(--border-default) hover:border-(--border-strong)"
                }`}
              >
                {libelle}
              </button>
            );
          })}
        </div>

        {/*
          Le catalogue qui travaille. La transition porte sur le chiffre : un
          nombre qui saute ne se lit pas comme une conséquence de la réponse.
        */}
        <p
          aria-live="polite"
          className="mt-(--space-4) t-caption text-(--text-tertiary) transition-opacity duration-(--motion-base)"
        >
          <span className="chiffre">{candidats}</span>{" "}
          {candidats > 1 ? "parcours correspondent" : "parcours correspond"} à vos réponses
        </p>

        {/*
          Zéro se dit TOUT DE SUITE. Laisser dérouler jusqu'au bout pour
          n'afficher aucun résultat fait perdre trois écrans avant d'annoncer
          une impasse qu'on connaissait dès la réponse précédente.
        */}
        {aucunCandidat && (
          <div
            role="alert"
            className="mt-(--space-4) rounded-(--radius-md) border border-(--status-absent) p-(--space-4) t-body-sm"
          >
            <p className="text-(--text-primary)">
              Aucun parcours du catalogue ne réunit ces réponses.
            </p>
            <p className="mt-(--space-2) text-(--text-secondary)">
              Ce n&apos;est pas un manque de résultats : c&apos;est un fait sur le catalogue tel
              qu&apos;il est publié aujourd&apos;hui. Revenez sur une réponse pour élargir.
            </p>
            {rang > 0 && (
              <button
                type="button"
                onClick={revenir}
                className="mt-(--space-3) rounded-(--radius-sm) underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
              >
                Revenir à la question précédente
              </button>
            )}
          </div>
        )}
      </fieldset>

      <div className="mt-(--space-8) flex flex-wrap items-center gap-(--space-4)">
        {rang > 0 && (
          <button
            type="button"
            onClick={revenir}
            className="rounded-(--radius-sm) t-body-sm text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          >
            ← Question précédente
          </button>
        )}

        {/*
          Un seul bouton dans tout le parcours, sur la dernière question :
          répondre fait avancer, sauf ici où ça déclenche un calcul.
        */}
        {derniere && (
          <Button onClick={chercher} disabled={enCours || !situationComplete(reponses)}>
            {enCours ? "Recherche en cours…" : "Voir les correspondances"}
          </Button>
        )}
      </div>

      <p className="mt-(--space-3) max-w-xl t-caption text-(--text-secondary)">
        Le résultat indique une adéquation avec votre situation, pas un niveau de qualité. Nous
        n&apos;évaluons aucun organisme.
      </p>

      {refus !== null && (
        <p
          role="alert"
          className="mt-(--space-4) rounded-(--radius-md) border border-absent/40 p-(--space-3) t-body-sm text-absent"
        >
          {refus}
        </p>
      )}

      {avertissement !== null && (
        <p className="mt-8 rounded-(--radius-md) border border-(--border-subtle) p-3 t-caption text-(--text-secondary)">
          {avertissement}
        </p>
      )}

      {resultats !== null && (
        <section className="mt-10">
          <h2 ref={titreResultats} tabIndex={-1} className="font-titre text-xl font-medium">
            Trois correspondances
          </h2>
          <ul className="mt-4 space-y-6">
            {resultats.map((a) => (
              <li key={a.parcours.slug} className="border-t border-(--border-subtle) pt-5">
                <h3 className="font-titre text-base font-medium">
                  <a
              {...proprietesLien(a.parcours)}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {a.parcours.nom}
                  </a>
                </h3>
                <p className="mt-1 t-body-sm text-(--text-secondary)">{a.parcours.organismeNom}</p>
                <p className="chiffre mt-2 t-body-sm">
                  {libellePrix(a.parcours.prixMin, a.parcours.prixMax, a.parcours.modaliteAcces)}
                  {a.parcours.duree !== null && (
                    <span className="text-(--text-secondary)"> · {a.parcours.duree}</span>
                  )}
                </p>

                {phrases.has(a.parcours.slug) && (
                  <p className="mt-3 t-body-sm">
                    {phrases.get(a.parcours.slug)!.phrase}
                  </p>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="t-caption font-medium uppercase tracking-wide text-atteste">
                      ✓ Ce qui correspond
                    </h4>
                    <ul className="mt-2 space-y-1 t-body-sm">
                      {a.correspond.length === 0 ? (
                        <li className="text-(--text-secondary)">Aucun critère satisfait</li>
                      ) : (
                        a.correspond.map((c) => <li key={c}>{c}</li>)
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="t-caption font-medium uppercase tracking-wide text-absent">
                      ≠ Ce qui ne correspond pas
                    </h4>
                    <ul className="mt-2 space-y-1 t-body-sm">
                      {a.ecarts.length === 0 ? (
                        <li className="text-(--text-secondary)">
                          Aucun écart constaté — vérifiez que la fiche est suffisamment renseignée
                        </li>
                      ) : (
                        a.ecarts.map((e) => <li key={e}>{e}</li>)
                      )}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 border-t border-(--border-subtle) pt-4 t-caption text-(--text-secondary)">
            Les écarts ne sont pas des défauts : ce sont des faits utiles pour décider. Une
            correspondance sans aucun écart signale le plus souvent une fiche trop peu renseignée
            pour qu&apos;un écart ait pu être constaté, pas un parcours sans compromis.
          </p>
        </section>
      )}

      {/*
        Le panneau s'ouvre par-dessus la vue, qui reste montée derrière lui : à
        la fermeture, les réponses au questionnaire et les correspondances sont
        toujours là, sans rechargement. C'est tout l'objet du chantier.
      */}
      {fiche !== undefined && (
        <PanneauFiche slug={fiche} autresParcours={parcours} fermer={fermerPanneau} />
      )}
    </main>
  );
}
