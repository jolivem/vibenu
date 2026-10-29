import type { AddressProvider } from "../../address/infrastructure/address.provider";
import type { CommuneContourProvider } from "../../address/infrastructure/commune-contour.provider";
import type { MobilityService } from "../../mobility/application/mobility.service";
import type { RiskService } from "../../risks/application/risk.service";
import type { RealEstateService } from "../../real-estate/application/real-estate.service";
import type { AirQualityService } from "../../air-quality/application/air-quality.service";
import type { NeighborhoodService } from "../../neighborhood/application/neighborhood.service";
import type { SummaryService } from "../../summary/application/summary.service";
import type { CadastreService } from "../../cadastre/application/cadastre.service";
import type { DemographicsService } from "../../demographics/application/demographics.service";
import type { ElectionsService } from "../../elections/application/elections.service";
import type { ClimateService } from "../../climate/application/climate.service";
import type { SchoolSectorService } from "../../school-sector/application/school-sector.service";
import type { SecurityService } from "../../security/application/security.service";
import type { LocalTaxService } from "../../local-tax/application/local-tax.service";
import type { RentsService } from "../../rents/application/rents.service";
import type { EnergyService } from "../../energy/application/energy.service";
import type { SchoolsService } from "../../schools/application/schools.service";
import type { CommuneEquipmentService } from "../../commune-equipment/application/commune-equipment.service";
import type { AnalyzeLocationInput, LocationAnalysisService } from "./location-analysis.service";
import type { FloodWindow } from "../../risks/domain/risk.types";
import type {
  AnalysisMode,
  GeoJsonGeometryDto,
  LocationAnalysisDto,
} from "../../../server-shared/types/location-analysis.dto";

const METERS_PER_DEGREE_LAT = 111_320;

/**
 * Durée de chaque source, affichée dans la console du serveur quand `ANALYZE_TIMINGS=1` :
 * pour trouver celle qui retient l'analyse (elle attend la plus lente). Muet sinon.
 */
const TIMINGS = process.env.ANALYZE_TIMINGS === "1";

function timed<T>(label: string, promise: Promise<T>): Promise<T> {
  if (!TIMINGS) return promise;
  const start = Date.now();
  return promise.finally(() => console.info(`[analyze] ${label} : ${Date.now() - start} ms`));
}

/**
 * Rayon de la fenêtre interrogée pour les zonages PPR, en mode adresse.
 *
 * 6 km couvrent largement ce que la carte montre au zoom d'arrivée (~5,7 km de large sur
 * un écran large) et laissent de la marge pour dézoomer d'un cran sans requête nouvelle.
 */
const FLOOD_RADIUS_M = 6_000;

/** Demi-côté maximal en mode commune : Arles fait 759 km², la fenêtre doit rester bornée. */
const FLOOD_COMMUNE_MAX_HALF_SPAN_M = 10_000;

/**
 * Une fenêtre en degrés autour d'un point, de rayon **métrique**.
 *
 * Le facteur `cos(latitude)` n'est pas une coquetterie : une boîte de ±0,035° fait 7,8 km
 * de haut mais seulement 5,1 km de large à la latitude de Paris. Sans lui, la fenêtre est
 * un tiers trop étroite là où la France est la plus peuplée.
 */
function windowAround(lat: number, lon: number, radiusM: number): FloodWindow {
  const dLat = radiusM / METERS_PER_DEGREE_LAT;
  const dLon = radiusM / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

/**
 * La fenêtre d'une commune : l'emprise de son contour, élargie au minimum puis bornée.
 *
 * Une boîte fixe autour du centroïde laisserait des pans entiers d'une grande commune sans
 * zonage affiché, alors que le contour est déjà chargé — autant s'en servir.
 *
 * Les deux bornes règlent chacune un travers observé :
 * - **le plancher**, parce que l'emprise d'une petite commune est plus étroite que la
 *   fenêtre d'une adresse : Saint-Cyr-l'École ne rendait que 2 des 4 zonages que la même
 *   commune montre en mode adresse. La vue d'ensemble ne doit pas être plus pauvre que la
 *   vue rapprochée, et une rivière ne s'arrête pas à la limite communale ;
 * - **le plafond**, pour qu'une commune démesurée — Arles fait 759 km² — ne fasse pas
 *   exploser la requête.
 */
function windowForContour(contour: GeoJsonGeometryDto, lat: number, lon: number): FloodWindow {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [x, y] = coords as [number, number];
      if (x < west) west = x;
      if (x > east) east = x;
      if (y < south) south = y;
      if (y > north) north = y;
      return;
    }
    for (const c of coords) visit(c);
  };
  visit(contour.coordinates);

  if (!Number.isFinite(west)) return windowAround(lat, lon, FLOOD_RADIUS_M);

  const midLat = (south + north) / 2;
  const midLon = (west + east) / 2;
  const min = windowAround(midLat, midLon, FLOOD_RADIUS_M);
  const max = windowAround(midLat, midLon, FLOOD_COMMUNE_MAX_HALF_SPAN_M);
  return [
    Math.max(Math.min(west, min[0]), max[0]),
    Math.max(Math.min(south, min[1]), max[1]),
    Math.min(Math.max(east, min[2]), max[2]),
    Math.min(Math.max(north, min[3]), max[3]),
  ];
}

