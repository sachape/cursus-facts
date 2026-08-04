/**
 * Champ de recherche du hero, avec autocomplétion.
 *
 * Un champ de 56 px de haut crée une attente : il promet un résultat, pas un
 * filtrage silencieux d'une liste plus bas. L'autocomplétion tient cette
 * promesse — dès trois caractères, des résultats groupés par type, chacun
 * menant directement à sa destination.
 *
 * Les groupes sont ordonnés du plus précis au plus large : un parcours nommé
 * est une réponse, un domaine n'est qu'une piste.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { normaliser } from "@/collecte/citation";

export type Suggestion = {
  type: "parcours" | "organisme" | "domaine";
  libelle: string;
  detail?: string;
  /** Ce que la sélection déclenche : ouvrir une fiche ou poser un filtre. */
  choisir: () => void;
};

const LIBELLES_GROUPES: Record<Suggestion["type"], string> = {
  parcours: "Parcours",
  organisme: "Organismes",
  domaine: "Domaines",
};

const ORDRE: Suggestion["type"][] = ["parcours", "organisme", "domaine"];
const MAX_PAR_GROUPE = 5;
const SEUIL_CARACTERES = 3;

export function RechercheHero({
  valeur,
  modifier,
  suggestions,
}: {
  valeur: string;
  modifier: (v: string) => void;
  /** Calculées par l'appelant : ce composant n'interroge aucune donnée. */
  suggestions: Suggestion[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [surligne, setSurligne] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);
  const listeId = useId();

  const groupes = useMemo(() => {
    if (normaliser(valeur).length < SEUIL_CARACTERES) return [];
    return ORDRE.map((type) => ({
      type,
      entrees: suggestions.filter((s) => s.type === type).slice(0, MAX_PAR_GROUPE),
    })).filter((g) => g.entrees.length > 0);
  }, [valeur, suggestions]);

  const aplaties = useMemo(() => groupes.flatMap((g) => g.entrees), [groupes]);

  useEffect(() => setSurligne(0), [valeur]);

  // Un clic hors du champ referme : sans ça, la liste reste ouverte derrière
  // le contenu et intercepte des clics destinés aux résultats.
  useEffect(() => {
    const dehors = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, []);

  const clavier = (e: React.KeyboardEvent) => {
    if (aplaties.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSurligne((i) => (i + 1) % aplaties.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurligne((i) => (i - 1 + aplaties.length) % aplaties.length);
    } else if (e.key === "Enter" && ouvert) {
      e.preventDefault();
      aplaties[surligne]?.choisir();
      setOuvert(false);
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  };

  let index = -1;

  return (
    <div ref={conteneur} className="relative w-full max-w-(--recherche-largeur)">
      <input
        type="search"
        role="combobox"
        aria-expanded={ouvert && groupes.length > 0}
        aria-controls={listeId}
        aria-autocomplete="list"
        value={valeur}
        onChange={(e) => {
          modifier(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={clavier}
        placeholder="Recherche par parcours, organisme, code RNCP…"
        className="h-(--recherche-hauteur) w-full rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-(--space-4) t-body text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--border-strong) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border-strong) focus-visible:ring-offset-2"
      />

      {ouvert && groupes.length > 0 && (
        <div
          id={listeId}
          role="listbox"
          className="absolute z-20 mt-(--space-2) w-full overflow-hidden rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) shadow-(--elevation-2)"
        >
          {groupes.map((groupe) => (
            <div key={groupe.type}>
              <p className="border-b border-(--border-subtle) bg-(--surface-sunken) px-(--space-4) py-(--space-2) t-label text-(--text-tertiary)">
                {LIBELLES_GROUPES[groupe.type]}
              </p>
              <ul>
                {groupe.entrees.map((entree) => {
                  index++;
                  const actif = index === surligne;
                  return (
                    <li key={`${groupe.type}-${entree.libelle}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={actif}
                        onMouseEnter={() => setSurligne(aplaties.indexOf(entree))}
                        onClick={() => {
                          entree.choisir();
                          setOuvert(false);
                        }}
                        className={`flex w-full items-baseline justify-between gap-(--space-4) px-(--space-4) py-(--space-3) text-left t-body ${
                          actif ? "bg-(--surface-hover)" : ""
                        }`}
                      >
                        <span className="truncate text-(--text-primary)">{entree.libelle}</span>
                        {entree.detail !== undefined && (
                          <span className="shrink-0 t-caption text-(--text-tertiary)">
                            {entree.detail}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
