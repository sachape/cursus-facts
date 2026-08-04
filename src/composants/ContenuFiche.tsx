/**
 * Contenu d'une fiche parcours.
 *
 * Partagé par la page `/parcours/<slug>` (rendue côté serveur, indexable) et
 * par le panneau latéral du catalogue. Une seule source pour les deux surfaces :
 * si le contenu divergeait, la version indexée cesserait de correspondre à la
 * version consultée.
 *
 * ORDRE DES SECTIONS. Le classement vient avant tout le reste, parce qu'il
 * répond à la première question posée à une fiche : « est-ce que ça parle de ce
 * que je cherche ? ». Le prix, la durée et le format remontent en conséquence
 * dans l'en-tête : sans cette ligne de faits clés, remonter les compétences
 * repousserait le coût hors de vue et dégraderait la fiche.
 */
import { Link } from "@tanstack/react-router";
import type { ParcoursFiche, ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { DEFINITIONS_MODALITES } from "@/modele/modalite-acces";
import { ConditionCout, MentionDerivation } from "./Niveaux";
import { coutDuParcours } from "@/modele/condition-cout";
import { CodeBarres, CompteurInformations } from "./CodeBarres";
import { libellePrix } from "./RangeeParcours";
import { useComparaison } from "./comparaison";
import { Button } from "@/components/ui/button";
import type { EtatInformation } from "@/types/cursus";

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

/**
 * Une information et son état.
 *
 * « Non communiqué » et « Ne s'applique pas » ne se disent pas de la même
 * façon : le premier est un manque de l'organisme, le second un fait sur le
 * parcours.
 */
function Information({
  libelle,
  etat,
  children,
}: {
  libelle: string;
  etat: EtatInformation;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{libelle}</dt>
      <dd className="mt-1 text-sm sm:mt-0">
        {etat === "renseigne" || etat === "a_confirmer" ? (
          <>
            {children}
            {etat === "a_confirmer" && <span className="ml-2 text-xs text-absent">à confirmer</span>}
          </>
        ) : etat === "non_applicable" ? (
          <span className="italic text-muted-foreground/70">Ne s&apos;applique pas à ce parcours</span>
        ) : etat === "non_collecte" ? (
          /*
            L'absence n'a pas été constatée : c'est notre collecte qui manque,
            pas nécessairement l'information. Le dire autrement ferait porter à
            l'organisme une opacité qui est peut-être la nôtre.
          */
          <span className="italic text-muted-foreground/70">
            Pas encore collecté — nous n&apos;avons pas ouvert la page de détail
          </span>
        ) : (
          <span className="text-absent">Non publié par l&apos;organisme</span>
        )}
      </dd>
    </div>
  );
}

/** Une date lisible, ou la mention d'absence — jamais un blanc. */
function formaterDate(valeur: string | null): string {
  if (valeur === null) return "Non communiquée";
  return new Date(valeur).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function LigneProvenance({
  libelle,
  valeur,
  detail,
}: {
  libelle: string;
  valeur: string;
  detail?: string | undefined;
}) {
  return (
    <div className="py-2.5 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{libelle}</dt>
      <dd className="mt-0.5 sm:mt-0">
        <span className="chiffre text-sm">{valeur}</span>
        {detail !== undefined && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
        )}
      </dd>
    </div>
  );
}

function Section({
  titre,
  intro,
  children,
}: {
  titre: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-6">
      <h2 className="font-titre text-lg font-medium">{titre}</h2>
      {intro && <p className="mt-1 text-xs text-muted-foreground">{intro}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * En-tête de fiche.
 *
 * Rendu collant par le panneau, statique sur la page. Il porte les faits clés —
 * coût pour l'apprenant, durée, format — pour qu'ils restent lisibles même
 * quand le classement occupe le haut du contenu.
 */
export function EnteteFiche({ p }: { p: ParcoursFiche }) {
  return (
    <>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {LIBELLES_DOMAINES[p.domaine]}
        <span aria-hidden> · </span>
        {LIBELLES_CATEGORIES[p.organismeCategorie]}
      </p>
      <h1 className="mt-1 font-titre text-xl font-semibold leading-tight sm:text-2xl">{p.nom}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{p.organismeNom}</p>

      {/* Faits clés : ce qu'on doit pouvoir lire sans défiler. */}
      <dl className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <div>
          <dt className="sr-only">Coût pour l&apos;apprenant</dt>
          <dd className="chiffre font-medium">
            {libellePrix(p.prixMin, p.prixMax, p.modaliteAcces)}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Durée</dt>
          <dd className="text-muted-foreground">{p.duree ?? "Durée non communiquée"}</dd>
        </div>
        <div>
          <dt className="sr-only">Format</dt>
          <dd className="text-muted-foreground">
            {p.formats.length > 0
              ? p.formats.map((f) => LIBELLES_FORMATS[f]).join(", ")
              : "Format non communiqué"}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-3">
        <CodeBarres etats={p.etats} />
        <CompteurInformations
          renseignees={p.infosRenseignees}
          applicables={p.infosApplicables}
        />
      </div>
    </>
  );
}

export function ContenuFiche({
  p,
  autresParcours = [],
}: {
  p: ParcoursFiche;
  /** Autres parcours du même organisme, hors celui-ci. */
  autresParcours?: readonly ParcoursListe[];
}) {
  const { ajouter, retirer, contient } = useComparaison();
  const e = p.etats;
  const selectionne = contient(p.slug);

  return (
    <>
      {p.motifRegroupement !== null && (
        <p className="mt-4 rounded border border-absent/30 px-3 py-2 text-xs text-absent">
          Regroupement en attente d&apos;arbitrage. {p.motifRegroupement}{" "}
          <Link to="/methode" className="underline underline-offset-2">
            Voir la file d&apos;arbitrage
          </Link>
        </p>
      )}

      {/* 1. Le classement d'abord : « est-ce que ça parle de ce que je cherche ? » */}
      <Section titre="Classement du parcours">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Domaine</dt>
            <dd className="mt-1 text-sm">{LIBELLES_DOMAINES[p.domaine]}</dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Sujet principal
            </dt>
            {/*
              Le sujet principal et les compétences abordées ne sont pas au même
              niveau : le premier est l'objet du parcours, les secondes ce qu'il
              aborde. Toute la classification repose sur cette distinction, elle
              doit donc se voir.
            */}
            <dd className="mt-1">
              <span className="inline-block rounded-md border border-foreground bg-foreground px-2.5 py-1 text-sm font-medium text-background">
                {p.sujetPrincipal}
              </span>
            </dd>
          </div>

          {p.competencesCouvertes.length > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Compétences abordées
              </dt>
              <dd className="mt-1">
                <ul className="flex flex-wrap gap-1.5">
                  {p.competencesCouvertes.map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sans hiérarchie interne. Ce parcours les aborde sans en faire son objet — son
                  objet est « {p.sujetPrincipal} ».
                </p>
              </dd>
            </div>
          )}
        </dl>
      </Section>

      {p.variantes.length > 1 && (
        <Section
          titre="Variantes"
          intro="Un contenu différent ferait une fiche différente. Seuls le prix, l'accompagnement, la durée et les options varient à l'intérieur d'une fiche."
        >
          <ul className="space-y-1">
            {p.variantes.map((v, i) => (
              <li key={i} className="flex justify-between gap-4 text-sm">
                <span>{v.label}</span>
                <span className="chiffre">{libellePrix(v.prix, null, p.modaliteAcces)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        titre="Informations vérifiables"
        intro="Le compteur décrit l'état de la fiche. Il n'évalue ni la formation ni l'organisme."
      >
        <dl>
          <Information libelle="Prix" etat={e.prix}>
            {(() => {
              const cout = coutDuParcours({ ...p, etats: e });
              return (
                <>
                  <span className="chiffre">
                    {cout.valeur ?? libellePrix(cout.montant, p.prixMax, p.modaliteAcces)}
                  </span>
                  <ConditionCout>{cout.condition}</ConditionCout>
                  <MentionDerivation>{cout.derivation}</MentionDerivation>
                </>
              );
            })()}
            <span className="hidden">
            </span>
            {p.prixIntra !== null && (
              /*
                Le tarif de groupe figure sur la fiche mais jamais dans la
                liste : il ne concerne pas un particulier, et l'afficher au
                catalogue ferait paraître ces parcours trois fois trop chers.
              */
              <span className="mt-1 block text-xs text-muted-foreground">
                Tarif intra-entreprise (groupe) :{" "}
                <span className="chiffre">{p.prixIntra.toLocaleString("fr-FR")} €</span>
              </span>
            )}
            {p.modaliteAcces !== null && (
              <>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {DEFINITIONS_MODALITES[p.modaliteAcces]}
                </span>
                {p.modaliteAcces === "freemium" && (
                  <span className="mt-1 block text-xs text-absent">
                    Le parcours complet est payant.
                  </span>
                )}
                {p.sourceModaliteAcces !== null && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Source : {p.sourceModaliteAcces}
                  </span>
                )}
              </>
            )}
          </Information>
          <Information libelle="Modalités de paiement" etat={e.modalites_paiement}>
            {p.modalitesPaiement}
          </Information>
          <Information libelle="Durée" etat={e.duree}>
            {p.duree}
          </Information>
          <Information libelle="Volume horaire" etat={e.volume_horaire}>
            <span className="chiffre">{p.volumeHoraire} h</span>
          </Information>
          <Information libelle="Format" etat={e.format}>
            {p.formats.map((f) => LIBELLES_FORMATS[f]).join(", ")}
          </Information>
          <Information libelle="Lieu" etat={e.lieu}>
            {p.lieu}
          </Information>
          <Information libelle="Niveau d'entrée" etat={e.niveau_entree}>
            {p.niveauEntree ? LIBELLES_NIVEAUX[p.niveauEntree] : null}
          </Information>
          <Information libelle="Prérequis" etat={e.prerequis}>
            {p.prerequis}
          </Information>
          <Information libelle="Éligibilité CPF" etat={e.eligible_cpf}>
            {p.eligibleCpf === true ? <span className="text-atteste">Éligible</span> : "Non éligible"}
          </Information>
          <Information libelle="Financements acceptés" etat={e.financements_acceptes}>
            {p.financements?.join(" · ")}
          </Information>
          <Information libelle="Certification" etat={e.certification}>
            <span className={p.codeRncpRs ? "text-atteste" : ""}>{p.certification}</span>
          </Information>
          <Information libelle="Code RNCP ou RS" etat={e.code_rncp_rs}>
            <span className="chiffre">{p.codeRncpRs}</span>
          </Information>
          <Information libelle="Outils enseignés" etat={e.outils_enseignes}>
            {p.outils?.length} outils, détaillés ci-dessous
          </Information>
          <Information libelle="Programme détaillé" etat={e.programme}>
            {p.programme?.length} modules, détaillés ci-dessous
          </Information>
          <Information libelle="Non couvert par le programme" etat={e.non_couvert}>
            {p.nonCouvert?.length} points, détaillés ci-dessous
          </Information>
          <Information libelle="Site officiel" etat={e.site_officiel}>
            {p.siteOfficiel}
          </Information>
          <Information libelle="Source de l'information" etat={e.source_information}>
            {p.sourceInformation}
          </Information>
          <Information libelle="Date de vérification" etat={e.date_verification}>
            <span className="chiffre">
              {p.dateVerification
                ? new Date(p.dateVerification).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null}
            </span>
          </Information>
        </dl>
      </Section>

      {p.outils !== null && p.outils.length > 0 && (
        <Section titre="Outils enseignés">
          <ul className="flex flex-wrap gap-1.5">
            {p.outils.map((o) => (
              <li key={o} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                {o}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.programme !== null && p.programme.length > 0 && (
        <Section titre="Programme publié">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {p.programme.map((m, i) => (
              <li key={i}>{m.titre}</li>
            ))}
          </ol>
        </Section>
      )}

      {p.nonCouvert !== null && p.nonCouvert.length > 0 && (
        <Section
          titre="Non couvert par le programme publié"
          intro="Strictement dérivé du programme publié, jamais une appréciation."
        >
          <ul className="space-y-1 text-sm">
            {p.nonCouvert.map((n) => (
              <li key={n} className="text-absent">
                {n}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.ecartClassification !== null && (
        <>
          <Section
            titre="Pourquoi ce parcours est référencé"
            intro="Acteur découvert hors des bases officielles, dont le vocabulaire échappe au classificateur."
          >
            <p className="text-sm text-muted-foreground">
              Les critères d&apos;éligibilité et les motifs des acteurs écartés sont publiés dans
              la{" "}
              <Link to="/methode" className="underline underline-offset-4">
                page Méthode
              </Link>
              .
            </p>
          </Section>

          <Section titre="Écart de classification">
            <p className="text-sm text-muted-foreground">{p.ecartClassification}</p>
          </Section>
        </>
      )}

      {autresParcours.length > 0 && (
        <Section titre={`Autres parcours de ${p.organismeNom}`}>
          <ul className="space-y-2">
            {autresParcours.slice(0, 6).map((autre) => (
              <li key={autre.slug} className="flex items-baseline justify-between gap-4 text-sm">
                <Link
                  to="/parcours/$slug"
                  params={{ slug: autre.slug }}
                  className="hover:underline hover:underline-offset-4"
                >
                  {autre.nom}
                </Link>
                <span className="chiffre shrink-0 text-xs text-muted-foreground">
                  {autre.infosRenseignees} sur {autre.infosApplicables}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/*
        Historique de provenance.

        « Mise à jour » et « vérification » sont deux faits distincts, et les
        confondre trompe : une fiche vérifiée le mois dernier sans changement
        est plus fiable qu'une fiche modifiée il y a un an et jamais
        recontrôlée depuis.

        Cet historique prépare la revendication de fiche. Le jour où un
        organisme modifie ses valeurs, il montrera ce qui a changé, quand, et à
        la demande de qui — un comparateur dont l'historique est public est
        beaucoup plus difficile à corrompre qu'un comparateur qui n'affiche que
        son état courant.
      */}
      <Section titre="Provenance">
        <dl className="divide-y divide-border text-sm">
          <LigneProvenance
            libelle="Créée"
            valeur={formaterDate(p.creeeLe)}
            detail="Première entrée au catalogue"
          />
          <LigneProvenance
            libelle="Dernière mise à jour"
            valeur={formaterDate(p.misAJourLe)}
            detail={
              p.champModifie !== null
                ? `Champ modifié : ${p.champModifie}`
                : "Aucun changement de valeur enregistré depuis la création"
            }
          />
          <LigneProvenance
            libelle="Source"
            valeur={p.sourceInformation ?? "Non communiquée"}
            detail={p.siteOfficiel ?? undefined}
          />
          <LigneProvenance
            libelle="Dernière vérification"
            valeur={formaterDate(p.dateVerification)}
            detail={`Contrôle effectué même sans changement · Origine : ${p.origineChangement ?? "vérification interne"}`}
          />
        </dl>
      </Section>

      {/*
        La section « Actions » vivait ici. Elle est passée dans le pied ancré du
        panneau : sur une fiche longue, elle était à quinze écrans du haut, et
        l'action que la personne cherche en priorité n'était jamais visible sans
        défiler jusqu'au bout.
      */}
    </>
  );
}
