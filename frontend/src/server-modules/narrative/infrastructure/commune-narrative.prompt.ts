import type {
  CommuneLegendes,
  CommuneLegendKey,
  CommuneNarrativeContent,
  CommuneNarrativeInput,
} from "../domain/commune-narrative.types";
import { COMMUNE_LEGEND_KEYS } from "../domain/commune-narrative.types";
import type { EquipmentDomainStats } from "../../commune-stats/domain/commune-stats.types";
import { CITIES } from "@/lib/commune-slugs";
import { FEATURES } from "@/lib/site-features";
import { summarizeSecurity } from "../../commune-stats/application/security-summary";
import { roundOrNull } from "@/server-shared/domain/trend";
import {
  classeDominante,
  EPOCH_LABELS,
  ROOM_LABELS,
} from "../application/card-insights.input";
import {
  communeSectionContent,
  type CommuneSectionId,
} from "@/components/commune/sections";

/**
 * Bump this version when the prompt changes.
 * Cache entries with a different version are ignored and regenerated.
 *
 * v6 : `ratio_vs_ville` vaut null pour un domaine d'équipements anormalement concentré dans
 * l'arrondissement (la BPE y rattache des équipements à l'adresse de leur gestionnaire). Les
 * légendes générées sur l'ancien écart — « forte présence culturelle » à Marseille 1er — sont
 * régénérées.
 *
 * v7 : `taux_pauvrete_pct` recevait 3853.5 au lieu de 38.5 (pourcentage de la vue multiplié
 * une seconde fois par 100). Les légendes écrites sur cette valeur sont régénérées.
 *
 * v8 : section Sécurité — bloc `securite` en entrée (écarts à la ville et à la France déjà
 * calculés), règle de rédaction et légende `legende_securite`.
 *
 * v9 : fiabilisation, et une phrase sur le vote dans « identite ». Les synthèses v8 écrivaient
 * « revenu inférieur de 38,5 % au seuil de pauvreté » (le taux de pauvreté lu comme un écart
 * de revenu), « 4 gares pour 1 000 habitants » (un nombre lu comme une densité), une moyenne
 * parisienne de revenu inventée, et des noms de quartiers ou de gares absents des données.
 * L'entrée nomme donc ses unités, les repères sont posés à côté de leur valeur, et le prompt
 * interdit toute connaissance extérieure.
 *
 * v10 : trois écarts restants des synthèses v9 — « aucune donnée sur la qualité de l'air »
 * (le format demandait l'air « si dispo », ce qui l'invitait à signaler l'absence), un
 * « cadre de vie calme » que rien ne mesure, et une culture « moins dense » à Lyon 3e alors
 * que l'écart y est retiré pour concentration anormale (ratio null).
 *
 * v11 : les consignes ne suffisaient pas, le modèle lisant encore l'entrée de travers
 * (« restauration bien représentée » à −42 %, « aucun indicateur de qualité de l'air »,
 * « sur la période disponible »). On applique donc « TS calcule, le modèle verbalise » :
 * les champs null sont retirés de l'entrée, et la position de chaque domaine d'équipements
 * face à la ville est tranchée en TS (`position_vs_ville`) au lieu d'un ratio brut.
 *
 * v12 : retrait des paragraphes « marche_immobilier » et « profil ». Le premier redisait la
 * section Prix en y glissant des interprétations fausses (« marché équilibré sans tension »,
 * « sous-évaluation des biens ») ; le second déduisait un public de quelques chiffres.
 *
 * v13 : « cadre_de_vie » ne parle plus de l'air que si l'entrée en contient. La consigne
 * « qualité de l'air seulement si… » du format suffisait à lui faire écrire « aucun repère
 * de qualité de l'air n'est disponible » ; l'air n'est donc plus nommé que dans la note du
 * bloc `qualite_air_ville`, absent quand la rubrique est coupée. Et « cadre_de_vie » ne
 * reprend plus la population ni les âges d'« identite ».
 *
 * v14 : retrait de `surperformances_equipements` et `sousrepresentation_equipements`. Ces
 * listes (ratio ≥ 1,5 ou ≤ 0,5) contredisaient `position_vs_ville` : l'éducation de
 * Marseille 1er, à −37 %, est « en dessous de la ville » mais absente des
 * sous-représentations, et le modèle la disait « proche de la moyenne ».
 *
 * v15 : un écart de sécurité d'au moins deux fois le repère arrive en multiple
 * (`multiple_vs_france`) et non plus en pourcentage. Lyon 7e lisait « vols dans les
 * véhicules 1 262,8 % plus fréquents qu'en France » pour un taux 13,6 fois le taux français.
 *
 * v16 : le parc de logements entre dans l'entrée (`logement`) et la rubrique Population
 * gagne une septième légende, `legende_logement`. La section `demographie` en porte donc
 * deux, parce qu'elle rend quatre cards — une règle anti-redite les sépare, les deux
 * graphiques étant voisins dans la même colonne.
 */
