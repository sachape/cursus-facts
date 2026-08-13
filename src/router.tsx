import { QueryClient } from "@tanstack/react-query";
import { createRouter, stringifySearchWith } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Les paramètres d'adresse s'écrivent en clair, pas en JSON.
 *
 * Par défaut, une valeur de chaîne part encodée avec ses guillemets :
 * `?certifiant=%221%22`. C'est illisible dans une barre d'adresse, illisible
 * dans un rapport Search Console, et impossible à taper à la main — alors que
 * ces paramètres sont un CONTRAT PUBLIC depuis qu'ils portent l'état des
 * filtres et servent de pages de croisement.
 *
 * La lecture reste celle par défaut, qui retombe sur la chaîne brute quand
 * `JSON.parse` échoue : les adresses de l'ancienne forme continuent donc de
 * fonctionner. `?cpf=1` se relit en revanche comme le NOMBRE 1 — d'où des
 * lecteurs de paramètres qui acceptent les deux, dans `filtres-url.ts`.
 */
const ecrireEnClair = stringifySearchWith((valeur: unknown) =>
  typeof valeur === "string" ? valeur : JSON.stringify(valeur),
);

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    stringifySearch: ecrireEnClair,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
