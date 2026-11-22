import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { communeHref } from "@/components/articles/liens";
import { ComparisonTable } from "@/components/commune/ComparisonTable";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
/** Deux décimales, comme les taux votés publiés par la DGFiP. */
const taux = (v: number | null) => (v === null ? "—" : `${fmt.decimal(v, 2, 2)} %`);
const points = (v: number | null) =>
  v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt.decimal(Math.abs(v), 2, 2)} pt`;

type Ville = (typeof data.villes)[number];
const parCode = new Map(data.villes.map((v) => [v.code, v]));
const ville = (code: string): Ville => {
  const v = parCode.get(code);
  if (!v) throw new Error(`Ville absente de l'instantané : ${code}`);
  return v;
};

export function ChiffresTaxe() {
  const haut = ville(data.faits.plusHaut);
  const bas = ville(data.faits.plusBas);
  return (
    <Chiffres>
      <Chiffre valeur={taux(haut.taux)}>à {haut.nom}, le taux le plus élevé des {data.nbVilles} plus grandes villes</Chiffre>
      <Chiffre valeur={taux(bas.taux)}>à {bas.nom}, le plus bas</Chiffre>
      <Chiffre valeur={taux(data.faits.mediane)}>
        taux médian des {data.nbVilles} villes, contre {taux(data.france.medianeTaux)} pour l&apos;ensemble des communes
      </Chiffre>
    </Chiffres>
  );
}

export function Classement() {
  return (
    <BarresHorizontales
      titre={`Taux global de taxe foncière sur le bâti en ${data.annee}, ${data.nbVilles} plus grandes villes`}
      rangees={data.villes.map((v) => ({
        id: v.code,
        libelle: v.nom,
        precision: `dép. ${v.dep} · ${points(v.evolutionPoints)} depuis ${data.anneeDepart}`,
        href: communeHref(v.code),
        valeur: v.taux,
        texte: taux(v.taux),
      }))}
      repere={{
        valeur: data.france.medianeTaux,
        libelle: `Médiane des communes de France : ${taux(data.france.medianeTaux)}`,
      }}
    />
  );
}

/** Les hausses depuis l'année de départ, de la plus forte à la plus faible. */
export function Hausses({ nombre = 12 }: { nombre?: number }) {
  const triees = [...data.villes]
    .filter((v) => v.evolutionPoints !== null && v.evolutionPoints > 0)
    .sort((a, b) => (b.evolutionPoints ?? 0) - (a.evolutionPoints ?? 0))
    .slice(0, nombre);
  return (
    <BarresHorizontales
      titre={`Les ${nombre} plus fortes hausses du taux depuis ${data.anneeDepart} (en points)`}
      rangees={triees.map((v) => ({
        id: v.code,
        libelle: v.nom,
        precision: `${taux(v.tauxDepart)} → ${taux(v.taux)}`,
        href: communeHref(v.code),
        valeur: v.evolutionPoints ?? 0,
        texte: points(v.evolutionPoints),
      }))}
    />
  );
}

export function Detail() {
  return (
    <details className="article-details">
      <summary>Le détail ville par ville : commune, intercommunalité, ordures ménagères</summary>
      <ComparisonTable
        caption={`Taux votés de taxe foncière sur le bâti et de TEOM, ${data.annee}`}
        enteteLieu="Ville"
        ordreInitial="Du taux le plus élevé au plus bas"
        colonnes={[
          { id: "global", label: "Taux global", definition: "Taux global de taxe foncière sur le bâti", trier: "Trier par taux global" },
          { id: "commune", label: "Commune", definition: "Part votée par la commune", trier: "Trier par part de la commune" },
          { id: "epci", label: "Interco.", definition: "Part votée par l'intercommunalité", trier: "Trier par part de l'intercommunalité" },
          { id: "depart", label: String(data.anneeDepart), definition: `Taux global en ${data.anneeDepart}`, trier: `Trier par taux ${data.anneeDepart}` },
          { id: "teom", label: "TEOM", definition: "Taxe d'enlèvement des ordures ménagères", trier: "Trier par TEOM" },
        ]}
        lignes={data.villes.map((v) => ({
          id: v.code,
          nom: `${v.nom} (${v.dep})`,
          href: communeHref(v.code),
          cellules: [
            { texte: taux(v.taux), valeur: v.taux },
            { texte: taux(v.tauxCommune), valeur: v.tauxCommune },
            { texte: taux(v.tauxEpci), valeur: v.tauxEpci },
            { texte: taux(v.tauxDepart), valeur: v.tauxDepart },
            { texte: v.teom === null ? "redevance" : taux(v.teom), valeur: v.teom },
          ],
        }))}
        references={[
          {
            id: "france",
            nom: "Médiane des communes de France",
            cellules: [taux(data.france.medianeTaux), "—", "—", taux(data.france.medianeTauxDepart), taux(data.france.medianeTeom)],
          },
        ]}
      />
    </details>
  );
}
