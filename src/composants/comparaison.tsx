/**
 * Sélection de parcours à comparer.
 *
 * Quatre au maximum. Au-delà, l'ajout est refusé avec un message plutôt que
 * silencieusement ignoré : un bouton qui ne fait rien laisse croire à un bug.
 *
 * La sélection survit à la navigation entre les vues (elle vit dans un
 * contexte au-dessus des routes) et à un rechargement de page
 * (`sessionStorage`) — on choisit dans Explorer, on compare dans Comparer.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const MAX_COMPARAISON = 4;

const CLE_STOCKAGE = "cursus.comparaison";

/** Ce qu'on retient d'un parcours sélectionné : de quoi étiqueter la barre. */
export type ParcoursSelectionne = { slug: string; nom: string };

type Contexte = {
  selection: ParcoursSelectionne[];
  slugs: string[];
  ajouter: (parcours: ParcoursSelectionne) => void;
  retirer: (slug: string) => void;
  vider: () => void;
  contient: (slug: string) => boolean;
  /** Message de refus du dernier ajout, ou null. */
  refus: string | null;
  effacerRefus: () => void;
};

const ContexteComparaison = createContext<Contexte | null>(null);

export function FournisseurComparaison({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<ParcoursSelectionne[]>([]);
  const [refus, setRefus] = useState<string | null>(null);

  // Relecture après hydratation : le stockage n'existe pas côté serveur, et
  // lire au premier rendu produirait une divergence serveur/client.
  useEffect(() => {
    try {
      const brut = sessionStorage.getItem(CLE_STOCKAGE);
      if (brut) setSelection(JSON.parse(brut) as ParcoursSelectionne[]);
    } catch {
      // Stockage indisponible : la sélection reste en mémoire, sans plus.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(selection));
    } catch {
      // Idem : l'absence de persistance ne doit rien casser.
    }
  }, [selection]);

  const ajouter = useCallback((parcours: ParcoursSelectionne) => {
    setSelection((actuels) => {
      if (actuels.some((p) => p.slug === parcours.slug)) return actuels;
      if (actuels.length >= MAX_COMPARAISON) {
        setRefus(
          `La comparaison porte sur ${MAX_COMPARAISON} parcours au maximum. Retirez-en un pour en ajouter un autre.`,
        );
        return actuels;
      }
      setRefus(null);
      return [...actuels, parcours];
    });
  }, []);

  const retirer = useCallback((slug: string) => {
    setRefus(null);
    setSelection((actuels) => actuels.filter((p) => p.slug !== slug));
  }, []);

  const vider = useCallback(() => {
    setRefus(null);
    setSelection([]);
  }, []);

  const valeur = useMemo<Contexte>(
    () => ({
      selection,
      slugs: selection.map((p) => p.slug),
      ajouter,
      retirer,
      vider,
      contient: (slug: string) => selection.some((p) => p.slug === slug),
      refus,
      effacerRefus: () => setRefus(null),
    }),
    [selection, ajouter, retirer, vider, refus],
  );

  return <ContexteComparaison.Provider value={valeur}>{children}</ContexteComparaison.Provider>;
}

export function useComparaison(): Contexte {
  const contexte = useContext(ContexteComparaison);
  if (!contexte) {
    throw new Error("useComparaison doit être utilisé dans un FournisseurComparaison");
  }
  return contexte;
}
