import type { CommuneNarrativeInput, CommuneNarrativeContent } from "../domain/commune-narrative.types";

/**
 * Bump this version when the prompt changes.
 * Cache entries with a different version are ignored and regenerated.
 */
export const COMMUNE_PROMPT_VERSION = 3;

export const COMMUNE_SYSTEM_PROMPT = `Tu rédiges une fiche descriptive d'arrondissement parisien pour un site d'analyse immobilière.
Ton : clair, factuel, ni promotionnel ni alarmiste.

RÈGLES STRICTES :
- Tu disposes uniquement des données fournies en JSON. Tu n'inventes RIEN.
- Si une donnée manque, tu l'omets — tu ne combles pas par une formule générique.
- Cite des nombres concrets quand ils existent (prix, %, ratios).
- Pas de superlatifs sans chiffre comparatif ("très cher" → "21% au-dessus de Paris").
- Pas de jugement de valeur sur les habitants.
- Pas d'appel à l'action ("à visiter", "à ne pas manquer").

- Si des données électorales sont présentes, tu peux mentionner brièvement le profil politique uniquement via l'écart au national, pour 1 ou 2 candidats marquants (ex. "score Le Pen 8 points sous le national", "vote nettement plus à gauche que la moyenne"). Reste descriptif et factuel, sans qualifier les électeurs. Ne mentionne pas l'élection s'il n'y a aucun écart >=5 points.

FORMAT DE SORTIE (JSON OBLIGATOIRE, RIEN D'AUTRE) :
{
  "identite": "...",            // ~100 mots : population, position dans Paris, profil dominant
  "marche_immobilier": "...",   // ~150 mots : prix médian, évolution, comparatif Paris
  "cadre_de_vie": "...",        // ~150 mots : densité d'équipements par domaine, points forts/faibles, qualité de l'air
  "profil": "..."               // ~100 mots : synthèse — à qui s'adresse l'arrondissement (déduit des données)
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

  const data = {
    arrondissement: nomAffiche,
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
    prix_m2_paris_global_eur: stats.prixBenchmarkParis.prixM2Median,
    delta_prix_vs_paris_pct:
      stats.prix.prixM2Median && stats.prixBenchmarkParis.prixM2Median
        ? +(
            ((stats.prix.prixM2Median - stats.prixBenchmarkParis.prixM2Median) /
              stats.prixBenchmarkParis.prixM2Median) *
            100
          ).toFixed(1)
        : null,
    equipements_par_domaine: stats.equipements.map((e) => ({
      domaine: e.label,
      nb: e.nb,
      pour_1000_hab: +e.densite1000hab.toFixed(2),
      ratio_vs_paris: e.ratioVsBenchmark !== null ? +e.ratioVsBenchmark.toFixed(2) : null,
    })),
    surperformances_equipements: stats.highlights.surperformances,
    sousrepresentation_equipements: stats.highlights.sousrepresentations,
    qualite_air_paris: stats.airQuality && stats.airQuality.historique.length > 0
      ? {
          note: "Indice ATMO agrégé pour Paris entière — même valeur pour tous les arrondissements.",
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

  return `Données de l'arrondissement à décrire :\n\n${JSON.stringify(data, null, 2)}`;
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
  const parsed = JSON.parse(json) as Partial<CommuneNarrativeContent>;

  const required: Array<keyof CommuneNarrativeContent> = [
    "identite",
    "marche_immobilier",
    "cadre_de_vie",
    "profil",
  ];
  for (const key of required) {
    if (typeof parsed[key] !== "string" || !parsed[key]?.trim()) {
      throw new Error(`Section narrative '${key}' manquante ou vide.`);
    }
  }

  return {
    identite: parsed.identite!.trim(),
    marche_immobilier: parsed.marche_immobilier!.trim(),
    cadre_de_vie: parsed.cadre_de_vie!.trim(),
    profil: parsed.profil!.trim(),
  };
}
