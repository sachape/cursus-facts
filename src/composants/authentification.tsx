/**
 * Authentification — email et mot de passe.
 *
 * PAS DE LIEN MAGIQUE. Le produit se consulte en va-et-vient sur plusieurs
 * jours : on compare, on revient, on compare encore. Un lien magique impose une
 * boîte mail à chaque visite, et c'est le mot de passe qui tient la session
 * dans la durée.
 *
 * AUCUNE PAGE N'EST RÉSERVÉE AUX CONNECTÉS. Le catalogue reste entièrement
 * public : c'est lui qui amène les visiteurs, et un mur d'inscription
 * détruirait l'acquisition en même temps que le référencement. Le compte AJOUTE
 * des capacités, il n'en retire aucune — cette règle vaut aussi pour la suite,
 * quand la tentation viendra de « réserver » une fonction pour pousser à
 * l'inscription.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { declarerConnecte, oublierIdentite } from "./mesure";

type Contexte = {
  utilisateur: User | null;
  /** `true` tant qu'on ne sait pas encore : ni connecté, ni déconnecté. */
  chargement: boolean;
  connecter: (email: string, motDePasse: string) => Promise<{ erreur: string | null }>;
  inscrire: (email: string, motDePasse: string) => Promise<{ erreur: string | null; confirmationRequise: boolean }>;
  reinitialiser: (email: string) => Promise<{ erreur: string | null }>;
  deconnecter: () => Promise<void>;
};

const ContexteAuth = createContext<Contexte | null>(null);

/**
 * Traduit les erreurs de Supabase en français, et surtout en ACTIONNABLE.
 *
 * « Invalid login credentials » ne dit pas quoi corriger. Un message générique
 * transforme une faute de frappe en abandon : la personne ne sait pas si elle
 * s'est trompée d'email, de mot de passe, ou si le compte n'existe pas.
 *
 * Une exception assumée : on ne distingue jamais « email inconnu » de « mot de
 * passe faux » à la connexion. Le faire livrerait la liste de nos comptes à qui
 * teste des adresses.
 */
function messageLisible(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Un compte existe déjà avec cette adresse. Connectez-vous, ou demandez un nouveau mot de passe.";
  }
  if (m.includes("password") && (m.includes("at least") || m.includes("short"))) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "Cette adresse email n'est pas valide.";
  }
  if (m.includes("invalid login credentials")) {
    return "Adresse email ou mot de passe incorrect.";
  }
  if (m.includes("email not confirmed")) {
    return "Votre adresse n'est pas encore confirmée. Ouvrez le lien reçu par email.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  return message;
}

export function FournisseurAuth({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    /*
      L'abonnement est posé AVANT la lecture de la session existante : entre les
      deux, un événement peut survenir — retour de confirmation d'email,
      rafraîchissement de jeton — et il serait perdu dans l'autre ordre.
    */
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => {
      setSession(s);
      setChargement(false);
      // `connecte` est une propriété globale de la mesure : déclarée ici, elle
      // accompagne ensuite chaque événement sans qu'aucune vue n'y pense.
      declarerConnecte(s !== null);
    });
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setChargement(false);
      declarerConnecte(s !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const connecter = useCallback(async (email: string, motDePasse: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    return { erreur: error ? messageLisible(error.message) : null };
  }, []);

  const inscrire = useCallback(async (email: string, motDePasse: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      // Le retour de confirmation revient sur le site, pas sur une page tierce.
      options: { emailRedirectTo: `${window.location.origin}/connexion?confirme=1` },
    });
    if (error) return { erreur: messageLisible(error.message), confirmationRequise: false };
    // Pas de session immédiate = la confirmation par email est exigée.
    return { erreur: null, confirmationRequise: data.session === null };
  }, []);

  const reinitialiser = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/connexion`,
    });
    return { erreur: error ? messageLisible(error.message) : null };
  }, []);

  const deconnecter = useCallback(async () => {
    await supabase.auth.signOut();
    // Sur un poste partagé, deux sessions ne doivent pas être cousues en une.
    oublierIdentite();
  }, []);

  const valeur = useMemo(
    () => ({
      utilisateur: session?.user ?? null,
      chargement,
      connecter,
      inscrire,
      reinitialiser,
      deconnecter,
    }),
    [session, chargement, connecter, inscrire, reinitialiser, deconnecter],
  );

  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>;
}

export function useAuth(): Contexte {
  const contexte = useContext(ContexteAuth);
  if (!contexte) throw new Error("useAuth doit être utilisé dans un FournisseurAuth");
  return contexte;
}
