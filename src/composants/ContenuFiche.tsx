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
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ParcoursFiche, ParcoursListe } from "@/donnees/requetes";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { hrefOrganisme } from "./lien-organisme";
import { DEFINITIONS_MODALITES, libellePrixQualifie } from "@/modele/modalite-acces";
import { ConditionCout, MentionDerivation } from "./Niveaux";
import { coutDuParcours } from "@/modele/condition-cout";
import { CodeBarres, CompteurInformations } from "./CodeBarres";

import { useComparaison } from "./comparaison";
import { Button } from "@/components/ui/button";
import type { EtatInformation } from "@/types/cursus";
import { useOuvertureFiche } from "./ouverture-fiche";
import { mesurer, proprietesParcours } from "./mesure";

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
  methode,
}: {
  libelle: string;
  etat: EtatInformation;
  children?: React.ReactNode;
  /**
   * L'ancre de la section de Méthode qui définit ce champ, quand il en a une.
   *
   * Facultatif : la plupart des 18 informations se comprennent sans
   * explication. Le lien est réservé à celles dont le libellé, seul, se prête
   * à un contresens — et il vaut mieux que l'entrée de menu qu'il remplace,
   * parce qu'il est là au moment où la question se pose.
   */
  methode?: string;
}) {
  return (
    <div className="border-b border-border py-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">
        {methode === undefined ? (
          libelle
        ) : (
          <Link to="/methode" hash={methode} className="underline underline-offset-2">
            {libelle}
          </Link>
        )}
      </dt>
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

/**
 * Provenance — une ligne au repos, le détail sur demande.
 *
 * POURQUOI REPLIER. Le bloc occupait quatre lignes avec leurs explications, au
 * même niveau visuel que le programme. C'est disproportionné pour une
 * information de second plan, et ça repoussait la barre d'actions hors de vue.
 *
 * POURQUOI NE PAS MASQUER. La source et la date sont ce qui rend notre promesse
 * vérifiable. Les retirer nous ramènerait au régime des comparatifs affiliés,
 * qui demandent qu'on les croie sur parole — c'est précisément ce contre quoi
 * le produit se construit. Repliée, l'information reste à un clic ; masquée,
 * elle n'existe plus.
 *
 * L'ÉTAT NE SURVIT PAS À LA FICHE. Le panneau ne se remonte pas d'un parcours à
 * l'autre : sans cette remise à zéro, ouvrir une fiche après avoir déplié la
 * précédente afficherait un pavé de dates là où on attend un résumé.
 */
function Provenance({ p }: { p: ParcoursFiche }) {
  const [deplie, setDeplie] = useState(false);
  useEffect(() => setDeplie(false), [p.id]);

  return (
    <section className="border-t border-border py-(--space-5)">
      {/*
        `flex-wrap` : sous 640 px la ligne passe sur deux lignes plutôt que de
        tronquer une date ou de pousser le bouton hors du panneau.
      */}
      <div className="flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-1) t-caption text-(--text-tertiary)">
        <span>
          <Link to="/methode" hash="sources" className="underline underline-offset-2">
            Source
          </Link>
          {" : "}
          {p.sourceInformation ?? "Non communiquée"}
        </span>
        <span aria-hidden="true">·</span>
        <span>Vérifié le {formaterDate(p.dateVerification)}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => setDeplie((ouvert) => !ouvert)}
          aria-expanded={deplie}
          className="inline-flex items-center gap-(--space-1) rounded-(--radius-sm) text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
        >
          {deplie ? "Masquer le détail" : "Voir le détail"}
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-(--motion-base) ${deplie ? "rotate-180" : ""}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </button>
      </div>

      {/*
        Dépliage par `grid-template-rows: 0fr → 1fr`, et non par une hauteur
        maximale devinée. Une `max-height` en dur se fait rattraper dès qu'une
        source porte un nom long : soit elle coupe, soit elle laisse un blanc,
        et dans les deux cas elle ment sur la hauteur réelle.
      */}
      <div
        className={`grid transition-[grid-template-rows] duration-(--motion-base) ${
          deplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <dl className="divide-y divide-border pt-(--space-4) text-sm">
            <LigneProvenance
              libelle="Première écriture en base"
              valeur={formaterDate(p.creeeLe)}
            />
            <LigneProvenance
              libelle="Dernière mise à jour"
              valeur={formaterDate(p.misAJourLe)}
              /*
                La mention n'affirme un changement que si un champ modifié est
                réellement enregistré. Elle affirmait auparavant « aucun
                changement depuis la création » dès que ce champ était vide — or
                il l'est toujours, la colonne n'ayant jamais existé. Une absence
                d'enregistrement n'est pas une absence de changement.
              */
              detail={
                p.champModifie !== null
                  ? `Champ modifié : ${p.champModifie}`
                  : "Détail des changements non enregistré"
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
        </div>
      </div>
    </section>
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
            {libellePrixQualifie(p.prixMin, p.prixMax, p.modaliteAcces)}
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
  // Rebondir d'une fiche à une autre est une source à part : la personne
  // n'explore plus, elle compare deux parcours du même organisme.
  const { proprietesLien } = useOuvertureFiche({ source: "fiche" });
  const { ajouter, retirer, contient } = useComparaison();
  const e = p.etats;
  const selectionne = contient(p.slug);

  return (
    <>
      {p.motifRegroupement !== null && (
        <p className="mt-4 rounded border border-absent/30 px-3 py-2 text-xs text-absent">
          Regroupement en attente d&apos;arbitrage. {p.motifRegroupement}{" "}
          <Link to="/methode" hash="arbitrage" className="underline underline-offset-2">
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
              {/* Le libellé renvoie à la règle qui l'a produit : « pourquoi ce
                  sujet et pas un autre » se demande ici, jamais dans un menu. */}
              <Link to="/methode" hash="classification" className="underline underline-offset-2">
                Sujet principal
              </Link>
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
                <span className="chiffre">{libellePrixQualifie(v.prix, null, p.modaliteAcces)}</span>
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
                    {cout.valeur ?? libellePrixQualifie(cout.montant, p.prixMax, p.modaliteAcces)}
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
          <Information
            libelle="Non couvert par le programme"
            etat={e.non_couvert}
            /* Ce champ est le plus mal compris des 18 : il énonce ce que le
               programme n'aborde pas, ce qui n'est ni un défaut ni un avis. */
            methode="informations"
          >
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
              <Link to="/methode" hash="eligibilite" className="underline underline-offset-4">
                critères d&apos;éligibilité
              </Link>
              .
            </p>
          </Section>

          <Section titre="Écart de classification">
            <p className="text-sm text-muted-foreground">{p.ecartClassification}</p>
          </Section>
        </>
      )}

      {/*
        LA SECTION NE DISPARAÎT PLUS QUAND LA LISTE EST VIDE.

        Le panneau est monté depuis des vues qui ne chargent pas toutes le
        catalogue — la comparaison ne charge que les fiches comparées. La
        section s'effaçait alors, et son absence se lisait comme « cet organisme
        n'a qu'un parcours », quand elle voulait dire « nous ne les avons pas
        chargés ». C'est la distinction `non_collecte` / `non_communique`
        transposée à l'interface : une absence de chargement ne doit jamais se
        donner pour une absence de fait.

        Le lien vers la page de l'organisme lève l'ambiguïté dans les deux cas,
        et ne coûte rien à charger.
      */}
      <Section titre={`Autres parcours de ${p.organismeNom}`}>
        {autresParcours.length > 0 && (
          <ul className="space-y-2">
            {autresParcours.slice(0, 6).map((autre) => (
              <li key={autre.slug} className="flex items-baseline justify-between gap-4 text-sm">
                <a
                  {...proprietesLien(autre)}
                  className="hover:underline hover:underline-offset-4"
                >
                  {autre.nom}
                </a>
                <span className="chiffre shrink-0 text-xs text-muted-foreground">
                  {autre.infosRenseignees} sur {autre.infosApplicables}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className={autresParcours.length > 0 ? "mt-(--space-4) t-body-sm" : "t-body-sm"}>
          <a
            href={hrefOrganisme(p.organismeNom)}
            className="text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          >
            Voir tous les parcours de {p.organismeNom}
          </a>
        </p>
      </Section>

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
      {/*
        « Première écriture en base », et non « entrée au catalogue ».
        `created_at` date le premier enregistrement du parcours dans la base —
        ce qui n'est pas la date à laquelle nous l'avons collecté. Une date de
        vérification ANTÉRIEURE est donc normale et non contradictoire.

        L'explication de ce décalage a quitté la fiche pour la page Méthode,
        section « Sources de données » : elle décrit notre fonctionnement, pas
        la formation. Une fiche porte des faits sur un parcours ; tout ce qui
        parle de nous appartient à la méthode.
      */}
      <Provenance p={p} />

      {/*
        « Signaler une correction » a quitté la barre d'actions du pied, où il
        occupait le même rang que « Voir le site officiel » — trois actions
        alignées déclarent trois importances égales, et débordaient sur trois
        lignes.

        Sa vraie place est ici : on ne signale une correction qu'après avoir lu
        la fiche et constaté une erreur. En haut, il ne fait que peser sur les
        deux actions qui comptent ; en bas, il tombe exactement au moment où il
        peut servir.
      */}
      <p className="pb-(--space-4) t-caption text-(--text-tertiary)">
        <a
          href={
            `mailto:corrections@formlist.fr` +
            `?subject=${encodeURIComponent(`Correction — ${p.nom}`)}` +
            `&body=${encodeURIComponent(`Fiche concernée : ${p.slug}\n\nInformation à corriger :\n`)}`
          }
          className="rounded-(--radius-sm) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-secondary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
          /*
            Un signalement est un fait sur NOTRE collecte, pas sur la personne :
            savoir sur quelles fiches on se trompe dit où la donnée est fragile.
            Le lien ouvre un client mail — le clic est tout ce qu'on peut voir,
            et il ne garantit pas qu'un message parte.
          */
          onClick={() => mesurer("correction_signalee", proprietesParcours(p))}
        >
          Signaler une correction
        </a>
      </p>

      {/*
        La section « Actions » vivait ici. Elle est passée dans le pied ancré du
        panneau : sur une fiche longue, elle était à quinze écrans du haut, et
        l'action que la personne cherche en priorité n'était jamais visible sans
        défiler jusqu'au bout.
      */}
    </>
  );
}
