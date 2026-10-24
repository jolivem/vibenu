import type { AnalysisMode, MobilityAnalysisDto } from "@/types/location-analysis";
import type { MobilityMessages } from "@/i18n/messages/fr/analysis/mobility";
import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";
import { mobilityView } from "./mobilityModel";
import { formatProximity } from "./proximityFormat";
import { CardDetailToggle, useCardDetail } from "./readingMode";

/** Mode « L'essentiel » : les arrêts et les gares les plus proches seulement. */
const ESSENTIAL_STOPS = 3;
const ESSENTIAL_STATIONS = 2;

interface Props {
  mobility: MobilityAnalysisDto;
  /** Mode d'analyse — en "commune", on masque distances/temps (mesurés depuis le centroïde). */
  mode: AnalysisMode;
  m: MobilityMessages;
  /** Temps de marche et distances, partagés avec la section « À proximité ». */
  nearby: NearbyMessages;
}

export function MobilityCard({ mobility, mode, m, nearby }: Props) {
  const { isCommune, stops: allStops, stations: allStations, stationsHeading } = mobilityView(mobility, mode);
  const detail = useCardDetail();
  const stops = detail.open ? allStops : allStops.slice(0, ESSENTIAL_STOPS);
  const stations = detail.open ? allStations : allStations.slice(0, ESSENTIAL_STATIONS);
  const hasMore = allStops.length > ESSENTIAL_STOPS || allStations.length > ESSENTIAL_STATIONS;

  return (
    <section className="card">
      <h2>{m.title}</h2>

      {stops.length > 0 && (
        <>
          <h3>{m.busTitle}</h3>
          <ul>
            {stops.map((stop) => (
              <li key={stop.id}>
                {stop.name}
                {!isCommune && (
                  <>
                    {" "}
                    <span className="poi-distance">{nearby.after(formatProximity(stop.distanceMeters, nearby))}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {stationsHeading && (
        <>
          <h3>{m.stationsTitle(stationsHeading.kind, stationsHeading.nearestOnly)}</h3>
          <ul>
            {stations.map((s) => (
              <li key={s.id}>
                {s.name}
                {!isCommune && (
                  <>
                    {" "}
                    <span className="poi-distance">{nearby.after(formatProximity(s.distanceMeters, nearby))}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {detail.enabled && hasMore && <CardDetailToggle open={detail.open} onToggle={detail.toggle} />}
    </section>
  );
}
