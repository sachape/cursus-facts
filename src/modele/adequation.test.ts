import { describe, expect, it } from "vitest";
import type { ParcoursListe } from "@/donnees/requetes";
import { ETATS_PAR_DEFAUT } from "@/types/cursus";
import {
  classerParAdequation,
  evaluer,
  motsInterditsPresents,
  situationComplete,
  compterCandidats,
  correspondances,
  PLAFOND_QUASI,
  resultatsAdequation,
  type Situation,
} from "./adequation";

const p = (partiel: Partial<ParcoursListe> = {}): ParcoursListe => ({
  id: "1",
  slug: "parcours",
  nom: "Parcours",
  organismeNom: "Organisme",
  organismeCategorie: "formation_professionnelle",
  sourceInformation: null,
  organismeSite: null,
  organismeCertifications: [],
  domaine: "ecommerce",
  sujetPrincipal: "E-commerce généraliste",
  competencesCouvertes: [],
  prixMin: null,
  prixMax: null,
  unitePrix: null,
  prixNiveau: null,
  modaliteAcces: null,
  dispoInter: null,
  dispoIntra: null,
  prixIntra: null,
  duree: null,
  volumeHoraire: null,
  formats: [],
  lieu: null,
  niveauEntree: null,
  eligibleCpf: null,
  financements: null,
  certification: null,
  codeRncpRs: null,
  dateVerification: null,
  etats: ETATS_PAR_DEFAUT,
  infosRenseignees: 0,
  infosApplicables: 18,
  statutRegroupement: "autonome",
  motifRegroupement: null,
  offresRepliees: 0,
  ...partiel,
});

const situation = (partiel: Partial<Situation> = {}): Situation => ({
  objectif: "developper_activite",
  budget: "plus_2500",
  temps: "temps_plein",
  canal: "pas_decide",
  ...partiel,
});

describe("les cinq questions sont obligatoires", () => {
  it("refuse une situation incomplète", () => {
    expect(situationComplete({ objectif: "trouver_emploi" })).toBe(false);
    expect(
      situationComplete({
        objectif: "trouver_emploi",
        budget: "zero",
        temps: "moins_3h",
      }),
    ).toBe(false);
  });

  it("accepte une situation complète", () => {
    expect(situationComplete(situation())).toBe(true);
  });
});

describe("l'écart est une information, pas un défaut masqué", () => {
  it("énonce un budget dépassé avec le chiffre", () => {
    const { ecarts } = evaluer(p({ prixMin: 2490 }), situation({ budget: "moins_500" }));
    // toLocaleString('fr-FR') sépare les milliers par une espace insécable
    // étroite — on normalise avant de chercher le montant.
    const normalise = ecarts.map((e) => e.replace(/[  ]/g, " "));
    expect(normalise.some((e) => e.includes("Budget dépassé") && e.includes("2 490"))).toBe(true);
  });

  it("n'énonce plus aucun écart de prérequis, la question ayant été retirée", () => {
    /*
      Le point de départ a été retiré le 6 août 2026 : 17,8 points d'écart entre
      ses réponses, neutres exclues, alors que `niveau_entree` est publié sur
      93 % du catalogue. La question disposait de sa donnée et ne triait pas.

      Ce test remplace « énonce un prérequis non détenu ». Le supprimer sans le
      remplacer aurait laissé le retrait invisible : un critère qui disparaît
      d'`evaluer` sans qu'aucun test ne l'atteste revient au premier
      copier-coller.
    */
    const { ecarts } = evaluer(p({ niveauEntree: "bac3" }), situation({}));
    expect(ecarts.some((e) => e.includes("Prérequis"))).toBe(false);
  });

  it("énonce un canal non couvert", () => {
    const { ecarts } = evaluer(
      p({ domaine: "commerce_vente", sujetPrincipal: "Commerce et vente" }),
      situation({ canal: "marketplaces" }),
    );
    expect(ecarts.some((e) => e.includes("Canal non couvert"))).toBe(true);
  });

  it("énonce une charge horaire incompatible", () => {
    const { ecarts } = evaluer(p({ volumeHoraire: 450 }), situation({ temps: "moins_3h" }));
    expect(ecarts.some((e) => e.includes("Charge horaire incompatible"))).toBe(true);
  });

  it("énonce l'absence de diplôme reconnu quand c'est l'objectif", () => {
    const { ecarts } = evaluer(p({ codeRncpRs: null }), situation({ objectif: "diplome_reconnu" }));
    expect(ecarts.some((e) => e.includes("Aucun code RNCP"))).toBe(true);
  });
});

