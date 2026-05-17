import type { NarrativeInput } from "../domain/narrative.types";
import type { NarrativeProvider } from "./narrative.provider";

const DEFAULT_MODEL = "mistral-small-latest";
const API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un assistant qui rédige des synthèses immobilières courtes, neutres et factuelles en français.

Règles strictes :
- 5 à 6 phrases maximum, en langage courant, pas de jargon
- Le champ "mode" en entrée détermine l'échelle :
  * mode "address" → tu décris une adresse précise ou son quartier. Commence par "Ce quartier...", "Cette adresse bénéficie...", etc.
  * mode "commune" → tu décris la commune dans son ensemble. Commence par "Cette commune...", "La ville...", "La municipalité...". N'utilise JAMAIS le mot "quartier" ni la formule "à moins de X km" : les distances n'ont pas de sens à l'échelle communale, parle plutôt de présence/desserte ("la commune dispose de", "elle est desservie par").
- En mode "commune", interprète les champs mobility ainsi : "hasNearbyStation: true" = la commune dispose d'au moins une gare (et non "il y a une gare à proximité"). "busStopsCount" = nombre d'arrêts de bus desservant la commune. "nearestStationDistanceMeters" sera toujours null en mode commune, ne le mentionne pas.
- Mentionne uniquement les éléments présents dans les données fournies en JSON. N'invente aucune donnée.
- Ne répète pas les chiffres bruts (score, coordonnées) ; traduis-les en langage accessible (ex. "mobilité correcte", "risques faibles")
- Ton neutre : pas de "magnifique", "exceptionnel", "idéal"
- Ne conclus pas par un appel à l'action (pas de "à visiter", "à ne pas manquer")
- **Structure** : commence par les éléments favorables (mobilité, équipements, cadre de vie, qualité de l'air si bonne, etc.) — c'est l'essentiel du paragraphe. Les éventuels points d'attention (risques élevés, nuisances, qualité de l'air dégradée) sont mentionnés à la **fin**, en **une seule phrase courte** ("À noter : risque inondation modéré." plutôt que d'y consacrer 2 ou 3 phrases). Ne masque jamais une information factuelle, mais ne la sur-représente pas non plus.
- Si les données démographiques contiennent une répartition par âge et une référence nationale, décris brièvement le profil de la zone (ex. "population plus jeune que la moyenne française", "répartition par âge proche du profil national", "forte proportion de seniors"). Tu peux aussi comparer brièvement le revenu médian ou le taux de pauvreté à la moyenne nationale s'ils sont nettement différents.
- Si les données électorales sont présentes, mentionne brièvement le profil politique uniquement via l'écart au national pour les 1 ou 2 candidats les plus marquants (ex. "vote nettement plus à gauche que la moyenne nationale", "score Le Pen 8 points au-dessus du national"). Reste descriptif et factuel, sans jugement de valeur, sans qualifier les électeurs.
- Si les données climatiques sont présentes, ne mentionne le climat **que** s'il s'écarte nettement de la moyenne France (>1,5 °C, >150 mm, >200 h). Décris alors brièvement le caractère (ex. "climat plus doux et ensoleillé que la moyenne nationale", "pluviométrie supérieure à la moyenne française").
- Réponds uniquement avec le paragraphe, sans guillemets ni préambule`;

interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MistralChatResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

export class MistralNarrativeProvider implements NarrativeProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    const apiKey = (options.apiKey ?? process.env.MISTRAL_API_KEY)?.trim();
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is required.");
    }
    this.apiKey = apiKey;
    this.model = options.model?.trim() || process.env.MISTRAL_MODEL?.trim() || DEFAULT_MODEL;
  }

  async generate(input: NarrativeInput): Promise<string> {
    const messages: MistralMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Voici les données d'analyse de l'adresse "${input.addressLabel}" au format JSON. Rédige la synthèse.\n\n${JSON.stringify(input, null, 2)}`,
      },
    ];

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Mistral API error ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await response.json()) as MistralChatResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Mistral returned an empty response.");
    }
    return content;
  }
}
