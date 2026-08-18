/**
 * Suivre un parcours — l'état des alertes du compte, côté client.
 *
 * ON NE SUPPRIME PAS UNE ALERTE, ON LA DÉSACTIVE. `active = false` conserve la
 * trace de ce qui a été suivi et de ce qui a été abandonné ; supprimer perdrait
 * l'information et rendrait impossible de constater qu'on avait le droit
 * d'écrire. C'est la règle « on n'efface pas une valeur, on la déclasse »,
 * appliquée à un abonnement.
 *
 * Les policies RLS de `alertes` autorisent déjà chacun à lire et écrire ses
 * propres lignes : ce module parle donc directement à la base, comme les
 * sauvegardes, sans passer par le serveur.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./authentification";
import { CHAMPS_SURVEILLES } from "@/modele/alertes";

type Contexte = {
  estSuivi: (parcoursId: string) => boolean;
  /** Crée, réactive ou désactive — jamais ne supprime. */
  basculer: (parcoursId: string) => Promise<void>;
  /** Les parcours suivis, actifs seulement. */
  suivis: readonly string[];
  chargement: boolean;
};

const ContexteAlertes = createContext<Contexte | null>(null);

export function FournisseurAlertes({ children }: { children: React.ReactNode }) {
  const { utilisateur } = useAuth();
  /** parcours_id → id de la ligne, active ou non. */
  const [lignes, setLignes] = useState<ReadonlyMap<string, { id: string; active: boolean }>>(
    new Map(),
  );
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (utilisateur === null) {
      setLignes(new Map());
      return;
    }
    let annule = false;
    setChargement(true);
    void supabase
      .from("alertes")
      .select("id, parcours_id, active")
      .then(({ data, error }) => {
        if (annule) return;
        setChargement(false);
        if (error !== null || data === null) return;
        setLignes(new Map(data.map((l) => [l.parcours_id, { id: l.id, active: l.active }])));
      });
    return () => {
      annule = true;
    };
  }, [utilisateur]);

  const estSuivi = useCallback(
    (parcoursId: string) => lignes.get(parcoursId)?.active === true,
    [lignes],
  );

  const basculer = useCallback(
    async (parcoursId: string) => {
      if (utilisateur === null) return;
      const existante = lignes.get(parcoursId);
      const vise = !(existante?.active ?? false);

      // Optimiste : l'état bascule tout de suite, le réseau ne fait pas attendre.
      const precedent = lignes;
      setLignes((m) => {
        const suivant = new Map(m);
        suivant.set(parcoursId, { id: existante?.id ?? "en-cours", active: vise });
        return suivant;
      });

      if (existante !== undefined && existante.id !== "en-cours") {
        const { error } = await supabase
          .from("alertes")
          .update({ active: vise })
          .eq("id", existante.id);
        if (error !== null) setLignes(precedent);
        return;
      }

      const { data, error } = await supabase
        .from("alertes")
        .insert({
          utilisateur_id: utilisateur.id,
          parcours_id: parcoursId,
          champs_surveilles: [...CHAMPS_SURVEILLES],
        })
        .select("id")
        .single();

      if (error !== null || data === null) {
        setLignes(precedent);
        return;
      }
      setLignes((m) => new Map(m).set(parcoursId, { id: data.id, active: true }));
    },
    [utilisateur, lignes],
  );

  const suivis = useMemo(
    () => [...lignes.entries()].filter(([, l]) => l.active).map(([parcoursId]) => parcoursId),
    [lignes],
  );

  const valeur = useMemo(
    () => ({ estSuivi, basculer, suivis, chargement }),
    [estSuivi, basculer, suivis, chargement],
  );

  return <ContexteAlertes.Provider value={valeur}>{children}</ContexteAlertes.Provider>;
}

export function useAlertesSuivies(): Contexte {
  const contexte = useContext(ContexteAlertes);
  if (!contexte) throw new Error("useAlertesSuivies doit être utilisé dans un FournisseurAlertes");
  return contexte;
}
