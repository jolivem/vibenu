import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { ComparisonTable, type ComparisonTableRow } from "@/components/commune/ComparisonTable";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
const r = data.reglementation;

type Commune = (typeof data.tendue.tableau)[number];

/** Les trois chiffres d'entrée. */
export function ChiffresZones() {
  return (
    <Chiffres>
      <Chiffre valeur={fmt.spaced(data.tendue.nbCommunes)}>
        communes en zone tendue, où vivent {fmt.int(data.tendue.partPopulationPct)} % des habitants
      </Chiffre>
      <Chiffre valeur={fmt.spaced(data.touristique.nbCommunes)}>
        communes en zone touristique et tendue, {fmt.int(data.touristique.partPopulationPct)} % des habitants
      </Chiffre>
      <Chiffre valeur={fmt.spaced(data.tendue.nbMajoration)}>
        communes de zone tendue qui majorent la taxe d&apos;habitation des résidences secondaires
      </Chiffre>
    </Chiffres>
  );
}

/** Ce qui s'applique selon la catégorie de la commune. */
export function TableauRegles() {
  const oui = "oui";
  const non = "non";
  const lignes: Array<[string, string, string, string]> = [
    ["Préavis du locataire (location vide)", `${r.preavisMois} mois`, `${r.preavisNormalMois} mois`, `${r.preavisNormalMois} mois`],
    ["Loyer plafonné à la relocation", oui, non, non],
    ["Taxe sur les logements vacants", oui, oui, non],
    ["Majoration possible de la taxe d'habitation des résidences secondaires", oui, oui, non],
  ];
  return (
    <div className="article-table-wrap">
      <table className="article-table">
        <caption>Ce qui change selon le zonage de la commune</caption>
        <thead>
          <tr>
            <th scope="col">Règle</th>
            <th scope="col">Zone tendue</th>
            <th scope="col">Zone touristique et tendue</th>
            <th scope="col">Hors zone</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(([regle, ...cases]) => (
            <tr key={regle}>
              <th scope="row">{regle}</th>
              {cases.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const majoration = (c: Commune) => (c.majoration === null ? "non" : `${fmt.int(c.majoration)} %`);

function lignesCommunes(communes: Commune[]): ComparisonTableRow[] {
  return communes.map((c) => ({
    id: c.code,
    nom: `${c.nom} (${c.dep})`,
    cellules: [
      { texte: fmt.spaced(c.population), valeur: c.population },
      { texte: majoration(c), valeur: c.majoration },
    ],
  }));
}

const colonnes = [
  { id: "population", label: "Habitants", definition: `Population ${data.anneePopulation} (DGFiP)`, trier: "Trier par population" },
  {
    id: "majoration",
    label: "Majoration rés. secondaires",
    definition: "Majoration de la taxe d'habitation des résidences secondaires votée par la commune",
    trier: "Trier par majoration",
  },
];

/** Les plus grandes communes d'une catégorie. */
export function PlusPeuplees({ zone }: { zone: "tendue" | "touristique" }) {
  const z = data[zone];
  const libelle = zone === "tendue" ? "en zone tendue" : "en zone touristique et tendue";
  return (
    <ComparisonTable
      caption={`Les ${z.plusPeuplees.length} communes les plus peuplées ${libelle}`}
      enteteLieu="Commune"
      ordreInitial="Par population"
      colonnes={colonnes}
      lignes={lignesCommunes(z.plusPeuplees)}
      references={[]}
    />
  );
}

/** Les départements qui comptent le plus de communes d'une catégorie. */
export function ParDepartement({ zone, nombre = 12 }: { zone: "tendue" | "touristique"; nombre?: number }) {
  const z = data[zone];
  const libelle = zone === "tendue" ? "en zone tendue" : "en zone touristique et tendue";
  return (
    <BarresHorizontales
      titre={`Départements comptant le plus de communes ${libelle}`}
      rangees={z.parDepartement.slice(0, nombre).map((d) => ({
        id: d.dep,
        libelle: d.nom,
        precision: `dép. ${d.dep}`,
        valeur: d.nbCommunes,
        texte: `${fmt.int(d.nbCommunes)} communes`,
      }))}
    />
  );
}

/** Toutes les communes zonées d'au moins `seuilTableau` habitants, repliées. */
export function ListeComplete({ zone }: { zone: "tendue" | "touristique" }) {
  const z = data[zone];
  const libelle = zone === "tendue" ? "en zone tendue" : "en zone touristique et tendue";
  return (
    <details className="article-details">
      <summary>
        Les {fmt.int(z.tableau.length)} communes {libelle} de plus de {fmt.spaced(data.seuilTableau)} habitants
      </summary>
      <ComparisonTable
        caption={`Communes ${libelle} de plus de ${fmt.spaced(data.seuilTableau)} habitants`}
        enteteLieu="Commune"
        ordreInitial="Par population"
        colonnes={colonnes}
        lignes={lignesCommunes(z.tableau)}
        references={[]}
      />
    </details>
  );
}
