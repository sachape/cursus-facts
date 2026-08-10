/**
 * Rejoue ce que la personne voulait faire avant qu'on lui demande un compte.
 *
 * POURQUOI SUR L'APPARITION DE LA SESSION, et non au montage d'un composant.
 * Le parcours d'inscription sort du site : on clique, on crée un compte, on
 * ouvre sa boîte mail, et on revient dans un ONGLET NEUF. Un effet de montage
 * ne verrait que le second cas ou que le premier ; la transition « pas de
 * session → session » les voit tous les deux, parce que c'est elle qui se
 * produit dans les deux.
 *
 * MONTÉ À L'INTÉRIEUR DES FOURNISSEURS, et c'est nécessaire : rejouer une
 * intention veut dire écrire une sauvegarde ou une comparaison, donc consommer
 * les contextes qui les portent. L'abonnement d'authentification, lui, vit au
 * niveau au-dessus et n'y a pas accès.
 *
 * SANS CE POINT, TOUT LE RESTE EST DÉCORATIF. Quelqu'un qui clique sur
 * sauvegarder, crée un compte, confirme son email et revient sur un catalogue
 * vide ne recommencera pas — et le compte qu'il vient de créer n'aura servi à
 * rien.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./authentification";
import { useSauvegardes } from "./sauvegardes";
import { reprendreIntention } from "./intention";
import { mesurer } from "./mesure";

export function RepriseIntention() {
  const { utilisateur } = useAuth();
  const { sauvegarder } = useSauvegardes();
  /*
    L'identifiant précédent, et non un simple booléen : changer de compte dans
    le même onglet est aussi une apparition de session, et l'intention posée
    avant doit se rejouer pour le nouveau.
  */
  const precedent = useRef<string | null>(null);

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = utilisateur?.id ?? null;

    if (utilisateur === null) return;
    if (avant === utilisateur.id) return; // Pas une apparition : un simple rendu.

    const reprise = reprendreIntention();
    if (reprise === null) return;
    const { intention, ageMs } = reprise;

    /*
      Mesuré AVANT de rejouer, et non après : la reprise peut échouer — une
      sélection périmée, une insertion refusée — et c'est justement le cas
      qu'on veut voir. Un événement émis seulement en cas de succès donnerait
      un taux de reprise de 100 %, qui ne mesurerait plus rien.
    */
    mesurer("intention_rejouee", {
      action: intention.type,
      delai_secondes: Math.round(ageMs / 1000),
    });

    void (async () => {
      if (intention.type === "sauvegarder") {
        await sauvegarder(intention.cible, intention.cibleId);
        return;
      }

      /*
        La contrainte de deux à quatre parcours est portée par la base. On la
        vérifie ici aussi : une intention périmée peut porter une sélection qui
        n'est plus valable, et laisser l'insertion échouer donnerait une erreur
        de base de données pour une action que la personne a demandée il y a
        cinquante minutes.
      */
      const ids = intention.parcoursIds;
      if (ids.length < 2 || ids.length > 4) return;

      const { error } = await supabase.from("comparaisons").insert({
        utilisateur_id: utilisateur.id,
        nom: intention.nom,
        parcours_ids: ids,
      });
      if (error === null) mesurer("comparaison_enregistree", { nombre: ids.length });
    })();
  }, [utilisateur, sauvegarder]);

  return null;
}
