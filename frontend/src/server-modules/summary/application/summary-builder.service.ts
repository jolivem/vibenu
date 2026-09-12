import type { SummaryService } from "./summary.service";
import type { SummaryInput } from "../domain/summary.types";
import type { SummaryDto } from "../../../server-shared/types/location-analysis.dto";

/** En dessous, la médiane DVF locale repose sur trop peu de ventes pour servir de repère. */
const MIN_TRANSACTIONS_LISIBLES = 10;

export class SummaryBuilderService implements SummaryService {
  build(input: SummaryInput): SummaryDto {
    const strengths: string[] = [];
    const warnings: string[] = [];

    // Mobilité
    if (input.mobilityLabel === "très bon" || input.mobilityLabel === "bon") {
      strengths.push("Bonne desserte en transports");
    } else if (input.mobilityLabel === "correct") {
      strengths.push("Accès correct aux transports du quotidien");
    } else {
      warnings.push("Desserte en transports limitée");
    }

    // Risques — `switch` exhaustif : l'ajout d'un niveau ne compilera pas sans passer
    // ici, ce qui évite de reconduire le « tout le reste est élevé » d'avant.
    switch (input.riskLevel) {
      case "faible":
        strengths.push("Profil de risque plutôt favorable");
        break;
      case "présent":
        warnings.push("Risques signalés à cette adresse, sans gravité publiée — à vérifier");
        break;
      case "modéré":
        warnings.push("Quelques risques modérés à vérifier avant engagement");
        break;
      case "élevé":
        warnings.push("Risques élevés identifiés — étude spécialisée recommandée");
        break;
      case "inconnu":
        warnings.push("Risques non renseignés pour cette adresse — à vérifier sur georisques.gouv.fr");
        break;
    }

    // Immobilier
    if ((input.realEstateTransactionsCount ?? 0) >= MIN_TRANSACTIONS_LISIBLES) {
      strengths.push("Contexte immobilier local relativement lisible");
    } else {
      warnings.push("Peu de repères immobiliers exploitables dans la zone proche");
    }

    const shortText = `${input.addressLabel} présente un profil utile pour une première analyse. Les indicateurs doivent être confirmés avant signature.`;

    return {
      strengths,
      warnings,
      shortText,
    };
  }
}
