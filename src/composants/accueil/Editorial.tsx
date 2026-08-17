/**
 * 08 — Les guides, 09 — les ressources gratuites, 10 — la clôture.
 *
 * LA FIN DE PAGE NE VEND RIEN. Elle propose de lire, de chercher gratuitement
 * ailleurs, puis d'ouvrir le catalogue. Un bandeau final qui presse — « ne
 * ratez pas », « la meilleure formation vous attend » — ferait exactement ce
 * que le produit reproche aux comparatifs rémunérés.
 *
 * LE BANDEAU DE MARQUE N'APPARAÎT QU'UNE FOIS. Un changement de registre
 * employé deux fois cesse d'en être un : les ressources le prennent, la clôture
 * reste sur le fond de la page.
 */
import { Link } from "@tanstack/react-router";
import { GUIDES } from "@/contenu/guides";
import { RESSOURCES, LIBELLES_TYPES_RESSOURCE, type TypeRessource } from "@/modele/ressources";
import { formaterNombre } from "@/modele/nombres";
import { BoutonLien, Entete, LienAction, Reveal, Section } from "./pieces";

/* -------------------------------------------------------------------------- */
/* 08 — Les guides                                                            */
/* -------------------------------------------------------------------------- */

export function LesGuides() {
  if (GUIDES.length === 0) return null;

  return (
    <Section fond="creuse">
      <Reveal>
        <Entete
          index={{ numero: "08", libelle: "Comprendre" }}
          titre="Ce qu'il faut savoir avant de payer."
          appui="Quatre guides sur les questions qui décident vraiment : le prix, le financement, les sigles, et ce qu'il faut demander à un organisme."
        />
      </Reveal>

      <ol className="mt-(--space-10) grid gap-(--space-4) min-[900px]:grid-cols-2">
        {GUIDES.map((guide, i) => (
          <Reveal key={guide.slug} delai={i * 40} className="h-full">
            <li className="h-full list-none">
              <Link
                to="/guides/$slug"
                params={{ slug: guide.slug }}
                className="group/guide flex h-full gap-(--space-5) rounded-(--carte-rayon) border border-(--border-default) bg-(--surface-raised) p-(--space-6) shadow-(--elevation-2) transition-[border-color,box-shadow,transform] duration-(--motion-fast) hover:border-(--accent-default) hover:shadow-(--elevation-3) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) motion-safe:hover:-translate-y-px"
              >
                <span className="t-data text-(--text-tertiary)">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block t-heading-3 text-(--text-primary) underline-offset-4 transition-colors duration-(--motion-fast) group-hover/guide:text-(--accent-default) group-hover/guide:underline">
                    {guide.titre}
                  </span>
                  <span className="mt-(--space-2) block t-body-sm text-(--text-secondary)">
                    {guide.chapo}
                  </span>
                </span>
              </Link>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 09 — Les ressources gratuites                                              */
/* -------------------------------------------------------------------------- */

/** Nombre de sujets à montrer : au-delà, la liste redevient un catalogue. */
const SUJETS_MONTRES = 8;

/**
 * Ce que la section montre est CALCULÉ, jamais écrit à la main.
 *
 * Les sujets les plus couverts et le décompte par nature de ressource sortent
 * des mêmes données que la page /ressources : une liste rédigée à part
 * divergerait à la première ressource ajoutée, et personne ne le verrait.
 */
function inventaire() {
  const parSujet = new Map<string, number>();
  for (const r of RESSOURCES) {
    for (const s of r.sujets) parSujet.set(s, (parSujet.get(s) ?? 0) + 1);
  }
  const sujets = [...parSujet.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .slice(0, SUJETS_MONTRES);

  const parType = new Map<TypeRessource, number>();
  for (const r of RESSOURCES) parType.set(r.type, (parType.get(r.type) ?? 0) + 1);
  const types = [...parType.entries()].sort((a, b) => b[1] - a[1]);

  return { sujets, types, totalSujets: parSujet.size };
}

export function LesRessources() {
  // Une section qui annonce des ressources sans en lister aucune est pire
  // qu'une section absente.
  if (RESSOURCES.length === 0) return null;
  const { sujets, types, totalSujets } = inventaire();

  return (
    <Section fond="accent">
      {/*
        DEUX COLONNES, PAS UN BANDEAU. À gauche la position éditoriale, à droite
        l'inventaire réel : c'est l'inventaire qui prouve la phrase, et le
        mettre à côté d'elle plutôt qu'en dessous évite la ligne de boutons
        flottante qui faisait ressembler la section à une publicité.
      */}
      <div className="grid gap-(--space-12) min-[1000px]:grid-cols-[1.05fr_1fr] min-[1000px]:gap-(--space-16)">
        <Reveal>
          <div className="flex h-full flex-col">
            <p className="t-label text-(--text-on-inverse) opacity-60">09 · Ressources gratuites</p>

            <h2 className="mt-(--space-5) text-balance t-display-1 text-(--text-on-inverse) max-[767px]:t-display-2">
              <span className="chiffre">{formaterNombre(RESSOURCES.length)}</span> ressources
              gratuites, sur <span className="chiffre">{formaterNombre(totalSujets)}</span> sujets
            </h2>

            <p className="mt-(--space-6) max-w-[56ch] t-body-lg text-(--text-on-inverse) opacity-80">
              Des plateformes d&apos;éditeur, des documentations et des certifications gratuites.
              Ce ne sont pas des formations : elles n&apos;entrent pas dans le catalogue et nous ne
              les évaluons pas.
            </p>

            {/*
              Les natures en ligne de crédit, pas en cartes : elles qualifient ce
              qu'on va trouver, elles ne sont pas quatre choses à cliquer.
            */}
            <dl className="mt-(--space-8) flex flex-wrap gap-x-(--space-8) gap-y-(--space-4) border-t border-(--text-on-inverse)/15 pt-(--space-6)">
              {types.map(([type, n]) => (
                <div key={type}>
                  <dt className="t-caption text-(--text-on-inverse) opacity-60">
                    {LIBELLES_TYPES_RESSOURCE[type]}
                  </dt>
                  <dd className="mt-(--space-1) t-heading-3 text-(--text-on-inverse) [font-variant-numeric:tabular-nums]">
                    {formaterNombre(n)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-(--space-10) flex flex-wrap items-center gap-(--space-5)">
              <BoutonLien to="/ressources" variante="clair">
                Voir les ressources
              </BoutonLien>
              <span className="t-body-sm text-(--text-on-inverse) opacity-60">
                Aucune n&apos;est un lien affilié.
              </span>
            </div>
          </div>
        </Reveal>

        {/*
          L'INVENTAIRE, EN RAYONNAGE. Une ligne par sujet, le décompte aligné à
          droite en chiffres tabulaires : c'est la forme d'un index de
          bibliothèque, et elle rend visible d'un coup l'étendue de ce qui est
          couvert — ce qu'une grille de cartes dilue.
        */}
        <Reveal delai={80}>
          <div className="rounded-(--carte-rayon) border border-(--text-on-inverse)/15 bg-(--text-on-inverse)/5 p-(--space-6) max-[639px]:p-(--space-5)">
            <div className="flex items-baseline justify-between gap-(--space-4) border-b border-(--text-on-inverse)/15 pb-(--space-4)">
              <p className="t-label text-(--text-on-inverse) opacity-60">Sujets les plus couverts</p>
              <p className="t-caption text-(--text-on-inverse) opacity-60">
                <span className="chiffre">{formaterNombre(totalSujets)}</span> au total
              </p>
            </div>

            <ul className="flex flex-col">
              {sujets.map(([sujet, n]) => (
                <li
                  key={sujet}
                  className="flex items-baseline gap-(--space-4) border-b border-(--text-on-inverse)/10 py-(--space-3) last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate t-body text-(--text-on-inverse) opacity-90">
                    {sujet}
                  </span>
                  <span
                    aria-hidden
                    className="h-px flex-1 bg-(--text-on-inverse)/15 max-[479px]:hidden"
                  />
                  <span className="t-data-sm text-(--text-on-inverse) opacity-70 [font-variant-numeric:tabular-nums]">
                    {formaterNombre(n)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-(--space-5)">
              <LienAction to="/ressources" ton="inverse">
                Parcourir par sujet
              </LienAction>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 10 — La clôture                                                            */
/* -------------------------------------------------------------------------- */

/** Les trois engagements. Ce sont des faits sur le produit, pas des arguments. */
const ENGAGEMENTS = [
  "Aucune note, aucun classement par qualité.",
  "Aucune position achetable, aucun lien affilié.",
  "Aucune commission sur une inscription.",
];

/**
 * La dernière chose que la page dit.
 *
 * ELLE N'EST PLUS UNE CARTE POSÉE DANS LE VIDE. Un encadré centré au milieu du
 * fond de page lisait comme un encart publicitaire ; ici la section elle-même
 * fait la clôture — grand titre, filets pleine largeur, engagements en pied.
 *
 * Elle rappelle la position du produit et rouvre le catalogue. Rien d'autre :
 * pas de collecte d'adresse, pas de compte à rebours, pas de promesse.
 */
export function Cloture({ parcours }: { parcours: number }) {
  return (
    <Section>
      <Reveal>
        <div className="border-y border-(--border-default) py-(--space-16) text-center max-[639px]:py-(--space-12)">
          <p className="t-label text-(--text-tertiary)">10 · La position</p>

          <h2 className="mx-auto mt-(--space-6) max-w-[20ch] text-balance t-display-1 text-(--text-primary) max-[767px]:t-display-2">
            Des faits, pas des classements.
          </h2>

          <p className="mx-auto mt-(--space-6) max-w-[54ch] text-balance t-body-lg text-(--text-secondary)">
            Ouvrez le catalogue et comparez vous-même. Aucun organisme ne peut acheter sa place, et
            nous ne touchons aucune commission.
          </p>

          <div className="mt-(--space-10) flex flex-wrap items-center justify-center gap-(--space-3)">
            <BoutonLien to="/catalogue">Voir les {formaterNombre(parcours)} parcours</BoutonLien>
            <BoutonLien to="/aide-au-choix" variante="contour">
              Être aidé dans le choix
            </BoutonLien>
          </div>

          {/* Troisième niveau : pour qui sait déjà quoi comparer. */}
          <div className="mt-(--space-6) flex justify-center">
            <LienAction to="/comparer">Comparer directement</LienAction>
          </div>

          {/*
            Les engagements en pied de clôture, en petit : ils ne remplacent pas
            la page Méthode, ils rappellent ce que la page vient de démontrer.
          */}
          <ul className="mx-auto mt-(--space-12) flex max-w-(--contenu-largeur-max) flex-wrap justify-center gap-x-(--space-8) gap-y-(--space-3) border-t border-(--border-subtle) pt-(--space-6)">
            {ENGAGEMENTS.map((e) => (
              <li key={e} className="t-caption text-(--text-tertiary)">
                {e}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Section>
  );
}
