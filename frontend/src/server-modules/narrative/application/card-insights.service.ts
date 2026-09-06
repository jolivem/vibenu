import { buildGeoKey } from "@/server-shared/infrastructure/cache/in-memory-cache";
import type { CardInsightKey, CardInsights, CardInsightsDto } from "@/server-shared/types/card-insights";
import type { LocationAnalysisDto } from "@/server-shared/types/location-analysis.dto";
import { CardInsightsCacheProvider } from "../infrastructure/card-insights-cache.provider";
import { CARD_INSIGHTS_FIXTURE } from "../infrastructure/card-insights.fixture";
import {
  buildCardInsightsUserPrompt,
  CARD_INSIGHTS_SYSTEM_PROMPT,
  parseCardInsightsJson,
} from "../infrastructure/card-insights.prompt";
import { buildCardInsightsInput, expectedKeys } from "./card-insights.input";

const DEFAULT_MODEL = "mistral-small-latest";
const DEFAULT_BASE_URL = "https://api.mistral.ai/v1";

/**
 * Températures et budget de sortie.
 *
 * 0.2 plutôt que les 0.3 du narratif : on ne cherche pas de la variété d'écriture mais
 * une verbalisation fidèle de chiffres déjà calculés.
 *
 * 1400 tokens pour ~7 × 45 mots (≈ 500 tokens) : la marge est volontairement large.
 * Sous `response_format: json_object`, un budget trop court ne tronque pas la dernière
 * phrase — il rend un JSON invalide, et fait donc perdre les SEPT clés.
 */
const TEMPERATURE = 0.2;
const MAX_TOKENS = 1400;

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export interface GenerateOptions {
  /** NEXT_PUBLIC_DEBUG : court-circuite le cache et renvoie le payload envoyé au modèle. */
  debug?: boolean;
  /** Code INSEE de l'URL — sert à distinguer un arrondissement d'une commune. */
  codeInsee?: string;
}

function emptyResult(debugInput?: unknown): CardInsightsDto {
  return {
    insights: {},
    generatedAt: new Date().toISOString(),
    cached: false,
    ...(debugInput !== undefined ? { debugInput } : {}),
  };
}

/**
 * Produit les mini-synthèses des cards en un seul appel au modèle.
 *
 * Ne lève jamais. Toute défaillance — clé absente, quota épuisé, JSON illisible, base
 * indisponible — se traduit par un résultat vide : les cards s'affichent alors sans
 * phrase, c'est-à-dire exactement comme avant cette fonctionnalité. C'est ce qui permet
 * à la route de répondre 200 en toute circonstance, au lieu du 500 non catché que
 * produisait l'ancien pipeline quand la clé API manquait.
 */
export class CardInsightsService {
  private readonly cache = new CardInsightsCacheProvider();
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    this.model = process.env.MISTRAL_MODEL?.trim() || DEFAULT_MODEL;
    // L'API visée est un /chat/completions compatible OpenAI : pointer un autre
    // fournisseur (ou un modèle local) ne demande qu'une variable d'environnement.
    this.baseUrl = (process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async generate(data: LocationAnalysisDto, options: GenerateOptions = {}): Promise<CardInsightsDto> {
    const input = buildCardInsightsInput(data, options.codeInsee);
    const expected = expectedKeys(input);
    const debugInput = options.debug ? input : undefined;

    // Aucune card à commenter : inutile de déranger le modèle.
    if (expected.length === 0) return emptyResult(debugInput);

    const fixture = process.env.CARD_INSIGHTS_FIXTURE?.trim();
    if (fixture) {
      // `slow` ajoute la latence qui manque pour juger le fondu à l'écran : sans elle,
      // les phrases arrivent trop vite pour qu'on voie quoi que ce soit.
      if (fixture === "slow") await new Promise((resolve) => setTimeout(resolve, 1200));
      const insights: CardInsights = {};
      for (const key of expected) {
        const text = CARD_INSIGHTS_FIXTURE[key];
        if (text) insights[key] = text;
      }
      return { insights, generatedAt: new Date().toISOString(), cached: false, ...(debugInput !== undefined ? { debugInput } : {}) };
    }

    const geoKey = buildGeoKey(data.map.center.lat, data.map.center.lon);

    if (!options.debug) {
      const cached = await this.cache.get(geoKey, data.mode, this.model);
      if (cached) {
        return { insights: cached.insights, generatedAt: cached.generatedAt, cached: true };
      }
    }

    const apiKey = (process.env.LLM_API_KEY || process.env.MISTRAL_API_KEY)?.trim();
    if (!apiKey) {
      console.warn("[card-insights] no API key configured — skipping generation.");
      return emptyResult(debugInput);
    }

    let insights: CardInsights;
    try {
      insights = await this.callModel(apiKey, buildCardInsightsUserPrompt(input, expected), expected);
    } catch (err) {
      console.warn("[card-insights] generation failed:", err);
      return emptyResult(debugInput);
    }

    if (!options.debug) {
      await this.cache.set(geoKey, data.mode, this.model, insights);
    }

    return {
      insights,
      generatedAt: new Date().toISOString(),
      cached: false,
      ...(debugInput !== undefined ? { debugInput } : {}),
    };
  }

  private async callModel(
    apiKey: string,
    userPrompt: string,
    expected: readonly CardInsightKey[],
  ): Promise<CardInsights> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: CARD_INSIGHTS_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`LLM ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await response.json()) as ChatResponse;
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) throw new Error("Réponse LLM vide.");
    return parseCardInsightsJson(raw, expected);
  }
}

let singleton: CardInsightsService | null = null;

export function getCardInsightsService(): CardInsightsService {
  if (!singleton) singleton = new CardInsightsService();
  return singleton;
}
