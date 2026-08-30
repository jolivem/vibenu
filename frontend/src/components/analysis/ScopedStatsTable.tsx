import type { ReactNode } from "react";
import type { InseeView } from "./inseeChart";

export interface ScopedRow<T> {
  label: string;
  render: (stats: T) => string;
}

/**
 * Tableau « un indicateur par ligne, une échelle par colonne » des cards INSEE.
 *
 * Les trois cards de la rubrique Population comparent toutes l'échelle locale à sa
 * commune et à la France, avec la même colonne communale escamotable ; seul le contenu
 * des lignes change. Le rendu reprend les classes de la card Démographie, pour que les
 * quatre tableaux de la section se lisent comme un seul.
 */
export function ScopedStatsTable<T>({
  view,
  rows,
}: {
  view: InseeView<T>;
  rows: ScopedRow<T>[];
}): ReactNode {
  const { scoped, localName, communeName, showCommune } = view;
  const withCommune = showCommune && scoped.commune !== null;
  const cell = (stats: T | null, row: ScopedRow<T>) => (stats ? row.render(stats) : "—");

  return (
    <table className="demographics-table">
      <thead>
        <tr>
          <th scope="col">Indicateur</th>
          <th scope="col">{localName}</th>
          {withCommune && <th scope="col">{communeName}</th>}
          {scoped.france && <th scope="col">France</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{cell(scoped.iris, row)}</td>
            {withCommune && <td>{cell(scoped.commune, row)}</td>}
            {scoped.france && <td>{cell(scoped.france, row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
