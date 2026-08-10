/**
 * Sauvegardes — ce qu'une personne veut retrouver.
 *
 * AUCUN AGRÉGAT PERSISTÉ. Pas de compteur de sauvegardes sur les parcours : les
 * totaux se calculent à la lecture, jamais dans une colonne à côté. C'est le
 * défaut qui a fait mentir le compteur d'informations pendant six jours — une
 * valeur dérivée stockée finit toujours par diverger de sa source.
 *
 * ET SURTOUT : AUCUN SIGNAL D'USAGE NE REMONTE DANS LE CLASSEMENT. Ni ici ni
 * ailleurs. Une formation sauvegardée cent fois n'est pas meilleure, c'est
 * celle que des gens ont regardée. L'invariant est posé dans `classement.ts` et
 * doit rester vert.
 *
 * L'UNICITÉ EST EN BASE — `UNIQUE (utilisateur_id, type, cible_id)`. L'interface
 * ne la reproduit pas ; elle traite le conflit, parce que deux clics rapides se
 * croisent réellement et qu'un `23505` remonté brut à l'écran serait un défaut
 * de notre part, pas de la personne.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./authentification";
import { mesurer } from "./mesure";

export type TypeSauvegarde = "parcours" | "organisme";

/** Clé locale d'une sauvegarde, indépendante de la base. */
const clef = (type: TypeSauvegarde, cibleId: string) => `${type}:${cibleId}`;

type Contexte = {
  /** Clés `type:cibleId` des éléments sauvegardés. */
  cles: ReadonlySet<string>;
  chargement: boolean;
  estSauvegarde: (type: TypeSauvegarde, cibleId: string) => boolean;
  basculer: (type: TypeSauvegarde, cibleId: string) => Promise<void>;
  sauvegarder: (type: TypeSauvegarde, cibleId: string) => Promise<void>;
};

const ContexteSauvegardes = createContext<Contexte | null>(null);

export function FournisseurSauvegardes({ children }: { children: React.ReactNode }) {
  const { utilisateur } = useAuth();
  const [cles, setCles] = useState<ReadonlySet<string>>(new Set());
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (utilisateur === null) {
      setCles(new Set());
      return;
    }
    let annule = false;
    setChargement(true);
    void supabase
      .from("sauvegardes")
      .select("type, cible_id")
      .then(({ data, error }) => {
        if (annule) return;
        setChargement(false);
        if (error !== null || data === null) return;
        setCles(new Set(data.map((l) => clef(l.type as TypeSauvegarde, l.cible_id))));
      });
    return () => {
      annule = true;
    };
  }, [utilisateur]);

  const estSauvegarde = useCallback(
    (type: TypeSauvegarde, cibleId: string) => cles.has(clef(type, cibleId)),
    [cles],
  );

  const sauvegarder = useCallback(
    async (type: TypeSauvegarde, cibleId: string) => {
      if (utilisateur === null) return;
      // Optimiste : le signet se remplit tout de suite. Le réseau ne doit pas
      // faire attendre un geste dont l'effet est évident.
      setCles((c) => new Set(c).add(clef(type, cibleId)));
      const { error } = await supabase
        .from("sauvegardes")
        .insert({ utilisateur_id: utilisateur.id, type, cible_id: cibleId });
      /*
        `23505` = violation d'unicité : deux clics se sont croisés, et la ligne
        existe déjà. C'est le résultat voulu — on ne défait rien.
      */
      if (error !== null && error.code !== "23505") {
        setCles((c) => {
          const suivant = new Set(c);
          suivant.delete(clef(type, cibleId));
          return suivant;
        });
        return;
      }
      mesurer("sauvegarde_ajoutee", { type });
    },
    [utilisateur],
  );

  const basculer = useCallback(
    async (type: TypeSauvegarde, cibleId: string) => {
      if (utilisateur === null) return;
      if (!cles.has(clef(type, cibleId))) {
        await sauvegarder(type, cibleId);
        return;
      }
      setCles((c) => {
        const suivant = new Set(c);
        suivant.delete(clef(type, cibleId));
        return suivant;
      });
      const { error } = await supabase
        .from("sauvegardes")
        .delete()
        .eq("utilisateur_id", utilisateur.id)
        .eq("type", type)
        .eq("cible_id", cibleId);
      if (error !== null) {
        setCles((c) => new Set(c).add(clef(type, cibleId)));
        return;
      }
      mesurer("sauvegarde_retiree", { type });
    },
    [utilisateur, cles, sauvegarder],
  );

  const valeur = useMemo(
    () => ({ cles, chargement, estSauvegarde, basculer, sauvegarder }),
    [cles, chargement, estSauvegarde, basculer, sauvegarder],
  );

  return <ContexteSauvegardes.Provider value={valeur}>{children}</ContexteSauvegardes.Provider>;
}

export function useSauvegardes(): Contexte {
  const contexte = useContext(ContexteSauvegardes);
  if (!contexte) throw new Error("useSauvegardes doit être utilisé dans un FournisseurSauvegardes");
  return contexte;
}
