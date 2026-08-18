/**
 * Suivre les changements d'un parcours.
 *
 * POSÉ SUR LA LIGNE DE PROVENANCE, ET NON DANS LE PIED D'ACTIONS. Le pied porte
 * déjà trois gestes — site officiel, signet, comparaison — et son propre
 * commentaire prévient qu'une quatrième action de même rang se lirait comme un
 * élément posé là. Ici, l'offre arrive au moment exact où l'on parle de la
 * fraîcheur de l'information : « vérifié le 12 août » appelle naturellement
 * « prévenez-moi si ça change ».
 *
 * LE GESTE N'EST PAS PERDU QUAND ON EST DÉCONNECTÉ. L'intention est posée avant
 * la redirection et rejouée au retour, y compris après un aller-retour par la
 * boîte mail — même mécanique que le signet.
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "./authentification";
import { poserIntention } from "./intention";
import { useAlertesSuivies } from "./alertes-suivi";

export function BoutonSuivi({ parcoursId, libelle }: { parcoursId: string; libelle: string }) {
  const { utilisateur } = useAuth();
  const { estSuivi, basculer } = useAlertesSuivies();
  const naviguer = useNavigate();
  const chemin = useRouterState({ select: (e) => e.location.href });

  const actif = estSuivi(parcoursId);

  return (
    <button
      type="button"
      aria-pressed={actif}
      /*
        Le libellé dit ce qui se passera, pas l'état courant. « Suivi » seul
        laisserait deviner si cliquer active ou désactive — `aria-pressed` porte
        l'état, le nom accessible porte l'effet.
      */
      aria-label={
        actif
          ? `Ne plus suivre les changements de ${libelle}`
          : `Être prévenu si une information change sur ${libelle}`
      }
      onClick={() => {
        if (utilisateur === null) {
          poserIntention({ type: "suivre", parcoursId });
          void naviguer({ to: "/connexion", search: { retour: chemin } });
          return;
        }
        void basculer(parcoursId);
      }}
      className="inline-flex items-center gap-(--space-1) rounded-(--radius-sm) text-(--text-secondary) underline-offset-2 transition-colors duration-(--motion-fast) hover:text-(--text-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong)"
    >
      {/*
        Une cloche pleine quand c'est actif, évidée sinon. Le pictogramme double
        le texte, il ne le remplace pas : seul, il demanderait d'apprendre ce
        qu'il veut dire.
      */}
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path
          d="M8 2a3.5 3.5 0 0 0-3.5 3.5c0 2.5-1 3.5-1 3.5h9s-1-1-1-3.5A3.5 3.5 0 0 0 8 2Zm0 12a1.5 1.5 0 0 0 1.4-1H6.6A1.5 1.5 0 0 0 8 14Z"
          fill={actif ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      {actif ? "Suivi" : "Me prévenir si ça change"}
    </button>
  );
}
