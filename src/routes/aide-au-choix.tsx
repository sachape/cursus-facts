/**
 * Aide au choix — un moteur d'adéquation, pas de recommandation.
 *
 * La distinction est affichée à l'écran, pas seulement respectée dans le code :
 * l'utilisateur doit savoir que le résultat décrit une adéquation avec sa
 * situation, et non un niveau de qualité. Les écarts sont affichés au même rang
 * que les correspondances — c'est souvent l'information la plus utile.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { chargerListe } from "@/donnees/requetes";
import {
  QUESTIONS,
  situationComplete,
  troisCorrespondances,
  type Adequation,
  type Situation,
} from "@/modele/adequation";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { libellePrix } from "@/composants/RangeeParcours";
import { redigerAdequation, type PhraseRedigee } from "@/ingestion/adequation.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/aide-au-choix")({
  loader: () => chargerListe(),
  component: AideAuChoix,
  head: () => ({
    meta: [
      { title: "Aide au choix — quelle formation pour votre situation | Cursus" },
      {
        name: "description",
        content:
          "Cinq questions, trois correspondances avec leurs écarts explicites. Une adéquation avec votre situation, pas une évaluation de qualité.",
      },
    ],
  }),
});

function AideAuChoix() {
  const parcours = Route.useLoaderData();
  const [reponses, setReponses] = useState<Partial<Situation>>({});
  const [resultats, setResultats] = useState<Adequation[] | null>(null);
  const [phrases, setPhrases] = useState<Map<string, PhraseRedigee>>(new Map());
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const complete = situationComplete(reponses);
  const manquantes = QUESTIONS.filter((q) => reponses[q.cle as keyof Situation] === undefined);

  async function chercher() {
    if (!situationComplete(reponses)) {
      setRefus(
        `Les cinq questions doivent être renseignées pour établir une adéquation. Il en manque ${manquantes.length} : ${manquantes.map((q) => q.intitule.replace(/\s*\?$/, "").toLowerCase()).join(", ")}.`,
      );
      return;
    }
    setRefus(null);
    setEnCours(true);
    setPhrases(new Map());
    setAvertissement(null);

    const trois = troisCorrespondances(parcours, reponses);
    setResultats(trois);

    try {
      const resume = QUESTIONS.map((q) => {
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
            prix: libellePrix(a.parcours.prixMin, a.parcours.prixMax),
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
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Cinq questions sur votre situation, trois parcours qui y correspondent — avec ce qui ne
        correspond pas. Nous n&apos;évaluons aucun organisme et ne classons rien par qualité.
      </p>

      <div className="mt-8 space-y-8">
        {QUESTIONS.map((question) => {
          const cle = question.cle as keyof Situation;
          const options = question.options as Record<string, string>;
          return (
            <fieldset key={question.cle}>
              <legend className="font-titre text-base font-medium">{question.intitule}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(options).map(([valeur, libelle]) => {
                  const choisi = reponses[cle] === valeur;
                  return (
                    <button
                      key={valeur}
                      type="button"
                      aria-pressed={choisi}
                      onClick={() => {
                        setReponses((r) => ({ ...r, [cle]: valeur }));
                        setRefus(null);
                      }}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        choisi
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      {libelle}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="mt-10">
        <Button onClick={chercher} disabled={enCours}>
          {enCours ? "Recherche en cours…" : "Voir les correspondances"}
        </Button>
        <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
          Le résultat indique une adéquation avec votre situation, pas un niveau de qualité. Nous
          n&apos;évaluons aucun organisme.
        </p>

        {refus !== null && (
          <p role="alert" className="mt-4 rounded-md border border-absent/40 p-3 text-sm text-absent">
            {refus}
          </p>
        )}
      </div>

      {avertissement !== null && (
        <p className="mt-8 rounded-md border border-border p-3 text-xs text-muted-foreground">
          {avertissement}
        </p>
      )}

      {resultats !== null && (
        <section className="mt-10">
          <h2 className="font-titre text-xl font-medium">Trois correspondances</h2>
          <ul className="mt-4 space-y-6">
            {resultats.map((a) => (
              <li key={a.parcours.slug} className="border-t border-border pt-5">
                <h3 className="font-titre text-base font-medium">
                  <Link
                    to="/parcours/$slug"
                    params={{ slug: a.parcours.slug }}
                    className="hover:underline hover:underline-offset-4"
                  >
                    {a.parcours.nom}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.parcours.organismeNom}</p>
                <p className="chiffre mt-2 text-sm">
                  {libellePrix(a.parcours.prixMin, a.parcours.prixMax)}
                  {a.parcours.duree !== null && (
                    <span className="text-muted-foreground"> · {a.parcours.duree}</span>
                  )}
                </p>

                {phrases.has(a.parcours.slug) && (
                  <p className="mt-3 text-sm leading-relaxed">
                    {phrases.get(a.parcours.slug)!.phrase}
                  </p>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wide text-atteste">
                      ✓ Ce qui correspond
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      {a.correspond.length === 0 ? (
                        <li className="text-muted-foreground">Aucun critère satisfait</li>
                      ) : (
                        a.correspond.map((c) => <li key={c}>{c}</li>)
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wide text-absent">
                      ≠ Ce qui ne correspond pas
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      {a.ecarts.length === 0 ? (
                        <li className="text-muted-foreground">
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

          <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            Les écarts ne sont pas des défauts : ce sont des faits utiles pour décider. Une
            correspondance sans aucun écart signale le plus souvent une fiche trop peu renseignée
            pour qu&apos;un écart ait pu être constaté, pas un parcours sans compromis.
          </p>
        </section>
      )}
    </main>
  );
}
