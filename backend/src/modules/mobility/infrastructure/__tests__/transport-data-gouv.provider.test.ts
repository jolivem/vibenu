import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TransportDataGouvProvider } from "../transport-data-gouv.provider.js";

function loadFixture(name: string) {
  const path = resolve(import.meta.dirname, "fixtures", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function mockFetchWith(fixture: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => fixture,
  } as Response);
}

describe("TransportDataGouvProvider", () => {
  let provider: TransportDataGouvProvider;

  beforeEach(() => {
    provider = new TransportDataGouvProvider();
    vi.restoreAllMocks();
  });

  describe("Saint-Cyr-l'École — 3 Rue Paul Vaillant Couturier (48.7995, 2.0712)", () => {
    const LAT = 48.7975;
    const LON = 2.072422;

    it("should return bus stops and a train station", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      expect(result.nearestStops.length).toBeGreaterThan(0);
      expect(result.nearestStation).toBeDefined();
    });

    it("should classify SNCF location_type=1 as train station", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      expect(result.nearestStation).toBeDefined();
      expect(result.nearestStation!.mode).toBe("train");
    });

    it("should not classify bus stops named 'Gare ...' as train", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      const busStopNames = result.nearestStops.map((s) => s.name);
      // "Gare de Saint-Cyr-l'École" is an IDFM bus stop, not a train station
      expect(busStopNames).toContain("Gare de Saint-Cyr-l'École");
      expect(result.nearestStops.find((s) => s.name === "Gare de Saint-Cyr-l'École")!.mode).toBe(
        "bus",
      );
    });

    it("should not classify SNCF multimodal hubs (name with '/') as train", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      // "République - La Poste / Ecole Militaire" is location_type=1 in SNCF but
      // it's a bus hub, not a train station — the "/" in the name reveals this
      const station = result.nearestStation!;
      expect(station.name).toBe("Saint-Cyr");
      expect(station.name).not.toContain("/");
    });

    it("should not classify 'Paul Vaillant Couturier' as train station", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      // Paul Vaillant Couturier is a bus stop, not a station
      const allNames = [
        ...result.nearestStops.map((s) => s.name),
        ...(result.nearestStation ? [result.nearestStation.name] : []),
      ];
      const pvc = result.nearestStops.find((s) => s.name === "Paul Vaillant Couturier");
      if (pvc) {
        expect(pvc.mode).toBe("bus");
      }
      // It must not be the nearest station
      expect(result.nearestStation!.name).not.toBe("Paul Vaillant Couturier");
    });

    it("should return at most 5 bus stops sorted by distance", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      expect(result.nearestStops.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < result.nearestStops.length; i++) {
        expect(result.nearestStops[i].distanceMeters).toBeGreaterThanOrEqual(
          result.nearestStops[i - 1].distanceMeters,
        );
      }
    });

    it("should deduplicate stops with same name and mode", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      const busNames = result.nearestStops.map((s) => `${s.name}|${s.mode}`);
      const unique = new Set(busNames);
      expect(busNames.length).toBe(unique.size);
    });

    it("should filter out entrances (location_type=2)", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      // "pl. Pierre Sémard" only exists as location_type=2 (entrance) — should not appear
      const allNames = [
        ...result.nearestStops.map((s) => s.name),
        ...(result.nearestStation ? [result.nearestStation.name] : []),
      ];
      expect(allNames).not.toContain("pl. Pierre Sémard");
    });

    it("should match expected snapshot for this location", async () => {
      mockFetchWith(loadFixture("saint-cyr-lecole"));

      const result = await provider.findNearbyStops(LAT, LON, 1000);

      expect(result.nearestStops).toEqual([
        expect.objectContaining({ name: "Paul Vaillant Couturier", mode: "bus" }),
        expect.objectContaining({ name: "Saint-Cyr", mode: "bus" }),
        expect.objectContaining({ name: "Gare de Saint-Cyr-l'École", mode: "bus" }),
        expect.objectContaining({ name: "Saint-Cyr - voie 2", mode: "bus" }),
        expect.objectContaining({ name: "République Gare Saint-Cyr", mode: "bus" }),
      ]);

      expect(result.nearestStation).toEqual(
        expect.objectContaining({
          name: "Saint-Cyr",
          mode: "train",
        }),
      );
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("should return empty results on API error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await provider.findNearbyStops(48.8, 2.07, 1000);

      expect(result.nearestStops).toEqual([]);
      expect(result.nearestStation).toBeUndefined();
    });

    it("should return empty results on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      const result = await provider.findNearbyStops(48.8, 2.07, 1000);

      expect(result.nearestStops).toEqual([]);
      expect(result.nearestStation).toBeUndefined();
    });
  });
});
