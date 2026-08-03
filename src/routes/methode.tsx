/**
 * La page Méthode — toute règle appliquée au catalogue est publiée ici.
 *
 * C'est l'invariant 7, et ce n'est pas de la transparence décorative : c'est ce
 * qui permet à un organisme mécontent de son classement de contester la règle
 * plutôt que la décision. Une règle non publiée transforme chaque nouvel
 * organisme en négociation.
 *
 * Les règles affichées sont LUES DEPUIS LE MODÈLE, jamais recopiées. Une page
 * Méthode qui diverge du code est pire que pas de page Méthode.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { chargerArbitrages } from "@/donnees/requetes";
import {
  LIBELLES_CATEGORIES,
  LIBELLES_DOMAINES,
  MOTIFS_COMPETENCES,
  SUJET_GENERALISTE,
  SUJETS_OUTILS,
} from "@/modele/vocabulaires";
import { SEUIL_SUJET_MODULES } from "@/modele/classification";
import { SEUIL_PROXIMITE_INTITULE, SEUIL_TRONC_COMMUN } from "@/modele/regroupement";
import { LIBELLES_TRIS, TRIS } from "@/modele/classement";
import { CHAMPS_INFORMATION, LIBELLES_CHAMPS_INFORMATION } from "@/types/cursus";
import ecartes from "@/donnees/acteurs-ecartes.json";

export const Route = createFileRoute("/methode")({
  loader: () => chargerArbitrages(),
  component: Methode,
  head: () => ({
    meta: [
      { title: "Méthode — comment ce catalogue est construit | Cursus" },
      {
        name: "description",
        content:
          "Toutes les règles appliquées au catalogue : classification, regroupement, classement, éligibilité, file d'arbitrage. Déterministes et publiées.",
      },
    ],
  }),
});

const CRITERES_ELIGIBILITE = [
  "Offre structurée",
  "Objectif pédagogique explicite",
  "Contenu ou modules identifiables",
  "Durée ou modalités",
  "Prix ou processus d'inscription",
  "Accompagnement pédagogique",
  "Offre actuellement commercialisée",
];

const JAMAIS_REFERENCE = [
  "Chaîne gratuite sans offre payante",
  "Consultant qui ne vend aucune formation",
  "Agence proposant une prestation",
  "Masterclass ponctuelle sans parcours",
  "Page abandonnée",
];

function Section({
  titre,
  children,
  intro,
}: {
  titre: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-8">
      <h2 className="font-titre text-xl font-medium">{titre}</h2>
      {intro && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{intro}</p>}
      <div className="mt-4 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Methode() {
  const arbitrages = Route.useLoaderData();
  const pourcentSujet = Math.round(SEUIL_SUJET_MODULES * 100);
  const pourcentIntitule = Math.round(SEUIL_PROXIMITE_INTITULE * 100);
  const pourcentTronc = Math.round(SEUIL_TRONC_COMMUN * 100);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Retour au catalogue
      </Link>

      <header className="mt-6 pb-2">
        <h1 className="font-titre text-3xl font-semibold tracking-tight">Méthode</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Toutes les règles ci-dessous sont déterministes et publiées. Aucune ne repose sur
          une appréciation. C&apos;est la condition pour qu&apos;un organisme mécontent de son
          classement puisse contester la règle plutôt que la décision — et pour que, dans un
          an, on sache encore pourquoi une offre a été regroupée et une autre non.
        </p>
      </header>

      <Section
        titre="Les invariants"
        intro="Huit règles que rien ne peut faire céder — ni un organisme mécontent, ni une opportunité commerciale, ni une contrainte technique. Elles sont publiées ici pour pouvoir nous être opposées."
      >
        <ol className="list-decimal space-y-2 pl-5">
          <li>Aucune note, aucun score de qualité, aucune moyenne, nulle part.</li>
          <li>
            Aucune information déduite. Un champ inconnu affiche « Non communiqué ».
          </li>
          <li>Une fiche incomplète n&apos;est jamais retirée du catalogue.</li>
          <li>
            Le tri décrit l&apos;état des fiches, jamais la qualité, et son libellé est toujours
            visible.
          </li>
          <li>Aucun placement achetable, aucun lien affilié.</li>
          <li>
            L&apos;assistant produit une adéquation, jamais un jugement, et énonce toujours les
            écarts.
          </li>
          <li>Toute règle appliquée au catalogue est publiée dans cette page.</li>
          <li>Toute décision manuelle est journalisée et publique.</li>
        </ol>
      </Section>

      <Section
        titre="Une fiche = un parcours pédagogique distinct"
        intro="C'est la décision structurante du produit, et l'unité de tout le reste."
      >
        <p>
          Une fiche ne correspond ni à une session, ni à un organisme, ni à une déclinaison
          marketing. Quatre niveaux se superposent :
        </p>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="inline font-medium">Organisme — </dt>
            <dd className="inline text-muted-foreground">
              l&apos;acteur qui vend et délivre. Sert à la navigation, et évite qu&apos;un acteur
              sature les résultats.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Parcours — </dt>
            <dd className="inline text-muted-foreground">
              un parcours pédagogique distinct. <strong>C&apos;est la fiche</strong>, et
              l&apos;unité de comparaison.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Variante — </dt>
            <dd className="inline text-muted-foreground">
              une déclinaison commerciale d&apos;un parcours. Affichée dans la fiche, jamais dans
              la liste. Seuls le prix, l&apos;accompagnement, la durée et les options peuvent
              varier à l&apos;intérieur d&apos;une fiche : un contenu différent fait une fiche
              différente.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Session — </dt>
            <dd className="inline text-muted-foreground">
              une date, une ville, une promotion. Hors périmètre pour l&apos;instant.
            </dd>
          </div>
        </dl>
      </Section>

      <Section
        titre="Ce que ce comparateur refuse d'être"
        intro="Le marché français de la formation e-commerce est dominé par des comparatifs rémunérés à l'affiliation. Ce site fait l'inverse."
      >
        <ul className="space-y-3">
          <li>
            <strong className="font-medium">Aucune note, aucun score maison.</strong> Afficher
            91/100 face à 74/100 est un jugement. Un fait — 42 heures, éligible CPF — n&apos;est
            pas contestable.
          </li>
          <li>
            <strong className="font-medium">Aucun avis collecté.</strong> Une plateforme
            d&apos;avis est un métier à part : faux avis, modération, droit de réponse. Ce
            n&apos;est pas le métier d&apos;un comparateur de données.
          </li>
          <li>
            <strong className="font-medium">Aucun lien affilié, aucun placement vendu.</strong>{" "}
            Aucun critère de classement n&apos;est achetable.
          </li>
          <li>
            <strong className="font-medium">Aucune information déduite.</strong> Un champ non
            publié s&apos;affiche « Non communiqué ». Jamais estimé, jamais rempli par analogie.
          </li>
        </ul>
      </Section>

      <Section
        titre="Les 18 informations suivies"
        intro="Le compteur affiché sur chaque fiche décrit son état. Il n'évalue ni la formation ni l'organisme, et n'est jamais converti en pourcentage : un chiffre sur 100 se lit comme une note."
      >
        <ol className="grid list-decimal gap-x-8 gap-y-1 pl-5 sm:grid-cols-2">
          {CHAMPS_INFORMATION.map((champ) => (
            <li key={champ}>{LIBELLES_CHAMPS_INFORMATION[champ]}</li>
          ))}
        </ol>

        <h3 className="mt-6 font-titre font-medium">Trois états, pas deux</h3>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="inline font-medium">Non communiqué — </dt>
            <dd className="inline text-muted-foreground">
              l&apos;organisme ne publie pas l&apos;information.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Ne s&apos;applique pas — </dt>
            <dd className="inline text-muted-foreground">
              le champ n&apos;a pas de sens pour ce parcours. Le lieu d&apos;une formation
              exclusivement à distance, les modalités de paiement d&apos;une formation gratuite.
              Ces champs sortent du dénominateur : « 12 sur 16 applicables ». Un champ
              effectivement publié reste toujours applicable.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">À confirmer — </dt>
            <dd className="inline text-muted-foreground">
              valeur connue mais vérification datée.
            </dd>
          </div>
        </dl>
      </Section>

      <Section
        titre="Classification"
        intro="Trois niveaux, parce qu'un seul ne filtre plus rien. Avec un niveau de tags unique, filtrer sur une compétence remontait un quart du catalogue : un filtre qui remonte 54 résultats sur 195 ne filtre plus."
      >
        <h3 className="font-titre font-medium">Domaine — un seul, parmi neuf</h3>
        <p className="mt-1 text-muted-foreground">
          {Object.values(LIBELLES_DOMAINES).join(" · ")}
        </p>
        <p className="mt-2">Déterminé dans cet ordre, le premier motif reconnu l&apos;emporte :</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
          <li>motif reconnu dans l&apos;intitulé du parcours</li>
          <li>motif reconnu dans l&apos;intitulé et le nom de l&apos;organisme</li>
          <li>motif reconnu dans un module publié</li>
          <li>
            défaut selon la catégorie : « Commerce et vente » pour les universités et les
            écoles, « Marketing digital » sinon
          </li>
        </ol>

        <h3 className="mt-6 font-titre font-medium">Sujet principal — un seul, obligatoire</h3>
        <p className="mt-1">Déterminé dans cet ordre strict :</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
          <li>la compétence citée dans l&apos;intitulé</li>
          <li>sinon, la compétence présente dans au moins {pourcentSujet} % des modules publiés</li>
          <li>
            sinon, la compétence citée dans les outils — uniquement si aucun programme
            n&apos;est publié
          </li>
          <li>sinon, le sujet généraliste du domaine</li>
        </ol>
        <p className="mt-2 text-muted-foreground">
          Le seuil de {pourcentSujet} % remplace celui de 25 % de la première version, qui
          produisait des aberrations : une formation Shopify de sept modules dont un sur le
          référencement n&apos;est pas une formation de référencement.
        </p>
        <p className="mt-2 text-muted-foreground">
          Les sujets généralistes ne sont pas un pis-aller : la majorité des licences pro,
          masters et bachelors n&apos;ont aucune compétence dominante. Sans eux, une grande
          partie du catalogue sortirait du filtre principal, qui est l&apos;entrée de
          navigation.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          <strong className="font-medium">Vocabulaire fermé</strong> —{" "}
          {SUJETS_OUTILS.length} sujets-outils : {SUJETS_OUTILS.join(", ")}. Et{" "}
          {Object.keys(SUJET_GENERALISTE).length} sujets généralistes, un par domaine :{" "}
          {Object.values(SUJET_GENERALISTE).join(", ")}.
        </p>

        <h3 className="mt-6 font-titre font-medium">Compétences abordées</h3>
        <p className="mt-1 text-muted-foreground">
          Toutes les autres compétences identifiées, sans hiérarchie interne. Elles alimentent
          un filtre secondaire, jamais le filtre principal. {MOTIFS_COMPETENCES.length}{" "}
          compétences sont détectées, uniquement dans l&apos;intitulé, les outils et les modules
          publiés — jamais au-delà.
        </p>
      </Section>

      <Section
        titre="Regroupement des offres"
        intro="Une fiche = un parcours pédagogique distinct. Pas une session, pas un organisme, pas une déclinaison marketing. Trois issues possibles, jamais une règle binaire."
      >
        <h3 className="font-titre font-medium">Fusion automatique</h3>
        <p className="mt-1 text-muted-foreground">
          Les quatre conditions réunies, et aucune preuve de divergence : même organisme ·
          intitulé partageant au moins {pourcentIntitule} % de mots communs après retrait du
          suffixe de formule (Builder, Premium, Elite, Starter, Niveau N…) · même niveau
          d&apos;entrée · même sujet principal.
        </p>

        <h3 className="mt-4 font-titre font-medium">Refus automatique</h3>
        <p className="mt-1 text-muted-foreground">
          Les deux programmes sont publiés <em>et</em> partagent moins de {pourcentTronc} % de
          leurs modules. Deux fiches distinctes.
        </p>

        <h3 className="mt-4 font-titre font-medium">Cas ambigu</h3>
        <p className="mt-1 text-muted-foreground">
          Informations insuffisantes pour trancher — typiquement, au moins un programme non
          publié. Le cas part en file d&apos;arbitrage. Pendant l&apos;attente, les offres
          restent des fiches distinctes et consultables, mais se replient en une seule entrée
          dans la liste, avec le motif affiché.
        </p>

        <p className="mt-5 rounded border border-border bg-muted/40 p-4">
          <strong className="font-medium">Pourquoi la fusion est le défaut.</strong> La
          formulation naïve serait « je fusionne si je peux prouver que les programmes sont
          similaires ». Elle produit une incitation inversée : organisme transparent, programme
          publié, une fiche ; organisme opaque, programme absent, quinze fiches. Le manque
          d&apos;information devient rentable. La règle retenue est l&apos;inverse : on regroupe
          par défaut, on ne refuse qu&apos;avec la preuve d&apos;une divergence réelle.
          L&apos;absence de données ne peut jamais faire gagner de place dans les résultats.
        </p>
      </Section>

      <Section
        titre="File d'arbitrage"
        intro="Toute décision manuelle enregistre le cas, la règle restée muette, la preuve retenue, la date et l'auteur. Cette file est publique : c'est ce qui rend la revue manuelle compatible avec le reste du produit."
      >
        {arbitrages.length === 0 ? (
          <p className="text-muted-foreground">Aucun cas en attente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-2 font-normal">Cas</th>
                  <th className="p-2 font-normal">Règle restée muette</th>
                  <th className="p-2 font-normal">Preuve retenue</th>
                  <th className="p-2 font-normal">Statut</th>
                  <th className="p-2 font-normal">Décidé le</th>
                </tr>
              </thead>
              <tbody>
                {arbitrages.map((a) => (
                  <tr key={a.id} className="border-b border-border align-top">
                    <td className="p-2 font-medium">{a.regle_muette}</td>
                    <td className="p-2 text-muted-foreground">Fusion automatique</td>
                    <td className="p-2 text-muted-foreground">{a.preuve_retenue}</td>
                    <td className="p-2">
                      <span className={a.decision === null ? "text-absent" : "text-atteste"}>
                        {a.decision ?? "En attente d'arbitrage"}
                      </span>
                    </td>
                    <td className="chiffre p-2 text-muted-foreground">
                      {a.date_decision
                        ? new Date(a.date_decision).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 rounded border border-absent/30 p-3 text-xs text-absent">
          Reste à trancher avant d&apos;ouvrir la revendication de fiche : qui arbitre, et sous
          quel délai. Une file sans engagement de traitement devient une zone grise permanente —
          et c&apos;est précisément là que la pression commerciale s&apos;exercerait, puisque
          rester en attente coûte des lignes de résultats à l&apos;organisme.
        </p>
      </Section>

      <Section
        titre="Sources de données"
        intro="D'où vient chaque information. Un champ non publié par ces sources reste « Non communiqué » : nous ne le complétons pas par recoupement."
      >
        <dl className="space-y-2">
          <div>
            <dt className="inline font-medium">France Compétences — </dt>
            <dd className="inline text-muted-foreground">
              fiches RNCP et RS, certificateurs accrédités, liste des organismes préparant à la
              certification, dates d&apos;échéance.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Mon Compte Formation — </dt>
            <dd className="inline text-muted-foreground">
              catalogue des offres éligibles au CPF.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">
              Liste publique des organismes de formation —{" "}
            </dt>
            <dd className="inline text-muted-foreground">déclarations d&apos;activité, SIRET.</dd>
          </div>
          <div>
            <dt className="inline font-medium">Liste des certifiés Qualiopi — </dt>
            <dd className="inline text-muted-foreground">statut qualité.</dd>
          </div>
          <div>
            <dt className="inline font-medium">Onisep — </dt>
            <dd className="inline text-muted-foreground">diplômes d&apos;État, BTS, BUT.</dd>
          </div>
          <div>
            <dt className="inline font-medium">Sites officiels des organismes — </dt>
            <dd className="inline text-muted-foreground">
              prix réels, programmes, formations indépendantes. La source retenue est affichée sur
              chaque fiche, avec sa date de vérification.
            </dd>
          </div>
        </dl>
      </Section>

      <Section
        titre="Classement des résultats"
        intro="Aucun critère n'est achetable. Le libellé du tri appliqué est toujours affiché sous la liste."
      >
        <dl className="space-y-3">
          {TRIS.map((tri) => (
            <div key={tri}>
              <dt className="font-medium">
                {
                  {
                    informations: "Informations disponibles (par défaut)",
                    verification: "Dernière vérification",
                    alphabetique: "Ordre alphabétique",
                    prix: "Prix croissant",
                    duree: "Volume horaire",
                  }[tri]
                }
              </dt>
              <dd className="text-muted-foreground">{LIBELLES_TRIS[tri]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-muted-foreground">
          Effet recherché, assumé : un organisme mal classé n&apos;a pas à négocier, il a à
          remplir sa fiche.
        </p>
      </Section>

      <Section
        titre="Éligibilité au référencement"
        intro="Un acteur est référencé s'il vérifie au moins 3 des 7 critères suivants. Les critères vérifiés sont affichés sur la fiche."
      >
        <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
          {CRITERES_ELIGIBILITE.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <h3 className="mt-5 font-titre font-medium">Jamais référencé</h3>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
          {JAMAIS_REFERENCE.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <h3 className="mt-5 font-titre font-medium">Acteurs écartés</h3>
        <p className="mt-1 text-muted-foreground">
          Publiés avec leur motif, même logique que la file d&apos;arbitrage.
        </p>
        <ul className="mt-2 space-y-1">
          {(ecartes as Array<{ nom: string; motif: string }>).map((e) => (
            <li key={e.nom}>
              <span className="font-medium">{e.nom}</span>{" "}
              <span className="text-muted-foreground">— {e.motif}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        titre="Les sept catégories d'organisme"
        intro="Elles évitent qu'un cours à 15 € et un mastère de deux ans se retrouvent dans la même liste."
      >
        <p className="text-muted-foreground">{Object.values(LIBELLES_CATEGORIES).join(" · ")}</p>
      </Section>

      <Section
        titre="Ce que cette méthode ne résout pas encore"
        intro="Autant le dire ici plutôt que de le laisser découvrir."
      >
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <strong className="font-medium text-foreground">Le dédoublonnage réel.</strong> La
            règle ne reconnaît aujourd&apos;hui que les suffixes de formule. Reconnaître que deux
            intitulés différents recouvrent le même parcours suppose de comparer les
            programmes — donc qu&apos;ils soient publiés. Beaucoup ne le sont pas.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              L&apos;éligibilité CPF non vérifiée.
            </strong>{" "}
            La donnée collectée ne distingue pas encore « vérifié non éligible » de « non
            vérifié ». Nous ne comblons pas cet écart par déduction.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              La visibilité des fiches incomplètes.
            </strong>{" "}
            Une fiche peu renseignée reste au catalogue, mais atterrit loin dans la liste. Le
            référencement est préservé, la visibilité non.
          </li>
        </ul>
      </Section>
    </div>
  );
}