describe("rien n'est déduit d'une information absente", () => {
  it("ne conclut pas sur le budget quand le prix n'est pas publié", () => {
    const { ecarts, correspond } = evaluer(p({ prixMin: null }), situation({ budget: "moins_500" }));
    expect(ecarts.some((e) => e.includes("prix n'est pas publié"))).toBe(true);
    expect(correspond.some((c) => c.includes("budget"))).toBe(false);
  });

  it("ne produit ni correspondance ni écart horaire sans volume publié", () => {
    const { correspond, ecarts } = evaluer(
      p({ volumeHoraire: null }),
      situation({ temps: "moins_3h" }),
    );
    expect(correspond.some((c) => c.includes("Volume horaire"))).toBe(false);
    expect(ecarts.some((e) => e.includes("Charge horaire"))).toBe(false);
  });

});

describe("correspondances factuelles", () => {
  it("retient la gratuité comme correspondance quand le budget est nul", () => {
    const { correspond, ecarts } = evaluer(p({ prixMin: 0 }), situation({ budget: "zero" }));
    expect(correspond).toContain("Gratuit");
    expect(ecarts.some((e) => e.includes("Budget dépassé"))).toBe(false);
  });

  it("retient le canal couvert par une compétence publiée", () => {
    const { correspond } = evaluer(
      p({ competencesCouvertes: ["Amazon FBA"] }),
      situation({ canal: "marketplaces" }),
    );
    expect(correspond.some((c) => c.includes("Canal couvert"))).toBe(true);
  });

  it("retient l'alternance comme signal d'insertion à défaut de certification", () => {
    const { correspond } = evaluer(
      p({ formats: ["alternance"], codeRncpRs: null }),
      situation({ objectif: "trouver_emploi" }),
    );
    expect(correspond).toContain("Disponible en alternance");
  });
});

describe("classement", () => {
  it("place les parcours qui présentent le moins d'écarts en premier", () => {
    const parfait = p({ nom: "Sans écart", prixMin: 200, niveauEntree: "aucun_prerequis" });
    const ecarte = p({ nom: "Trop cher", prixMin: 5000, niveauEntree: "bac3" });
    const classe = classerParAdequation([ecarte, parfait], situation({ budget: "moins_500" }));
    expect(classe[0]!.parcours.nom).toBe("Sans écart");
  });

  it("fait passer un parcours gratuit avant un parcours payant à écarts égaux", () => {
    const gratuit = p({ nom: "Gratuit", prixMin: 0, infosRenseignees: 5 });
    const payant = p({ nom: "Payant", prixMin: 300, infosRenseignees: 5 });
    const classe = classerParAdequation([payant, gratuit], situation({ budget: "moins_500" }));
    expect(classe[0]!.parcours.nom).toBe("Gratuit");
  });

  it("renvoie TOUS les parcours qui réunissent les réponses, sans plafond", () => {
    // Couper à trois faisait de l'assistant un sélectionneur : rien ne
    // distingue le troisième du quatrième quand tous deux réunissent les
    // mêmes réponses.
    // Prix publié : sans lui, la compatibilité budgétaire est un écart, et le
    // catalogue de contrôle ne réunirait aucune réponse.
    const catalogue = Array.from({ length: 10 }, (_, i) =>
      p({ nom: `P${i}`, slug: `p${i}`, prixMin: 200 }),
    );
    expect(correspondances(catalogue, situation())).toHaveLength(10);
  });

  it("écarte du résultat tout parcours présentant un écart", () => {
    const retenu = p({ nom: "Sans écart", slug: "ok", prixMin: 200 });
    const ecarte = p({ nom: "Trop cher", slug: "ko", prixMin: 5000 });
    const retenus = correspondances([ecarte, retenu], situation({ budget: "moins_500" }));
    expect(retenus.map((a) => a.parcours.nom)).toEqual(["Sans écart"]);
  });

  it("désigne exactement l'ensemble que le compteur annonce", () => {
    // Le fil promet « 18 parcours → 5 » : afficher autre chose que ces 5 rend
    // les deux nombres invérifiables.
    const catalogue = [
      p({ nom: "A", slug: "a", prixMin: 100 }),
      p({ nom: "B", slug: "b", prixMin: 200 }),
      p({ nom: "C", slug: "c", prixMin: 9000 }),
    ];
    const s = situation({ budget: "moins_500" });
    expect(correspondances(catalogue, s)).toHaveLength(compterCandidats(catalogue, s));
  });

  it("ne retire jamais un parcours du classement, même très écarté", () => {
    // Une fiche qui ne correspond à rien reste classable : c'est à
    // l'utilisateur de lire les écarts, pas au moteur de masquer la fiche.
    const catalogue = [p({ nom: "Inadapté", prixMin: 9999, niveauEntree: "bac3" })];
    const classe = classerParAdequation(catalogue, situation({ budget: "zero" }));
    expect(classe).toHaveLength(1);
    expect(classe[0]!.ecarts.length).toBeGreaterThan(0);
  });
});

