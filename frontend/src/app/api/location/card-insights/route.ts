import { NextRequest, NextResponse } from "next/server";
import { getCardInsightsService } from "@/server-modules/narrative/application/card-insights.service";
import type { LocationAnalysisDto } from "@/server-shared/types/location-analysis.dto";

/**
 * Mini-synthèses des cards, en un appel.
 *
 * Le corps est le `LocationAnalysisDto` complet, renvoyé tel quel par le client : c'est
 * un second aller-retour, déclenché une fois l'analyse affichée, et le serveur ne
 * conserve rien entre les deux.
 *
 * La route ne répond jamais autre chose que 200 ou 400. Le service ne lève pas : une
 * clé absente, un quota épuisé ou un JSON illisible donnent un objet vide, et les cards
 * s'affichent sans phrase. C'est délibérément différent de l'ancienne route « Synthèse »,
 * dont le service était construit hors du try : sans clé API, le constructeur levait et
 * la route rendait un 500.
 */
export async function POST(request: NextRequest) {
  let body: LocationAnalysisDto;
  try {
    body = (await request.json()) as LocationAnalysisDto;
  } catch {
    return NextResponse.json({ message: "Corps de requête invalide." }, { status: 400 });
  }

  if (!body?.address?.label || !body?.map?.center) {
    return NextResponse.json({ message: "Données d'analyse incomplètes." }, { status: 400 });
  }

  const debug = process.env.NEXT_PUBLIC_DEBUG === "true";
  const codeInsee = request.nextUrl.searchParams.get("citycode") ?? undefined;

  const result = await getCardInsightsService().generate(body, { debug, codeInsee });
  return NextResponse.json(result);
}
