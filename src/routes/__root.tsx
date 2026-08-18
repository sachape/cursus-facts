import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navigation } from "@/composants/Navigation";
import { BarreComparaison } from "@/composants/BarreComparaison";
import { FournisseurComparaison } from "@/composants/comparaison";
import { PiedDePage, type StatistiquesPied } from "@/composants/PiedDePage";
import { chargerListe } from "@/donnees/requetes";
import { CHAMPS_INFORMATION } from "@/types/cursus";
import { FournisseurAuth } from "@/composants/authentification";
import { FournisseurSauvegardes } from "@/composants/sauvegardes";
import { FournisseurAlertes } from "@/composants/alertes-suivi";
import { RepriseIntention } from "@/composants/RepriseIntention";

/** Adresse canonique du site. Une seule source pour les métadonnées. */
const SITE = "https://formlist.fr";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  /*
    Les chiffres du pied viennent du catalogue, jamais écrits en dur : une
    promesse chiffrée est la première chose qu'un visiteur vérifie, et elle
    mentirait au premier parcours ajouté.

    Chargé à la racine parce que le pied est sur toutes les pages. Le catalogue
    est déjà lu par la plupart des routes ; ce loader n'ajoute une requête que
    sur celles qui n'en font aucune.
  */
  loader: async (): Promise<StatistiquesPied> => {
    const parcours = await chargerListe();
    return {
      parcours: parcours.length,
      organismes: new Set(parcours.map((p) => p.organismeNom)).size,
      criteres: CHAMPS_INFORMATION.length,
      /*
        PAS DE DATE DE VÉRIFICATION ICI. Le pied n'affiche plus de date globale :
        la plus récente des dates de fiche ne dit rien des autres, et l'écrire au
        singulier en faisait une affirmation sur tout le catalogue. Elle reste
        calculée là où elle décrit un objet précis — fiche, organisme, et le
        chiffre « dernière vérification » de l'accueil.
      */
    };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Formlist — Comparateur de formations e-commerce en France" },
      { name: "description", content: "Comparez les formations e-commerce en France selon leur prix, programme, durée, format, financement et certification, avec des informations vérifiées." },
      { name: "author", content: "Formlist" },
      { property: "og:title", content: "Formlist — Comparateur de formations e-commerce en France" },
      { property: "og:description", content: "Comparez les formations e-commerce en France selon leur prix, programme, durée, format, financement et certification, avec des informations vérifiées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Formlist — Comparateur de formations e-commerce en France" },
      { name: "twitter:description", content: "Comparez les formations e-commerce en France selon leur prix, programme, durée, format, financement et certification, avec des informations vérifiées." },
      /*
        Images servies depuis NOTRE domaine. Elles vivaient sur le stockage de
        l'outil qui a généré le projet : une carte de partage qui dépend d'un
        hébergement tiers casse le jour où ce tiers change d'avis, et c'est la
        prévisualisation de chaque lien partagé qui tombe d'un coup.
      */
      { property: "og:image", content: `${SITE}/og-formlist.jpg` },
      { property: "og:url", content: SITE },
      { name: "twitter:image", content: `${SITE}/og-formlist.jpg` },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        /*
          Trois familles, et seulement les graisses employées.

          Bricolage Grotesque est chargé en variable sur l'axe `opsz` (12 à 96) :
          les classes .t-display-* et .t-heading-* le pilotent via
          `font-variation-settings`, et une version statique annulerait ce
          réglage sans produire la moindre erreur — le titre paraîtrait
          simplement mou, sans qu'on sache pourquoi.
        */
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Geist:wght@400;500&family=DM+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        La sélection de comparaison vit au-dessus des routes : on choisit des
        parcours dans Explorer et on les retrouve dans Comparer.
      */}
      {/*
        L'ordre compte : les sauvegardes lisent la session, donc l'auth
        l'enveloppe. La comparaison ne dépend d'aucune des deux et vit à
        l'intérieur, où elle profite de la session pour la fusion du local.
      */}
      <FournisseurAuth>
      <FournisseurSauvegardes>
      <FournisseurAlertes>
      <FournisseurComparaison>
        {/* Rejoue l'intention dès qu'une session apparaît, connexion directe
            comme retour de confirmation. Monté ici : il lui faut les
            fournisseurs pour écrire ce qu'on avait demandé. */}
        <RepriseIntention />
        <div className="flex min-h-screen flex-col">
          <Navigation />
          <div className="flex-1">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </div>
          <PiedDePage />
          <BarreComparaison />
        </div>
      </FournisseurComparaison>
      </FournisseurAlertes>
      </FournisseurSauvegardes>
      </FournisseurAuth>
    </QueryClientProvider>
  );
}