interface Dependencies {
  addressProvider: AddressProvider;
  communeContourProvider: CommuneContourProvider;
  mobilityService: MobilityService;
  riskService: RiskService;
  realEstateService: RealEstateService;
  airQualityService: AirQualityService;
  neighborhoodService: NeighborhoodService;
  summaryService: SummaryService;
  cadastreService: CadastreService;
  demographicsService: DemographicsService;
  electionsService: ElectionsService;
  climateService: ClimateService;
  schoolSectorService: SchoolSectorService;
  securityService: SecurityService;
  localTaxService: LocalTaxService;
  rentsService: RentsService;
  energyService: EnergyService;
  schoolsService: SchoolsService;
  communeEquipmentService: CommuneEquipmentService;
}

export class LocationAnalysisUseCase implements LocationAnalysisService {
  constructor(private readonly dependencies: Dependencies) {}

  async analyze(input: AnalyzeLocationInput): Promise<LocationAnalysisDto> {
    return this.execute(input);
  }

  async execute(input: AnalyzeLocationInput): Promise<LocationAnalysisDto> {
    // Resolve address first — we need codeInsee for DVF
    const addressDetails = await timed("geocodage_inverse", this.dependencies.addressProvider.reverseGeocode(input.lat, input.lon));
    const codeInsee = addressDetails?.citycode;
    const contourCitycode = input.citycode ?? codeInsee;

    const mode: AnalysisMode = input.type === "municipality" ? "commune" : "address";

    // Le contour commune est affiché UNIQUEMENT en mode commune.
    // En mode adresse, on ne montre que la parcelle cadastrale — pas l'arrondissement
    // ni la commune (qui surchargeraient la carte sans valeur informative).
    const contourPromise =
      mode === "commune" && contourCitycode
        ? this.dependencies.communeContourProvider.getContour(contourCitycode)
        : Promise.resolve(null);

    // En mode commune, on n'affiche pas la parcelle au centroïde
    // (elle ne représente rien pour l'utilisateur qui regarde le territoire entier).
    const cadastrePromise =
      mode === "commune"
        ? Promise.resolve({ parcel: null, urbanZone: null, prescriptions: [] })
        : this.dependencies.cadastreService.getCadastreData(input.lat, input.lon);

    // Idem pour le voisinage (POIs autour d'un point) : pas pertinent pour une commune entière.
    const neighborhoodPromise =
      mode === "commune"
        ? Promise.resolve({ pois: [], label: "", counts: null })
        : this.dependencies.neighborhoodService.getNeighborhoodData(input.lat, input.lon);

    // Carte scolaire : uniquement en mode adresse (le point au centroïde d'une commune
    // ne correspond pas à une vraie résidence et tomberait sur un secteur arbitraire).
    const schoolSectorPromise =
      mode === "commune"
        ? Promise.resolve(null)
        : this.dependencies.schoolSectorService.getCollegeSector(input.lat, input.lon);

    // Le pendant du voisinage en mode commune : les équipements de la commune entière,
    // comptés sur le code de la commune cherchée et non sur celui du centroïde.
    const communeEquipmentPromise =
      mode === "commune" && contourCitycode
        ? this.dependencies.communeEquipmentService.getCommuneEquipment(contourCitycode)
        : Promise.resolve(null);

    // Les zonages PPR, sur une fenêtre et non sur un point : la carte montre les zones
    // *autour* de l'adresse, pas seulement celle qui la contient. En mode commune, la
    // fenêtre suit le contour — d'où le chaînage sur `contourPromise`, créée plus haut.
    const floodZonesPromise = (
      mode === "commune"
        ? contourPromise.then((contour) =>
            contour
              ? windowForContour(contour, input.lat, input.lon)
              : windowAround(input.lat, input.lon, FLOOD_RADIUS_M),
          )
        : Promise.resolve(windowAround(input.lat, input.lon, FLOOD_RADIUS_M))
    ).then((window) => this.dependencies.riskService.getFloodZones(window));

    // Collèges et lycées : autour du point en mode adresse, ceux de la commune cherchée
    // en mode commune (même code que les équipements).
    // Chaînée sur la carte scolaire, pour situer le collège de secteur dans la liste.
    const schoolsPromise = schoolSectorPromise.then((sector) =>
      this.dependencies.schoolsService.getNearbySchools(input.lat, input.lon, {
        codeCommune: mode === "commune" ? contourCitycode : undefined,
        sectorCollege: sector?.nomEtablissement ?? null,
      }),
    );

    const [mobility, risks, realEstate, airQuality, neighborhood, cadastre, demographics, communeContour, elections, climate, schoolSector, security, municipales, communeEquipment, floodZones, localTax, rents, schools, energy] =
      await Promise.all([
        timed("mobilite", this.dependencies.mobilityService.getMobilityData(input.lat, input.lon)),
        // Le code sert l'historique des catastrophes naturelles : celui de la commune cherchée
        // en mode commune, comme pour la fiscalité.
        timed("risques", this.dependencies.riskService.getRiskData(
          input.lat, input.lon, undefined, mode === "commune" ? contourCitycode : codeInsee,
        )),
        timed("dvf", this.dependencies.realEstateService.getMarketData(input.lat, input.lon, codeInsee, { mode })),
        timed("air", this.dependencies.airQualityService.getAirQualityData(input.lat, input.lon)),
        timed("voisinage", neighborhoodPromise),
        timed("cadastre", cadastrePromise),
        timed("demographie", this.dependencies.demographicsService.getDemographicsData(input.lat, input.lon)),
        timed("contour", contourPromise),
        timed("presidentielle", this.dependencies.electionsService.getElectionsData(codeInsee)),
        timed("climat", this.dependencies.climateService.getClimateData(input.lat, input.lon)),
        timed("secteur_scolaire", schoolSectorPromise),
        timed("securite", this.dependencies.securityService.getSecurityData(codeInsee)),
        timed("municipales", this.dependencies.electionsService.getMunicipalesData(codeInsee)),
        timed("equipements", communeEquipmentPromise),
        timed("zones_inondables", floodZonesPromise),
        // Comme les équipements : la commune cherchée, pas celle où tombe le centroïde.
        timed("fiscalite", this.dependencies.localTaxService.getLocalTax(mode === "commune" ? contourCitycode : codeInsee)),
        // Même code que la fiscalité ; la carte « alentour » se centre sur le point analysé.
        timed("loyers", this.dependencies.rentsService.getRents(mode === "commune" ? contourCitycode : codeInsee, input.lat, input.lon)),
        timed("ecoles", schoolsPromise),
        // DPE : mode adresse seulement — la card parle d'abord de l'adresse ; en mode commune
        // il ne resterait que deux barres (commune, France), sans intérêt pour un logement.
        timed("dpe", mode === "commune"
          ? Promise.resolve(null)
          : this.dependencies.energyService.getEnergy({
              lat: input.lat,
              lon: input.lon,
              codeCommune: codeInsee,
              mode,
              // Type absent (lien ancien ou partagé) : on tente, la tolérance de 2 m tranche.
              atAddress: input.type === "housenumber" || input.type === undefined,
            })),
      ]);


    const address = {
      label: input.label ?? addressDetails?.label ?? `${input.lat}, ${input.lon}`,
      city: input.city ?? addressDetails?.city ?? "Inconnue",
      postcode: input.postcode ?? addressDetails?.postcode ?? "",
      latitude: input.lat,
      longitude: input.lon,
    };

    const summary = this.dependencies.summaryService.build({
      mobilityLabel: mobility.label,
      riskLevel: risks.level,
      realEstateTransactionsCount: realEstate.nearbyTransactionsCount,
      addressLabel: address.label,
    });

    return {
      mode,
      address,
      map: {
        center: { lat: input.lat, lon: input.lon },
        zoom: 14,
        ...(communeContour ? { communeContour } : {}),
      },
      mobility,
      risks: { ...risks, floodZones },
      realEstate,
      airQuality,
      neighborhood,
      demographics,
      cadastre,
      summary,
      elections,
      climate,
      schoolSector,
      security,
      municipales,
      communeEquipment,
      localTax,
      rents,
      schools,
      energy,
    };
  }
}
