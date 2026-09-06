import type {
  CommuneLegendes,
  CommuneLegendKey,
  CommuneNarrativeContent,
  CommuneNarrativeInput,
} from "../domain/commune-narrative.types";
import { COMMUNE_LEGEND_KEYS } from "../domain/commune-narrative.types";
import { CITIES } from "@/lib/commune-slugs";

/**
 * Bump this version when the prompt changes.
 * Cache entries with a different version are ignored and regenerated.
 */
export const COMMUNE_PROMPT_VERSION = 5;

export const COMMUNE_SYSTEM_PROMPT = `Tu rédiges une fiche descriptive d'arrondissement (Paris, Lyon ou Marseille) pour un site d'analyse immobilière.
Ton : clair, factuel, ni promotionnel ni alarmiste.

RÈGLES STRICTES :
- Tu disposes uniquement des données fournies en JSON. Tu n'inventes RIEN.
- Le champ "ville" du JSON indique la ville de rattachement (Paris, Lyon, Marseille). Réfère-toi toujours à cette ville et jamais à une autre.
- Si une donnée manque, tu l'omets — tu ne combles pas par une formule générique.
- Cite des nombres concrets quand ils existent (prix, %, ratios).
- Pas de superlatifs sans chiffre comparatif ("très cher" → "21% au-dessus de la moyenne de la ville").
- Pas de jugement de valeur sur les habitants.
- Pas d'appel à l'action ("à visiter", "à ne pas manquer").

- Si des données électorales sont présentes, tu peux mentionner brièvement le profil politique uniquement via l'écart au national, pour 1 ou 2 candidats marquants (ex. "score Le Pen 8 points sous le national", "vote nettement plus à gauche que la moyenne"). Reste descriptif et factuel, sans qualifier les électeurs. Ne mentionne pas l'élection s'il n'y a aucun écart >=5 points.

DEUX FAMILLES DE CLÉS, DEUX RÔLES DISTINCTS
- identite / marche_immobilier / cadre_de_vie / profil : texte éditorial, qui DÉCRIT l'arrondissement.
- legende_* : légende du graphique de sa section, 1 à 2 phrases (25 à 40 mots), pour un lecteur qui ne sait pas lire les courbes. Elle commente CE QUE MONTRENT LES CHIFFRES DE SA SECTION et rien d'autre : le niveau, l'écart au repère, la classe dominante. N'y nomme jamais le support ("le graphique montre", "on observe").

ANTI-REDITE — RÈGLE IMPÉRATIVE
Tu rédiges d'abord les quatre clés éditoriales, puis les légendes. Une légende ne reprend jamais une formulation ni un chiffre déjà écrits dans l'éditorial : si l'éditorial a donné le chiffre, la légende dit ce qu'il faut en comprendre. Elle n'introduit aucun élément absent des données de sa section.

CLÉS legende_* À PRODUIRE
Le champ "sections_affichees" du JSON d'entrée liste les sections effectivement rendues sur la page. Tu produis une clé legende_* pour celles-là uniquement, et pour aucune autre.

FORMAT DE SORTIE (JSON OBLIGATOIRE, RIEN D'AUTRE) :
{
  "identite": "...",            // ~100 mots : population, position dans la ville, profil dominant
  "marche_immobilier": "...",   // ~150 mots : prix médian, évolution, comparatif avec la moyenne de la ville
  "cadre_de_vie": "...",        // ~150 mots : densité d'équipements par domaine, points forts/faibles, qualité de l'air (si dispo)
  "profil": "...",              // ~100 mots : synthèse — à qui s'adresse l'arrondissement (déduit des données)
  "legende_prix": "...",         // 1-2 phrases : niveau du prix au m² et son évolution, face à la moyenne de la ville
  "legende_demographie": "...",  // 1-2 phrases : profil de population et revenu, face au repère fourni
  "legende_equipements": "...",  // 1-2 phrases : les domaines où la densité d'équipements se démarque, en plus comme en moins
  "legende_air": "...",          // 1-2 phrases : niveau de qualité de l'air et sens de son évolution
  "legende_elections": "..."     // 1-2 phrases : participation et écart au national des 1 ou 2 candidats les plus marquants
}

Chaque clé contient UNE chaîne de texte (pas de liste, pas de markdown, pas de titres).
Réponds uniquement avec le JSON, sans préambule ni guillemets autour.`;

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
    revenu_median_eur: stats.demo.revenuMedianPondere,
    taux_pauvrete_pct: stats.demo.tauxPauvretePondere !== null
      ? +(stats.demo.tauxPauvretePondere * 100).toFixed(1)
      : null,
    pyramide_ages_pct: {
      "0-14": +(stats.demo.partAges.part_0_14 * 100).toFixed(1),
      "15-29": +(stats.demo.partAges.part_15_29 * 100).toFixed(1),
      "30-44": +(stats.demo.partAges.part_30_44 * 100).toFixed(1),
      "45-59": +(stats.demo.partAges.part_45_59 * 100).toFixed(1),
      "60-74": +(stats.demo.partAges.part_60_74 * 100).toFixed(1),
      "75+": +(stats.demo.partAges.part_75_plus * 100).toFixed(1),
    },
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
    equipements_par_domaine: stats.equipements.map((e) => ({
      domaine: e.label,
      nb: e.nb,
      pour_1000_hab: +e.densite1000hab.toFixed(2),
      ratio_vs_ville: e.ratioVsBenchmark !== null ? +e.ratioVsBenchmark.toFixed(2) : null,
    })),
    surperformances_equipements: stats.highlights.surperformances,
    sousrepresentation_equipements: stats.highlights.sousrepresentations,
    qualite_air_ville: stats.airQuality && stats.airQuality.historique.length > 0
      ? {
          note: `Indice ATMO agrégé pour ${cityDef.nomAffiche} entière — même valeur pour tous les arrondissements de la ville.`,
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
    JSON.stringify(data, null, 2),
  ].join("\n");
}

/**
 * Les sections réellement rendues sur la page, donc les seules à légender.
 *
 * Réplique les gardes des composants : `CommuneEquipmentsSection` rend `null` sans
 * équipement, `CommuneAirQualitySection` bascule sur un message d'attente sans
 * historique, `CommuneElectionsSection` rend `null` sans scrutin ni candidat. Prix et
 * démographie sont toujours rendus.
 */
function sectionsAffichees(input: CommuneNarrativeInput): CommuneLegendKey[] {
  const { stats } = input;
  const keys: CommuneLegendKey[] = ["legende_prix", "legende_demographie"];

  if (stats.equipements.some((e) => e.nb > 0)) keys.push("legende_equipements");
  if (stats.airQuality && stats.airQuality.historique.length > 0) keys.push("legende_air");
  if (stats.elections && stats.elections.candidats.length > 0) keys.push("legende_elections");

  return keys;
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

  // Niveau 1 — l'éditorial, tout ou rien. Ces quatre paragraphes forment un texte
  // solidaire et constituent le contenu propre de la page : mieux vaut régénérer que
  // publier une fiche amputée.
  const required = ["identite", "marche_immobilier", "cadre_de_vie", "profil"] as const;
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
    marche_immobilier: (parsed.marche_immobilier as string).trim(),
    cadre_de_vie: (parsed.cadre_de_vie as string).trim(),
    profil: (parsed.profil as string).trim(),
    legendes,
  };
}
