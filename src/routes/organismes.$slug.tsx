/**
 * Page dédiée d'un organisme.
 *
 * POURQUOI UNE PAGE ET NON UN FILTRE. Cliquer sur un organisme renvoyait vers
 * l'explorateur avec `?organisme=`. La personne quittait la vue Organismes,
 * perdait sa position, et atterrissait dans une liste qui ne disait rien de
 * l'organisme lui-même — ni sa catégorie, ni ses certifications, ni depuis
 * quand nous l'avons vérifié.
 *
 * C'est aussi une page de traîne longue à part entière : « formations
 * LiveMentor », « formations ORSYS » sont des requêtes réelles, et un filtre
 * appliqué à une autre page ne s'indexe pas.
 *
 * CE QUE LA PAGE NE FAIT PAS. Aucune note, aucun classement par qualité. Le
 * nombre de parcours décrit l'étendue de NOTRE collecte, et la mention qui le
 * dit est obligatoire sous les chiffres : sans elle, un organisme dont nous ne
 * détenons qu'une fiche paraît plus petit qu'il n'est, et c'est un jugement que
 * nous ne portons pas.
 */
import { useMemo, useRef, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { chargerListe } from "@/donnees/requetes";
import { trouverOrganisme, urlDuSite } from "@/modele/organismes";
import { classer, LIBELLES_TRIS, TRI_PAR_DEFAUT } from "@/modele/classement";
import { LIBELLES_CATEGORIES, LIBELLES_DOMAINES } from "@/modele/vocabulaires";
import { SelecteurListe } from "@/composants/SelecteurListe";

/** Les formats, en français : la base stocke « distanciel », on lit « Distanciel ». */
const LIBELLES_FORMATS: Record<FormatParcours, string> = {
  distanciel: "Distanciel",
  presentiel: "Présentiel",
  alternance: "Alternance",
};
import { RangeeParcours } from "@/composants/RangeeParcours";
import { PanneauFiche } from "@/composants/PanneauFiche";
import { useOuvertureFiche, validerFiche } from "@/composants/ouverture-fiche";
import { ProvenanceOrganisme } from "@/composants/ProvenanceOrganisme";
import { formaterDateLongue } from "@/modele/dates";
import type { FormatParcours } from "@/types/cursus";

const SITE = "https://formlist.fr";

export const Route = createFileRoute("/organismes/$slug")({
  // Le panneau s'ouvre par-dessus cette page : même point d'appel qu'ailleurs.
  validateSearch: validerFiche,
  loader: async ({ params }) => {
    const parcours = await chargerListe();
    const trouve = trouverOrganisme(parcours, params.slug);
    if (trouve === null) throw notFound();
    return trouve;
  },
  component: PageOrganisme,
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { organisme } = loaderData;
    return {
      meta: [
        { title: `Formations ${organisme.nom} — prix, durée, certification | Formlist` },
        {
          name: "description",
          content:
            `${organisme.parcours} formation${organisme.parcours > 1 ? "s" : ""} de ${organisme.nom} ` +
            `référencée${organisme.parcours > 1 ? "s" : ""}, comparées sur des faits vérifiables : prix, durée, ` +
            `format, financement, certification. Sans note ni classement.`,
        },
      ],
      // Auto-référent : cette page est la version canonique de son contenu, et
      // le filtre `?organisme=` de l'explorateur n'en est plus une variante.
      links: [{ rel: "canonical", href: `${SITE}/organismes/${organisme.slug}` }],
      /*
        `Organization` et non `EducationalOrganization` : la seconde affirme un
        statut d'établissement d'enseignement que nous ne vérifions pas — sept
        catégories cohabitent au catalogue, dont des créateurs indépendants.

        Aucune note, aucun avis, pour la même raison que sur les fiches.
      */
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: organisme.nom,
            url: `${SITE}/organismes/${organisme.slug}`,
            ...(urlDuSite(organisme.site) !== null ? { sameAs: [urlDuSite(organisme.site)] } : {}),
            ...(organisme.certifications.length > 0
              ? { hasCredential: organisme.certifications }
              : {}),
          }),
        },
      ],
    };
  },
});

