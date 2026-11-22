import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { communeHref } from "@/components/articles/liens";
import { ComparisonTable } from "@/components/commune/ComparisonTable";
import { VerticalBars } from "@/components/commune/VerticalBars";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
const ips = (v: number) => fmt.decimal(v, 1, 1);
const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);
const r = data.references;

export function ChiffresColleges() {
  return (
    <Chiffres>
      <Chiffre valeur={`${fmt.int(data.nbPublics)} / ${fmt.int(data.nbPrives)}`}>
        collèges publics et privés à Paris
      </Chiffre>
      <Chiffre valeur={`${ips(r.ipsParisPublic)} / ${ips(r.ipsParisPrive)}`}>
        indice de position sociale des élèves, public et privé (France : {ips(r.ipsNational)})
      </Chiffre>
      <Chiffre valeur={`${fmt.int(data.faits.reussitePubliqueMoyenne)} % / ${fmt.int(data.faits.reussitePriveeMoyenne)} %`}>
        de réussite au brevet {data.session}, en moyenne, dans le public et dans le privé
      </Chiffre>
    </Chiffres>
  );
}

/** IPS médian des collèges publics, par arrondissement. */
export function IpsArrondissements() {
  return (
    <figure className="article-figure">
      <figcaption className="hbars-titre">
        Indice de position sociale médian des collèges publics, par arrondissement (rentrée {data.rentree})
      </figcaption>
      <VerticalBars
        label="IPS médian des collèges publics par arrondissement"
        rows={data.arrondissements
          .filter((a) => a.ipsMedian !== null)
          .map((a) => ({
            id: a.code,
            court: ordinal(a.arr),
            nom: `Paris ${ordinal(a.arr)}`,
            href: communeHref(a.code),
            valeur: a.ipsMedian ?? 0,
            nombre: ips(a.ipsMedian ?? 0),
            texte: `IPS ${ips(a.ipsMedian ?? 0)}`,
          }))}
        references={[
          { id: "paris", valeur: r.ipsParisPublic, libelle: `Collèges publics de Paris : ${ips(r.ipsParisPublic)}` },
          { id: "france", valeur: r.ipsNationalPublic, libelle: `Collèges publics de France : ${ips(r.ipsNationalPublic)}` },
        ]}
      />
    </figure>
  );
}

export function TableauArrondissements() {
  return (
    <ComparisonTable
      caption={`Collèges de Paris par arrondissement : IPS (rentrée ${data.rentree}) et brevet ${data.session} des collèges publics`}
      enteteLieu="Arrondissement"
      ordreInitial="Par arrondissement"
      colonnes={[
        { id: "pub", label: "Publics", definition: "Nombre de collèges publics", trier: "Trier par nombre de collèges publics" },
        { id: "priv", label: "Privés", definition: "Nombre de collèges privés", trier: "Trier par nombre de collèges privés" },
        { id: "ips", label: "IPS médian", definition: "IPS médian des collèges publics", trier: "Trier par IPS" },
        { id: "fourchette", label: "IPS min – max", definition: "IPS du collège public le moins et le plus favorisé", trier: "Trier par IPS minimal" },
        { id: "reussite", label: "Brevet", definition: "Taux de réussite moyen des collèges publics", trier: "Trier par réussite" },
      ]}
      lignes={data.arrondissements.map((a) => ({
        id: a.code,
        nom: `Paris ${ordinal(a.arr)}`,
        href: communeHref(a.code),
        cellules: [
          { texte: fmt.int(a.nbPublics), valeur: a.nbPublics },
          { texte: fmt.int(a.nbPrives), valeur: a.nbPrives },
          { texte: a.ipsMedian === null ? "—" : ips(a.ipsMedian), valeur: a.ipsMedian },
          {
            texte: a.ipsMin === null || a.ipsMax === null ? "—" : `${ips(a.ipsMin)} – ${ips(a.ipsMax)}`,
            valeur: a.ipsMin,
          },
          { texte: a.reussiteMoyenne === null ? "—" : `${fmt.int(a.reussiteMoyenne)} %`, valeur: a.reussiteMoyenne },
        ],
      }))}
      references={[
        {
          id: "paris",
          nom: "Paris",
          cellules: [
            fmt.int(data.nbPublics),
            fmt.int(data.nbPrives),
            ips(r.ipsParisPublic),
            `${ips(data.faits.ipsPublicMin)} – ${ips(data.faits.ipsPublicMax)}`,
            `${fmt.int(data.faits.reussitePubliqueMoyenne)} %`,
          ],
        },
      ]}
    />
  );
}
