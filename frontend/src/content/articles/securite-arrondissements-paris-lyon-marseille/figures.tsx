import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { communeHref } from "@/components/articles/liens";
import { ComparisonTable } from "@/components/commune/ComparisonTable";
import { getCommuneByCodeInsee } from "@/lib/commune-slugs";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");

type Cle = "cambriolages" | "vols" | "violences";
type Arrondissement = (typeof data.villes)[number]["arrondissements"][number];

const UNITE: Record<Cle, string> = {
  cambriolages: "pour 1 000 logements",
  vols: "pour 1 000 habitants",
  violences: "pour 1 000 habitants",
};
const LIBELLE: Record<Cle, string> = {
  cambriolages: "Cambriolages de logement",
  vols: "Vols sans violence contre des personnes",
  violences: "Violences physiques hors cadre familial",
};

const tous: Arrondissement[] = data.villes.flatMap((v) => v.arrondissements);
const nom = (code: string) => getCommuneByCodeInsee(code)?.nomCourt ?? code;
const taux = (v: number | null) => (v === null ? "—" : `${fmt.fixed(v, 1)} ‰`);
const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt.int(Math.abs(v))} %`);

/** Les trois villes, pour un indicateur : taux et évolution depuis l'année de départ. */
export function Villes({ indicateur }: { indicateur: Cle }) {
  const france = data.references.FRANCE[indicateur];
  return (
    <Chiffres>
      {data.villes.map((v) => (
        <Chiffre key={v.id} valeur={taux(v[indicateur].taux)}>
          {UNITE[indicateur]} à {v.nom}, {pct(v[indicateur].evolutionPct)} depuis {data.anneeDepart}
        </Chiffre>
      ))}
      <Chiffre valeur={taux(france.taux)}>
        {UNITE[indicateur]} en France, {pct(france.evolutionPct)} depuis {data.anneeDepart}
      </Chiffre>
    </Chiffres>
  );
}

/** Les arrondissements classés pour un indicateur, repère France. */
export function Classement({ indicateur, nombre }: { indicateur: Cle; nombre?: number }) {
  const tries = tous
    .filter((a) => a[indicateur].taux !== null)
    .sort((a, b) => (b[indicateur].taux ?? 0) - (a[indicateur].taux ?? 0));
  const rangees = (nombre ? tries.slice(0, nombre) : tries).map((a) => ({
    id: a.code,
    libelle: nom(a.code),
    precision: `${pct(a[indicateur].evolutionPct)} depuis ${data.anneeDepart}`,
    href: communeHref(a.code),
    valeur: a[indicateur].taux ?? 0,
    texte: taux(a[indicateur].taux),
  }));
  const france = data.references.FRANCE[indicateur].taux;
  return (
    <BarresHorizontales
      titre={`${LIBELLE[indicateur]}, ${UNITE[indicateur]}, ${data.annee}${
        nombre ? ` : les ${nombre} arrondissements les plus touchés` : ` : les ${tries.length} arrondissements`
      }`}
      rangees={rangees}
      repere={{ valeur: france, libelle: `France : ${taux(france)}` }}
    />
  );
}

/** Le tableau complet, replié : les trois indicateurs et leur évolution. */
export function Tableau() {
  const cellules = (a: { taux: number | null; evolutionPct: number | null }) => [
    { texte: taux(a.taux), valeur: a.taux },
    { texte: pct(a.evolutionPct), valeur: a.evolutionPct },
  ];
  const colonne = (id: string, label: string, definition: string) => ({ id, label, definition, trier: `Trier par ${label}` });
  return (
    <details className="article-details">
      <summary>Les {data.nbArrondissements} arrondissements, en tableau</summary>
      <ComparisonTable
        caption={`Délinquance enregistrée en ${data.annee}, et évolution depuis ${data.anneeDepart}`}
        enteteLieu="Arrondissement"
        ordreInitial="Par ville et par arrondissement"
        colonnes={[
          colonne("camb", "Cambriolages", `Cambriolages de logement, ${UNITE.cambriolages}`),
          colonne("camb-evol", "évol.", `Évolution depuis ${data.anneeDepart}`),
          colonne("vols", "Vols sans violence", `Vols sans violence contre des personnes, ${UNITE.vols}`),
          colonne("vols-evol", "évol.", `Évolution depuis ${data.anneeDepart}`),
          colonne("viol", "Violences physiques", `Violences physiques hors cadre familial, ${UNITE.violences}`),
          colonne("viol-evol", "évol.", `Évolution depuis ${data.anneeDepart}`),
        ]}
        lignes={tous.map((a) => ({
          id: a.code,
          nom: nom(a.code),
          href: communeHref(a.code),
          cellules: [...cellules(a.cambriolages), ...cellules(a.vols), ...cellules(a.violences)],
        }))}
        references={[
          ...data.villes.map((v) => ({
            id: v.id,
            nom: v.nom,
            cellules: (["cambriolages", "vols", "violences"] as const).flatMap((k) => [taux(v[k].taux), pct(v[k].evolutionPct)]),
          })),
          {
            id: "france",
            nom: "France",
            cellules: (["cambriolages", "vols", "violences"] as const).flatMap((k) => [
              taux(data.references.FRANCE[k].taux),
              pct(data.references.FRANCE[k].evolutionPct),
            ]),
          },
        ]}
      />
    </details>
  );
}
