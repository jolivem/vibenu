import type { RiskCategoryDto } from "@/types/location-analysis";

/**
 * Card « Risques naturels » : titre, niveaux, noms, messages et explications. Seul le
 * statut publié par Géorisques vient des données, et se cite tel quel.
 */
export const risks = {
  title: "Risques naturels",
  /** Libellé de la pastille de niveau. Les clés sont les codes du DTO. */
  levels: {
    élevé: "Élevé",
    modéré: "Modéré",
    présent: "Signalé",
    faible: "Faible",
    inconnu: "Non renseigné",
    absent: "Absent",
  } satisfies Record<RiskCategoryDto["level"], string> as Record<RiskCategoryDto["level"], string>,
  /**
   * Noms des risques, par code Géorisques. Un code inconnu d'ici garde le nom envoyé par le
   * serveur.
   */
  names: {
    inondation: "Risque d'inondation",
    remonteeNappe: "Remontée de nappe",
    risqueCotier: "Risque côtier",
    seisme: "Risque sismique",
    mouvementTerrain: "Mouvements de terrain",
    reculTraitCote: "Recul du trait de côte",
    retraitGonflementArgile: "Retrait-gonflement des argiles",
    avalanche: "Risque d'avalanche",
    feuForet: "Feu de forêt",
    eruptionVolcanique: "Éruption volcanique",
    cyclone: "Cyclone",
    radon: "Exposition au radon",
    icpe: "Installation classée (ICPE)",
    nucleaire: "Risque nucléaire",
    canalisationsMatieresDangereuses: "Canalisations dangereuses",
    pollutionSols: "Pollution des sols",
    ruptureBarrage: "Rupture de barrage",
    risqueMinier: "Risque minier",
  } as Record<string, string>,
  /**
   * Message d'un risque mis en avant. Il ne reprend pas le nom du risque, affiché à côté de
   * la pastille : l'omettre évite un accord impossible à tenir, les noms étant tantôt
   * masculins, tantôt féminins, tantôt pluriels. `detail` est le statut publié par
   * Géorisques, cité tel quel.
   */
  message: (p: {
    name: string;
    level: RiskCategoryDto["level"];
    detail: string | null;
    communeFallback: boolean;
    unavailable: boolean;
  }) => {
    if (p.unavailable) {
      return "Données Géorisques indisponibles — vérifier manuellement sur georisques.gouv.fr.";
    }
    const suffix = p.detail ? ` (${p.detail})` : "";
    // Dire d'où vient la gravité : à l'échelle de la commune, elle ne se transpose pas
    // telle quelle à la parcelle.
    const scope = p.communeFallback ? ", à l'échelle de la commune — non établi à l'adresse" : "";
    switch (p.level) {
      case "absent":
        return `Pas de ${p.name.toLowerCase()} identifié sur ce secteur.`;
      case "élevé":
        return `⚠️ Niveau élevé${scope}${suffix}. Étude spécialisée recommandée.`;
      case "modéré":
        return `Niveau modéré${scope}${suffix}. À investiguer avant décision.`;
      case "présent":
        return `Signalé par Géorisques${scope}${suffix}, sans gravité publiée : à vérifier avant décision.`;
      case "faible":
        return `Niveau faible${scope}${suffix}.`;
      case "inconnu":
        return "Non renseigné par Géorisques à cette adresse. À vérifier sur georisques.gouv.fr.";
    }
  },
  /**
   * Ce qu'est chaque risque, en une phrase ou deux.
   *
   * Géorisques nomme les risques et les gradue, mais n'explique pas ce qu'ils sont. « Retrait-
   * gonflement des argiles » ou « Exposition au radon » ne disent rien à qui ne les connaît
   * pas déjà — et ce sont justement les deux que le lecteur a le plus de chances de croiser
   * sans les comprendre.
   *
   * Ligne éditoriale, la même que le reste de la page : dire le phénomène et ce qu'il
   * implique concrètement pour un logement, sans conseiller ni dramatiser. Quand le
   * classement est communal alors que l'exposition dépend du bâti — radon, argiles — on
   * le dit : c'est l'écart que le lecteur doit connaître pour ne pas surinterpréter la
   * pastille.
   *
   * Clés : les codes de `risquesNaturels` et `risquesTechnologiques` de l'API Géorisques,
   * tels que `riskLabels` les liste dans `brgm-risk.provider.ts`. Une clé manquante n'est
   * pas une erreur — le risque s'affiche alors sans explication, comme avant.
   */
  explanations: {
    inondation:
      "Débordement d'un cours d'eau ou ruissellement après de fortes pluies. Le zonage porte sur le secteur : ce qu'un logement subit dépend surtout de son étage et de la présence d'un sous-sol.",
    remonteeNappe:
      "Montée de la nappe souterraine jusqu'à la surface. Elle inonde caves et sous-sols sans qu'aucun cours d'eau ne déborde.",
    risqueCotier:
      "Submersion marine lors des tempêtes, lorsque la mer franchit le trait de côte. Distinct de l'érosion, qui déplace la côte elle-même.",
    seisme:
      "La France métropolitaine est découpée en cinq zones de sismicité. Le classement commande les règles de construction ; il ne prédit pas un séisme ressenti.",
    mouvementTerrain:
      "Affaissements, glissements de terrain ou chutes de blocs. Sous une ville, c'est souvent l'héritage d'anciennes carrières souterraines.",
    reculTraitCote:
      "Érosion du littoral, qui fait reculer la limite de la côte à l'échelle de plusieurs décennies.",
    retraitGonflementArgile:
      "Les sols argileux gonflent en saison humide et se rétractent en sécheresse. Ce mouvement fissure les murs des maisons individuelles aux fondations peu profondes, et c'est l'un des premiers postes d'indemnisation au titre des catastrophes naturelles. Un immeuble sur fondations profondes y est peu sensible.",
    avalanche:
      "Concerne les communes de montagne dont le bâti est exposé à un couloir d'avalanche.",
    feuForet:
      "Exposition aux incendies de végétation. Elle impose souvent un débroussaillement réglementaire autour des constructions.",
    eruptionVolcanique:
      "Concerne les communes situées près d'un volcan actif — outre-mer, et Massif central.",
    cyclone:
      "Concerne les départements d'outre-mer exposés aux cyclones tropicaux, avec des règles de construction propres.",
    radon:
      "Gaz radioactif naturel venu du sous-sol, sans odeur ni couleur, qui s'accumule dans les caves et les pièces mal ventilées en contact avec le sol. Le classement est communal : la concentration réelle dépend du bâti et de la ventilation, et se mesure avec un dosimètre posé quelques semaines.",
    icpe:
      "Présence d'installations industrielles soumises à autorisation. Les plus sensibles relèvent d'un plan de prévention des risques technologiques, qui encadre la construction autour d'elles.",
    nucleaire:
      "Commune comprise dans le périmètre du plan particulier d'intervention d'une installation nucléaire.",
    canalisationsMatieresDangereuses:
      "Passage d'une canalisation de transport de gaz, d'hydrocarbures ou de produits chimiques. Des servitudes limitent ce qui peut être construit à proximité immédiate.",
    pollutionSols:
      "Trace d'une activité industrielle passée sur le secteur, répertoriée dans les bases de sols pollués. Le diagnostic se fait à la parcelle.",
    ruptureBarrage:
      "Commune située dans l'onde de submersion théorique d'un grand barrage.",
    risqueMinier:
      "Séquelles d'anciennes exploitations minières : affaissements, effondrements localisés ou remontées d'eau.",
  } as Record<string, string>,
  /** Fiche PDF. */
  pdf: {
    othersLabel: "Autres risques",
    other: (name: string, level: string) => `${name} (${level.toLowerCase()})`,
    none: "Aucun risque naturel recensé.",
  },
};

export type RisksMessages = typeof risks;