/** Une pastille de certification. Pine : le fait est attesté, pas jugé. */
function Certification({ libelle }: { libelle: string }) {
  return (
    <span className="inline-flex items-center rounded-(--radius-full) border border-(--status-verified) bg-(--status-verified-bg) px-(--space-3) py-(--space-1) t-caption text-(--status-verified)">
      {libelle}
    </span>
  );
}

function PageOrganisme() {
  const { organisme, fiches } = Route.useLoaderData();
  const { fiche } = Route.useSearch();

  const titreListe = useRef<HTMLHeadingElement | null>(null);
  const { fermer: fermerPanneau } = useOuvertureFiche({ retourParDefaut: titreListe });

  /*
    FILTRES RÉDUITS. Une colonne complète pour six parcours coûte plus d'écran
    qu'elle n'en fait gagner : à cette échelle, on lit la liste entière plus
    vite qu'on ne la filtre. Domaine, sujet et format suffisent — ce sont les
    trois axes sur lesquels un même organisme se disperse réellement.
  */
  const [domaine, setDomaine] = useState<string>("");
  const [sujet, setSujet] = useState<string>("");
  const [format, setFormat] = useState<string>("");

  /*
    LES LIBELLÉS VIENNENT DU VOCABULAIRE D'AFFICHAGE, jamais de la valeur
    stockée. Le sélecteur natif rendait « distanciel » et « presentiel » — le
    vocabulaire de la base servi à l'utilisateur, en minuscules et sans accent.
    Les valeurs enregistrées ne changent pas ; seule leur présentation est mise
    en forme.

    Le COMPTEUR par option compte les parcours de CET organisme, comme la
    colonne de filtres de l'explorateur. Une option à zéro reste affichée mais
    désactivée : elle informe sans laisser cliquer dans le vide.
  */
  const axes = useMemo(() => {
    const compter = (predicat: (p: (typeof fiches)[number]) => boolean) =>
      fiches.filter(predicat).length;
    return {
      domaines: [...new Set(fiches.map((p) => p.domaine))]
        .sort()
        .map((d) => ({
          valeur: d,
          libelle: LIBELLES_DOMAINES[d],
          compte: compter((p) => p.domaine === d),
        })),
      sujets: [...new Set(fiches.map((p) => p.sujetPrincipal))]
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((s) => ({ valeur: s, libelle: s, compte: compter((p) => p.sujetPrincipal === s) })),
      formats: [...new Set(fiches.flatMap((p) => p.formats))]
        .sort()
        .map((f) => ({
          valeur: f,
          libelle: LIBELLES_FORMATS[f],
          compte: compter((p) => p.formats.includes(f)),
        })),
    };
  }, [fiches]);

  const resultats = useMemo(() => {
    const retenus = fiches.filter(
      (p) =>
        (domaine === "" || p.domaine === domaine) &&
        (sujet === "" || p.sujetPrincipal === sujet) &&
        (format === "" || p.formats.includes(format as FormatParcours)),
    );
    return classer(retenus, TRI_PAR_DEFAUT);
  }, [fiches, domaine, sujet, format]);

  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <header>
        <h1 className="t-display-2 text-(--text-primary)">{organisme.nom}</h1>
        <p className="mt-(--space-2) t-body-sm text-(--text-secondary)">
          {LIBELLES_CATEGORIES[organisme.categorie]}
        </p>

        <dl className="mt-(--space-5) flex flex-wrap items-baseline gap-x-(--space-8) gap-y-(--space-2) t-body-sm">
          <div className="flex items-baseline gap-(--space-2)">
            <dt className="text-(--text-secondary)">Parcours référencés</dt>
            <dd className="chiffre text-(--text-primary)">{organisme.parcours}</dd>
          </div>
          <div className="flex items-baseline gap-(--space-2)">
            <dt className="text-(--text-secondary)">Domaines couverts</dt>
            <dd className="chiffre text-(--text-primary)">{organisme.domaines}</dd>
          </div>
          {urlDuSite(organisme.site) !== null && (
            <div className="flex items-baseline gap-(--space-2)">
              <dt className="text-(--text-secondary)">Site officiel</dt>
              <dd>
                <a
                  href={urlDuSite(organisme.site)!}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className="text-(--text-primary) underline-offset-2 hover:underline"
                >
                  {urlDuSite(organisme.site)!.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
          <div className="flex items-baseline gap-(--space-2)">
            <dt className="text-(--text-secondary)">Dernière vérification</dt>
            <dd className="chiffre text-(--text-primary)">
              {formaterDateLongue(organisme.derniereVerification)}
            </dd>
          </div>
        </dl>

        {/*
          OBLIGATOIRE, et jamais sous condition. C'est la même règle que
          `non_collecte` : le compteur est un fait sur notre collecte, pas sur
          l'organisme. Sans cette phrase, le chiffre se lit comme une mesure de
          taille — donc comme un jugement que nous ne portons pas.
        */}
        <p className="mt-(--space-3) max-w-2xl t-caption text-(--text-tertiary)">
          Le nombre de parcours référencés décrit l&apos;étendue de notre collecte, pas celle du
          catalogue de l&apos;organisme.
        </p>

        {organisme.certifications.length > 0 && (
          <div className="mt-(--space-5) flex flex-wrap gap-(--space-2)">
            {organisme.certifications.map((c) => (
              <Certification key={c} libelle={c} />
            ))}
          </div>
        )}
      </header>

      <section className="mt-(--space-12)">
        <div className="flex flex-wrap items-baseline justify-between gap-(--space-4)">
          <h2 ref={titreListe} tabIndex={-1} className="t-heading-3 text-(--text-primary)">
            Parcours
            <span className="chiffre ml-(--space-2) t-body-sm text-(--text-secondary)">
              {resultats.length}
            </span>
          </h2>
          {/*
            Le libellé du tri est affiché, comme partout : un tri dont on ne
            publie pas la règle est un classement éditorial déguisé.
          */}
          <p className="t-caption text-(--text-tertiary)">{LIBELLES_TRIS[TRI_PAR_DEFAUT]}</p>
        </div>

        {/*
          Une ligne en version bureau, empilés sous 768 px avec le libellé
          AU-DESSUS du sélecteur — côte à côte, trois lignes de libellés de
          longueurs différentes désalignent les trois champs.
        */}
        <div className="mt-(--space-4) flex flex-col gap-(--space-4) min-[768px]:flex-row min-[768px]:flex-wrap">
          {[
            { id: "domaine", etiquette: "Domaine", valeur: domaine, choisir: setDomaine, options: axes.domaines },
            { id: "sujet", etiquette: "Sujet principal", valeur: sujet, choisir: setSujet, options: axes.sujets },
            { id: "format", etiquette: "Format", valeur: format, choisir: setFormat, options: axes.formats },
          ].map((axe) =>
            axe.options.length < 2 ? null : (
              <div key={axe.id} className="flex flex-col gap-(--space-2)">
                <label htmlFor={axe.id} className="t-body-sm text-(--text-secondary)">
                  {axe.etiquette}
                </label>
                <SelecteurListe
                  id={axe.id}
                  etiquette={axe.etiquette}
                  valeur={axe.valeur}
                  choisir={axe.choisir}
                  libelleVide="Tous"
                  options={[
                    { valeur: "", libelle: "Tous", compte: fiches.length },
                    ...axe.options,
                  ]}
                />
              </div>
            ),
          )}
        </div>

        {resultats.length === 0 ? (
          <p className="py-(--space-16) text-center t-body-sm text-(--text-secondary)">
            Aucun parcours de cet organisme ne correspond à ces critères. Aucune fiche n&apos;est
            retirée du catalogue — elle ne correspond simplement pas.
          </p>
        ) : (
          <ul className="mt-(--space-4)">
            {resultats.map((p) => (
              <RangeeParcours key={p.id} parcours={p} />
            ))}
          </ul>
        )}
      </section>

      <ProvenanceOrganisme
        sources={[...new Set(fiches.map((p) => p.sourceInformation).filter((s): s is string => s !== null))]}
        derniereVerification={organisme.derniereVerification}
        nom={organisme.nom}
        slug={organisme.slug}
      />

      {/*
        Le panneau se superpose : la page organisme reste montée derrière, donc
        la fermeture rend la liste et sa position intactes.
      */}
      {fiche !== undefined && (
        <PanneauFiche slug={fiche} autresParcours={fiches} fermer={fermerPanneau} />
      )}
    </main>
  );
}

