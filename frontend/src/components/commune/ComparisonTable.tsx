"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Un tableau de comparaison triable : les lieux en lignes, les indicateurs en colonnes, les
 * repères (ville, France) en pied.
 *
 * Rendu en entier côté serveur, dans l'ordre reçu : il se lit sans JavaScript, et c'est ce que
 * les robots indexent. Le tri n'est qu'un confort, au clic sur un en-tête. Tous les textes
 * arrivent formatés : le composant ne sait ni la langue ni les unités, la future comparaison
 * d'adresses pourra le reprendre.
 */

export interface ComparisonTableColumn {
  id: string;
  label: string;
  /** Ce que mesure la colonne, en infobulle. */
  definition: string;
  /** « Trier par … », pour les lecteurs d'écran. */
  trier: string;
}

export interface ComparisonTableCell {
  texte: string;
  /** Valeur de tri ; `null` va toujours en bas. */
  valeur: number | null;
  titre?: string;
}

export interface ComparisonTableRow {
  id: string;
  nom: string;
  href?: string;
  cellules: ComparisonTableCell[];
}

interface Props {
  caption: string;
  /** En-tête de la première colonne : « Arrondissement ». */
  enteteLieu: string;
  ordreInitial: string;
  colonnes: ComparisonTableColumn[];
  lignes: ComparisonTableRow[];
  references: Array<{ id: string; nom: string; cellules: string[] }>;
}

type Tri = { colonne: number; sens: "desc" | "asc" } | null;

export function ComparisonTable({ caption, enteteLieu, ordreInitial, colonnes, lignes, references }: Props) {
  const [tri, setTri] = useState<Tri>(null);

  const triees = useMemo(() => {
    if (!tri) return lignes;
    const signe = tri.sens === "desc" ? -1 : 1;
    return [...lignes].sort((a, b) => {
      const va = a.cellules[tri.colonne]?.valeur ?? null;
      const vb = b.cellules[tri.colonne]?.valeur ?? null;
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return signe * (va - vb);
    });
  }, [lignes, tri]);

  const cliquer = (colonne: number) =>
    setTri((t) =>
      t?.colonne === colonne ? { colonne, sens: t.sens === "desc" ? "asc" : "desc" } : { colonne, sens: "desc" },
    );

  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={tri ? undefined : "none"}>
              <button type="button" onClick={() => setTri(null)} title={ordreInitial}>
                {enteteLieu}
              </button>
            </th>
            {colonnes.map((c, i) => {
              const actif = tri?.colonne === i;
              return (
                <th
                  key={c.id}
                  scope="col"
                  title={c.definition}
                  aria-sort={actif ? (tri.sens === "desc" ? "descending" : "ascending") : "none"}
                >
                  <button type="button" onClick={() => cliquer(i)} aria-label={c.trier}>
                    {c.label}
                    <span className="comparison-sort" aria-hidden="true">
                      {actif ? (tri.sens === "desc" ? "▼" : "▲") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {triees.map((l) => (
            <tr key={l.id}>
              <th scope="row">{l.href ? <Link href={l.href}>{l.nom}</Link> : l.nom}</th>
              {l.cellules.map((c, i) => (
                <td key={colonnes[i]?.id ?? i} title={c.titre}>
                  {c.texte}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {references.length > 0 && (
          <tfoot>
            {references.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.nom}</th>
                {r.cellules.map((texte, i) => (
                  <td key={colonnes[i]?.id ?? i}>{texte}</td>
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
}
