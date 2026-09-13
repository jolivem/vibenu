import type { AnalysisMode, MobilityAnalysisDto } from "@/types/location-analysis";
import { mobilityView } from "./mobilityModel";
import { formatProximity } from "./proximityFormat";

interface Props {
  mobility: MobilityAnalysisDto;
  /** Mode d'analyse — en "commune", on masque distances/temps (mesurés depuis le centroïde). */
  mode: AnalysisMode;
}

export function MobilityCard({ mobility, mode }: Props) {
  const { isCommune, stops, stations, stationsTitle } = mobilityView(mobility, mode);

  return (
    <section className="card">
      <h2>Transports en commun</h2>

      {stops.length > 0 && (
        <>
          <h3>Bus</h3>
          <ul>
            {stops.map((stop) => (
              <li key={stop.id}>
                {stop.name}
                {!isCommune && (
                  <>
                    {" "}
                    <span className="poi-distance">
                      — {formatProximity(stop.distanceMeters)}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {stations.length > 0 && (
        <>
          <h3>{stationsTitle}</h3>
          <ul>
            {stations.map((s) => (
              <li key={s.id}>
                {s.name}
                {!isCommune && (
                  <>
                    {" "}
                    <span className="poi-distance">
                      — {formatProximity(s.distanceMeters)}
                    </span>
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
