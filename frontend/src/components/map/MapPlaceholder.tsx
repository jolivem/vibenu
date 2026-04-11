export function MapPlaceholder({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  return (
    <section className="map-placeholder card">
      <h2>Carte</h2>
      <p>{label}</p>
      <p>
        Latitude : {lat} | Longitude : {lon}
      </p>
      <div className="map-box">Zone carte interactive à brancher avec MapLibre ou Leaflet</div>
    </section>
  );
}
