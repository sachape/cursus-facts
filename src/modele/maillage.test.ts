import { describe, expect, it } from "vitest";
import { chargerCatalogue } from "@/donnees/catalogue";
import { classifier } from "@/modele/classification";
import { slugifierOrganisme } from "./organismes";
import type { Organisme } from "./organismes";
import type { ParcoursListe } from "@/donnees/requetes";
import {
  domainesParOrganisme,
  MINIMUM_LIENS,
  voisinsDeParcours,
  voisinsDOrganisme,
} from "./maillage";

/*
  AUCUNE PAGE ORPHELINE.

  Une page qu'aucun lien ne désigne est difficile à explorer et paraît sans
  importance : c'est vrai d'un robot comme d'un lecteur. Le seuil est de trois
  liens entrants, et il porte sur les 400 adresses du sitemap.

  POURQUOI ICI ET NON DANS LES INVARIANTS DE RENDU. Le graphe se DÉDUIT du
  modèle : ce sont `voisinsDeParcours` et `voisinsDOrganisme` qui décident quels
  liens existent, et le rendu ne fait que les afficher. Le vérifier ici les
  couvre TOUTES — 232 fiches et 163 organismes — en deux dixièmes de seconde,
  là où un parcours de 400 pages au navigateur prendrait dix minutes et ne
  passerait jamais dans un crochet de pré-poussée.

  Les invariants de rendu prennent le relais sur ce que ce test ne peut pas
  voir : que les sections sont réellement rendues, que les ancres portent le
  bon texte, et que le balisage `BreadcrumbList` est là.

  CE TEST LIT LE CATALOGUE SOURCE, pas la base. Les deux peuvent diverger d'un
  jour d'ingestion ; ce qu'on vérifie est la FORME du graphe, qui ne dépend que
  des sujets, domaines et organismes — pas des slugs stockés.
*/

/** Le catalogue source, classé comme il l'est en base. */
function catalogue(): ParcoursListe[] {
  return chargerCatalogue().map((offre) => {
    const classe = classifier(offre as never);
    return {
      id: String(offre.id),
      slug: `p-${offre.id}`,
      nom: offre.nom,
      organismeNom: offre.organisme,
      organismeCategorie: offre.categorie,
      domaine: classe.domaine,
      sujetPrincipal: classe.sujetPrincipal,
      infosRenseignees: 0,
      infosApplicables: 0,
      dateVerification: offre.dateVerification ?? null,
      prixMin: offre.prix ?? null,
      volumeHoraire: offre.volumeHoraire ?? null,
    } as unknown as ParcoursListe;
  });
}

function organismes(parcours: readonly ParcoursListe[]): Organisme[] {
  const par = new Map<string, Organisme>();
  for (const p of parcours) {
    if (par.has(p.organismeNom)) continue;
    par.set(p.organismeNom, {
      nom: p.organismeNom,
      slug: slugifierOrganisme(p.organismeNom),
      categorie: p.organismeCategorie,
      parcours: 0,
      domaines: 0,
      sujets: [],
      parcoursAvecCout: 0,
      derniereVerification: null,
      site: null,
      certifications: [],
    });
  }
  return [...par.values()];
}

