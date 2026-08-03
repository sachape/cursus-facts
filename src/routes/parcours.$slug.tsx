/**
 * La fiche d'un parcours — l'unité de comparaison.
 *
 * Les 18 informations y figurent toutes, y compris celles qui manquent :
 * masquer un champ vide reviendrait à masquer le fait que l'organisme ne le
 * publie pas. Un champ absent s'affiche « Non communiqué », jamais une
 * estimation, jamais une valeur reprise par analogie.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { chargerFiche, type ParcoursFiche } from "@/donnees/requetes";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { CodeBarres, CompteurInformations } from "@/composants/CodeBarres";
import { libellePrix } from "@/composants/RangeeParcours";
import type { EtatInformation } from "@/types/cursus";

export const Route = createFileRoute("/parcours/$slug")({
  loader: async ({ params }) => {
    const fiche = await chargerFiche(params.slug);
    if (!fiche) throw notFound();
    return fiche;
  },
  component: Fiche,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.nom} — ${loaderData.organismeNom} | Cursus` },
          {
            name: "description",
            content: `${loaderData.nom} par ${loaderData.organismeNom}. ${loaderData.infosRenseignees} informations vérifiées sur ${loaderData.infosApplicables} applicables. Faits comparables, sans note ni classement.`,
          },
        ]
      : [],
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

/**
 * Une information et son état.
 *
 * « Non communiqué » et « Ne s'applique pas » ne se disent pas de la même
 * façon : le premier est un manque de l'organisme, le second un fait sur le
 * parcours. Les confondre pénalise les fiches sur des champs qui ne les
 * concernent pas.
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
    <div className="border-b border-border py-3 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{libelle}</dt>
      <dd className="mt-1 text-sm sm:mt-0">
        {etat === "renseigne" || etat === "a_confirmer" ? (
          <>
            {children}
            {etat === "a_confirmer" && (
              <span className="ml-2 text-xs text-absent">à confirmer</span>
            )}
          </>
        ) : etat === "non_applicable" ? (
          <span className="text-muted-foreground/70 italic">
            Ne s&apos;applique pas à ce parcours
          </span>
        ) : (
          <span className="text-absent">Non communiqué</span>
        )}
      </dd>
    </div>
  );
}

function Fiche() {
  const p: ParcoursFiche = Route.useLoaderData();
  const e = p.etats;

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Retour au catalogue
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <p className="text-sm text-muted-foreground">
          {p.organismeNom} · {LIBELLES_CATEGORIES[p.organismeCategorie]}
        </p>
        <h1 className="mt-1 font-titre text-2xl font-semibold leading-tight sm:text-3xl">
          {p.nom}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {LIBELLES_DOMAINES[p.domaine]} · {p.sujetPrincipal}
        </p>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <p className="chiffre text-xl">{libellePrix(p.prixMin, p.prixMax)}</p>
          <div className="flex flex-col items-end gap-1">
            <CodeBarres etats={e} />
            <CompteurInformations
              renseignees={p.infosRenseignees}
              applicables={p.infosApplicables}
            />
          </div>
        </div>

        {p.ecartClassification !== null && (
          <p className="mt-4 rounded border border-border px-3 py-2 text-xs text-muted-foreground">
            {p.ecartClassification}
          </p>
        )}

        {p.motifRegroupement !== null && (
          <p className="mt-3 rounded border border-absent/30 px-3 py-2 text-xs text-absent">
            Regroupement en attente d&apos;arbitrage. {p.motifRegroupement}{" "}
            <Link to="/methode" className="underline underline-offset-2">
              Voir la file d&apos;arbitrage
            </Link>
          </p>
        )}
      </header>

      {p.variantes.length > 1 && (
        <section className="border-b border-border py-6">
          <h2 className="font-titre text-lg font-medium">Formules</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Un contenu différent ferait une fiche différente. Seuls le prix,
            l&apos;accompagnement, la durée et les options varient à l&apos;intérieur
            d&apos;une fiche.
          </p>
          <ul className="mt-3 space-y-1">
            {p.variantes.map((v, i) => (
              <li key={i} className="flex justify-between gap-4 text-sm">
                <span>{v.label}</span>
                <span className="chiffre">{libellePrix(v.prix, null)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="py-6">
        <h2 className="font-titre text-lg font-medium">Les 18 informations suivies</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Ce compteur décrit l&apos;état de la fiche. Il n&apos;évalue ni la formation ni
          l&apos;organisme.
        </p>

        <dl className="mt-4">
          <Information libelle="Prix" etat={e.prix}>
            <span className="chiffre">{libellePrix(p.prixMin, p.prixMax)}</span>
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
            {p.eligibleCpf === true ? (
              <span className="text-atteste">Éligible</span>
            ) : (
              "Non éligible"
            )}
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
            {p.outils?.join(" · ")}
          </Information>
          <Information libelle="Programme détaillé" etat={e.programme}>
            <ul className="list-disc space-y-0.5 pl-4">
              {p.programme?.map((m, i) => <li key={i}>{m.titre}</li>)}
            </ul>
          </Information>
          <Information libelle="Non couvert par le programme" etat={e.non_couvert}>
            <ul className="space-y-0.5">
              {p.nonCouvert?.map((n, i) => (
                <li key={i} className="text-absent">
                  {n}
                </li>
              ))}
            </ul>
          </Information>
          <Information libelle="Site officiel" etat={e.site_officiel}>
            {p.siteOfficiel && (
              /* Lien sortant non affilié — c'est le seul actif défendable
                 face aux comparateurs existants. */
              <a
                href={p.siteOfficiel.startsWith("http") ? p.siteOfficiel : `https://${p.siteOfficiel}`}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="underline underline-offset-4"
              >
                {p.siteOfficiel}
              </a>
            )}
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
      </section>

      {p.competencesCouvertes.length > 0 && (
        <section className="border-t border-border py-6">
          <h2 className="font-titre text-lg font-medium">Compétences abordées</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sans hiérarchie interne. Le sujet principal de ce parcours est « {p.sujetPrincipal} ».
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {p.competencesCouvertes.map((c) => (
              <li key={c} className="rounded-full border border-border px-2.5 py-1 text-xs">
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
