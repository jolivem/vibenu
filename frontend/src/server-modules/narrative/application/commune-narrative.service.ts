import type {
  CommuneLegendes,
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
 * Légendes factices, activées par COMMUNE_LEGENDS_FIXTURE.
 *
 * Elles s'ajoutent au contenu sans le remplacer, y compris à une entrée servie par le
 * cache : on peut donc juger le rendu des légendes sans régénérer l'éditorial, ni
 * appeler le fournisseur. Une clé est volontairement absente — "legende_air" — pour que
 * le chemin « section rendue sans légende » reste visible à chaque essai.
 */
const LEGENDS_FIXTURE: CommuneLegendes = {
  legende_prix: "Le prix au mètre carré dépasse d'environ un cinquième la moyenne de la ville, et il progresse plus vite qu'elle depuis deux ans.",
  legende_demographie: "La population est plus jeune et plus aisée que la moyenne française, avec une nette sur-représentation des 30-44 ans.",
  legende_equipements: "La densité de commerces et de services de santé se situe au-dessus de la moyenne de la ville ; les équipements sportifs sont en revanche moins nombreux.",
  legende_elections: "La participation a dépassé de quelques points la moyenne nationale, et le vote s'est porté nettement plus à gauche qu'en France.",
};

function withFixtureLegends(content: CommuneNarrativeContent): CommuneNarrativeContent {
  const flag = process.env.COMMUNE_LEGENDS_FIXTURE?.trim();
  if (!flag) return content;
  return { ...content, legendes: { ...LEGENDS_FIXTURE, ...content.legendes } };
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
        content: withFixtureLegends(cached.content),
        model: this.model,
        generatedAt: cached.generatedAt,
        fromCache: true,
      };
    }

    // 2. génération
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    if (!apiKey) {
      return this.stale(input, "aucune clé API configurée");
    }

    let content: CommuneNarrativeContent;
    try {
      content = await this.generate(apiKey, input);
    } catch (err) {
      console.warn("[commune-narrative] generation failed:", err);
      return this.stale(input, "génération en échec");
    }

    try {
      await this.cache.set(input.codeCommune, this.model, content);
    } catch (err) {
      console.warn("[commune-narrative] cache write failed:", err);
    }

    return {
      content: withFixtureLegends(content),
      model: this.model,
      generatedAt: new Date().toISOString(),
      fromCache: false,
    };
  }

  /**
   * Repli sur la dernière narrative connue quand la régénération est impossible.
   *
   * Sert le cas qui arrive à chaque bump de `COMMUNE_PROMPT_VERSION` : le cache courant
   * est vide par construction, et si le fournisseur est indisponible au même moment,
   * toutes les pages perdraient d'un coup leur seul contenu rédactionnel. On préfère un
   * texte d'une version antérieure — donc sans ses légendes — à une page vide.
   */
  private async stale(
    input: CommuneNarrativeInput,
    raison: string,
  ): Promise<CommuneNarrativeResult | null> {
    let previous: Awaited<ReturnType<CommuneNarrativeCacheProvider["getStale"]>> = null;
    try {
      previous = await this.cache.getStale(input.codeCommune, this.model);
    } catch (err) {
      console.warn("[commune-narrative] stale lookup failed:", err);
    }

    if (!previous) return null;

    console.warn(
      `[commune-narrative] ${input.codeCommune} : ${raison}, repli sur une version antérieure du cache.`,
    );
    return {
      content: withFixtureLegends(previous.content),
      model: this.model,
      generatedAt: previous.generatedAt,
      fromCache: true,
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
        // ~800 tokens d'éditorial + ~280 de légendes + l'échappement JSON. La marge est
        // volontaire : sous `json_object`, une troncature ne coûte pas la dernière
        // phrase mais la totalité des clés, donc la page entière.
        max_tokens: 2400,
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
