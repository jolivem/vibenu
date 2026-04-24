import type { NarrativeInput } from "../domain/narrative.types";
import type { NarrativeProvider } from "./narrative.provider";

const DEFAULT_MODEL = "mistral-small-latest";
const API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un assistant qui rédige des synthèses immobilières courtes, neutres et factuelles en français.

Règles strictes :
- 3 à 4 phrases maximum, en langage courant, pas de jargon
- Commence par un verbe ou une description générale (ex. "Ce quartier...", "Cette adresse bénéficie..."), pas par le nom/l'adresse
- Mentionne uniquement les éléments présents dans les données fournies en JSON. N'invente aucune donnée.
- Ne répète pas les chiffres bruts (score, coordonnées) ; traduis-les en langage accessible (ex. "mobilité correcte", "risques faibles")
- Ton neutre : pas de "magnifique", "exceptionnel", "idéal"
- Ne conclus pas par un appel à l'action (pas de "à visiter", "à ne pas manquer")
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
    const apiKey = options.apiKey ?? process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is required.");
    }
    this.apiKey = apiKey;
    this.model = options.model ?? process.env.MISTRAL_MODEL ?? DEFAULT_MODEL;
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
