import type { RiskCategory } from "../domain/risk.types";
import type { RiskProvider, RiskScope } from "./risk.provider";
import { InMemoryCache, buildGeoKey } from "../../../server-shared/infrastructure/cache/in-memory-cache";

const ONE_DAY = 24 * 60 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

interface RisqueDto {
  present: boolean;
  libelle: string;
  libelleStatutCommune: string | null;
  libelleStatutAdresse: string | null;
  specifique: unknown;
}

interface GeorisquesRapportResponse {
  adresse: {
    libelle: string;
    longitude: number;
    latitude: number;
  };
  commune: {
    libelle: string;
    codePostal: string;
    codeInsee: string;
  };
  risquesNaturels: {
    inondation: RisqueDto;
    remonteeNappe: RisqueDto;
    risqueCotier: RisqueDto;
    seisme: RisqueDto;
    mouvementTerrain: RisqueDto;
    reculTraitCote: RisqueDto;
    retraitGonflementArgile: RisqueDto;
    avalanche: RisqueDto;
    feuForet: RisqueDto;
    eruptionVolcanique: RisqueDto;
    cyclone: RisqueDto;
    radon: RisqueDto;
  };
  risquesTechnologiques: {
    icpe: RisqueDto;
    nucleaire: RisqueDto;
    canalisationsMatieresDangereuses: RisqueDto;
    pollutionSols: RisqueDto;
    ruptureBarrage: RisqueDto;
    risqueMinier: RisqueDto;
  };
}

/**
 * Risk provider using Géorisques API v1
 * Uses the comprehensive report endpoint for a single-call risk assessment
 * API doc: https://www.georisques.gouv.fr/doc-api
 * Rate limit: 1 call/s on resultats_rapport_risque
 */
export class GeorisquesRiskProvider implements RiskProvider {
  private static cache = new InMemoryCache<RiskCategory[]>(ONE_DAY);
  private static fallbackCache = new InMemoryCache<RiskCategory[]>(FIVE_MINUTES);
  private readonly baseUrl = "https://www.georisques.gouv.fr/api/v1";

  private readonly riskLabels: Record<string, string> = {
    inondation: "Risque d'inondation",
    remonteeNappe: "Remontée de nappe",
    risqueCotier: "Risque côtier",
    seisme: "Risque sismique",
    mouvementTerrain: "Mouvements de terrain",
    reculTraitCote: "Recul du trait de côte",
    retraitGonflementArgile: "Retrait-gonflement des argiles",
    avalanche: "Risque d'avalanche",
    feuForet: "Feu de forêt",
    eruptionVolcanique: "Éruption volcanique",
    cyclone: "Cyclone",
    radon: "Exposition au radon",
    icpe: "Installation classée (ICPE)",
    nucleaire: "Risque nucléaire",
    canalisationsMatieresDangereuses: "Canalisations dangereuses",
    pollutionSols: "Pollution des sols",
    ruptureBarrage: "Rupture de barrage",
    risqueMinier: "Risque minier",
  };

  async getLocationRisks(
    lat: number,
    lon: number,
    scope: RiskScope = "adresse",
  ): Promise<RiskCategory[]> {
    // L'échelle entre dans la clé : les deux lectures du même point ne donnent pas la
    // même liste, et une page de ville ne doit pas servir le cache d'une analyse
    // d'adresse voisine.
    const cacheKey = `${buildGeoKey(lat, lon)}:${scope}`;
    const cached = GeorisquesRiskProvider.cache.get(cacheKey);
    if (cached) return cached;
    const recentFallback = GeorisquesRiskProvider.fallbackCache.get(cacheKey);
    if (recentFallback) return recentFallback;

    try {
      const response = await fetch(
        `${this.baseUrl}/resultats_rapport_risque?latlon=${lon},${lat}`,
        {
          headers: { Accept: "application/json" },
          // Le Data Cache de Next survit au redéploiement, là où le cache mémoire
          // ci-dessus est propre au processus — c'est lui qui borne réellement le
          // nombre d'appels à une API limitée à un par seconde.
          next: { revalidate: 86400 },
        },
      );

      if (!response.ok) {
        console.warn(`Géorisques API error: ${response.status} ${response.statusText}`);
        return this.cachedFallback(cacheKey);
      }

      const data = (await response.json()) as GeorisquesRapportResponse;
      const result = this.parseRapport(data, scope);
      GeorisquesRiskProvider.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("Géorisques API error, using fallback:", error);
      return this.cachedFallback(cacheKey);
    }
  }

