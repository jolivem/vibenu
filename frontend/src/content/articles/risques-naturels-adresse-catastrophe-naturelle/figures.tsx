import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { VerticalBars } from "@/components/commune/VerticalBars";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");

export function ChiffresCatnat() {
  return (
    <Chiffres>
      <Chiffre valeur={fmt.spaced(data.reconnaissances)}>
        reconnaissances de catastrophe naturelle depuis {data.premierJo.slice(0, 4)}
      </Chiffre>
      <Chiffre valeur={`${fmt.int(data.partCommunesToucheesPct)} %`}>
        des communes reconnues au moins une fois
      </Chiffre>
      <Chiffre valeur={fmt.spaced(data.secheresse.record)}>
        reconnaissances pour la sécheresse de {data.secheresse.anneeRecord}, un record
      </Chiffre>
    </Chiffres>
  );
}

/** Les reconnaissances par type de péril. */
export function Perils() {
  return (
    <BarresHorizontales
      titre="Reconnaissances de catastrophe naturelle par péril, depuis 1982"
      rangees={data.perils.map((p) => ({
        id: p.code,
        libelle: p.libelle,
        valeur: p.reconnaissances,
        texte: fmt.spaced(p.reconnaissances),
      }))}
    />
  );
}

/** La sécheresse année par année (année de l'événement). */
export function Secheresse() {
  return (
    <figure className="article-figure">
      <figcaption className="hbars-titre">
        Communes reconnues en catastrophe naturelle pour sécheresse, par année de l&apos;événement
      </figcaption>
      <VerticalBars
        label="Reconnaissances pour sécheresse par année"
        rows={data.secheresse.parAnnee.map((a) => ({
          id: String(a.annee),
          court: String(a.annee).slice(2),
          nom: String(a.annee),
          valeur: a.reconnaissances,
          nombre: fmt.spaced(a.reconnaissances),
          texte: `${fmt.spaced(a.reconnaissances)} communes`,
        }))}
        ordre="donne"
      />
    </figure>
  );
}

/** Les communes les plus souvent reconnues. */
export function Communes() {
  return (
    <BarresHorizontales
      titre={`Les ${data.communes.length} communes les plus souvent reconnues en catastrophe naturelle`}
      rangees={data.communes.map((c) => ({
        id: c.code,
        libelle: c.nom,
        precision: `${c.depNom} · dont ${fmt.int(c.inondations)} pour inondations`,
        valeur: c.reconnaissances,
        texte: `${fmt.int(c.reconnaissances)} fois`,
      }))}
    />
  );
}