export const COMMUNE_PROMPT_VERSION = 16;

export const COMMUNE_SYSTEM_PROMPT = `Tu rédiges une fiche descriptive d'arrondissement (Paris, Lyon ou Marseille) pour un site d'analyse immobilière.
Ton : clair, factuel, ni promotionnel ni alarmiste.

RÈGLES STRICTES :
- Tu disposes uniquement des données fournies en JSON. Tu n'inventes RIEN.
- AUCUNE CONNAISSANCE EXTÉRIEURE : pas de nom de quartier, de rue, de gare, de monument ou d'institution, pas de situation géographique (« au sud-ouest », « en bord de mer », « en centre-ville »), pas de chiffre absent du JSON. Même si tu connais l'arrondissement, tu n'écris que ce que le JSON contient.
- Une comparaison se fait uniquement au repère fourni À CÔTÉ de la valeur dans le JSON. Sans repère fourni, pas de comparaison (« inférieur à la moyenne de la ville » est interdit si le JSON ne donne pas cette moyenne). Pour les équipements, reprends le sens donné par "position_vs_ville" et rien d'autre : un domaine « non comparable » ne se juge ni faible ni élevé.
- Pas de qualificatif d'ambiance ou de ressenti que les données ne mesurent pas (« calme », « animé », « dynamique », « dynamisme », « prisé », « familial », « équilibre »), ni d'affirmation sur la demande, l'attractivité ou la tension d'un marché que le JSON ne chiffre pas.
- Respecte l'unité de chaque champ, indiquée par son nom : un nombre total d'équipements n'est pas une densité, une part d'habitants sous le seuil de pauvreté n'est pas un revenu.
- Les champs "ecart_pts" sont des écarts en POINTS entre deux parts, jamais des pourcentages d'évolution : 33 % de propriétaires contre 58 % en France, c'est « 25 points en dessous », et non « 43 % en dessous ».
- Le champ "ville" du JSON indique la ville de rattachement (Paris, Lyon, Marseille). Réfère-toi toujours à cette ville et jamais à une autre.
- Si une donnée manque, tu l'omets SANS LE SIGNALER : n'écris jamais qu'une donnée est « indisponible », « absente » ou « non disponible ».
- Cite des nombres concrets quand ils existent (prix, %, ratios).
- Pas de superlatifs sans chiffre comparatif ("très cher" → "21% au-dessus de la moyenne de la ville").
- Pas de jugement de valeur sur les habitants.
- Pas d'appel à l'action ("à visiter", "à ne pas manquer").

VOTE — UNIQUEMENT DANS "identite"
- Si "elections.ecarts_notables_vs_france" contient au moins un candidat, "identite" se termine par UNE phrase sur le vote : le nom du scrutin et son année, puis l'écart au national, en points, de 1 ou 2 candidats de cette liste (ex. « Au 1er tour de la présidentielle 2022, Emmanuel Macron y a obtenu 12 points de plus qu'au national. »).
- Tu décris des scores, jamais des personnes ni un territoire : pas d'« électorat de gauche », d'« arrondissement de droite », de « bastion », de « vote protestataire ».
- Si la liste est vide, "identite" ne parle pas du vote.
- Le vote n'apparaît pas dans "cadre_de_vie".
- Si des données de sécurité sont présentes : ce sont des faits ENREGISTRÉS par la police et la gendarmerie, la mesure dépend aussi du dépôt de plainte. Ne qualifie jamais l'arrondissement de « dangereux », « sûr » ou « tranquille » : situe chaque taux face à la ville et à la France, chiffres à l'appui. Quand "multiple_vs_ville" ou "multiple_vs_france" est fourni (le taux atteint au moins le double du repère), exprime cet écart en fois — « 13,6 fois plus fréquents qu'en France » — et jamais en pourcentage. "annees_masquees" compte les années sous secret statistique (1 à 4 faits dans l'année) : un phénomène rare, jamais une donnée manquante.

DEUX FAMILLES DE CLÉS, DEUX RÔLES DISTINCTS
- identite / cadre_de_vie : texte éditorial, qui DÉCRIT l'arrondissement.
- legende_* : légende du graphique de sa section, 1 à 2 phrases (25 à 40 mots), pour un lecteur qui ne sait pas lire les courbes. Elle commente CE QUE MONTRENT LES CHIFFRES DE SA SECTION et rien d'autre : le niveau, l'écart au repère, la classe dominante. N'y nomme jamais le support ("le graphique montre", "on observe").

ANTI-REDITE — RÈGLE IMPÉRATIVE
Tu rédiges d'abord les deux clés éditoriales, puis les légendes. Une légende ne reprend jamais une formulation ni un chiffre déjà écrits dans l'éditorial : si l'éditorial a donné le chiffre, la légende dit ce qu'il faut en comprendre. Elle n'introduit aucun élément absent des données de sa section.
"legende_demographie" et "legende_logement" légendent deux graphiques voisins de la même rubrique : la première ne parle que des habitants (âges, revenus), la seconde que des logements (parc, statut d'occupation, taille, époque). Ni l'une ni l'autre ne parle de prix, qui relève de "legende_prix".

CLÉS legende_* À PRODUIRE
Le champ "sections_affichees" du JSON d'entrée liste les sections effectivement rendues sur la page. Tu produis une clé legende_* pour celles-là uniquement, et pour aucune autre.

FORMAT DE SORTIE (JSON OBLIGATOIRE, RIEN D'AUTRE) :
{
  "identite": "...",            // ~100 mots : population, âges, revenus, puis la phrase sur le vote si un écart est notable
  "cadre_de_vie": "...",        // ~150 mots : densité d'équipements par domaine selon "position_vs_ville", sans reprendre la population, les âges ni les revenus
  "legende_prix": "...",         // 1-2 phrases : niveau du prix au m² et son évolution, face à la moyenne de la ville
  "legende_demographie": "...",  // 1-2 phrases : profil de population et revenu, face au repère fourni
  "legende_logement": "...",     // 1-2 phrases : ce que dit le parc — statut d'occupation dominant, type et âge des logements — face à la France
  "legende_equipements": "...",  // 1-2 phrases : les domaines où la densité d'équipements se démarque, en plus comme en moins
  "legende_securite": "...",     // 1-2 phrases : les 1 ou 2 indicateurs de délinquance les plus marquants face à la ville et à la France, et leur tendance
  "legende_air": "...",          // 1-2 phrases : niveau de qualité de l'air et sens de son évolution
  "legende_elections": "..."     // 1-2 phrases : participation et écart au national des 1 ou 2 candidats les plus marquants
}

Chaque clé contient UNE chaîne de texte (pas de liste, pas de markdown, pas de titres).
Réponds uniquement avec le JSON, sans préambule ni guillemets autour.`;