  /**
   * Le repli, mémorisé quelques minutes seulement.
   *
   * Sans cela, une panne prolongée fait refrapper l'API à chaque requête et alimente
   * elle-même le throttling. Quelques minutes suffisent à casser ce martèlement sans
   * figer « Non renseigné » comme le ferait le TTL de 24 h des réponses valides.
   */
  private cachedFallback(cacheKey: string): RiskCategory[] {
    const fallback = this.getDefaultRisks();
    GeorisquesRiskProvider.fallbackCache.set(cacheKey, fallback);
    return fallback;
  }

  private parseRapport(data: GeorisquesRapportResponse, scope: RiskScope): RiskCategory[] {
    const entries: Array<{ category: RiskCategory; raw: RisqueDto }> = [];

    for (const [code, risque] of Object.entries(data.risquesNaturels)) {
      entries.push({ category: this.mapRisque(code, risque, scope), raw: risque });
    }
    for (const [code, risque] of Object.entries(data.risquesTechnologiques)) {
      entries.push({ category: this.mapRisque(code, risque, scope), raw: risque });
    }

    // On ne remonte que les risques qui concernent le lieu.
    //
    // Une liste de six risques clés était auparavant conservée même absente, pour
    // pouvoir afficher « Pas de risque d'inondation identifié ». Ces lignes ne sont plus
    // affichées : la card ne montrerait qu'une pastille « Absent » sans rien à en dire,
    // et la place est mieux employée par les risques réellement présents.
    return entries
      .filter(({ category, raw }) => {
        // BRGM marque "Risque non Concerne" quand le risque ne s'applique pas à cette
        // adresse — même motif de retrait que `present: false`, dit autrement.
        if (this.isNotApplicable(raw, scope)) return false;
        return category.level !== "absent";
      })
      .map(({ category }) => category);
  }

  private isNotApplicable(risque: RisqueDto, scope: RiskScope): boolean {
    // Même règle de lecture que `resolveLevel` : à l'échelle de la commune, le statut
    // d'adresse ne décide de rien.
    const statut = (
      scope === "commune"
        ? risque.libelleStatutCommune
        : (risque.libelleStatutAdresse ?? risque.libelleStatutCommune)
    ) ?? "";
    return statut.toLowerCase().includes("non concerne") || statut.toLowerCase().includes("non concerné");
    return statut.includes("non concerne") || statut.includes("non concerné");
  }

  private mapRisque(code: string, risque: RisqueDto, requested: RiskScope): RiskCategory {
    const name = this.riskLabels[code] ?? code;
    const { level, scope } = this.resolveLevel(risque, requested);

    return {
      code,
      name,
      level,
      message: this.buildMessage(name, level, scope, risque, requested),
    };
  }

  /**
   * Gravité d'un statut Géorisques, ou `"inconnu"` quand il n'en énonce aucune.
   *
   * L'API ne gradue qu'une partie des risques : « Risque Existant - important » porte
   * une gravité, « Risque Existant » et « Risque Concerne » n'en portent aucune. Ces
   * deux derniers valent donc « présent » — le risque concerne bien l'adresse, mais
   * le dire « faible », comme le faisait la version précédente, était une affirmation
   * que la source ne soutient pas.
   */
  private gradeFromStatut(statut: string | null): RiskCategory["level"] {
    const s = (statut ?? "").toLowerCase();
    if (!s) return "inconnu";
    // Avant tout le reste : « non Concerne » contient « concerne ».
    if (s.includes("non concerne") || s.includes("non concerné")) return "absent";
    if (s.includes("non connu") || s.includes("non connue")) return "inconnu";
    if (s.includes("élevé") || s.includes("important") || s.includes("fort")) return "élevé";
    if (s.includes("modéré") || s.includes("moyen")) return "modéré";
    if (s.includes("faible")) return "faible";
    return "présent";
  }

