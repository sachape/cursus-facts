/**
 * Enregistrer la comparaison en cours dans son compte.
 *
 * POURQUOI AUCUN NOM N'EST DEMANDÉ. Une boîte de dialogue « Donnez un nom à
 * votre comparaison » place un champ vide entre le geste et son effet, pour une
 * information dont personne n'a besoin : les deux listes qui affichent les
 * comparaisons enregistrées retombent déjà sur les intitulés des parcours
 * (`c.nom ?? noms.join(" · ")`). Le nom reste donc `null`, et la comparaison
 * se lit par ce qu'elle contient — ce qui est aussi la façon dont on la
 * reconnaît.
 *
 * L'INTENTION EST POSÉE AVANT LA REDIRECTION, comme pour le signet. Une
 * personne déconnectée qui clique ici veut enregistrer, pas créer un compte.
 * Si, après l'inscription et l'aller-retour par la boîte mail, elle devait
 * recomposer sa sélection et recliquer, elle ne le ferait pas — et le compte
 * créé n'aurait servi à rien. `RepriseIntention` rejoue l'enregistrement au
 * retour, y compris dans un autre onglet.
 *
 * CE QUE LE BOUTON NE FAIT PAS : vérifier qu'une comparaison identique existe
 * déjà. Il faudrait une requête à chaque changement de sélection pour un cas
 * rare, et enregistrer deux fois le même ensemble à quelques jours d'écart est
 * un geste plausible, pas une erreur. Dans une même session, la confirmation
 * remplace le bouton, ce qui suffit à éviter le double clic.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./authentification";
import { useComparaison } from "./comparaison";
import { poserIntention } from "./intention";
import { mesurer } from "./mesure";

type Etat = "repos" | "en-cours" | "enregistree";

export function EnregistrerComparaison() {
  const { utilisateur } = useAuth();
  const { selection } = useComparaison();
  const naviguer = useNavigate();
  const chemin = useRouterState({ select: (e) => e.location.href });

  const [etat, setEtat] = useState<Etat>("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  /*
    La confirmation ne survit pas à un changement de sélection : retirer un
    parcours produit une AUTRE comparaison, et laisser « Enregistrée » affiché
    la donnerait pour sauvegardée alors qu'elle ne l'est pas.
  */
  const cles = selection.map((p) => p.slug).join(",");
  useEffect(() => {
    setEtat("repos");
    setErreur(null);
  }, [cles]);

  async function enregistrer() {
    const ids = selection.map((p) => p.slug);

    if (utilisateur === null) {
      poserIntention({ type: "enregistrer-comparaison", parcoursIds: ids, nom: null });
      void naviguer({ to: "/connexion", search: { retour: chemin } });
      return;
    }

    setEtat("en-cours");
    setErreur(null);
    const { error } = await supabase
      .from("comparaisons")
      .insert({ utilisateur_id: utilisateur.id, nom: null, parcours_ids: ids });

    if (error !== null) {
      setEtat("repos");
      /*
        Ce qui s'est passé, pourquoi, et quoi faire — jamais le message brut de
        la base. `comparaisons_taille` est la seule contrainte qu'un geste
        normal puisse heurter, et son message par défaut ne dit rien à personne.
      */
      setErreur(
        error.message.includes("comparaisons_taille")
          ? "Une comparaison enregistrée porte entre deux et quatre parcours. Ajustez la sélection avant d'enregistrer."
          : "L'enregistrement n'a pas abouti. Votre comparaison est intacte — réessayez dans un instant.",
      );
      return;
    }

    setEtat("enregistree");
    mesurer("comparaison_enregistree", { nombre: ids.length });
  }

  if (etat === "enregistree") {
    return (
      /*
        CONFIRMER CE QUI VIENT DE SE PASSER, ET DIRE OÙ ÇA VA. « Enregistrée »
        seul laisse la question suivante sans réponse : où la retrouver ? Le
        lien répond sur place, sans faire quitter la comparaison en cours.
      */
      <p
        role="status"
        className="flex shrink-0 items-center gap-(--space-2) t-body-sm text-(--text-secondary)"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="size-(--signet-taille) shrink-0 text-(--status-verified)"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 10.5l4 4 8-9" />
        </svg>
        Enregistrée —{" "}
        <Link to="/mes-comparaisons" className="underline underline-offset-2">
          voir mes comparaisons
        </Link>
      </p>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-(--space-2)">
      <button
        type="button"
        onClick={() => void enregistrer()}
        disabled={etat === "en-cours"}
        className="inline-flex h-(--bouton-hauteur) items-center justify-center whitespace-nowrap rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-(--space-4) t-body-sm text-(--text-primary) transition-colors duration-(--motion-fast) hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) disabled:opacity-60 max-[639px]:h-(--bouton-hauteur-tactile)"
      >
        {/*
          Le libellé ne change pas selon l'état de connexion. Écrire « Créer un
          compte pour enregistrer » annoncerait le péage au lieu du résultat, et
          ferait renoncer avant même d'avoir essayé — alors que l'intention
          posée rend le détour réversible.
        */}
        {etat === "en-cours" ? "Enregistrement…" : "Enregistrer cette comparaison"}
      </button>

      {erreur !== null && (
        // À côté du bouton, jamais en bandeau : une erreur affichée en haut de
        // page oblige à faire le lien soi-même avec le geste qui l'a produite.
        <p role="alert" className="max-w-prose t-caption text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}
