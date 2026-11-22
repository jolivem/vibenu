import { Chiffre, Chiffres } from "@/components/articles/Chiffre";
import { Classement } from "@/components/articles/Classement";
import { communeHref } from "@/components/articles/liens";
import { getCommuneByCodeInsee } from "@/lib/commune-slugs";
import { createFormat } from "@/i18n/format";
import data from "./data.json";

const fmt = createFormat("fr");
type VilleId = "paris" | "lyon" | "marseille";

function ville(id: VilleId) {
  const v = data.villes.find((x) => x.id === id);
  if (!v) throw new Error(`Ville absente de l'instantané : ${id}`);
  return v;
}

const euros = (n: number) => `${fmt.spaced(n)} €/m²`;
const pct = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt.int(Math.abs(n))} %`);
const nomCourt = (code: string) => getCommuneByCodeInsee(code)?.nomCourt ?? code;

/** Les trois évolutions, en tête d'article. */
export function EvolutionsVilles() {
  return (
    <Chiffres>
      {(["paris", "lyon", "marseille"] as const).map((id) => {
        const v = ville(id);
        return (
          <Chiffre key={id} valeur={pct(v.evolutionPct)}>
            {v.nom}, {euros(v.median)} en {data.millesime} contre {euros(v.medianAvant)} en{" "}
            {data.millesimeAvant}
          </Chiffre>
        );
      })}
    </Chiffres>
  );
}

/** Le classement des arrondissements d'une ville : barres, puis tableau triable. */
export function PrixVille({ ville: id }: { ville: VilleId }) {
  const v = ville(id);
  return (
    <Classement
      titre={`${v.nom} : prix médian au m² des appartements par arrondissement, ${data.millesime}`}
      barres={v.arrondissements.map((a) => {
        const nom = nomCourt(a.code);
        return {
          id: a.code,
          court: nom.replace(`${v.nom} `, ""),
          nom,
          href: communeHref(a.code),
          valeur: a.median,
          nombre: fmt.spaced(a.median),
          texte: euros(a.median),
        };
      })}
      references={[{ id: "ville", valeur: v.median, libelle: `${v.nom} (ensemble) : ${euros(v.median)}` }]}
      table={{
        caption: `Appartements vendus à ${v.nom}, par arrondissement (DVF)`,
        enteteLieu: "Arrondissement",
        colonnes: [
          { id: "median", label: `€/m² ${data.millesime}`, definition: "Prix médian au m²", trier: "Trier par prix" },
          {
            id: "evolution",
            label: `depuis ${data.millesimeAvant}`,
            definition: `Évolution du prix médian depuis ${data.millesimeAvant}`,
            trier: "Trier par évolution",
          },
          { id: "ventes", label: "ventes", definition: `Ventes retenues en ${data.millesime}`, trier: "Trier par ventes" },
        ],
        lignes: v.arrondissements.map((a) => ({
          id: a.code,
          nom: nomCourt(a.code),
          href: communeHref(a.code),
          cellules: [
            { texte: euros(a.median), valeur: a.median },
            { texte: pct(a.evolutionPct), valeur: a.evolutionPct },
            { texte: fmt.spaced(a.ventes), valeur: a.ventes },
          ],
        })),
        references: [
          {
            id: "ville",
            nom: `${v.nom} (ensemble)`,
            cellules: [euros(v.median), pct(v.evolutionPct), fmt.spaced(v.ventes)],
          },
        ],
      }}
    />
  );
}
