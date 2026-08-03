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
import { Checkbox } from "@/components/ui/checkbox";

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
      <p className="mt-2 text-sm text-muted-foreground">
        Écrit les 195 parcours sources en base, en appliquant la classification, le
        regroupement et l&apos;état des 18 informations. L&apos;opération est rejouable :
        les organismes sont rapprochés par leur nom, les parcours par leur slug.
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
          <Ligne terme="Arbitrages en attente" valeur={resultat.arbitragesEnAttente} />
          <Ligne terme="Informations vérifiées" valeur={resultat.informationsVerifiees} />
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
