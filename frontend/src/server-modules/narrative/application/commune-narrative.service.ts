import type {
  CommuneNarrativeInput,
  CommuneNarrativeResult,
  CommuneNarrativeContent,
} from "../domain/commune-narrative.types";
import {
  COMMUNE_SYSTEM_PROMPT,
  buildCommuneUserPrompt,
  parseCommuneNarrativeJson,
} from "../infrastructure/commune-narrative.prompt";
import { CommuneNarrativeCacheProvider } from "../infrastructure/commune-narrative-cache.provider";

const DEFAULT_MODEL = "mistral-small-latest";
const API_URL = "https://api.mistral.ai/v1/chat/completions";

interface MistralChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export interface CommuneNarrativeService {
  getNarrative(input: CommuneNarrativeInput): Promise<CommuneNarrativeResult | null>;
}

/**
 * Génère ou récupère depuis le cache une narrative structurée 4 sections.
 * Si l'API Mistral n'est pas configurée (MISTRAL_API_KEY absent), retourne null
 * pour que la page se rende sans la section narrative.
 */
export class CommuneNarrativeServiceImpl implements CommuneNarrativeService {
  private readonly model: string;
  private readonly cache = new CommuneNarrativeCacheProvider();

  constructor() {
    this.model = process.env.MISTRAL_MODEL?.trim() || DEFAULT_MODEL;
  }

  async getNarrative(input: CommuneNarrativeInput): Promise<CommuneNarrativeResult | null> {
    // 1. cache hit
    const cached = await this.cache.get(input.codeCommune, this.model);
    if (cached) {
      return {
        content: cached.content,
        model: this.model,
        generatedAt: cached.generatedAt,
        fromCache: true,
      };
    }

    // 2. génération
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    if (!apiKey) {
      // Mode dégradé : pas de génération, la page se rendra sans narrative.
      return null;
    }

    let content: CommuneNarrativeContent;
    try {
      content = await this.generate(apiKey, input);
    } catch (err) {
      console.warn("[commune-narrative] generation failed:", err);
      return null;
    }

    try {
      await this.cache.set(input.codeCommune, this.model, content);
    } catch (err) {
      console.warn("[commune-narrative] cache write failed:", err);
    }

    return {
      content,
      model: this.model,
      generatedAt: new Date().toISOString(),
      fromCache: false,
    };
  }

  private async generate(
    apiKey: string,
    input: CommuneNarrativeInput,
  ): Promise<CommuneNarrativeContent> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: COMMUNE_SYSTEM_PROMPT },
          { role: "user", content: buildCommuneUserPrompt(input) },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Mistral ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await response.json()) as MistralChatResponse;
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) throw new Error("Réponse Mistral vide.");
    return parseCommuneNarrativeJson(raw);
  }
}

let singleton: CommuneNarrativeService | null = null;

export function getCommuneNarrativeService(): CommuneNarrativeService {
  if (!singleton) {
    singleton = new CommuneNarrativeServiceImpl();
  }
  return singleton;
}
