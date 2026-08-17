/**
 * Connexion, inscription, réinitialisation — un seul écran, trois modes.
 *
 * POURQUOI UN ÉCRAN ET NON TROIS PAGES. La personne qui arrive ici ne sait pas
 * toujours si elle a déjà un compte : la faire naviguer entre deux adresses
 * pour s'en apercevoir ajoute un aller-retour à un moment où elle voulait juste
 * sauvegarder une fiche. Le mode change, le contexte reste.
 *
 * `noindex` — ce n'est pas une page de contenu, et l'indexer diluerait les 400
 * pages de catalogue sur lesquelles repose l'acquisition.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/composants/authentification";
import { declencheurDe, mesurer } from "@/composants/mesure";
import { intentionEnAttente } from "@/composants/intention";

type Mode = "connexion" | "inscription" | "reinitialisation";

export const Route = createFileRoute("/connexion")({
  validateSearch: (r: Record<string, unknown>): { retour?: string; confirme?: string } => ({
    ...(typeof r["retour"] === "string" ? { retour: r["retour"] } : {}),
    ...(typeof r["confirme"] === "string" ? { confirme: r["confirme"] } : {}),
  }),
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion | Formlist" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const LIBELLES: Record<Mode, { titre: string; action: string }> = {
  connexion: { titre: "Se connecter", action: "Se connecter" },
  inscription: { titre: "Créer un compte", action: "Créer mon compte" },
  reinitialisation: { titre: "Mot de passe oublié", action: "Recevoir un lien" },
};

function Connexion() {
  const { retour, confirme } = Route.useSearch();
  const { utilisateur, connecter, inscrire, reinitialiser } = useAuth();
  const naviguer = useNavigate();

  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    confirme !== undefined ? "Votre adresse est confirmée. Connectez-vous." : null,
  );
  const [enCours, setEnCours] = useState(false);

  /*
    Une fois connecté, on repart d'où l'on venait. `replace` et non `push` : la
    page de connexion ne doit pas rester dans l'historique, sinon le retour
    arrière y ramène une personne déjà connectée.
  */
  useEffect(() => {
    if (utilisateur === null) return;
    void naviguer({ to: retour ?? "/", replace: true });
  }, [utilisateur, retour, naviguer]);

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur(null);
    setMessage(null);
    setEnCours(true);

    if (mode === "reinitialisation") {
      const { erreur: e } = await reinitialiser(email);
      setEnCours(false);
      if (e !== null) return setErreur(e);
      /*
        Le message ne confirme jamais que l'adresse existe : « si un compte
        existe » plutôt que « email envoyé ». Sans cette précaution, le
        formulaire devient un outil pour savoir qui est inscrit.
      */
      return setMessage("Si un compte existe pour cette adresse, un lien vient d'être envoyé.");
    }

    if (mode === "inscription") {
      const { erreur: e, confirmationRequise } = await inscrire(email, motDePasse);
      setEnCours(false);
      if (e !== null) return setErreur(e);
      /*
        `declencheur` dit ce que la personne essayait de faire quand on lui a
        demandé un compte. C'est le chiffre qui décide où poser — ou retirer —
        une invitation à s'inscrire : « spontané » et « voulait sauvegarder »
        ne se corrigent pas de la même manière.
      */
      mesurer("compte_cree", { declencheur: declencheurDe(intentionEnAttente()) });
      if (confirmationRequise) {
        return setMessage(
          "Compte créé. Ouvrez le lien envoyé à votre adresse pour le confirmer — nous reprendrons où vous en étiez.",
        );
      }
      return;
    }

    const { erreur: e } = await connecter(email, motDePasse);
    setEnCours(false);
    if (e !== null) return setErreur(e);
    mesurer("connexion_effectuee");
  }

  const libelle = LIBELLES[mode];

  return (
    <main className="mx-auto flex max-w-(--formulaire-largeur) flex-col px-(--space-6) py-(--space-16)">
      <h1 className="t-heading-1 text-(--text-primary)">{libelle.titre}</h1>
      {/*
        La raison d'être du compte, énoncée sans promesse creuse : il AJOUTE des
        capacités, il n'en retire aucune. Le catalogue reste public, et le dire
        ici évite de laisser croire à un mur.
      */}
      <p className="mt-(--space-3) t-body-sm text-(--text-secondary)">
        Le catalogue reste entièrement consultable sans compte. Un compte permet de retrouver vos
        formations, vos comparaisons et d&apos;être prévenu des changements.
      </p>

      <form onSubmit={soumettre} className="mt-(--space-8) flex flex-col gap-(--space-4)">
        <label className="flex flex-col gap-(--space-2)">
          <span className="t-body-sm text-(--text-secondary)">Adresse email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-(--bouton-hauteur) rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-(--space-3) t-body-sm text-(--text-primary)"
          />
        </label>

        {mode !== "reinitialisation" && (
          <label className="flex flex-col gap-(--space-2)">
            <span className="t-body-sm text-(--text-secondary)">Mot de passe</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "inscription" ? "new-password" : "current-password"}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="h-(--bouton-hauteur) rounded-(--radius-md) border border-(--border-default) bg-(--surface-raised) px-(--space-3) t-body-sm text-(--text-primary)"
            />
            {mode === "inscription" && (
              <span className="t-caption text-(--text-tertiary)">Au moins 6 caractères.</span>
            )}
            {/*
              SOUS LE CHAMP QU'IL CONCERNE, et non dans le bloc de liens du bas.
              Là-bas il voisinait « En créer un » et « Retour au catalogue » :
              trois propositions de même rang, dont une seule répond à la
              question qu'on se pose à cet instant précis — celui où le mot de
              passe ne revient pas.
            */}
            {mode === "connexion" && (
              <button
                type="button"
                onClick={() => { setMode("reinitialisation"); setErreur(null); setMessage(null); }}
                className="self-start t-caption text-(--text-tertiary) underline-offset-2 hover:text-(--text-secondary) hover:underline"
              >
                Mot de passe oublié
              </button>
            )}
          </label>
        )}

        {erreur !== null && (
          <p
            role="alert"
            className="rounded-(--radius-md) border border-(--status-error) bg-(--status-error-bg) p-(--space-3) t-body-sm text-(--status-error)"
          >
            {erreur}
          </p>
        )}
        {message !== null && (
          <p
            role="status"
            className="rounded-(--radius-md) border border-(--status-verified) bg-(--status-verified-bg) p-(--space-3) t-body-sm text-(--status-verified)"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="h-(--bouton-hauteur) rounded-(--radius-md) bg-(--interactive-default) px-(--space-4) t-body-sm font-medium text-(--text-on-inverse) transition-colors duration-(--motion-fast) hover:bg-(--interactive-hover) disabled:opacity-60 max-[639px]:h-(--bouton-hauteur-tactile)"
        >
          {enCours ? "…" : libelle.action}
        </button>
      </form>

      <div className="mt-(--space-6) flex flex-col gap-(--space-2) t-body-sm">
        {mode !== "inscription" && (
          <button
            type="button"
            onClick={() => { setMode("inscription"); setErreur(null); setMessage(null); }}
            className="text-left text-(--text-secondary) underline-offset-2 hover:text-(--text-primary) hover:underline"
          >
            Pas encore de compte ? En créer un
          </button>
        )}
        {mode !== "connexion" && (
          <button
            type="button"
            onClick={() => { setMode("connexion"); setErreur(null); setMessage(null); }}
            className="text-left text-(--text-secondary) underline-offset-2 hover:text-(--text-primary) hover:underline"
          >
            J&apos;ai déjà un compte
          </button>
        )}
        <Link to="/catalogue" className="text-(--text-tertiary) underline-offset-2 hover:underline">
          ← Retour au catalogue
        </Link>
      </div>
    </main>
  );
}
