import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { communeHref } from "@/components/articles/liens";
import { ComparisonTable } from "@/components/commune/ComparisonTable";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
const pct = (v: number | null) => (v === null ? "—" : `${fmt.decimal(v, 1, 1)} %`);

type Ville = (typeof data.villes)[number];
const parCode = new Map(data.villes.map((v) => [v.code, v]));
const ville = (code: string): Ville => {
  const v = parCode.get(code);
  if (!v) throw new Error(`Ville absente de l'instantané : ${code}`);
  return v;
};

/** « Emmanuel GRÉGOIRE » → « Emmanuel Grégoire » : le fichier écrit les noms en capitales. */
export function nomPropre(t: string): string {
  return t
    .split(" ")
    .map((mot) =>
      mot.length > 1 && mot === mot.toUpperCase()
        ? mot
            .toLowerCase()
            .split("-")
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join("-")
        : mot,
    )
    .join(" ");
}

/** La tête de liste si le fichier la donne, le nom de la liste sinon (villes gagnées au 1er tour). */
const gagnant = (v: Ville) => (v.gagnante.tete ? nomPropre(v.gagnante.tete) : `liste « ${v.gagnante.liste} »`);

export function ChiffresMunicipales() {
  const serre = ville(data.faits.plusSerre);
  return (
    <Chiffres>
      <Chiffre valeur={pct(data.national.participationT1)}>de participation au premier tour, en France</Chiffre>
      <Chiffre valeur={`${fmt.int(data.faits.nbDecideesT2)} sur ${fmt.int(data.nbVilles)}`}>
        grandes villes départagées au second tour
      </Chiffre>
      <Chiffre valeur={`${fmt.decimal(serre.ecartPoints ?? 0, 1)} point`}>
        d&apos;écart à {serre.nom}, le second tour le plus serré
      </Chiffre>
    </Chiffres>
  );
}

/** Participation au premier tour, ville par ville. */
export function Participation() {
  const triees = [...data.villes].sort((a, b) => b.participationT1 - a.participationT1);
  return (
    <BarresHorizontales
      titre={`Participation au premier tour, villes de plus de ${fmt.spaced(data.seuilPopulation)} habitants`}
      rangees={triees.map((v) => ({
        id: v.code,
        libelle: v.nom,
        precision: `dép. ${v.dep}`,
        href: communeHref(v.code),
        valeur: v.participationT1,
        texte: pct(v.participationT1),
      }))}
      repere={{ valeur: data.national.participationT1, libelle: `France : ${pct(data.national.participationT1)}` }}
    />
  );
}

/** Nuance des listes gagnantes. */
export function Nuances() {
  return (
    <BarresHorizontales
      titre="Nuance des listes arrivées en tête, dans les grandes villes"
      rangees={data.nuancesGagnantes.map((n) => ({
        id: n.nuance,
        libelle: n.nuance,
        valeur: n.villes,
        texte: `${fmt.int(n.villes)} ${n.villes > 1 ? "villes" : "ville"}`,
      }))}
    />
  );
}

/** Le tableau des résultats, ville par ville. */
export function Resultats() {
  return (
    <ComparisonTable
      caption={`Municipales ${data.annee} : résultat du tour décisif dans les ${data.nbVilles} plus grandes villes`}
      enteteLieu="Ville"
      ordreInitial="Par population"
      colonnes={[
        { id: "gagnant", label: "Liste en tête", definition: "Tête de liste, ou nom de la liste", trier: "Trier par liste en tête" },
        { id: "nuance", label: "Nuance", definition: "Nuance attribuée par le ministère de l'Intérieur", trier: "Trier par nuance" },
        { id: "voix", label: "Voix", definition: "Part des suffrages exprimés au tour décisif", trier: "Trier par part des voix" },
        { id: "sieges", label: "Sièges", definition: "Sièges obtenus au conseil municipal", trier: "Trier par sièges" },
        { id: "tour", label: "Tour", definition: "Tour qui a décidé de l'élection", trier: "Trier par tour" },
        { id: "particip", label: "Particip. 1er tour", definition: "Votants rapportés aux inscrits au premier tour", trier: "Trier par participation" },
      ]}
      lignes={data.villes.map((v) => ({
        id: v.code,
        nom: `${v.nom} (${v.dep})`,
        href: communeHref(v.code),
        cellules: [
          { texte: gagnant(v), valeur: null },
          { texte: v.gagnante.nuanceLibelle, valeur: null },
          // Deux décimales, comme les résultats officiels que cite le texte (« 50,52 % »).
          { texte: `${fmt.decimal(v.gagnante.pct, 2, 2)}\u00a0%`, valeur: v.gagnante.pct },
          { texte: fmt.int(v.gagnante.sieges), valeur: v.gagnante.sieges },
          { texte: v.tourDecisif === 1 ? "1er" : "2d", valeur: v.tourDecisif },
          { texte: pct(v.participationT1), valeur: v.participationT1 },
        ],
      }))}
      references={[]}
    />
  );
}
