/**
 * Le code-barres de 18 traits — élément signature du produit.
 *
 * Un trait par information suivie. Plein si l'information est renseignée, creux
 * sinon, absent du compte si elle ne s'applique pas à ce parcours. Identique
 * sur la rangée de la liste et sur la fiche.
 *
 * IL NE DIT RIEN DE LA QUALITÉ, tout de l'état de la fiche.
 * NE JAMAIS LE CONVERTIR EN POURCENTAGE : un chiffre sur 100 se lit comme une
 * note, et ce produit ne note pas. Le compteur reste un rapport de deux
 * entiers, « 12 sur 17 applicables ».
 */
import {
  CHAMPS_INFORMATION,
  LIBELLES_CHAMPS_INFORMATION,
  type EtatsInformation,
} from "@/types/cursus";

const TITRE_ETAT: Record<string, string> = {
  renseigne: "renseigné",
  non_communique: "non publié par l'organisme",
  non_applicable: "ne s'applique pas à ce parcours",
  non_collecte: "pas encore collecté par nos soins",
  a_confirmer: "à confirmer",
  derive: "dérivé d'une règle publiée",
  communique_sur_demande: "communiqué sur demande, jamais publié",
};

export function CodeBarres({
  etats,
  className = "",
}: {
  etats: EtatsInformation;
  className?: string;
}) {
  return (
    <div
      className={`flex items-end gap-[--barre-ecart] ${className}`}
      role="img"
      aria-label={`État de la fiche : ${
        CHAMPS_INFORMATION.filter((c) => etats[c] === "renseigne").length
      } informations renseignées sur ${
        CHAMPS_INFORMATION.filter((c) => etats[c] !== "non_applicable").length
      } applicables`}
    >
      {CHAMPS_INFORMATION.map((champ) => {
        const etat = etats[champ];
        return (
          <span
            key={champ}
            title={`${LIBELLES_CHAMPS_INFORMATION[champ]} — ${TITRE_ETAT[etat] ?? etat}`}
            className={[
              "h-[--barre-hauteur] w-[--barre-largeur] rounded-[--barre-rayon]",
              etat === "renseigne" ? "bg-foreground" : "",
              // Absence constatée : l'organisme ne publie pas. C'est un fait
              // sur lui, et le trait creux le dit.
              etat === "non_communique" ? "bg-border" : "",
              // Un champ sans objet ne se lit pas comme un manque : il s'efface
              // au lieu de creuser le code-barres.
              etat === "non_applicable" ? "bg-[--border-subtle] h-[--barre-hauteur-reduite]" : "",
              // Absence non constatée : c'est notre collecte qui manque, pas
              // l'information. Le trait est hachuré, ni plein ni creux.
              etat === "non_collecte"
                ? "bg-[repeating-linear-gradient(45deg,var(--color-border)_0px,var(--color-border)_1px,transparent_1px,transparent_3px)]"
                : "",
              etat === "a_confirmer" ? "bg-foreground/40" : "",
              // Dérivé : plein, mais légèrement plus court — la valeur est
              // exacte et opposable, elle ne vient simplement pas de l'organisme.
              etat === "derive" ? "bg-[--text-primary] h-[--barre-hauteur-reduite]" : "",
              // Communiqué sur demande : comme un champ sans objet, il s'efface
              // au lieu de creuser le code-barres. Ce n'est pas un manque.
              etat === "communique_sur_demande" ? "bg-[--border-subtle] h-[--barre-hauteur-reduite]" : "",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

/**
 * Le compteur écrit, toujours affiché à côté du code-barres.
 *
 * Se lit « 12 informations sur 17 applicables ». Le dénominateur varie d'une
 * fiche à l'autre : une formation à distance n'a pas de lieu, une formation
 * gratuite n'a pas de modalités de paiement, et les compter contre elle
 * reviendrait à les pénaliser pour des champs qui ne les concernent pas.
 */
export function CompteurInformations({
  renseignees,
  applicables,
  nonCollectes = 0,
  className = "",
}: {
  renseignees: number;
  applicables: number;
  /** Champs dont l'absence n'a pas encore été vérifiée. */
  nonCollectes?: number;
  className?: string;
}) {
  return (
    <span className={`t-data-sm text-[--text-tertiary] ${className}`}>
      {renseignees} sur {applicables}
      {applicables < 18 && nonCollectes === 0 && (
        <span className="ml-1 t-data-sm" title="Certains champs ne s'appliquent pas à ce parcours">
          applicables
        </span>
      )}
      {nonCollectes > 0 && (
        <span
          className="ml-1 t-data-sm"
          title={`${nonCollectes} champs pas encore collectés : leur absence n'a pas été vérifiée`}
        >
          · {nonCollectes} à vérifier
        </span>
      )}
    </span>
  );
}
