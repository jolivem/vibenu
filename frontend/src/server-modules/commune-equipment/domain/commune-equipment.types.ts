/**
 * Les équipements d'une commune entière, pour le mode commune de l'analyse — là où la
 * card Voisinage n'a pas de sens, faute de point de départ.
 *
 * Source : Base permanente des équipements (INSEE, BPE 2025), table `bpe_equipment`.
 * Les rubriques sont définies par codes `typequ` et non par les catégories de l'import :
 * la catégorie `school` mêle maternelles, collèges et lycées, `specialist` onze
 * spécialités. Le code, lui, distingue ce qu'une famille cherche (« un collège ? »).
 */

export interface EquipmentRubricDefinition {
  key: string;
  label: string;
  typequ: readonly string[];
}

export interface EquipmentFamilyDefinition {
  title: string;
  rubrics: readonly EquipmentRubricDefinition[];
}

/** Table unique des rubriques affichées : l'écran, le PDF et la requête en dérivent. */
export const EQUIPMENT_FAMILIES: readonly EquipmentFamilyDefinition[] = [
  {
    title: "Santé",
    rubrics: [
      { key: "generalistes", label: "Médecins généralistes", typequ: ["D265"] },
      {
        key: "specialistes",
        label: "Médecins spécialistes",
        typequ: ["D266", "D267", "D268", "D269", "D270", "D271", "D272", "D273", "D274", "D275", "D276"],
      },
      { key: "pharmacies", label: "Pharmacies", typequ: ["D307"] },
      { key: "hopitaux", label: "Hôpitaux et cliniques", typequ: ["D101", "D108", "D113"] },
      { key: "urgences", label: "Services d'urgences", typequ: ["D106"] },
    ],
  },
  {
    title: "Enseignement",
    rubrics: [
      { key: "ecoles", label: "Écoles maternelles et élémentaires", typequ: ["C107", "C108", "C109"] },
      { key: "colleges", label: "Collèges", typequ: ["C201"] },
      { key: "lycees", label: "Lycées", typequ: ["C301", "C302", "C303"] },
    ],
  },
  {
    title: "Commerces",
    rubrics: [
      { key: "supermarches", label: "Supermarchés", typequ: ["B104", "B105", "B201"] },
      { key: "epiceries", label: "Épiceries", typequ: ["B202", "B208"] },
      { key: "boulangeries", label: "Boulangeries", typequ: ["B207"] },
    ],
  },
  {
    title: "Services",
    rubrics: [
      { key: "poste", label: "Bureaux de poste", typequ: ["A206", "A207", "A208"] },
      { key: "banques", label: "Banques", typequ: ["A203"] },
    ],
  },
  {
    title: "Loisirs",
    rubrics: [
      { key: "bibliotheques", label: "Bibliothèques", typequ: ["F307"] },
      { key: "cinemas", label: "Cinémas", typequ: ["F303"] },
      {
        key: "sport",
        label: "Équipements sportifs",
        typequ: ["F101", "F102", "F103", "F106", "F107", "F108", "F109", "F111", "F113", "F116", "F120", "F121"],
      },
    ],
  },
  {
    title: "Transports",
    rubrics: [{ key: "gares", label: "Gares", typequ: ["E107", "E108", "E109"] }],
  },
];

export interface EquipmentRubric {
  key: string;
  label: string;
  count: number;
  /** Densité pour 10 000 habitants — pour 1 000, les équipements rares donnaient « 0,009 ». */
  per10k: number;
  /** La même densité pour la France entière, `null` si le repère n'a pas pu être calculé. */
  francePer10k: number | null;
  /**
   * Vrai pour un arrondissement qui détient plus de la moitié des équipements de sa ville
   * dans un code de la rubrique : la BPE les localise sans doute à l'adresse de leur
   * gestionnaire (les 11 bibliothèques de Marseille « dans » le 1er). La comparaison à la
   * France n'est alors pas affichée.
   */
  locationUncertain: boolean;
}

export interface CommuneEquipment {
  codeCommune: string;
  population: number;
  /** Arrondissement de Paris, Lyon ou Marseille : les nombres y sont moins sûrs. */
  isArrondissement: boolean;
  families: Array<{ title: string; rubrics: EquipmentRubric[] }>;
}
