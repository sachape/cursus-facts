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
import { FilAriane } from "@/composants/FilAriane";
import { chargerFiche, type ParcoursFiche } from "@/donnees/requetes";
import { useComparaison } from "@/composants/comparaison";
import { DemarrerComparaison, type ComparaisonEnregistree } from "@/composants/DemarrerComparaison";
import { chargerListe } from "@/donnees/requetes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/composants/authentification";
import { synthetiser } from "@/modele/synthese-comparaison";
import { useOuvertureFiche, validerFiche } from "@/composants/ouverture-fiche";
import { declarerVue, mesurer } from "@/composants/mesure";
import { EnregistrerComparaison } from "@/composants/EnregistrerComparaison";
import { PanneauFiche } from "@/composants/PanneauFiche";
import { ConditionCout } from "@/composants/Niveaux";
import { coutDuParcours } from "@/modele/condition-cout";

import { LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { DEFINITIONS_MODALITES, libellePrixQualifie } from "@/modele/modalite-acces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/comparer")({
  loader: () => chargerListe(),
  /*
    Même comportement d'ouverture qu'ailleurs. Le tableau porte déjà le contenu
    complet des fiches comparées, mais un titre de colonne reste un lien vers
    une fiche : le faire quitter la vue perdrait la sélection en cours.
  */
  validateSearch: validerFiche,
  component: Comparer,
  head: () => ({
    meta: [
      { title: "Comparer des formations e-commerce | Formlist" },
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
              {cout.valeur ?? libellePrixQualifie(cout.montant, p.prixMax, p.modaliteAcces, p.unitePrix)}
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
  const catalogue = Route.useLoaderData();
  const { selection, retirer } = useComparaison();
  const [enregistrees, setEnregistrees] = useState<ComparaisonEnregistree[]>([]);
  const { fiche } = Route.useSearch();
  const { utilisateur } = useAuth();

  /*
    Les comparaisons du compte, pour l'état vide. Chargées ici et non dans
    `DemarrerComparaison` : le composant décrit un écran, il n'interroge aucune
    donnée — même règle que pour les suggestions du hero.
  */
  useEffect(() => {
    if (utilisateur === null) {
      setEnregistrees([]);
      return;
    }
    let annule = false;
    void supabase
      .from("comparaisons")
      .select("id, nom, parcours_ids, cree_le")
      .order("cree_le", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (!annule) setEnregistrees((data ?? []) as ComparaisonEnregistree[]);
      });
    return () => {
      annule = true;
    };
  }, [utilisateur]);
  const { proprietesLien, fermer: fermerPanneau } = useOuvertureFiche();
  useEffect(() => declarerVue("comparer"), []);
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
        const chargees = resultats.filter((f): f is ParcoursFiche => f !== null);
        setFiches(chargees);
        /*
          `comparaison_lancee` À LA COMPARAISON RÉELLE, pas au clic sur
          « Comparer ». Un clic qui aboutit à une seule fiche chargée n'est pas
          une comparaison, et l'écart entre les deux chiffres — sélections
          faites, comparaisons obtenues — est précisément ce qu'on veut voir.

          Émis ici plutôt qu'à l'affichage : l'effet ne se rejoue qu'au
          changement de sélection, donc un simple rendu ne recompte pas.
        */
        if (chargees.length >= 2) {
          mesurer("comparaison_lancee", {
            nombre: chargees.length,
            cout_etabli: chargees.every((f) => f.prixMin !== null || f.prixMax !== null),
          });
        }
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
  // Recalculée à chaque ajout ou retrait : elle suit la sélection.
  const synthese = useMemo(() => synthetiser(fiches), [fiches]);

  /*
    L'ÉTAT VIDE EST UN POINT DE DÉPART, plus un renvoi. La page attendait une
    sélection faite ailleurs, donc elle renvoyait ailleurs : un aller-retour,
    pas une page.
  */
  if (selection.length < 2) {
    return <DemarrerComparaison catalogue={catalogue} enregistrees={enregistrees} />;
  }

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      {/*
        L'action est sur la ligne du titre, parce qu'elle porte sur la
        comparaison ENTIÈRE — pas sur une colonne, pas sur une ligne du tableau.
        Posée en bas de page, elle serait à quinze écrans du haut sur une
        comparaison à quatre parcours : le même défaut que les actions de fiche
        avant qu'elles ne rejoignent le pied ancré.

        `flex-wrap` et non deux mises en page : sous 640 px le bouton passe
        simplement sous le titre.
      */}
      <div className="flex flex-wrap items-center justify-between gap-(--space-4)">
        <FilAriane miettes={[{ libelle: "Accueil", chemin: "/" }, { libelle: "Comparer" }]} />
        <h1 className="font-titre text-2xl font-semibold sm:text-3xl">Comparaison</h1>
        <EnregistrerComparaison />
      </div>
      {chargement && (
        <p className="mt-2 t-body-sm text-(--text-secondary)">Chargement des fiches…</p>
      )}

      {/*
        SYNTHÈSE, PAS VERDICT. Le tableau oblige à tout lire pour trouver où
        sont les écarts ; ce bloc donne la lecture immédiate et le tableau reste
        la lecture détaillée.

        Il ne désigne aucun gagnant, ne met aucune colonne en avant, et ne
        contient aucune phrase rédigée — un gabarit rempli par des chiffres,
        jamais une interprétation.
      */}
      {!chargement && fiches.length >= 2 && (
        <section className="mt-(--space-6) rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-(--space-6)">
          <h2 className="t-heading-3 text-(--text-primary)">
            <span className="chiffre">{differences}</span>{" "}
            {differences > 1 ? "lignes diffèrent" : "ligne diffère"} sur{" "}
            <span className="chiffre">{lignes.length}</span>
          </h2>
          {/*
            LA DISTINCTION QUI MANQUAIT. Une ligne peut différer parce que les
            offres divergent, ou parce que l'un ne publie pas l'information. Le
            tableau affichait « Non communiqué » sans jamais dire combien de
            fois — un trou de collecte passait pour une différence d'offre.
          */}
          <p className="mt-(--space-2) t-body-sm text-(--text-secondary)">
            <span className="chiffre">{synthese.divergences}</span>{" "}
            {synthese.divergences > 1 ? "portent" : "porte"} une divergence réelle,{" "}
            <span className="chiffre">{synthese.incomparables}</span>{" "}
            {synthese.incomparables > 1 ? "portent" : "porte"} une information absente chez au
            moins un parcours.
          </p>

          {synthese.decisifs.length > 0 && (
            <dl className="mt-(--space-5) grid gap-(--space-3) min-[960px]:grid-cols-2">
              {synthese.decisifs.map((e) => (
                <div key={e.attribut}>
                  <dt className="t-label text-(--text-tertiary)">{e.attribut}</dt>
                  <dd className="mt-(--space-1) t-body text-(--text-primary)">{e.enonce}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="mt-(--space-5) border-t border-(--border-subtle) pt-(--space-4) t-caption text-(--text-tertiary)">
            <span className="chiffre">{synthese.incomparables}</span>{" "}
            {synthese.incomparables > 1 ? "attributs ne se comparent pas" : "attribut ne se compare pas"}{" "}
            : au moins un parcours n&apos;en publie pas l&apos;information. L&apos;absence peut
            venir de l&apos;organisme, qui ne la publie pas, ou de nous, qui n&apos;avons pas
            encore lu sa page —{" "}
            <Link to="/methode" hash="informations" className="underline underline-offset-2">
              la Méthode détaille les deux cas
            </Link>
            .
          </p>
        </section>
      )}

      {erreur !== null && (
        <p className="mt-6 rounded-(--radius-md) border border-destructive/40 p-4 t-body-sm text-destructive">
          {erreur}
        </p>
      )}

      {fiches.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse t-body-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-40 bg-background p-3 text-left align-bottom t-caption font-normal text-(--text-secondary)">
                  Attribut
                </th>
                {fiches.map((f) => (
                  <th key={f.slug} className="min-w-56 border-b border-(--border-subtle) p-3 text-left align-bottom">
                    <a
                      {...proprietesLien(f)}
                      className="font-titre t-body-sm font-medium leading-snug hover:underline hover:underline-offset-4"
                    >
                      {f.nom}
                    </a>
                    <p className="mt-1 t-caption font-normal text-(--text-secondary)">
                      {f.organismeNom}
                    </p>
                    <button
                      type="button"
                      onClick={() => retirer(f.slug)}
                      className="mt-2 t-caption font-normal text-(--text-secondary) underline underline-offset-2 hover:text-(--text-primary)"
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
                    className={identique ? "text-(--text-secondary)/60" : ""}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 bg-background border-b border-(--border-subtle) p-3 text-left align-top t-caption font-normal ${
                        identique ? "text-(--text-secondary)/60" : "text-(--text-secondary)"
                      }`}
                    >
                      {ligne.attribut}
                    </th>
                    {ligne.valeurs.map((valeur, i) => (
                      <td
                        key={i}
                        className={`border-b border-(--border-subtle) p-3 align-top ${
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

      <p className="mt-4 t-caption text-(--text-secondary)">
        Les lignes en retrait portent la même valeur sur tous les parcours comparés : elles sont
        affichées pour montrer qu&apos;elles ont été vérifiées, mais elles n&apos;aident pas à
        décider. Les lignes en relief sont celles où les parcours diffèrent réellement.
      </p>

      <BlocEmail />

      {/*
        Le panneau se superpose au tableau, qui reste monté : refermer rend la
        comparaison intacte, sélection comprise. `autresParcours` est vide ici —
        cette vue ne charge que les fiches comparées, et charger le catalogue
        entier pour une section secondaire coûterait plus qu'elle ne rapporte.
      */}
      {fiche !== undefined && (
        <PanneauFiche slug={fiche} autresParcours={[]} fermer={fermerPanneau} />
      )}
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
    <section className="mt-10 rounded-(--radius-md) border border-(--border-subtle) p-5">
      <h2 className="font-titre text-base font-medium">Recevoir cette comparaison par email</h2>
      {envoye ? (
        <p className="mt-2 t-body-sm text-(--text-secondary)">
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
      <p className="mt-3 t-caption text-(--text-secondary)">
        Vous serez prévenu si l&apos;un de ces prix ou programmes change. Aucun démarchage.
      </p>
    </section>
  );
}
