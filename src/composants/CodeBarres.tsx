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
  non_communique: "non communiqué",
  non_applicable: "ne s'applique pas à ce parcours",
  a_confirmer: "à confirmer",
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
      className={`flex items-end gap-[2px] ${className}`}
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
              "h-4 w-[3px] rounded-[1px]",
              etat === "renseigne" ? "bg-foreground" : "",
              etat === "non_communique" ? "bg-border" : "",
              // Un champ sans objet ne se lit pas comme un manque : il s'efface
              // au lieu de creuser le code-barres.
              etat === "non_applicable" ? "bg-border/30 h-2" : "",
              etat === "a_confirmer" ? "bg-foreground/40" : "",
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
  className = "",
}: {
  renseignees: number;
  applicables: number;
  className?: string;
}) {
  return (
    <span className={`chiffre text-xs text-muted-foreground ${className}`}>
      {renseignees} sur {applicables}
      {applicables < 18 && (
        <span className="ml-1 text-[10px]" title="Certains champs ne s'appliquent pas à ce parcours">
          applicables
        </span>
      )}
    </span>
  );
}
