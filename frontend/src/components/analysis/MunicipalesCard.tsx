import type { MunicipalesAnalysisDto, MunicipalesListeDto } from "@/types/location-analysis";
import { CardInsight } from "@/components/CardInsight";
import { NUANCE_LABEL } from "./electionLabels";
import { NEUTRAL_COLOR, NUANCE_COLOR, electionDeltaLabel, formatElectionPct, siegesLabel } from "./electionFormat";


/** Mode nuancé : barres commune / France, comme la card présidentielle. */
function NuancedList({ listes }: { listes: MunicipalesListeDto[] }) {
  const max = Math.max(
    ...listes.flatMap((l) => [l.pctExprimes, l.pctNational ?? 0]),
    1,
  );

  return (
    <ul className="elections-list">
      {listes.map((liste) => {
        const color = liste.nuance ? (NUANCE_COLOR[liste.nuance] ?? NEUTRAL_COLOR) : NEUTRAL_COLOR;
        const label = liste.nuance ? (NUANCE_LABEL[liste.nuance] ?? liste.nuance) : "Sans étiquette";
        const delta = liste.pctNational === null ? null : liste.pctExprimes - liste.pctNational;
        const nbSieges = siegesLabel(liste);
        // Sans tête de liste publiée, le libellé officiel tient ce rang plutôt que de
        // laisser la ligne réduite à sa seule nuance.
        const teteDeListe = liste.teteDeListe ?? liste.libelle;

        return (
          <li key={liste.panneau} className="elections-row">
            <div className="elections-row-head">
              {/* La nuance d'abord : c'est le nom de la liste, et c'est ce qu'on cherche
                  dans un scrutin municipal. La tête de liste, souvent inconnue hors de
                  la commune, la suit au second rang. */}
              <span className="elections-name">
                {label}
                {teteDeListe && <span className="elections-tete">{teteDeListe}</span>}
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
                  {electionDeltaLabel(delta)}
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
              <span className="elections-bar-pct">{formatElectionPct(liste.pctExprimes)}</span>
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
                  {formatElectionPct(liste.pctNational)}
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
        const nbSieges = siegesLabel(liste);
        return (
          <li key={liste.panneau}>
            <span className="municipales-plain-name">{liste.libelle}</span>
            <span className="municipales-plain-meta">
              {liste.voix.toLocaleString("fr-FR")} voix · {formatElectionPct(liste.pctExprimes)}
              {nbSieges ? ` · ${nbSieges}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Les listes du scrutin, sans le cadre ni les notes : les pages commune les reprennent
 * telles quelles.
 *
 * L'aiguillage nuancée/non voyage avec elles, pour qu'un second appelant n'ait pas à
 * réimplémenter la règle — l'État n'attribue de nuance qu'au-delà d'une certaine taille
 * de commune.
 */
export function MunicipalesLists({
  listes,
  nuancee,
}: {
  listes: MunicipalesListeDto[];
  nuancee: boolean;
}) {
  return nuancee ? <NuancedList listes={listes} /> : <PlainList listes={listes} />;
}

export function MunicipalesCard({
  municipales,
  insight,
}: {
  municipales: MunicipalesAnalysisDto;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  const { tour, participationPct, nuancee, villeEntiere, listes } = municipales;
  if (listes.length === 0) return null;

  const listeUnique = listes.length === 1;

  return (
    <section className="card elections-card">
      <h2>Municipales 2026 — {tour === 1 ? "1er" : "2e"} tour</h2>
      <p className="muted">
        Participation : {formatElectionPct(participationPct)}
        {listeUnique && " · Une seule liste était en lice."}
      </p>

      <CardInsight text={insight} />

      <MunicipalesLists listes={listes} nuancee={nuancee} />

      {villeEntiere && (
        <p className="elections-footnote">
          Résultat de la ville entière : le scrutin municipal ne se décline pas par
          arrondissement.
        </p>
      )}
      {!nuancee && (
        <p className="elections-footnote">
          Aucune nuance politique n&apos;est publiée pour cette commune : l&apos;État ne
          l&apos;attribue qu&apos;au-delà d&apos;une certaine taille. Les listes sont donc
          présentées sans étiquette.
        </p>
      )}
      <p className="elections-footnote">
        Source : Ministère de l&apos;Intérieur · Résultats des élections municipales des 15
        et 22 mars 2026.
      </p>
    </section>
  );
}
