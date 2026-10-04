import type { AnalysisMode, MobilityAnalysisDto } from "@/types/location-analysis";
import type { MobilityMessages } from "@/i18n/messages/fr/analysis/mobility";
import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";
import { mobilityView } from "./mobilityModel";
import { formatProximity } from "./proximityFormat";

interface Props {
  mobility: MobilityAnalysisDto;
  /** Mode d'analyse — en "commune", on masque distances/temps (mesurés depuis le centroïde). */
  mode: AnalysisMode;
  m: MobilityMessages;
  /** Temps de marche et distances, partagés avec la section « À proximité ». */
  nearby: NearbyMessages;
}

export function MobilityCard({ mobility, mode, m, nearby }: Props) {
  const { isCommune, stops, stations, stationsHeading } = mobilityView(mobility, mode);

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
    </section>
  );
}
