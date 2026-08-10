/**
 * Le signet — sur une rangée, une fiche, une carte d'organisme.
 *
 * LA REPRISE D'INTENTION EST LE CŒUR DU COMPOSANT, pas une commodité. Une
 * personne déconnectée qui clique ici veut sauvegarder, pas créer un compte :
 * l'inscription est un péage qu'on lui impose. Si, après l'avoir franchi, elle
 * doit encore retrouver la fiche et recliquer, elle ne le fait pas — et le
 * compte créé ne sert à rien.
 *
 * L'intention est donc posée AVANT la redirection, et rejouée au retour, y
 * compris après un aller-retour par la boîte mail.
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "./authentification";
import { poserIntention } from "./intention";
import { useSauvegardes, type TypeSauvegarde } from "./sauvegardes";

export function BoutonSauvegarde({
  type,
  cibleId,
  libelle,
}: {
  type: TypeSauvegarde;
  cibleId: string;
  /** Ce qu'on sauvegarde, pour le nom accessible. */
  libelle: string;
}) {
  const { utilisateur } = useAuth();
  const { estSauvegarde, basculer } = useSauvegardes();
  const naviguer = useNavigate();
  const chemin = useRouterState({ select: (e) => e.location.href });

  const actif = estSauvegarde(type, cibleId);

  return (
    <button
      type="button"
      aria-pressed={actif}
      aria-label={actif ? `Retirer ${libelle} de mes formations` : `Sauvegarder ${libelle}`}
      onClick={(e) => {
        // La rangée entière est cliquable : sans ça, sauvegarder ouvrirait la
        // fiche par-dessus.
        e.preventDefault();
        e.stopPropagation();
        if (utilisateur === null) {
          poserIntention({ type: "sauvegarder", cible: type, cibleId });
          void naviguer({ to: "/connexion", search: { retour: chemin } });
          return;
        }
        void basculer(type, cibleId);
      }}
      /*
        Cible de 44 px sous 640 px — le minimum sous lequel un pouce rate — mais
        le pictogramme reste à 20 px : c'est la ZONE qui grandit, pas le dessin,
        sinon le signet pèserait plus que l'intitulé qu'il accompagne.
      */
      className="grid size-(--signet-cible) shrink-0 place-items-center rounded-(--radius-md) text-(--text-tertiary) transition-colors duration-(--motion-fast) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) aria-pressed:text-(--text-primary) max-[639px]:size-(--signet-cible-tactile)"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-(--signet-taille)"
        fill={actif ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}
