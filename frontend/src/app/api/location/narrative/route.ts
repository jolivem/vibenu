import { NextRequest, NextResponse } from "next/server";
import type { LocationAnalysisDto } from "@/server-shared/types/location-analysis.dto";
import { NarrativeService } from "@/server-modules/narrative/application/narrative.service";
import { MistralNarrativeProvider } from "@/server-modules/narrative/infrastructure/mistral-narrative.provider";
import { NarrativeCacheRepository } from "@/server-modules/narrative/infrastructure/narrative-cache.repository";

const DEFAULT_MODEL = "mistral-small-latest";

let service: NarrativeService | null = null;

function getService(): NarrativeService {
  if (!service) {
    const model = process.env.MISTRAL_MODEL ?? DEFAULT_MODEL;
    service = new NarrativeService(
      new MistralNarrativeProvider({ model }),
      new NarrativeCacheRepository({ model }),
    );
  }
  return service;
}

export async function POST(request: NextRequest) {
  let body: LocationAnalysisDto;
  try {
    body = (await request.json()) as LocationAnalysisDto;
  } catch {
    return NextResponse.json(
      { message: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  if (!body?.address?.label || !body?.map?.center) {
    return NextResponse.json(
      { message: "Données d'analyse incomplètes." },
      { status: 400 },
    );
  }

  const debug = process.env.NEXT_PUBLIC_DEBUG === "true";

  try {
    const result = await getService().generate(body, { debug });
    return NextResponse.json(result);
  } catch (error) {
    console.warn("Narrative generation failed:", error);
    return NextResponse.json(
      { message: "La synthèse n'a pas pu être générée." },
      { status: 502 },
    );
  }
}
