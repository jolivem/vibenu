import { BarresHorizontales, type BarreHorizontale } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { ComparisonTable } from "@/components/commune/ComparisonTable";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
const heures = (h: number) => `${fmt.spaced(h)} h`;

type Station = (typeof data.metro)[number];
type StationOutreMer = (typeof data.outreMer)[number];

const parId = new Map(data.metro.map((s) => [s.id, s]));
const station = (id: string): Station => {
  const s = parId.get(id);
  if (!s) throw new Error(`Station absente de l'instantané : ${id}`);
  return s;
};

/** « Aix En Provence » et « Aix-en-Provence » sont le même lieu : on compare sans casse ni accents. */
const normalise = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/gi, "").toLowerCase();

/** Nom de la station, s'il apprend autre chose que celui de la commune. */
const autreNom = (station: string, commune: string) =>
  normalise(station) === normalise(commune) ? null : station;

/** « Bouches-du-Rhône » n'est pas en base : le numéro de département suffit à situer. */
function precision(s: Station): string {
  const lieu = `dép. ${s.dep}`;
  const nom = autreNom(s.station, s.commune);
  return nom ? `station ${nom} · ${lieu}` : lieu;
}

const rangee = (s: Station): BarreHorizontale => ({
  id: s.id,
  libelle: s.commune,
  precision: precision(s),
  valeur: s.heures,
  texte: heures(s.heures),
});

const medianeMetro = {
  valeur: data.faits.medianeMetro,
  libelle: `Médiane des ${data.nbMetro} stations de métropole : ${heures(data.faits.medianeMetro)}`,
};

/** Les deux extrêmes de la métropole, en tête d'article. */
export function Extremes() {
  const haut = station(data.faits.plusEnsoleillee);
  const bas = station(data.faits.moinsEnsoleillee);
  return (
    <Chiffres>
      <Chiffre valeur={heures(haut.heures)}>
        de soleil par an à {haut.commune} ({haut.dep}), la station la plus ensoleillée de métropole
      </Chiffre>
      <Chiffre valeur={heures(bas.heures)}>
        à la station de {bas.station} ({bas.dep}), la moins ensoleillée
      </Chiffre>
      <Chiffre valeur={`${fmt.decimal(data.faits.ecartHeuresParJour, 1)} h`}>
        de soleil en plus par jour, en moyenne sur l&apos;année, entre les deux
      </Chiffre>
    </Chiffres>
  );
}

export function PlusEnsoleillees({ nombre = 15 }: { nombre?: number }) {
  return (
    <BarresHorizontales
      titre={`Les ${nombre} stations les plus ensoleillées de métropole (heures de soleil par an)`}
      rangees={data.metro.slice(0, nombre).map(rangee)}
      repere={medianeMetro}
    />
  );
}

export function MoinsEnsoleillees({ nombre = 15 }: { nombre?: number }) {
  return (
    <BarresHorizontales
      titre={`Les ${nombre} stations les moins ensoleillées de métropole`}
      rangees={data.metro.slice(-nombre).reverse().map(rangee)}
      repere={medianeMetro}
    />
  );
}

/** Les grandes villes, avec la station que leur attribue la card Climat. */
export function GrandesVilles() {
  return (
    <BarresHorizontales
      titre={`Les ${data.nbGrandesVilles} plus grandes villes de métropole (station la plus proche)`}
      rangees={data.grandesVilles.map((v) => ({
        id: v.code,
        libelle: v.nom,
        precision: `station ${autreNom(v.stationNom, v.nom) ?? v.stationCommune}, à ${fmt.int(v.distanceKm)} km · ${v.rang}e sur ${data.nbMetro}`,
        valeur: v.heures,
        texte: heures(v.heures),
      }))}
      repere={medianeMetro}
    />
  );
}

/** Toutes les stations de métropole, en tableau triable replié. */
export function ToutesStations() {
  const nombre = (v: number | null, unite: string, decimales = 0) =>
    v === null ? "—" : `${decimales ? fmt.decimal(v, decimales, decimales) : fmt.spaced(v)} ${unite}`;
  return (
    <details className="article-details">
      <summary>Les {data.nbMetro} stations de métropole, en tableau</summary>
      <ComparisonTable
        caption={`Normales Météo-France ${data.periodeDebut}-${data.periodeFin}, stations de métropole`}
        enteteLieu="Station"
        ordreInitial="Du plus ensoleillé au moins ensoleillé"
        colonnes={[
          { id: "heures", label: "Soleil", definition: "Durée d'ensoleillement annuelle", trier: "Trier par ensoleillement" },
          { id: "temperature", label: "Temp.", definition: "Température moyenne annuelle", trier: "Trier par température" },
          { id: "pluie", label: "Pluie", definition: "Cumul annuel de précipitations", trier: "Trier par précipitations" },
          { id: "altitude", label: "Alt.", definition: "Altitude de la station", trier: "Trier par altitude" },
        ]}
        lignes={data.metro.map((s) => ({
          id: s.id,
          nom: `${s.commune} (${s.dep})`,
          cellules: [
            { texte: heures(s.heures), valeur: s.heures, titre: s.station },
            { texte: nombre(s.temperature, "°C", 1), valeur: s.temperature },
            { texte: nombre(s.precipitations, "mm"), valeur: s.precipitations },
            { texte: nombre(s.altitude, "m"), valeur: s.altitude },
          ],
        }))}
        references={[]}
      />
    </details>
  );
}

export function OutreMer() {
  return (
    <BarresHorizontales
      titre={`Les ${data.nbOutreMer} stations d'outre-mer`}
      rangees={data.outreMer.map((s: StationOutreMer) => ({
        id: s.id,
        libelle: s.commune,
        precision: s.territoire,
        valeur: s.heures,
        texte: heures(s.heures),
      }))}
    />
  );
}
