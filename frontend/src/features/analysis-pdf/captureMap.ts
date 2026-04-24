import type { Map as MapLibreMap } from "maplibre-gl";

export async function captureMap(map: MapLibreMap): Promise<string> {
  await new Promise<void>((resolve) => {
    if (map.loaded() && map.isStyleLoaded()) {
      map.once("idle", () => resolve());
      map.triggerRepaint();
    } else {
      map.once("idle", () => resolve());
    }
  });

  const canvas = map.getCanvas();
  return canvas.toDataURL("image/png");
}
