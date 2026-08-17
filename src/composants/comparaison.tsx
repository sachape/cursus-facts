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
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mesurer, type ProprietesParcours } from "./mesure";

export const MAX_COMPARAISON = 4;

const CLE_STOCKAGE = "cursus.comparaison";

/** Ce qu'on retient d'un parcours sélectionné : de quoi étiqueter la barre. */
export type ParcoursSelectionne = { slug: string; nom: string };

type Contexte = {
  selection: ParcoursSelectionne[];
  slugs: string[];
  /**
   * Ajoute à la sélection, et mesure le geste.
   *
   * LES PROPRIÉTÉS DE MESURE SONT EXIGÉES, pas optionnelles. Le contexte ne
   * retient qu'un slug et un nom — c'est ce qui est persisté en session, et
   * l'alourdir casserait la relecture des sélections déjà stockées. Mais un
   * `parcours_id` seul rendait `comparaison_ajoutee` incomparable aux autres
   * événements, `cout_etabli` en tête. Les trois appelants tiennent le
   * parcours entier ; c'est à eux de composer, par `proprietesParcours`.
   */
  ajouter: (parcours: ParcoursSelectionne, mesure: ProprietesParcours) => void;
  retirer: (slug: string) => void;
  vider: () => void;
  /**
   * Remplace la sélection entière — rechargement d'une comparaison enregistrée.
   *
   * REMPLACE et ne fusionne pas : fusionner produirait un ensemble que la
   * personne n'a jamais composé, et le plafond de quatre parcours la ferait
   * échouer sans qu'elle comprenne pourquoi.
   */
  remplacer: (parcours: ParcoursSelectionne[]) => void;
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

  /*
    La sélection est doublée dans une référence pour que la MESURE se décide
    hors de la fonction de mise à jour. Un `mesurer` posé dedans serait appelé
    deux fois en mode strict, et le compteur d'ajouts vaudrait le double sans
    que rien ne le signale.
  */
  const derniere = useRef<ParcoursSelectionne[]>([]);
  derniere.current = selection;

  const ajouter = useCallback((parcours: ParcoursSelectionne, mesure: ProprietesParcours) => {
    /*
      Mesuré seulement quand l'ajout ABOUTIT : un doublon ou un refus de
      plafond n'est pas un parcours ajouté, et le compter noierait le taux
      d'ajout dans des gestes sans effet.

      Les propriétés viennent de l'appelant, qui tient le parcours entier :
      le contexte, lui, ne retient qu'un slug et un nom, parce que c'est ce
      qui est persisté en session.
    */
    const actuelsAvant = derniere.current;
    if (
      !actuelsAvant.some((p) => p.slug === parcours.slug) &&
      actuelsAvant.length < MAX_COMPARAISON
    ) {
      mesurer("comparaison_ajoutee", {
        ...mesure,
        nombre_selectionnes: actuelsAvant.length + 1,
      });
    }

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

  const remplacer = useCallback((parcours: ParcoursSelectionne[]) => {
    setRefus(null);
    setSelection(parcours.slice(0, MAX_COMPARAISON));
  }, []);

  const valeur = useMemo<Contexte>(
    () => ({
      selection,
      remplacer,
      slugs: selection.map((p) => p.slug),
      ajouter,
      retirer,
      vider,
      contient: (slug: string) => selection.some((p) => p.slug === slug),
      refus,
      effacerRefus: () => setRefus(null),
    }),
    [selection, ajouter, retirer, vider, remplacer, refus],
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
