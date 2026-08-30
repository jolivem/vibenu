import type { MunicipalesAnalysisDto, MunicipalesListeDto } from "@/types/location-analysis";

/**
 * Couleurs par nuance de liste. Les codes municipaux sont préfixés « L » (liste), et
 * l'essentiel du corpus est composé de « divers » — LDVD, LDVG, LDIV, LDVC — que l'État
 * attribue quand aucune étiquette de parti ne s'impose.
 */
const NUANCE_COLOR: Record<string, string> = {
  LEXG: "#bf3f3f",
  LFI: "#cc0066",
  LCOM: "#cc0000",
  LSOC: "#ff8da1",
  LUG: "#e8607d",
  LVEC: "#3aaa35",
  LDVG: "#f2a0b4",
  LDIV: "#9ca3af",
  LREG: "#7c8ba1",
  LDVC: "#f0b429",
  LENS: "#ffc000",
  LMDM: "#f7a600",
  LUDI: "#4aa3df",
  LLR: "#1f5fbf",
  LDVD: "#7fa8dd",
  LUD: "#2b6fc9",
  LRN: "#0d3a6b",
  LEXD: "#1f2f4a",
  LUXD: "#16233a",
};

const NUANCE_LABEL: Record<string, string> = {
  LEXG: "Extrême gauche",
  LFI: "La France insoumise",
  LCOM: "Communiste",
  LSOC: "Socialiste",
  LUG: "Union de la gauche",
  LVEC: "Écologiste",
  LDVG: "Divers gauche",
  LDIV: "Divers",
  LREG: "Régionaliste",
  LDVC: "Divers centre",
  LENS: "Ensemble",
  LMDM: "Modem",
  LUDI: "UDI",
  LLR: "Les Républicains",
  LDVD: "Divers droite",
  LUD: "Union de la droite",
  LRN: "Rassemblement national",
  LEXD: "Extrême droite",
  LUXD: "Union extrême droite",
};

function formatPct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")} %`;
}

function deltaLabel(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "= national";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded).toFixed(1).replace(".", ",")} pts`;
}

function sieges(liste: MunicipalesListeDto): string | null {
  if (liste.siegesCm === null || liste.siegesCm === 0) return null;
  return `${liste.siegesCm} siège${liste.siegesCm > 1 ? "s" : ""}`;
}

/** Mode nuancé : barres commune / France, comme la card présidentielle. */
function NuancedList({ listes }: { listes: MunicipalesListeDto[] }) {
  const max = Math.max(
    ...listes.flatMap((l) => [l.pctExprimes, l.pctNational ?? 0]),
    1,
  );

  return (
    <ul className="elections-list">
      {listes.map((liste) => {
        const color = liste.nuance ? (NUANCE_COLOR[liste.nuance] ?? "#6b7280") : "#6b7280";
        const label = liste.nuance ? (NUANCE_LABEL[liste.nuance] ?? liste.nuance) : "Sans étiquette";
        const delta = liste.pctNational === null ? null : liste.pctExprimes - liste.pctNational;
        const nbSieges = sieges(liste);

        return (
          <li key={liste.panneau} className="elections-row">
            <div className="elections-row-head">
              <span className="elections-name">
                {liste.teteDeListe ?? liste.libelle}
                <span className="elections-parti">{label}</span>
              </span>
              {delta !== null && (
                <span
                  className={
                    delta > 0
                      ? "elections-delta-pill elections-delta-up"
                      : delta < 0
                        ? "elections-delta-pill elections-delta-down"
                        : "elections-delta-pill"
                  }
                >
                  {deltaLabel(delta)}
                </span>
              )}
            </div>

            <div className="elections-bar-row">
              <span className="elections-bar-label">Commune</span>
              <div className="elections-bar">
                <div
                  className="elections-bar-fill"
                  style={{ width: `${(liste.pctExprimes / max) * 100}%`, background: color }}
                />
              </div>
              <span className="elections-bar-pct">{formatPct(liste.pctExprimes)}</span>
            </div>

            {liste.pctNational !== null && (
              <div className="elections-bar-row">
                <span className="elections-bar-label">France</span>
                <div className="elections-bar">
                  <div
                    className="elections-bar-fill elections-bar-fill--national"
                    style={{ width: `${(liste.pctNational / max) * 100}%`, background: color }}
                  />
                </div>
                <span className="elections-bar-pct elections-bar-pct--national">
                  {formatPct(liste.pctNational)}
                </span>
              </div>
            )}

            {nbSieges && <p className="municipales-sieges">{nbSieges} au conseil municipal</p>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Mode non nuancé : ni couleur ni comparaison nationale, faute de nuance publiée.
 *
 * Pas de barre non plus : dans les 23 681 communes à liste unique, une barre pleine à
 * 100 % se lirait comme un plébiscite alors qu'elle ne traduit qu'une absence
 * d'adversaire.
 */
function PlainList({ listes }: { listes: MunicipalesListeDto[] }) {
  return (
    <ul className="municipales-plain">
      {listes.map((liste) => {
        const nbSieges = sieges(liste);
        return (
          <li key={liste.panneau}>
            <span className="municipales-plain-name">{liste.libelle}</span>
            <span className="municipales-plain-meta">
              {liste.voix.toLocaleString("fr-FR")} voix · {formatPct(liste.pctExprimes)}
              {nbSieges ? ` · ${nbSieges}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function MunicipalesCard({ municipales }: { municipales: MunicipalesAnalysisDto }) {
  const { tour, participationPct, nuancee, villeEntiere, listes } = municipales;
  if (listes.length === 0) return null;

  const listeUnique = listes.length === 1;

  return (
    <section className="card elections-card">
      <h2>Municipales 2026 — {tour === 1 ? "1er" : "2e"} tour</h2>
      <p className="muted">
        Participation : {formatPct(participationPct)}
        {villeEntiere && " · Résultat de la ville entière : le scrutin municipal ne se décline pas par arrondissement."}
        {listeUnique && " · Une seule liste était en lice."}
      </p>

      {nuancee ? <NuancedList listes={listes} /> : <PlainList listes={listes} />}

      {!nuancee && (
        <p className="elections-footnote">
          Aucune nuance politique n&apos;est publiée pour cette commune : l&apos;État ne
          l&apos;attribue qu&apos;au-delà d&apos;une certaine taille. Les listes sont donc
          présentées sans étiquette.
        </p>
      )}
      <p className="elections-footnote">
        Source : Ministère de l&apos;Intérieur · Résultats des élections municipales des 15
        et 22 mars 2026 (licence Ouverte 2.0).
      </p>
    </section>
  );
}
