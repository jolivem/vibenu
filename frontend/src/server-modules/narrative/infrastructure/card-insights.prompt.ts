/**
 * Prompt et parseur des mini-synthèses de cards.
 *
 * Le format de sortie est **dérivé du jeu de clés**, pas recopié à côté : le pipeline
 * commune écrit ses quatre clés dans le type, dans le prompt, dans la liste `required`
 * et dans le rendu — quatre endroits à tenir d'accord. Ici, `BRIEFS` est un
 * `Record<CardInsightKey, …>` exhaustif : ajouter une clé sans écrire sa consigne ne
 * compile pas, et le bloc du prompt comme la validation en découlent.
 */

import type { CardInsightKey, CardInsights } from "@/server-shared/types/card-insights";
import { CARD_INSIGHT_KEYS } from "@/server-shared/types/card-insights";
import type { CardInsightsInput } from "../domain/card-insights.types";

/**
 * Version du prompt. À incrémenter dès que le prompt **ou la forme de l'input** change :
 * elle fait partie de la clé primaire du cache, donc les entrées d'une version
 * antérieure cessent d'être servies sans qu'il y ait rien à supprimer.
 */
export const CARD_INSIGHTS_PROMPT_VERSION = 1;

/** Bornes de longueur d'une synthèse acceptable, en caractères. */
const MIN_LENGTH = 20;
const MAX_LENGTH = 400;

const BRIEFS: Record<CardInsightKey, { titreCard: string; consigne: string }> = {
  securite: {
    titreCard: "Sécurité",
    consigne:
      "le ou les deux indicateurs les plus marquants : niveau actuel, sens de l'évolution sur 10 ans, position par rapport au département ou à la France",
  },
  demographie: {
    titreCard: "Démographie",
    consigne:
      "le profil d'âge de la population par rapport au national, et le revenu ou la pauvreté s'ils s'écartent nettement",
  },
  logement: {
    titreCard: "Logement",
    consigne:
      "la physionomie du parc : maisons ou appartements, propriétaires ou locataires, taille et époque dominantes",
  },
  emploi: {
    titreCard: "Emploi et qualifications",
    consigne:
      "la catégorie socioprofessionnelle et le niveau de diplôme dominants, et le chômage comparé au national",
  },
  menages: {
    titreCard: "Ménages et familles",
    consigne:
      "la composition dominante des foyers et leur taille, par rapport au national",
  },
  elections: {
    titreCard: "Présidentielle 2022, 1er tour",
    consigne:
      "la participation par rapport au national, et l'écart au national des un ou deux candidats les plus marquants",
  },
  climat: {
    titreCard: "Climat",
    consigne:
      "le caractère du climat en s'appuyant sur la ville de référence la plus proche, les extrêmes mensuels et la pluviométrie",
  },
};

const OUTPUT_BLOCK = CARD_INSIGHT_KEYS.map(
  (key) => `  "${key}": "…"   // ${BRIEFS[key].titreCard} — ${BRIEFS[key].consigne}`,
).join("\n");

