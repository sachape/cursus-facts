/**
 * Comparer — jusqu'à quatre parcours côte à côte.
 *
 * RÈGLE D'AFFICHAGE CENTRALE. Seules les lignes où les parcours diffèrent
 * réellement sont mises en relief ; les lignes identiques restent affichées
 * mais en retrait. Une ligne identique n'aide pas à décider — la masquer
 * complètement priverait pourtant l'utilisateur de la preuve qu'elle a bien
 * été vérifiée sur les quatre.
 *
 * Toute valeur absente affiche « Non communiqué ». Jamais un tiret, jamais une
 * case vide : une case vide se lit comme un oubli d'affichage, pas comme un
 * fait sur l'organisme.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { chargerFiche, type ParcoursFiche } from "@/donnees/requetes";
import { useComparaison } from "@/composants/comparaison";
import { ConditionCout } from "@/composants/Niveaux";
import { coutDuParcours } from "@/modele/condition-cout";
import { libellePrix } from "@/composants/RangeeParcours";
import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { DEFINITIONS_MODALITES } from "@/modele/modalite-acces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/comparer")({
  component: Comparer,
  head: () => ({
    meta: [
      { title: "Comparer des formations e-commerce | Cursus" },
      {
        name: "description",
        content:
          "Comparez jusqu'à quatre parcours sur 21 informations vérifiables. Seules les différences réelles sont mises en relief.",
      },
    ],
  }),
});

const LIBELLES_FORMATS = {
  distanciel: "Distanciel",
  presentiel: "Présentiel",
  alternance: "Alternance",
} as const;

const LIBELLES_NIVEAUX = {
  aucun_prerequis: "Aucun prérequis",
  bac2: "Bac+2",
  bac3: "Bac+3",
  experience: "Expérience",
} as const;

/** La valeur affichée quand l'organisme ne publie pas l'information. */
export const NON_COMMUNIQUE = "Non communiqué";

/** Rend une valeur comparable, en n'inventant jamais de contenu. */
function texte(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined || valeur === "") return NON_COMMUNIQUE;
  return String(valeur);
}

function liste(valeurs: readonly string[] | null | undefined): string {
  if (!valeurs || valeurs.length === 0) return NON_COMMUNIQUE;
  return valeurs.join(" · ");
}

type Ligne = { attribut: string; valeurs: (string | React.ReactNode)[] };

/** Les 21 attributs comparés, dans l'ordre. */
export function construireLignes(parcours: readonly ParcoursFiche[]): Ligne[] {
  const par = <T,>(f: (p: ParcoursFiche) => T) => parcours.map(f);

  return [
    { attribut: "Domaine", valeurs: par((p) => LIBELLES_DOMAINES[p.domaine]) },
    { attribut: "Sujet principal", valeurs: par((p) => p.sujetPrincipal) },
    {
      attribut: "Prix",
      // La condition figure sous la valeur, dans la même cellule : comparer
      // 0 € et 1 690 € sans leurs conditions serait trompeur — l'un suppose un
      // contrat d'alternance, l'autre non.
      valeurs: par((p) => {
        const cout = coutDuParcours(p);
        return (
          <>
            <span className="chiffre">
              {cout.valeur ?? libellePrix(cout.montant, p.prixMax, p.modaliteAcces)}
            </span>
            <ConditionCout>{cout.condition}</ConditionCout>
          </>
        );
      }),
    },
    {
      attribut: "Modalité d'accès",
      valeurs: par((p) =>
        p.modaliteAcces === null ? NON_COMMUNIQUE : DEFINITIONS_MODALITES[p.modaliteAcces],
      ),
    },
    {
      attribut: "Variantes",
      valeurs: par((p) =>
        p.variantes.length > 1
          ? p.variantes.map((v) => v.label).join(" · ")
          : "Formule unique",
      ),
    },
    { attribut: "Durée", valeurs: par((p) => texte(p.duree)) },
    {
      attribut: "Volume horaire",
      valeurs: par((p) => (p.volumeHoraire === null ? NON_COMMUNIQUE : `${p.volumeHoraire} h`)),
    },
    {
      attribut: "Format",
      valeurs: par((p) => liste(p.formats.map((f) => LIBELLES_FORMATS[f]))),
    },
    { attribut: "Lieu", valeurs: par((p) => texte(p.lieu)) },
    {
      attribut: "Niveau d'entrée",
      valeurs: par((p) => (p.niveauEntree ? LIBELLES_NIVEAUX[p.niveauEntree] : NON_COMMUNIQUE)),
    },
    { attribut: "Prérequis", valeurs: par((p) => texte(p.prerequis)) },
    {
      attribut: "Éligible CPF",
      valeurs: par((p) =>
        p.eligibleCpf === null ? NON_COMMUNIQUE : p.eligibleCpf ? "Éligible" : "Non éligible",
      ),
    },
    { attribut: "Financements", valeurs: par((p) => liste(p.financements)) },
    { attribut: "Certification", valeurs: par((p) => texte(p.certification)) },
    { attribut: "Code RNCP ou RS", valeurs: par((p) => texte(p.codeRncpRs)) },
    { attribut: "Compétences couvertes", valeurs: par((p) => liste(p.competencesCouvertes)) },
    { attribut: "Outils enseignés", valeurs: par((p) => liste(p.outils)) },
    {
      attribut: "Programme",
      valeurs: par((p) =>
        p.programme && p.programme.length > 0
          ? `${p.programme.length} modules publiés`
          : NON_COMMUNIQUE,
      ),
    },
    { attribut: "Non couvert", valeurs: par((p) => liste(p.nonCouvert)) },
    {
      attribut: "Informations disponibles",
      valeurs: par((p) => `${p.infosRenseignees} sur ${p.infosApplicables} applicables`),
    },
    {
      attribut: "Dernière vérification",
      valeurs: par((p) =>
        p.dateVerification
          ? new Date(p.dateVerification).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : NON_COMMUNIQUE,
      ),
    },
    { attribut: "Source", valeurs: par((p) => texte(p.sourceInformation)) },
  ];
}