/** Au-delà de cet écart de densité à la ville, un domaine cesse d'être « proche de la ville ». */
const EQUIPMENT_POSITION_THRESHOLD = 0.1;

/**
 * Le sens de la densité d'un domaine face à la ville, tranché ici plutôt que déduit par le
 * modèle d'un ratio : il écrivait « restauration bien représentée » pour un ratio de 0,58.
 */
function equipmentPosition(e: EquipmentDomainStats): Record<string, string | number> {
  if (e.concentrationAnormale) {
    return { position_vs_ville: "non comparable (localisation incertaine dans la base)" };
  }
  if (e.ratioVsBenchmark === null) return {};
  const ratio = e.ratioVsBenchmark;
  const position =
    ratio >= 1 + EQUIPMENT_POSITION_THRESHOLD
      ? "au-dessus de la ville"
      : ratio <= 1 - EQUIPMENT_POSITION_THRESHOLD
        ? "en dessous de la ville"
        : "proche de la ville";
  return { position_vs_ville: position, ecart_densite_vs_ville_pct: Math.round((ratio - 1) * 100) };
}

/**
 * Retire les champs null, récursivement dans les objets — pas dans les tableaux, dont les
 * positions ont un sens.
 *
 * Une clé présente à null invitait le modèle à signaler l'absence (« aucun indicateur de
 * qualité de l'air », « sur la période disponible ») malgré la consigne contraire : une
 * donnée manquante est désormais invisible.
 */
function pruneNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(pruneNulls);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, pruneNulls(v)]),
    );
  }
  return value;
}

/** Fraction → pourcentage à une décimale, `null` conservé. */
function pctOrNull(fraction: number | null): number | null {
  return fraction !== null ? +(fraction * 100).toFixed(1) : null;
}

export function buildCommuneUserPrompt(input: CommuneNarrativeInput): string {
  const { nomAffiche, stats } = input;

  // Évolution sur 24 mois (delta médian première vs dernière année connue)
  const evol = stats.prix.evolution;
  let evolutionResume: string | null = null;
  if (evol.length >= 2) {
    const first = evol[0];
    const last = evol[evol.length - 1];
    if (first.prixMedian > 0) {
      const delta = ((last.prixMedian - first.prixMedian) / first.prixMedian) * 100;
      evolutionResume = `${first.annee}→${last.annee}: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
    }
  }

  const cityDef = CITIES[stats.city];
  const data = {
    arrondissement: nomAffiche,
    ville: cityDef.nomAffiche,
    population: stats.demo.populationTotale,
    profil_age_dominant: stats.highlights.profilAgeDominant,
    // Unités dans les noms et repère France à côté : les synthèses v8 lisaient le taux de
    // pauvreté comme un écart de revenu, et inventaient une moyenne de revenu de la ville.
    revenus: {
      note: "Aucun repère de revenu n'existe pour la ville entière : les revenus se comparent uniquement à la France.",
      revenu_median_annuel_eur: stats.demo.revenuMedianPondere,
      revenu_median_annuel_france_eur: stats.demoFrance?.revenuMedianPondere ?? null,
      part_habitants_sous_seuil_pauvrete_pct: pctOrNull(stats.demo.tauxPauvretePondere),
      part_habitants_sous_seuil_pauvrete_france_pct: pctOrNull(stats.demoFrance?.tauxPauvretePondere ?? null),
    },
    pyramide_ages_pct: {
      "0-14": +(stats.demo.partAges.part_0_14 * 100).toFixed(1),
      "15-29": +(stats.demo.partAges.part_15_29 * 100).toFixed(1),
      "30-44": +(stats.demo.partAges.part_30_44 * 100).toFixed(1),
      "45-59": +(stats.demo.partAges.part_45_59 * 100).toFixed(1),
      "60-74": +(stats.demo.partAges.part_60_74 * 100).toFixed(1),
      "75+": +(stats.demo.partAges.part_75_plus * 100).toFixed(1),
    },
    logement: logementInput(stats),
    prix_m2_eur: stats.prix.prixM2Median,
    prix_m2_p25: stats.prix.p25,
    prix_m2_p75: stats.prix.p75,
    nb_transactions_24m: stats.prix.nbTransactions,
    evolution_prix: evolutionResume,
    prix_m2_ville_global_eur: stats.prixBenchmarkVille.prixM2Median,
    delta_prix_vs_ville_pct:
      stats.prix.prixM2Median && stats.prixBenchmarkVille.prixM2Median
        ? +(
            ((stats.prix.prixM2Median - stats.prixBenchmarkVille.prixM2Median) /
              stats.prixBenchmarkVille.prixM2Median) *
            100
          ).toFixed(1)
        : null,
    // « nb » et « pour_1000_hab » côte à côte donnaient « 4 gares pour 1 000 habitants ».
    equipements_par_domaine: stats.equipements.map((e) => ({
      domaine: e.label,
      nombre_total: e.nb,
      densite_pour_1000_habitants: +e.densite1000hab.toFixed(2),
      ...equipmentPosition(e),
    })),
    // Mêmes chiffres que le tableau de la section : écarts et tendances déjà tranchés.
    securite: securiteInput(stats),
    // Coupé avec la rubrique : sans ce garde, l'éditorial « cadre_de_vie » continuerait
    // de commenter un air dont la page ne montre plus rien.
    qualite_air_ville: FEATURES.showAirQuality && stats.airQuality && stats.airQuality.historique.length > 0
      ? {
          note: `Indice ATMO agrégé pour ${cityDef.nomAffiche} entière — même valeur pour tous les arrondissements de la ville. À commenter brièvement dans "cadre_de_vie".`,
          source: cityDef.airSourceLabel,
          derniere_annee: stats.airQuality.historique[0].annee,
          jours_par_categorie_derniere_annee: {
            bon: stats.airQuality.historique[0].joursBonne,
            moyen: stats.airQuality.historique[0].joursMoyenne,
            degrade: stats.airQuality.historique[0].joursDegradee,
            mauvais: stats.airQuality.historique[0].joursMauvaise,
            tres_mauvais: stats.airQuality.historique[0].joursTresMauvaise,
            extremement_mauvais: stats.airQuality.historique[0].joursExtremementMauvaise,
          },
          total_jours_mesures: stats.airQuality.historique[0].totalJours,
        }
      : null,
    elections: stats.elections
      ? {
          scrutin: stats.elections.scrutin,
          taux_participation_pct: +(stats.elections.tauxParticipation * 100).toFixed(1),
          taux_participation_france_pct:
            stats.elections.tauxParticipationFrance !== null
              ? +(stats.elections.tauxParticipationFrance * 100).toFixed(1)
              : null,
          top_3_candidats: stats.elections.candidats.slice(0, 3).map((c) => ({
            candidat: c.candidat,
            parti: c.parti,
            pct: c.pctExprimes,
            pct_france: c.pctExprimesFrance,
            delta_pp_vs_france: c.deltaPp,
          })),
          ecarts_notables_vs_france: stats.highlights.ecartsElectorauxNotables,
        }
      : null,
  };

  return [
    `sections_affichees: ${JSON.stringify(sectionsAffichees(input))}`,
    "",
    `Données de l'arrondissement à décrire :`,
    "",
    JSON.stringify(pruneNulls(data), null, 2),
  ].join("\n");
}

/**
 * La section dont l'**affichage commande** chaque légende — et non celle qu'elle commente,
 * la nuance compte : `demographie` en porte deux, parce que la rubrique Population rend
 * quatre cards. Un `Record` est une application, pas une bijection ; deux clés peuvent
 * viser la même section, et l'invariant « une clé est produite ssi sa section s'affiche »
 * tient littéralement.
 *
 * Écart résiduel assumé : `FEATURES.showHousing` à `false` ferait produire
 * `legende_logement` sans sa card — exactement la situation que `showEmployment` et
 * `showHouseholds` portent déjà, ces drapeaux n'entrant pas non plus dans le garde de
 * section. Faire de cette table un jeu de prédicats pour ce seul cas serait la première
 * divergence du mécanisme.
 */
const SECTION_PAR_LEGENDE: Record<CommuneLegendKey, CommuneSectionId> = {
  legende_prix: "prix-immobilier",
  legende_demographie: "demographie",
  legende_logement: "demographie",
  legende_equipements: "equipements",
  legende_securite: "securite",
  legende_air: "qualite-air",
  legende_elections: "elections",
};

/**
 * Les sections réellement rendues sur la page, donc les seules à légender.
 *
 * Les gardes ne sont plus répliqués ici : la page les tient dans `communeSectionContent`,
 * et c'est cette table qu'on interroge. Une légende pour une section absente serait payée
 * au modèle pour n'être jamais lue — et l'invariant « une clé est produite ssi sa section
 * s'affiche » ne tient que s'il n'y a qu'un seul jeu de conditions.
 *
 * `contour` et `nbFaqItems` ne commandent que l'histoire et la FAQ, deux sections sans
 * légende : les valeurs passées ici ne changent aucune des six clés.
 */
function sectionsAffichees(input: CommuneNarrativeInput): CommuneLegendKey[] {
  const content = communeSectionContent({
    stats: input.stats,
    contour: null,
    nbFaqItems: 0,
  });

  return COMMUNE_LEGEND_KEYS.filter((key) => content[SECTION_PAR_LEGENDE[key]]);
}

/**
 * Bloc logement de l'entrée.
 *
 * Décalque de `buildLogement` (card-insights), transposé à la maille arrondissement/France
 * sans passer par le pipeline d'analyse, qui part d'un `DemographicsAnalysisDto` que la
 * page commune n'a pas. Deux disciplines en héritent :
 *
 * - les distributions brutes (5 tailles, 6 époques) n'entrent pas : seule leur classe
 *   dominante le fait, tranchée en TS par `classeDominante` — le même code que l'analyse,
 *   pour que les deux pages ne se contredisent pas ;
 * - les parts à `null` sont filtrées ici, `pruneNulls` n'élaguant que les objets, pas les
 *   tableaux, dont les positions portent un sens.
 */
function logementInput(stats: CommuneNarrativeInput["stats"]) {
  const local = stats.housing?.commune ?? null;
  if (!local) return null;
  const france = stats.housing?.france ?? null;

  const part = (libelle: string, pct: number | null, pctFrance: number | null) => ({
    libelle,
    pct,
    pct_france: pctFrance,
    ecart_pts: pct !== null && pctFrance !== null ? +(pct - pctFrance).toFixed(1) : null,
  });

  const parts = (entries: Array<[string, number | null, number | null]>) =>
    entries.map(([l, a, b]) => part(l, a, b)).filter((p) => p.pct !== null);

  return {
    note: "Parc de logements recensé par l'INSEE en 2021 ; « ecart_pts » est un écart en points à la France.",
    parc_total_logements: local.logements,
    residences_principales: local.residencesPrincipales,
    parts_du_parc_pct: parts([
      ["maisons", local.pctMaisons, france?.pctMaisons ?? null],
      ["appartements", local.pctAppartements, france?.pctAppartements ?? null],
      ["logements vacants", local.pctVacants, france?.pctVacants ?? null],
      ["résidences secondaires", local.pctResidencesSecondaires, france?.pctResidencesSecondaires ?? null],
    ]),
    statut_occupation_pct: parts([
      ["propriétaires", local.pctProprietaires, france?.pctProprietaires ?? null],
      ["locataires du privé", local.pctLocatairesPrives, france?.pctLocatairesPrives ?? null],
      ["logement social (HLM)", local.pctHlm, france?.pctHlm ?? null],
      ["logés gratuitement", local.pctLogesGratuitement, france?.pctLogesGratuitement ?? null],
    ]),
    taille_dominante: classeDominante(local.pieces, france?.pieces, ROOM_LABELS),
    epoque_dominante: classeDominante(local.epoques, france?.epoques, EPOCH_LABELS),
  };
}

/**
 * Bloc sécurité de l'entrée, tiré de `summarizeSecurity` comme le tableau et la FAQ : le
 * modèle ne peut pas citer un écart que la page n'affiche pas.
 */
function securiteInput(stats: CommuneNarrativeInput["stats"]) {
  if (!stats.securite) return null;
  const { annees } = stats.securite.local;
  return {
    note: "Faits enregistrés par la police et la gendarmerie (SSMSI) ; la mesure dépend aussi du dépôt de plainte.",
    periode: `${annees[0]}–${annees[annees.length - 1]}`,
    indicateurs: summarizeSecurity(stats.securite).map((row) => ({
      indicateur: row.indicateur,
      unite: `faits ${row.unite}`,
      annee: row.annee,
      taux: roundOrNull(row.tauxLocal, 2),
      valeur_masquee: row.masque,
      ecart_vs_ville_pct: row.ecartVille.pct,
      multiple_vs_ville: row.ecartVille.multiple,
      ecart_vs_france_pct: row.ecartFrance.pct,
      multiple_vs_france: row.ecartFrance.multiple,
      tendance_10ans: row.tendance10ans,
      evolution_10ans_pct: row.evolution10ansPct,
      annees_masquees: row.anneesMasquees,
    })),
  };
}

/**
 * Parse strict du JSON renvoyé par le LLM.
 * Tolère un préambule/footer en cherchant le premier { et le dernier }.
 */
export function parseCommuneNarrativeJson(raw: string): CommuneNarrativeContent {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Pas de JSON trouvé dans la réponse LLM.");
  }
  const json = raw.slice(start, end + 1);
  const parsed = JSON.parse(json) as Record<string, unknown>;

  // Niveau 1 — l'éditorial, tout ou rien. Ces paragraphes forment un texte
  // solidaire et constituent le contenu propre de la page : mieux vaut régénérer que
  // publier une fiche amputée.
  const required = ["identite", "cadre_de_vie"] as const;
  for (const key of required) {
    const value = parsed[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Section narrative '${key}' manquante ou vide.`);
    }
  }

  // Niveau 2 — les légendes, une à une. Chacune vit sous sa propre section : une
  // légende absente ou aberrante coûte une phrase, et ne doit jamais entraîner la
  // perte de l'éditorial validé ci-dessus.
  const legendes: CommuneLegendes = {};
  for (const key of COMMUNE_LEGEND_KEYS) {
    const value = parsed[key];
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text.length < 20 || text.length > 400) continue;
    legendes[key] = text;
  }

  return {
    identite: (parsed.identite as string).trim(),
    cadre_de_vie: (parsed.cadre_de_vie as string).trim(),
    legendes,
  };
}
