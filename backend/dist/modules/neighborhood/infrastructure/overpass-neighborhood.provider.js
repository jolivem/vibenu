/**
 * Neighborhood enrichment provider using Overpass API (OpenStreetMap)
 * Fetches schools, shops, parks, pharmacies, etc. around a location
 */
export class OverpassNeighborhoodProvider {
    overpassUrl = "https://overpass-api.de/api/interpreter";
    async findNearbyPois(lat, lon, radiusMeters) {
        try {
            const query = this.buildQuery(lat, lon, radiusMeters);
            const response = await fetch(this.overpassUrl, {
                method: "POST",
                body: `data=${encodeURIComponent(query)}`,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });
            if (!response.ok) {
                console.warn(`Overpass API error: ${response.status}`);
                return [];
            }
            const data = (await response.json());
            return this.parseElements(data.elements, lat, lon);
        }
        catch (error) {
            console.warn("Overpass neighborhood provider error:", error);
            return [];
        }
    }
    buildQuery(lat, lon, radius) {
        return `
[out:json][timeout:10];
(
  node["amenity"~"school|pharmacy|doctors|bank|post_office|library|restaurant"](around:${radius},${lat},${lon});
  node["shop"~"supermarket|bakery"](around:${radius},${lat},${lon});
  node["leisure"~"park|sports_centre"](around:${radius},${lat},${lon});
  way["amenity"~"school|pharmacy|doctors|bank|post_office|library"](around:${radius},${lat},${lon});
  way["shop"~"supermarket|bakery"](around:${radius},${lat},${lon});
  way["leisure"~"park|sports_centre"](around:${radius},${lat},${lon});
);
out center;
`;
    }
    parseElements(elements, centerLat, centerLon) {
        const pois = [];
        for (const el of elements) {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (!elLat || !elLon || !el.tags)
                continue;
            const category = this.resolveCategory(el.tags);
            if (!category)
                continue;
            const name = el.tags.name ?? this.defaultName(category);
            const distance = this.calculateDistance(centerLat, centerLon, elLat, elLon);
            pois.push({
                name,
                category,
                distanceMeters: Math.round(distance),
            });
        }
        return pois.sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    resolveCategory(tags) {
        const amenity = tags.amenity;
        const shop = tags.shop;
        const leisure = tags.leisure;
        if (amenity === "school")
            return "school";
        if (amenity === "pharmacy")
            return "pharmacy";
        if (amenity === "doctors")
            return "doctor";
        if (amenity === "bank")
            return "bank";
        if (amenity === "post_office")
            return "post_office";
        if (amenity === "library")
            return "library";
        if (amenity === "restaurant")
            return "restaurant";
        if (shop === "supermarket")
            return "supermarket";
        if (shop === "bakery")
            return "bakery";
        if (leisure === "park")
            return "park";
        if (leisure === "sports_centre")
            return "sport";
        return null;
    }
    defaultName(category) {
        const names = {
            school: "École",
            supermarket: "Supermarché",
            bakery: "Boulangerie",
            pharmacy: "Pharmacie",
            doctor: "Médecin",
            park: "Parc",
            sport: "Équipement sportif",
            restaurant: "Restaurant",
            post_office: "Bureau de poste",
            bank: "Banque",
            library: "Bibliothèque",
        };
        return names[category];
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6_371_000;
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const dPhi = ((lat2 - lat1) * Math.PI) / 180;
        const dLambda = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dPhi / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
//# sourceMappingURL=overpass-neighborhood.provider.js.map