describe("vocabulaire de jugement interdit", () => {
  it("détecte les mots interdits", () => {
    expect(motsInterditsPresents("C'est la meilleure formation")).toContain("meilleure");
    expect(motsInterditsPresents("Notre top 3 recommandé")).toEqual(
      expect.arrayContaining(["top", "recommandé"]),
    );
    expect(motsInterditsPresents("Le choix idéal pour vous")).toContain("idéal");
  });

  it("laisse passer une phrase strictement factuelle", () => {
    expect(
      motsInterditsPresents(
        "Ce parcours dure 450 heures, coûte 0 € et délivre une certification RNCP40509.",
      ),
    ).toEqual([]);
  });

  it("ne se déclenche pas sur un mot qui contient seulement la sous-chaîne", () => {
    // « topographie » contient « top » sans en être une occurrence.
    expect(motsInterditsPresents("Module de topographie commerciale")).toEqual([]);
  });
});

describe("les deux sections du résultat", () => {
  it("partitionne sur le nombre d'écarts, sans recouvrement", () => {
    // Prix publié : zéro écart. Prix absent : un seul écart, le budget.
    const exact = p({ nom: "Exact", slug: "exact", prixMin: 200 });
    const proche = p({ nom: "Proche", slug: "proche", prixMin: null });
    const { exactes, quasi } = resultatsAdequation([proche, exact], situation());

    expect(exactes.map((a) => a.parcours.nom)).toEqual(["Exact"]);
    expect(quasi.map((a) => a.parcours.nom)).toEqual(["Proche"]);
    expect(quasi.every((a) => a.ecarts.length === 1)).toBe(true);
    // Aucun parcours ne peut figurer dans les deux.
    const slugs = [...exactes, ...quasi].map((a) => a.parcours.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("fait gouverner les deux sections par la même évaluation", () => {
    /*
      LE POINT QUI COMPTE. « 12 correspondances · 6 à un écart près » sont deux
      nombres qu'un lecteur additionne : les tirer de deux calculs séparés les
      exposerait à diverger, et c'est très exactement le défaut qui faisait
      annoncer « 18 parcours → 5 » puis en montrer trois.
    */
    const catalogue = [
      p({ nom: "A", slug: "a", prixMin: 100 }),
      p({ nom: "B", slug: "b", prixMin: 200 }),
      p({ nom: "C", slug: "c", prixMin: null }),
    ];
    const s = situation();
    const { exactes } = resultatsAdequation(catalogue, s);
    expect(exactes).toHaveLength(compterCandidats(catalogue, s));
    expect(exactes.map((a) => a.parcours.slug)).toEqual(
      correspondances(catalogue, s).map((a) => a.parcours.slug),
    );
  });

  it("plafonne les quasi-correspondances et dit combien il y en avait", () => {
    // Une troncature silencieuse se lit comme une exhaustivité.
    const catalogue = Array.from({ length: PLAFOND_QUASI + 5 }, (_, i) =>
      p({ nom: `P${i}`, slug: `p${i}`, prixMin: null }),
    );
    const { exactes, quasi, quasiTotal } = resultatsAdequation(catalogue, situation());
    expect(exactes).toHaveLength(0);
    expect(quasi).toHaveLength(PLAFOND_QUASI);
    expect(quasiTotal).toBe(PLAFOND_QUASI + 5);
  });

  it("conserve l'ordre du classement par défaut dans les quasi-correspondances", () => {
    const fourni = p({ nom: "Renseigné", slug: "r", prixMin: null, infosRenseignees: 12 });
    const nu = p({ nom: "Nu", slug: "n", prixMin: null, infosRenseignees: 1 });
    const { quasi } = resultatsAdequation([nu, fourni], situation());
    expect(quasi.map((a) => a.parcours.nom)).toEqual(["Renseigné", "Nu"]);
  });
});
