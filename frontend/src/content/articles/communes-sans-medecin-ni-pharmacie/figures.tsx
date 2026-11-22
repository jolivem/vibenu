import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { ComparisonTable } from "@/components/commune/ComparisonTable";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");

export function ChiffresDeserts() {
  return (
    <Chiffres>
      <Chiffre valeur={fmt.spaced(data.sansMedecin.nb)}>
        communes de plus de {fmt.spaced(data.seuil)} habitants sans médecin généraliste ({fmt.spaced(data.sansMedecin.population)} habitants)
      </Chiffre>
      <Chiffre valeur={fmt.spaced(data.sansPharmacie.nb)}>sans pharmacie</Chiffre>
      <Chiffre valeur={fmt.spaced(data.sansLesDeux.nb)}>
        sans médecin généraliste ni pharmacie ({fmt.spaced(data.sansLesDeux.population)} habitants)
      </Chiffre>
    </Chiffres>
  );
}

export function ParDepartement({ nombre = 15 }: { nombre?: number }) {
  return (
    <BarresHorizontales
      titre={`Communes de plus de ${fmt.spaced(data.seuil)} habitants sans médecin généraliste, par département`}
      rangees={data.parDepartement.slice(0, nombre).map((d) => ({
        id: d.dep,
        libelle: d.nom,
        precision: `dép. ${d.dep}`,
        valeur: d.nb,
        texte: `${fmt.int(d.nb)} ${d.nb > 1 ? "communes" : "commune"}`,
      }))}
    />
  );
}

/** La liste des communes, repliée, sous la mise en garde du texte. */
export function Liste() {
  return (
    <details className="article-details">
      <summary>
        Les {fmt.int(data.tableau.length)} communes de plus de {fmt.spaced(data.seuil)} habitants sans médecin généraliste
        selon la BPE
      </summary>
      <ComparisonTable
        caption={`Communes sans médecin généraliste dans la BPE ${data.millesimeBpe} (à vérifier localement)`}
        enteteLieu="Commune"
        ordreInitial="Par population"
        colonnes={[
          { id: "population", label: "Habitants", definition: `Population ${data.anneePopulation} (DGFiP)`, trier: "Trier par population" },
          { id: "pharmacies", label: "Pharmacies", definition: "Nombre de pharmacies dans la BPE", trier: "Trier par pharmacies" },
        ]}
        lignes={data.tableau.map((c) => ({
          id: c.code,
          nom: `${c.nom} (${c.dep})`,
          cellules: [
            { texte: fmt.spaced(c.population), valeur: c.population },
            { texte: fmt.int(c.pharmacies), valeur: c.pharmacies },
          ],
        }))}
        references={[]}
      />
    </details>
  );
}
