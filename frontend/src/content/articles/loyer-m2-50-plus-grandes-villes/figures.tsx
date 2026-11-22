import { BarresHorizontales } from "@/components/articles/BarresHorizontales";
import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { communeHref } from "@/components/articles/liens";
import { ComparisonTable } from "@/components/commune/ComparisonTable";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
const m2 = (v: number) => `${fmt.fixed(v, 1)} €/m²`;
const euros = (v: number) => `${fmt.spaced(v)} €`;

type Ville = (typeof data.villes)[number];
type Indicateur = Ville["app"];

const parCode = new Map(data.villes.map((v) => [v.code, v]));
const ville = (code: string): Ville => {
  const v = parCode.get(code);
  if (!v) throw new Error(`Ville absente de l'instantané : ${code}`);
  return v;
};

/** Les extrêmes, en loyer au m² puis en exemple mensuel. */
export function Extremes() {
  const haut = ville(data.faits.plusCher);
  const bas = ville(data.faits.moinsCher);
  return (
    <Chiffres>
      <Chiffre valeur={m2(haut.app.loyer)}>
        à {haut.nom}, le loyer d&apos;annonce le plus élevé des {data.nbVilles} villes
      </Chiffre>
      <Chiffre valeur={m2(bas.app.loyer)}>à {bas.nom}, le plus bas</Chiffre>
      {haut.exempleMensuel !== null && bas.exempleMensuel !== null && (
        <Chiffre valeur={`${euros(haut.exempleMensuel)} / ${euros(bas.exempleMensuel)}`}>
          par mois pour un deux-pièces de {data.surfaceExemple} m², à {haut.nom} et à {bas.nom}
        </Chiffre>
      )}
    </Chiffres>
  );
}

/** Le classement des villes, loyer des appartements. */
export function Classement() {
  return (
    <BarresHorizontales
      titre={`Loyer d'annonce des appartements, ${data.nbVilles} plus grandes villes (€/m², charges comprises)`}
      rangees={data.villes.map((v) => ({
        id: v.code,
        libelle: v.nom,
        precision: `dép. ${v.dep} · ${fmt.spaced(v.population)} hab.`,
        href: communeHref(v.code),
        valeur: v.app.loyer,
        texte: m2(v.app.loyer),
      }))}
      repere={{ valeur: data.faits.mediane, libelle: `Médiane des ${data.nbVilles} villes : ${m2(data.faits.mediane)}` }}
    />
  );
}

const cellule = (i: Indicateur | null) =>
  i === null
    ? { texte: "—", valeur: null }
    : { texte: i.fiable ? m2(i.loyer) : `${m2(i.loyer)}*`, valeur: i.loyer, titre: `${fmt.spaced(i.annonces)} annonces` };

/** Le détail par type de logement, replié. */
export function Detail() {
  return (
    <details className="article-details">
      <summary>Le détail par type de logement, ville par ville</summary>
      <ComparisonTable
        caption={`Loyers d'annonce par type de logement (€/m², charges comprises, 3e trimestre ${data.annee})`}
        enteteLieu="Ville"
        ordreInitial="Par loyer des appartements"
        colonnes={[
          { id: "app", label: "Appart.", definition: "Appartements, tous types", trier: "Trier par loyer des appartements" },
          { id: "app12", label: "1-2 p.", definition: "Appartements d'une ou deux pièces", trier: "Trier par loyer des 1-2 pièces" },
          { id: "app3", label: "3 p. et +", definition: "Appartements de trois pièces et plus", trier: "Trier par loyer des 3 pièces et plus" },
          { id: "maison", label: "Maisons", definition: "Maisons, toutes tailles", trier: "Trier par loyer des maisons" },
          {
            id: "exemple",
            label: `${data.surfaceExemple} m²`,
            definition: `Loyer mensuel estimé d'un deux-pièces de ${data.surfaceExemple} m²`,
            trier: "Trier par loyer mensuel",
          },
        ]}
        lignes={data.villes.map((v) => ({
          id: v.code,
          nom: `${v.nom} (${v.dep})`,
          href: communeHref(v.code),
          cellules: [
            cellule(v.app),
            cellule(v.app12),
            cellule(v.app3),
            cellule(v.maison),
            { texte: v.exempleMensuel === null ? "—" : euros(v.exempleMensuel), valeur: v.exempleMensuel },
          ],
        }))}
        references={[]}
      />
      <p className="article-note">
        * Moins de {data.minAnnonces} annonces ou estimation peu ajustée : chiffre indicatif.
      </p>
    </details>
  );
}
