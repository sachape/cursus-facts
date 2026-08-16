/**
 * Mes alertes — l'écran existe, les alertes viennent au chantier suivant.
 *
 * La route est créée maintenant parce que le menu du compte y renvoie déjà :
 * un lien mort dans un menu se remarque plus qu'une page qui annonce son
 * arrivée. Elle porte son `noindex` dès le premier jour.
 */
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mes-alertes")({
  component: MesAlertes,
  head: () => ({
    meta: [{ title: "Mes alertes | Formlist" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

function MesAlertes() {
  return (
    <main className="mx-auto max-w-(--contenu-largeur-max) px-(--space-6) py-(--space-12)">
      <h1 className="t-heading-1 text-(--text-primary)">Mes alertes</h1>
      <p className="mt-(--space-4) max-w-2xl t-body-sm text-(--text-secondary)">
        La surveillance des changements de prix, de durée, de programme et de certification arrive
        prochainement. Vous pourrez être prévenu par email lorsqu&apos;une information change sur une
        formation que vous suivez.
      </p>
      <p className="mt-(--space-6) t-body-sm">
        <Link to="/catalogue" className="text-(--text-secondary) underline underline-offset-2">
          ← Retour au catalogue
        </Link>
      </p>
    </main>
  );
}
