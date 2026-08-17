/**
 * Page d'administration — lancement de l'ingestion du catalogue.
 *
 * Outil interne, pas une page produit. Elle n'expose aucune donnée et ne fait
 * rien sans le jeton attendu par le serveur.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { lancerIngestion, type ResultatSeed } from "@/ingestion/seed.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chargerCatalogue } from "@/donnees/catalogue";
import { CHAMPS_INFORMATION } from "@/types/cursus";
import { Checkbox } from "@/components/ui/checkbox";

/** Lu du catalogue source : l'écrire à la main le fait mentir au premier ajout. */
const OFFRES_SOURCES = chargerCatalogue().length;

export const Route = createFileRoute("/admin/seed")({
  component: PageSeed,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});

function PageSeed() {
  const [jeton, setJeton] = useState("");
  const [ecraser, setEcraser] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<ResultatSeed | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer() {
    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      setResultat(await lancerIngestion({ data: { jeton, ecraser } }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Ingestion du catalogue</h1>
      {/*
        AUCUN CHIFFRE EN DUR ICI NON PLUS. « 195 parcours sources » et « 18
        informations » avaient été écrits à la main : le premier était faux de
        vingt-deux fiches le jour où on l'a relu, sur l'écran même qui sert à
        écrire le catalogue en base. Les deux se lisent désormais du modèle.
      */}
      <p className="mt-2 text-sm text-muted-foreground">
        Écrit les <span className="chiffre">{OFFRES_SOURCES}</span> parcours sources en base,
        en appliquant la classification, le regroupement et l&apos;état des{" "}
        <span className="chiffre">{CHAMPS_INFORMATION.length}</span> informations.
        L&apos;opération est rejouable : les organismes sont rapprochés par leur nom, les
        parcours par leur slug. Les fiches que le catalogue ne produit plus sont retirées.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jeton">Jeton d&apos;ingestion</Label>
          <Input
            id="jeton"
            type="password"
            value={jeton}
            onChange={(e) => setJeton(e.target.value)}
            placeholder="SEED_TOKEN"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="ecraser"
            checked={ecraser}
            onCheckedChange={(v) => setEcraser(v === true)}
          />
          <Label htmlFor="ecraser" className="font-normal">
            Mettre à jour les fiches déjà en base
          </Label>
        </div>

        <Button onClick={lancer} disabled={enCours || jeton.length === 0}>
          {enCours ? "Ingestion en cours…" : "Lancer l'ingestion"}
        </Button>
      </div>

      {erreur !== null && (
        <p className="mt-6 rounded-md border border-destructive/40 p-4 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {resultat?.statut === "refuse" && (
        <p className="mt-6 rounded-md border p-4 text-sm">{resultat.raison}</p>
      )}

      {resultat?.statut === "ok" && (
        <dl className="mt-6 space-y-1 rounded-md border p-4 text-sm">
          <Ligne terme="Organismes créés" valeur={resultat.organismesCrees} />
          <Ligne terme="Organismes au total" valeur={resultat.organismesTotal} />
          <Ligne terme="Fiches écrites" valeur={resultat.fichesEcrites} />
          <Ligne terme="Fiches repliées en arbitrage" valeur={resultat.fichesRepliees} />
          <Ligne terme="Variantes" valeur={resultat.variantesEcrites} />
          <Ligne terme="Fiches retirées" valeur={resultat.fichesRetirees.length} />
          <Ligne terme="Arbitrages en attente" valeur={resultat.arbitragesEnAttente} />
          <Ligne terme="Informations vérifiées" valeur={resultat.informationsVerifiees} />
          {/*
            LES RETRAITS SONT NOMMÉS, PAS SEULEMENT COMPTÉS. C'est la seule
            opération de l'ingestion qui détruit : un compteur dirait « 22 » sans
            permettre de vérifier que ce sont bien les vingt-deux attendues.
            Nommées, une suppression aberrante se voit à la première lecture.
          */}
          {resultat.fichesRetirees.length > 0 && (
            <div className="mt-4">
              <p className="t-label text-(--text-tertiary)">Fiches retirées de la base</p>
              <ul className="mt-2 flex flex-col gap-1">
                {resultat.fichesRetirees.map((slug) => (
                  <li key={slug} className="t-caption text-(--text-secondary)">
                    {slug}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </dl>
      )}
    </main>
  );
}

function Ligne({ terme, valeur }: { terme: string; valeur: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{terme}</dt>
      <dd className="tabular-nums">{valeur.toLocaleString("fr-FR")}</dd>
    </div>
  );
}
