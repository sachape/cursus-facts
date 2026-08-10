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
import { useComparaison } from "./comparaison";
import { reprendreIntention } from "./intention";
import { mesurer } from "./mesure";

export function RepriseIntention() {
  const { utilisateur } = useAuth();
  const { sauvegarder } = useSauvegardes();
  const { selection, remplacer } = useComparaison();
  /*
    La sélection passe par une référence plutôt que par une dépendance de
    l'effet : en dépendance, chaque ajout ou retrait de parcours relancerait la
    reprise d'intention, alors que celle-ci ne doit se jouer qu'à l'apparition
    d'une session.
  */
  const selectionCourante = useRef<typeof selection>([]);
  selectionCourante.current = selection;
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
      const ids = intention.parcours.map((p) => p.slug);
      if (ids.length < 2 || ids.length > 4) return;

      /*
        LA SÉLECTION LOCALE EST RENDUE AVANT L'INSERTION, et c'est délibéré :
        c'est ce que la personne revient voir. L'enregistrement en base peut
        prendre une seconde ou échouer ; l'écran, lui, doit montrer la
        comparaison tout de suite. Sans ça, elle revient de sa boîte mail sur
        l'état vide — mesuré, `sessionStorage` vaut `[]` dans l'onglet neuf.

        SEULEMENT SI LA SÉLECTION EST VIDE. Se connecter dans l'onglet où l'on
        travaille est le cas le plus fréquent, et la sélection y est intacte :
        la remplacer par celle de l'intention écraserait ce que la personne
        vient peut-être de modifier. La règle de `remplacer` vaut ici aussi —
        on ne fusionne pas deux sélections, ça produirait un ensemble que
        personne n'a composé.
      */
      if (selectionCourante.current.length === 0) remplacer(intention.parcours);

      const { error } = await supabase.from("comparaisons").insert({
        utilisateur_id: utilisateur.id,
        nom: intention.nom,
        parcours_ids: ids,
      });
      if (error === null) mesurer("comparaison_enregistree", { nombre: ids.length });
    })();
  }, [utilisateur, sauvegarder, remplacer]);

  return null;
}