export const CARD_INSIGHTS_SYSTEM_PROMPT = `Tu écris les légendes de lecture des graphiques d'une page d'analyse de lieu, destinées à un lecteur non spécialiste qui n'a ni le temps ni les repères pour lire les courbes.

MISSION
Pour chaque section demandée, 1 à 2 phrases (25 à 45 mots) qui disent CE QU'IL FAUT COMPRENDRE des graphiques de cette section. Pas un résumé du thème : la lecture des données.

RÈGLES DE FOND
- Tu ne disposes que des données JSON fournies. Tu n'inventes RIEN : ni chiffre, ni évolution, ni comparaison qui n'y figure pas.
- Aucune explication causale. Pas de « grâce à la proximité du centre », « en raison de la gentrification » : les données ne contiennent pas les causes.
- Les champs "tendance_…", "ecart_…", "…_dominant", "…_dominante", "tranche_sur_representee", "ville_reference_la_plus_proche" sont DÉJÀ calculés. Reprends-les tels quels, ne les recalcule pas, ne les contredis pas.
- Chaque phrase situe le lieu par rapport au repère fourni (France, département, ou villes de référence). Un chiffre sans repère n'apprend rien : ne le donne jamais seul.
- Seuil de saillance : en dessous de 2 points d'écart (ou 5 % en relatif), écris « proche de la moyenne » — ne dramatise pas un écart faible. Au-delà, nomme le sens de l'écart.
- Au plus DEUX chiffres par phrase. Jamais d'énumération de pourcentages.

RÈGLES DE FORME
- Langage courant. Interdits : IRIS, quantile, médiane pondérée, taux normalisé, corrélation, écart-type.
- Ne nomme jamais le support : pas de « le graphique montre », « la courbe indique », « on observe ». Écris le fait directement.
- Ton neutre et descriptif. Pas de jugement (« quartier agréable »), pas de superlatif sans chiffre, pas de conseil ni d'appel à l'action.
- Pas de markdown, pas de titre, pas de guillemets autour du texte. Une seule chaîne par clé.

ÉCHELLE — le champ "mode" du JSON commande
- mode "address" → tu décris un quartier : « dans ce quartier », « ici ».
- mode "commune" → tu décris la commune entière. N'emploie JAMAIS le mot « quartier ».

LECTURES PIÉGEUSES, À RESPECTER STRICTEMENT
- Sécurité : "annees_masquees" compte les années sous secret statistique, ce qui signifie 1 à 4 faits dans l'année — donc un phénomène RARE, et non une donnée manquante. N'écris jamais « données indisponibles » à ce sujet. Ce sont des faits ENREGISTRÉS : la mesure dépend aussi du dépôt de plainte.
- Climat : il n'y a pas de moyenne France pertinente ; la comparaison se fait aux villes de référence fournies, en t'appuyant sur "ville_reference_la_plus_proche".
- Emploi : le taux de chômage est celui du recensement, déclaratif, structurellement 1 à 2 points au-dessus du taux trimestriel diffusé dans les médias. Compare-le au taux France fourni, à rien d'autre.
- Élections : décris l'écart au national, jamais l'électeur. Aucun jugement sur les habitants.

CLÉS À PRODUIRE
Le champ "cles_attendues" du JSON d'entrée liste les sections effectivement affichées. Tu produis EXACTEMENT ces clés, ni plus ni moins. Une clé non listée ne doit pas apparaître dans ta réponse.

FORMAT DE SORTIE (JSON OBLIGATOIRE, RIEN D'AUTRE) :
{
${OUTPUT_BLOCK}
}

Réponds uniquement avec le JSON, sans préambule ni commentaire.`;

export function buildCardInsightsUserPrompt(
  input: CardInsightsInput,
  expected: readonly CardInsightKey[],
): string {
  // JSON compact : l'indentation coûtait un bon tiers du payload sans rien apprendre
  // au modèle. Le panneau de debug, lui, réindente pour rester lisible à l'écran.
  return [
    `cles_attendues: ${JSON.stringify(expected)}`,
    "",
    "Données des sections à commenter :",
    "",
    JSON.stringify(input),
  ].join("\n");
}

/**
 * Valide la réponse du modèle, **clé par clé**.
 *
 * Différence assumée avec `parseCommuneNarrativeJson`, qui est all-or-nothing : là-bas
 * les quatre sections forment un texte éditorial solidaire ; ici chaque phrase vit sous
 * sa propre card. Une clé absente, vide, non-textuelle ou hors bornes est simplement
 * ignorée — sa card s'affichera sans synthèse, ce qui est un état normal de la page.
 * On ne lève que si rien n'est exploitable, auquel cas l'appelant dégrade en silence.
 */
export function parseCardInsightsJson(
  raw: string,
  expected: readonly CardInsightKey[],
): CardInsights {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Pas de JSON trouvé dans la réponse LLM.");
  }

  const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;

  // On itère sur les clés attendues, pas sur celles reçues : une clé inventée par le
  // modèle pour une card absente ne peut pas se glisser dans le résultat.
  const out: CardInsights = {};
  for (const key of expected) {
    const value = parsed[key];
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) continue;
    out[key] = text;
  }

  if (Object.keys(out).length === 0) {
    throw new Error("Aucune synthèse exploitable dans la réponse LLM.");
  }
  return out;
}
