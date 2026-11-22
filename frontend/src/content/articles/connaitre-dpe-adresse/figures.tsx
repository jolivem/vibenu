import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
const pct = (v: number) => `${fmt.decimal(v, 1, 1)}\u00a0%`;
const r = data.reglementation;

export function ChiffresDpe() {
  return (
    <Chiffres>
      <Chiffre valeur={pct(data.faits.partFGPct)}>
        des diagnostics classés F ou G, des « passoires » interdites à la location en {r.interdictionF} selon la loi en vigueur
      </Chiffre>
      <Chiffre valeur={pct(data.faits.partEFGPct)}>des diagnostics classés E, F ou G, concernés d&apos;ici {r.interdictionE}</Chiffre>
      <Chiffre valeur={fmt.spaced(data.total)}>diagnostics de logements enregistrés par l&apos;ADEME depuis juillet 2021</Chiffre>
    </Chiffres>
  );
}

export function Repartition() {
  return (
    <BarresHorizontales
      titre="Répartition des diagnostics par classe, depuis juillet 2021 (France)"
      rangees={data.classes.map((c) => ({
        id: c.classe,
        libelle: `Classe ${c.classe}`,
        valeur: c.partPct,
        texte: `${pct(c.partPct)} · ${fmt.spaced(c.diagnostics)}`,
        souligne: c.classe === "F" || c.classe === "G",
      }))}
    />
  );
}

/** Classes encore louables selon l'année de signature, de renouvellement ou de reconduction du bail. */
export function CalendrierLocation() {
  const lignes: Array<[string, string, string]> = [
    [`depuis ${r.interdictionG}`, "G", "A à F"],
    [`à partir de ${r.interdictionF}`, "F et G", "A à E"],
    [`à partir de ${r.interdictionE}`, "E, F et G", "A à D"],
  ];
  return (
    <div className="article-table-wrap">
      <table className="article-table">
        <caption>Louer selon le DPE, en métropole (bail signé, renouvelé ou reconduit)</caption>
        <thead>
          <tr>
            <th scope="col">Année</th>
            <th scope="col">Location interdite</th>
            <th scope="col">Classes louables</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(([annee, interdites, louables]) => (
            <tr key={annee}>
              <th scope="row">{annee}</th>
              <td>{interdites}</td>
              <td>{louables}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
