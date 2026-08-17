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
import { RESSOURCES } from "@/modele/ressources";
import { formaterNombre } from "@/modele/nombres";
import { BoutonLien, Entete, Reveal, Section } from "./pieces";

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

export function LesRessources() {
  // Une section qui annonce des ressources sans en lister aucune est pire
  // qu'une section absente.
  if (RESSOURCES.length === 0) return null;
  const sujets = new Set(RESSOURCES.flatMap((r) => r.sujets)).size;

  return (
    <Section fond="accent">
      <div className="flex flex-wrap items-center justify-between gap-(--space-10)">
        <div className="max-w-[34ch] min-[900px]:max-w-[46ch]">
          <p className="t-label text-(--text-on-inverse) opacity-70">09 · Gratuit</p>
          <h2 className="mt-(--space-3) t-display-2 text-(--text-on-inverse) max-[767px]:t-heading-1">
            <span className="chiffre">{formaterNombre(RESSOURCES.length)}</span> ressources
            gratuites, sur <span className="chiffre">{formaterNombre(sujets)}</span> sujets
          </h2>
          <p className="mt-(--space-4) t-body-lg text-(--text-on-inverse) opacity-80">
            Des plateformes d&apos;éditeur, des documentations et des certifications gratuites. Ce
            ne sont pas des formations : elles n&apos;entrent pas dans le catalogue et nous ne les
            évaluons pas.
          </p>
        </div>
        <BoutonLien to="/ressources" variante="clair">
          Voir les ressources
        </BoutonLien>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* 10 — La clôture                                                            */
/* -------------------------------------------------------------------------- */

/**
 * La dernière chose que la page dit.
 *
 * Elle rappelle la position du produit et rouvre le catalogue. Rien d'autre :
 * pas de collecte d'adresse, pas de compte à rebours, pas de promesse.
 */
export function Cloture({ parcours }: { parcours: number }) {
  return (
    <Section>
      <Reveal>
        <div className="rounded-(--carte-rayon) border border-(--border-default) bg-(--surface-raised) px-(--space-8) py-(--space-12) text-center shadow-(--elevation-2) max-[639px]:px-(--space-5)">
          <h2 className="mx-auto max-w-[26ch] text-balance t-display-2 text-(--text-primary) max-[767px]:t-heading-1">
            Des faits, pas des classements.
          </h2>
          <p className="mx-auto mt-(--space-4) max-w-[52ch] t-body-lg text-(--text-secondary)">
            Ouvrez le catalogue et comparez vous-même. Aucun organisme ne peut acheter sa place, et
            nous ne touchons aucune commission.
          </p>
          <div className="mt-(--space-8) flex flex-wrap justify-center gap-(--space-3)">
            <BoutonLien to="/catalogue">
              Voir les {formaterNombre(parcours)} parcours
            </BoutonLien>
            <BoutonLien to="/aide-au-choix" variante="contour">
              Être aidé dans le choix
            </BoutonLien>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
