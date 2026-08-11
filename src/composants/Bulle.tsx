/**
 * Les messages de la conversation d'aide au choix.
 *
 * PAS D'INDICATEUR DE SAISIE. Aucun « … » ne clignote avant une question :
 * rien ne rédige ici, les quatre questions sont écrites d'avance et le
 * filtrage est déterministe. Simuler une réflexion mentirait sur ce que fait
 * le produit — et sur une page qui répète qu'elle n'évalue rien, c'est
 * exactement le détail qui contredirait tout le reste.
 *
 * L'ATTENTE EXISTE QUAND MÊME, mais elle est ce qu'elle prétend être : le temps
 * de voir sa réponse partir avant que la suivante arrive.
 */
import type { ReactNode } from "react";

/**
 * L'entrée d'un message : léger décalage vertical, puis fondu.
 *
 * `motion-safe` uniquement — sous `prefers-reduced-motion`, le message est là
 * d'emblée. Un décalage de quelques pixels n'est pas décoratif pour tout le
 * monde.
 */
const ENTREE =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-(--motion-base)";

/** Message entrant — ce que le questionnaire dit. */
export function BulleEntrante({ children }: { children: ReactNode }) {
  return (
    <div className={`flex justify-start ${ENTREE}`}>
      {/*
        L'angle inférieur gauche est réduit : c'est ce qui donne le sens de
        l'échange sans avoir à dessiner une flèche. Le côté par lequel le
        message arrive porte la pointe.
      */}
      <div className="max-w-(--conversation-bulle-max) rounded-(--radius-lg) rounded-bl-(--radius-sm) border border-(--border-subtle) bg-(--surface-raised) p-(--space-4) t-body text-(--text-primary)">
        {children}
      </div>
    </div>
  );
}

/** Message sortant — ce que la personne a répondu. */
export function BulleSortante({
  children,
  modifier,
  libelleModification,
}: {
  children: ReactNode;
  /** Retire cette réponse et tout ce qui suit, puis rejoue la question. */
  modifier?: () => void;
  libelleModification?: string;
}) {
  return (
    <div className={`group flex items-center justify-end gap-(--space-2) ${ENTREE}`}>
      {modifier !== undefined && (
        /*
          DISCRET AU SURVOL, MAIS JAMAIS SEULEMENT AU SURVOL. Il devient
          visible au focus clavier : une action qui n'existe qu'à la souris
          n'existe pas au toucher, et c'est précisément ici qu'il faut pouvoir
          revenir — le retour en arrière est le point faible connu d'un format
          conversationnel.
        */
        <button
          type="button"
          onClick={modifier}
          aria-label={libelleModification ?? "Modifier cette réponse"}
          className="rounded-(--radius-sm) px-(--space-2) py-(--space-1) t-caption text-(--text-tertiary) opacity-0 transition-opacity duration-(--motion-fast) hover:text-(--text-primary) focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-strong) group-hover:opacity-100 group-focus-within:opacity-100 max-[767px]:opacity-100"
        >
          Modifier
        </button>
      )}
      <div className="max-w-(--conversation-bulle-max) rounded-(--radius-lg) rounded-br-(--radius-sm) bg-(--interactive-default) p-(--space-4) t-body text-(--text-on-inverse)">
        {children}
      </div>
    </div>
  );
}

/**
 * Le catalogue qui se réduit, sous chaque réponse.
 *
 * REMPLACE LA BARRE DE PROGRESSION, et dit davantage. Une barre annonce combien
 * d'écrans restent — une information sur le formulaire. « 233 → 47 » dit ce que
 * la réponse a produit : une information sur le catalogue, qui est la seule
 * chose qu'on soit venu chercher.
 */
export function Compteur({ avant, apres }: { avant: number; apres: number }) {
  return (
    <p className="flex justify-end pr-(--space-1) t-caption text-(--text-tertiary)">
      <span className="chiffre">{avant}</span>
      <span className="px-(--space-1)">parcours →</span>
      <span className="chiffre">{apres}</span>
    </p>
  );
}