  /**
   * Niveau retenu, et l'échelle dont il provient.
   *
   * Géorisques publie deux statuts, l'un à l'adresse et l'autre à la commune. La
   * version précédente prenait l'adresse et s'arrêtait là — ce qui jetait des données
   * connues : au 11 rue de l'Église (Paris 15e), le retrait-gonflement des argiles est
   * « non Connu » à l'adresse et « Risque Existant - important » sur la commune. On
   * retombe donc sur la commune quand l'adresse ne dit rien, et le message le précise :
   * une gravité communale n'est pas une gravité à la parcelle.
   */
  private resolveLevel(
    risque: RisqueDto,
    requested: RiskScope,
  ): {
    level: RiskCategory["level"];
    scope: "adresse" | "commune";
  } {
    if (!risque.present) return { level: "absent", scope: requested };

    // Lecture demandée à la commune : le statut d'adresse décrit un point pris au centre
    // de la ville, il ne dit rien de la ville. On saute donc la branche adresse.
    if (requested === "commune") {
      const atCommune = this.gradeFromStatut(risque.libelleStatutCommune);
      return atCommune !== "inconnu"
        ? { level: atCommune, scope: "commune" }
        : { level: "inconnu", scope: "commune" };
    }

    const atAddress = this.gradeFromStatut(risque.libelleStatutAdresse);
    if (atAddress !== "inconnu") return { level: atAddress, scope: "adresse" };

    const atCommune = this.gradeFromStatut(risque.libelleStatutCommune);
    if (atCommune !== "inconnu") return { level: atCommune, scope: "commune" };

    return { level: "inconnu", scope: "adresse" };
  }

  private buildMessage(
    name: string,
    level: RiskCategory["level"],
    scope: "adresse" | "commune",
    risque: RisqueDto,
    requested: RiskScope,
  ): string {
    if (level === "absent") {
      return `Pas de ${name.toLowerCase()} identifié sur ce secteur.`;
    }

    const detail =
      (scope === "commune" ? risque.libelleStatutCommune : risque.libelleStatutAdresse) ?? "";
    const suffix = detail ? ` (${detail})` : "";
    // Dire d'où vient la gravité : à l'échelle de la commune, elle ne se transpose pas
    // telle quelle à la parcelle. Mention inutile quand la commune est justement
    // l'échelle demandée — sur une page de ville, c'est la bonne portée, pas un pis-aller.
    const portee =
      scope === "commune" && requested === "adresse"
        ? ", à l'échelle de la commune — non établi à l'adresse"
        : "";

    // Le message ne reprend pas le nom du risque : l'écran comme le PDF l'affichent déjà
    // à côté de la pastille. L'omettre évite au passage un accord impossible à tenir —
    // « Remontée de nappe signalé », « Canalisations dangereuses signalé » — puisque les
    // libellés sont tantôt masculins, tantôt féminins, tantôt pluriels.
    switch (level) {
      case "élevé":
        return `⚠️ Niveau élevé${portee}${suffix}. Étude spécialisée recommandée.`;
      case "modéré":
        return `Niveau modéré${portee}${suffix}. À investiguer avant décision.`;
      case "présent":
        return `Signalé par Géorisques${portee}${suffix}, sans gravité publiée : à vérifier avant décision.`;
      case "faible":
        return `Niveau faible${portee}${suffix}.`;
      case "inconnu":
        return `Non renseigné par Géorisques à cette adresse. À vérifier sur georisques.gouv.fr.`;
    }
  }

  /**
   * Repli quand l'appel échoue — ce qui arrive : l'endpoint est limité à un appel par
   * seconde.
   *
   * Niveau « inconnu » et non « faible ». Ce repli affichait un risque faible sur les
   * trois catégories clés tout en annonçant dans son message que la donnée manquait :
   * une panne d'API se lisait comme une bonne nouvelle. Il n'est jamais mis en cache,
   * donc un rechargement retente l'appel.
   */
  private getDefaultRisks(): RiskCategory[] {
    const message =
      "Données Géorisques indisponibles — vérifier manuellement sur georisques.gouv.fr.";
    return [
      { code: "inondation", name: "Risque d'inondation", level: "inconnu", message },
      { code: "seisme", name: "Risque sismique", level: "inconnu", message },
      {
        code: "retraitGonflementArgile",
        name: "Retrait-gonflement des argiles",
        level: "inconnu",
        message,
      },
    ];
  }
}
