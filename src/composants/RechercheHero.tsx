/**
 * Champ de recherche du hero, avec autocomplétion.
 *
 * Un champ de 56 px de haut crée une attente : il promet un résultat, pas un
 * filtrage silencieux d'une liste plus bas. L'autocomplétion tient cette
 * promesse — dès trois caractères, des résultats groupés par type, chacun
 * menant directement à sa destination.
 *
 * Les groupes vont du plus précis au plus large : un parcours nommé est une
 * réponse, un domaine n'est qu'une piste.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export type Suggestion = {
  type: "parcours" | "organisme" | "domaine";
  libelle: string;
  /** Ligne de contexte : l'organisme, ou le nombre de parcours. */
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
const SEUIL_CARACTERES = 3;
const DEBOUNCE_MS = 150;
const HAUTEUR_MAX = 400;
/** Marge conservée entre la liste et le bord de la fenêtre. */
const MARGE_FENETRE = 24;
/** En dessous, la liste s'ouvre au-dessus du champ plutôt qu'en dessous. */
const ESPACE_MINIMAL_DESSOUS = 200;

/** Loupe — trait 1,5 px, grille 20 px, extrémités carrées, aucun remplissage. */
function Loupe({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden className={className}>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

/**
 * Indicateur de chargement, aux dimensions exactes de la loupe.
 *
 * Il la remplace au même emplacement : un indicateur d'une autre taille
 * décalerait le texte saisi à chaque frappe.
 */
function Chargement({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden className={className}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M10 3a7 7 0 0 1 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 10 10"
          to="360 10 10"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function Croix({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden className={className}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

/**
 * Met la portion saisie en évidence dans un libellé.
 *
 * Graisse seule, sans couleur ni fond : un surlignage coloré dans une liste de
 * résultats appartient au registre des moteurs de recherche grand public, et il
 * concurrencerait les deux couleurs sémantiques du produit.
 */
function Surligner({ texte, saisie }: { texte: string; saisie: string }) {
  const position = texte.toLowerCase().indexOf(saisie.toLowerCase());
  if (saisie === "" || position < 0) return <>{texte}</>;
  return (
    <>
      {texte.slice(0, position)}
      <span className="font-medium">{texte.slice(position, position + saisie.length)}</span>
      {texte.slice(position + saisie.length)}
    </>
  );
}

export function RechercheHero({
  valeur,
  modifier,
  suggestions,
  champRef,
}: {
  valeur: string;
  modifier: (v: string) => void;
  /** Calculées par l'appelant : ce composant n'interroge aucune donnée. */
  suggestions: Suggestion[];
  /** Exposé à l'appelant : c'est le point de retour du focus par défaut. */
  champRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [surligne, setSurligne] = useState(0);
  const [saisie, setSaisie] = useState(valeur);
  const [enCours, setEnCours] = useState(false);
  /*
    La hauteur de la liste s'adapte à la place réellement disponible sous le
    champ. Une hauteur fixe de 400 px n'était jamais atteinte par six entrées :
    le débordement ne venait pas du nombre d'entrées mais de la position du
    champ, bas dans un hero haut.
  */
  const [placement, setPlacement] = useState<{ sens: "bas" | "haut"; hauteur: number }>({
    sens: "bas",
    hauteur: HAUTEUR_MAX,
  });
  const conteneur = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  const actifRef = useRef<HTMLButtonElement>(null);
  const listeId = useId();

  /*
    Débounce de 150 ms, avec annulation de la frappe précédente. La valeur
    affichée dans le champ reste immédiate — c'est la propagation vers le
    filtrage qui attend, jamais le retour visuel de la frappe.
  */
  useEffect(() => {
    if (saisie === valeur) {
      setEnCours(false);
      return;
    }
    setEnCours(true);
    const minuteur = setTimeout(() => {
      modifier(saisie);
      setEnCours(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(minuteur);
  }, [saisie, valeur, modifier]);

  const assezLong = saisie.trim().length >= SEUIL_CARACTERES;

  const groupes = useMemo(() => {
    if (!assezLong) return [];
    return ORDRE.map((type) => ({
      type,
      // Aucun plafond : la liste montre tous les résultats et défile.
      // Tronquer à cinq cachait 21 des 26 licences sans le dire, et rien à
      // l'écran ne distinguait « voici tout » de « voici un extrait ».
      entrees: suggestions.filter((s) => s.type === type),
    })).filter((g) => g.entrees.length > 0);
  }, [assezLong, suggestions]);

  const aplaties = useMemo(() => groupes.flatMap((g) => g.entrees), [groupes]);

  useEffect(() => setSurligne(0), [suggestions]);

  /*
    L'élément sélectionné au clavier reste toujours visible. Sans ce
    défilement, la sélection sort de la zone visible dès le sixième élément et
    l'utilisateur pilote une liste qu'il ne voit plus.
  */
  useEffect(() => {
    actifRef.current?.scrollIntoView({ block: "nearest" });
  }, [surligne]);

  /*
    Placement recalculé à l'ouverture, au défilement et au redimensionnement :
    le champ bouge avec la page, et une hauteur figée à l'ouverture serait
    fausse dès le premier cran de molette.
  */
  const recalculer = useCallback(() => {
    const champ = champRef?.current ?? conteneur.current;
    if (!champ) return;
    const rect = champ.getBoundingClientRect();
    const dessous = window.innerHeight - rect.bottom - MARGE_FENETRE;
    const dessus = rect.top - MARGE_FENETRE;
    if (dessous < ESPACE_MINIMAL_DESSOUS && dessus > dessous) {
      setPlacement({ sens: "haut", hauteur: Math.max(0, Math.min(HAUTEUR_MAX, dessus)) });
    } else {
      setPlacement({ sens: "bas", hauteur: Math.max(0, Math.min(HAUTEUR_MAX, dessous)) });
    }
  }, [champRef]);

  useEffect(() => {
    if (!ouvert) return;
    recalculer();
    window.addEventListener("resize", recalculer);
    window.addEventListener("scroll", recalculer, true);
    return () => {
      window.removeEventListener("resize", recalculer);
      window.removeEventListener("scroll", recalculer, true);
    };
  }, [ouvert, recalculer]);

  /*
    Défilement de la page verrouillé pendant que la liste est ouverte : ancrée
    au champ, elle glisserait sur le hero au premier cran de molette. La largeur
    de la barre de défilement est compensée, sans quoi la page saute
    latéralement à chaque ouverture.
  */
  useEffect(() => {
    if (!ouvert) return;
    const { body, documentElement } = document;
    const compensation = window.innerWidth - documentElement.clientWidth;
    const overflow = body.style.overflow;
    const padding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (compensation > 0) body.style.paddingRight = `${compensation}px`;
    return () => {
      body.style.overflow = overflow;
      body.style.paddingRight = padding;
    };
  }, [ouvert]);

  useEffect(() => {
    const dehors = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, []);

  const valider = useCallback(
    (entree: Suggestion | undefined) => {
      entree?.choisir();
      setOuvert(false);
    },
    [],
  );

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Ferme sans effacer : la saisie reste, seule la liste disparaît.
      setOuvert(false);
      return;
    }
    if (e.key === "Tab") {
      setOuvert(false);
      return;
    }
    if (aplaties.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOuvert(true);
      // La navigation boucle, et traverse les groupes sans s'y arrêter.
      setSurligne((i) => (i + 1) % aplaties.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurligne((i) => (i - 1 + aplaties.length) % aplaties.length);
    } else if (e.key === "Enter" && ouvert) {
      e.preventDefault();
      valider(aplaties[surligne]);
    }
  };

  const listeVisible = ouvert && assezLong;
  let index = -1;

  return (
    <div ref={conteneur} className="relative mx-auto w-full max-w-(--recherche-largeur)">
      <div className="relative">
        <span
          className={`pointer-events-none absolute inset-y-0 left-(--space-4) flex items-center transition-colors ${
            ouvert ? "text-(--text-primary)" : "text-(--text-tertiary)"
          }`}
        >
          {enCours ? <Chargement className="" /> : <Loupe className="" />}
        </span>

        <input
          ref={champRef}
          type="text"
          role="combobox"
          aria-expanded={listeVisible}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-activedescendant={listeVisible ? `${listeId}-${surligne}` : undefined}
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={clavier}
          placeholder="Recherche par parcours, organisme, code RNCP…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          className={`h-(--recherche-hauteur) w-full rounded-(--radius-md) border bg-(--surface-raised) pl-(--recherche-retrait) pr-(--space-10) t-body text-(--text-primary) shadow-(--elevation-1) outline-none transition-[border-color,box-shadow] placeholder:text-(--text-tertiary) ${
            ouvert
              ? "border-(--border-strong) shadow-(--elevation-2)"
              : "border-(--border-default)"
          }`}
        />

        {saisie !== "" && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => {
              setSaisie("");
              modifier("");
              champRef?.current?.focus();
            }}
            className="absolute inset-y-0 right-(--space-2) my-auto flex size-(--cible-hauteur-min) items-center justify-center text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
          >
            <Croix className="" />
          </button>
        )}
      </div>

      {listeVisible && (
        <div
          id={listeId}
          ref={liste}
          role="listbox"
          style={{ maxHeight: `${placement.hauteur}px` }}
          className={`absolute z-20 w-full overflow-y-auto rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-raised) text-left shadow-(--elevation-3) [scrollbar-width:none] max-[639px]:fixed max-[639px]:inset-x-0 [&::-webkit-scrollbar]:hidden ${
            placement.sens === "haut"
              ? "bottom-full mb-(--space-2)"
              : "top-full mt-(--space-2)"
          }`}
        >
          {groupes.length === 0 ? (
            <div className="px-(--space-4) py-(--space-3)">
              <p className="flex h-(--suggestion-hauteur) items-center t-body text-(--text-secondary)">
                Aucun résultat pour «&nbsp;{saisie}&nbsp;»
              </p>
              <button
                type="button"
                onClick={() => {
                  setSaisie("");
                  modifier("");
                  setOuvert(false);
                }}
                className="t-body-sm text-(--text-primary) underline underline-offset-4"
              >
                Parcourir tous les parcours
              </button>
            </div>
          ) : (
            groupes.map((groupe) => (
              <div key={groupe.type}>
                {/*
                  En-tête collant : au-delà de quelques entrées, on ne sait plus
                  dans quel groupe on se trouve.
                */}
                <p className="sticky top-0 z-10 flex items-baseline justify-between gap-(--space-4) border-b border-(--border-subtle) bg-(--surface-raised) px-(--space-4) py-(--space-2) t-label text-(--text-tertiary)">
                  {LIBELLES_GROUPES[groupe.type]}
                  {/* Le compte dit d'emblée l'ampleur de ce qu'on fait défiler. */}
                  <span className="chiffre">{groupe.entrees.length}</span>
                </p>
                <ul>
                  {groupe.entrees.map((entree) => {
                    index++;
                    const position = index;
                    const actif = position === surligne;
                    return (
                      <li key={`${groupe.type}-${entree.libelle}`}>
                        <button
                          ref={actif ? actifRef : undefined}
                          id={`${listeId}-${position}`}
                          type="button"
                          role="option"
                          aria-selected={actif}
                          onMouseEnter={() => setSurligne(position)}
                          onClick={() => valider(entree)}
                          /* Survol et sélection clavier partagent le même
                             traitement : deux marquages simultanés feraient
                             croire à deux éléments actifs. */
                          className={`flex h-(--suggestion-hauteur) w-full flex-col justify-center px-(--space-4) text-left transition-colors ${
                            actif ? "bg-(--surface-hover)" : ""
                          } ${enCours ? "text-(--text-disabled)" : ""}`}
                        >
                          <span className="truncate t-body text-(--text-primary)">
                            <Surligner texte={entree.libelle} saisie={saisie.trim()} />
                          </span>
                          {entree.detail !== undefined && (
                            <span className="truncate t-caption text-(--text-tertiary)">
                              {entree.detail}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