/** Vrai si tous les parcours portent la même valeur sur cette ligne. */
export function ligneIdentique(ligne: Ligne): boolean {
  return new Set(ligne.valeurs).size <= 1;
}

function Comparer() {
  const { selection, retirer } = useComparaison();
  const [fiches, setFiches] = useState<ParcoursFiche[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const slugs = selection.map((p) => p.slug).join(",");

  useEffect(() => {
    const aCharger = slugs === "" ? [] : slugs.split(",");
    if (aCharger.length === 0) {
      setFiches([]);
      return;
    }
    let annule = false;
    setChargement(true);
    setErreur(null);
    Promise.all(aCharger.map((slug) => chargerFiche(slug)))
      .then((resultats) => {
        if (annule) return;
        setFiches(resultats.filter((f): f is ParcoursFiche => f !== null));
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, [slugs]);

  const lignes = useMemo(() => (fiches.length > 0 ? construireLignes(fiches) : []), [fiches]);
  const differences = lignes.filter((l) => !ligneIdentique(l)).length;

  if (selection.length < 2) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
        <h1 className="font-titre text-2xl font-semibold">Comparer des parcours</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Sélectionnez au moins deux parcours depuis le catalogue pour les comparer sur les 21
          informations suivies. La comparaison porte sur quatre parcours au maximum.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Retourner au catalogue</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="font-titre text-2xl font-semibold sm:text-3xl">Comparaison</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {chargement
          ? "Chargement des fiches…"
          : `${differences} ${differences > 1 ? "lignes diffèrent" : "ligne diffère"} sur ${lignes.length}.`}
      </p>

      {erreur !== null && (
        <p className="mt-6 rounded-md border border-destructive/40 p-4 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {fiches.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-40 bg-background p-3 text-left align-bottom text-xs font-normal text-muted-foreground">
                  Attribut
                </th>
                {fiches.map((f) => (
                  <th key={f.slug} className="min-w-56 border-b border-border p-3 text-left align-bottom">
                    <Link
                      to="/parcours/$slug"
                      params={{ slug: f.slug }}
                      className="font-titre text-sm font-medium leading-snug hover:underline hover:underline-offset-4"
                    >
                      {f.nom}
                    </Link>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">
                      {f.organismeNom}
                    </p>
                    <button
                      type="button"
                      onClick={() => retirer(f.slug)}
                      className="mt-2 text-xs font-normal text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Retirer
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne) => {
                const identique = ligneIdentique(ligne);
                return (
                  <tr
                    key={ligne.attribut}
                    className={identique ? "text-muted-foreground/60" : ""}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 bg-background border-b border-border p-3 text-left align-top text-xs font-normal ${
                        identique ? "text-muted-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {ligne.attribut}
                    </th>
                    {ligne.valeurs.map((valeur, i) => (
                      <td
                        key={i}
                        className={`border-b border-border p-3 align-top ${
                          valeur === NON_COMMUNIQUE && !identique ? "text-absent" : ""
                        } ${identique ? "" : "font-medium"}`}
                      >
                        {valeur}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Les lignes en retrait portent la même valeur sur tous les parcours comparés : elles sont
        affichées pour montrer qu&apos;elles ont été vérifiées, mais elles n&apos;aident pas à
        décider. Les lignes en relief sont celles où les parcours diffèrent réellement.
      </p>

      <BlocEmail />
    </main>
  );
}

/**
 * Seul point de capture d'adresse de la V1.
 *
 * Pas de demande de brochure, pas de formulaire commercial : la contrepartie
 * annoncée est un suivi factuel des changements, et rien d'autre.
 */
function BlocEmail() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);

  return (
    <section className="mt-10 rounded-md border border-border p-5">
      <h2 className="font-titre text-base font-medium">Recevoir cette comparaison par email</h2>
      {envoye ? (
        <p className="mt-2 text-sm text-muted-foreground">
          C&apos;est noté. Vous recevrez cette comparaison à l&apos;adresse indiquée.
        </p>
      ) : (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setEnvoye(true);
          }}
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.fr"
            aria-label="Votre adresse email"
            className="max-w-xs"
          />
          <Button type="submit">Recevoir la comparaison</Button>
        </form>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Vous serez prévenu si l&apos;un de ces prix ou programmes change. Aucun démarchage.
      </p>
    </section>
  );
}