describe("maillage interne", () => {
  const fiches = catalogue();
  const tous = organismes(fiches);
  const domaines = domainesParOrganisme(fiches);

  /** Le graphe complet : qui désigne qui. */
  function entrants(): Map<string, number> {
    const compte = new Map<string, number>();
    const ajouter = (cible: string) => compte.set(cible, (compte.get(cible) ?? 0) + 1);

    for (const cible of [...fiches.map((p) => `/parcours/${p.slug}`), ...tous.map((o) => `/organismes/${o.slug}`)]) {
      compte.set(cible, 0);
    }

    for (const fiche of fiches) {
      // Le lien vers la page de son organisme, déjà présent sur chaque fiche.
      ajouter(`/organismes/${slugifierOrganisme(fiche.organismeNom)}`);
      // Les parcours du même sujet, ou du même domaine à défaut.
      for (const voisin of voisinsDeParcours(fiches, fiche).parcours) {
        ajouter(`/parcours/${voisin.slug}`);
      }
    }

    for (const organisme of tous) {
      // La page organisme liste tous ses parcours.
      for (const p of fiches.filter((f) => f.organismeNom === organisme.nom)) {
        ajouter(`/parcours/${p.slug}`);
      }
      // Et les organismes voisins, en pied de vue.
      for (const voisin of voisinsDOrganisme(tous, domaines, organisme).organismes) {
        ajouter(`/organismes/${voisin.slug}`);
      }
    }

    // La vue Organismes désigne chaque organisme, une fois.
    for (const o of tous) ajouter(`/organismes/${o.slug}`);

    return compte;
  }

  it("aucune page du catalogue ne reçoit moins de trois liens internes", () => {
    const compte = entrants();
    const orphelines = [...compte]
      .filter(([, n]) => n < MINIMUM_LIENS)
      .sort((a, b) => a[1] - b[1])
      .map(([adresse, n]) => `${adresse} (${n})`);

    // Un contrôle qui ne trouve rien à contrôler ne protège rien.
    expect(compte.size).toBeGreaterThan(300);
    expect(orphelines).toEqual([]);
  });

  it("un parcours ne se lie jamais à un autre du même organisme", () => {
    /*
      Ils sont déjà atteignables par la page de l'organisme, qui les porte
      tous : les répéter consommerait la section sans ajouter une adresse au
      maillage. C'est la seule raison d'être de la règle.
    */
    const fautifs = fiches
      .flatMap((f) =>
        voisinsDeParcours(fiches, f).parcours.map((v) => ({ de: f.nom, vers: v.nom, organisme: v.organismeNom, source: f.organismeNom })),
      )
      .filter((l) => l.organisme === l.source);
    expect(fautifs).toEqual([]);
  });

  it("le titre annonce le critère réellement appliqué", () => {
    /*
      21 fiches n'ont pas trois voisins du même sujet. Elles basculent sur le
      domaine — et le titre doit basculer avec, sinon la section annonce
      « même sujet » en montrant autre chose.
    */
    for (const f of fiches) {
      const v = voisinsDeParcours(fiches, f);
      if (v.critere === "sujet") {
        expect(v.parcours.every((p) => p.sujetPrincipal === f.sujetPrincipal)).toBe(true);
        expect(v.titre).toContain(f.sujetPrincipal);
      } else if (v.critere === "domaine") {
        expect(v.parcours.every((p) => p.domaine === f.domaine)).toBe(true);
        expect(v.titre).toContain("domaine");
      } else {
        // Dernier repli : le titre ne promet plus aucune parenté.
        expect(v.titre).toBe("Autres parcours du catalogue");
      }
    }
  });

  it("aucun voisinage n'est présenté comme une recommandation", () => {
    /*
      Ces liens ne classent rien et ne conseillent rien. « Similaires »,
      « recommandé », « meilleur » sont exactement les mots qui transformeraient
      un maillage en classement — ce que l'invariant de classement interdit.
    */
    const INTERDITS = ["recommand", "similaire", "meilleur", "populaire", "top ", "sélection"];
    const textes = [
      ...fiches.slice(0, 40).flatMap((f) => {
        const v = voisinsDeParcours(fiches, f);
        return [v.titre, v.regleOrdre];
      }),
      ...tous.slice(0, 40).flatMap((o) => {
        const v = voisinsDOrganisme(tous, domaines, o);
        return [v.titre, v.regleOrdre];
      }),
    ];
    const fautifs = textes.filter((t) =>
      INTERDITS.some((mot) => t.toLowerCase().includes(mot)),
    );
    expect(fautifs).toEqual([]);
  });

  it("un voisinage ne dépasse jamais cinq liens", () => {
    for (const f of fiches) expect(voisinsDeParcours(fiches, f).parcours.length).toBeLessThanOrEqual(5);
    for (const o of tous) {
      expect(voisinsDOrganisme(tous, domaines, o).organismes.length).toBeLessThanOrEqual(5);
    }
  });
});
