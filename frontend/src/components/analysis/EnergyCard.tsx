import type {
  AnalysisMode,
  DpeClassDto,
  DpeCountsDto,
  DpeDistributionDto,
  DpeRecordDto,
  EnergyAnalysisDto,
} from "@/types/location-analysis";
import type { EnergyMessages } from "@/i18n/messages/fr/analysis/energy";
import { RichText } from "@/components/RichText";
import {
  DPE_CLASSES,
  DPE_COLORS,
  DPE_LIST_MAX_FULL,
  DPE_LIST_VISIBLE,
  DPE_TEXT_COLORS,
  dpeShares,
  dominantBuildPeriod,
  dpeVerifyUrl,
  rentalBanCalendar,
} from "./energyModel";
import { CardDetail } from "./readingMode";

/** Sous cette part (en %), la lettre ne tient pas dans son segment : seule la couleur reste. */
const MIN_SHARE_FOR_LETTER = 6;

/**
 * Performance énergétique : répartition des étiquettes DPE à l'adresse, dans la commune et
 * en France, en barres empilées de A à G aux couleurs de l'étiquette.
 *
 * L'essentiel : l'adresse seule (sa barre, ou une phrase quand elle n'a aucun DPE). Sur une
 * rue (pas d'adresse précise), la commune et la France y restent. Pas de card en mode
 * commune : le use-case n'interroge pas l'ADEME.
 *
 * Le détail : la liste des DPE de l'adresse (un par logement), la commune et la France pour
 * comparer, le calendrier d'interdiction de louer, les précautions et la source.
 *
 * La liste des DPE de l'adresse ne montre ni étage, ni porte, ni complément d'adresse : la
 * surface suffit à l'acheteur pour retrouver son logement.
 */
export function EnergyCard({
  energy,
  m,
  mode,
  communeName,
}: {
  energy: EnergyAnalysisDto;
  m: EnergyMessages;
  mode: AnalysisMode;
  /** Libellé de la barre « commune » ; « Commune » à défaut. */
  communeName?: string;
}) {
  type Row = { key: string; label: string; total: number; counts: DpeCountsDto };
  const addressRows: Row[] =
    energy.adresse && energy.adresse.total > 0
      ? [{ key: "adresse", label: m.rows.address, total: energy.adresse.total, counts: energy.adresse.counts }]
      : [];
  const diagnostics = energy.adresse?.diagnostics ?? [];
  const referenceRows: Row[] = (
    [
      ["commune", communeName || m.rows.commune, energy.commune],
      ["france", m.rows.france, energy.france],
    ] as const
  ).flatMap(([key, label, d]: readonly [string, string, DpeDistributionDto | null]) =>
    d && d.total > 0 ? [{ key, label, total: d.total, counts: d.counts }] : [],
  );
  // En mode adresse, l'essentiel ne parle que de l'adresse ; les repères attendent le détail.
  // Sans lecture à l'adresse (une rue), ils restent visibles, sinon la card serait vide.
  const addressOnly = mode === "address" && energy.adresse !== null;
  const essentialRows = addressOnly ? addressRows : [...addressRows, ...referenceRows];
  const detailRows = addressOnly ? referenceRows : [];

  const addressNote = energy.adresse && energy.adresse.total === 0 ? m.addressNone : null;

  const calendar = rentalBanCalendar(energy.codeCommune);

  return (
    <section className="card energy-card">
      <h2>{m.title}</h2>

      {essentialRows.length > 0 && (
        <>
          <div className="dpe-bars">
            {essentialRows.map((r) => (
              <DpeBar key={r.key} label={r.label} total={r.total} counts={r.counts} approx={r.key !== "adresse"} m={m} />
            ))}
          </div>
          <DpeLegend m={m} />
        </>
      )}
      {addressNote && <p className="energy-note">{addressNote}</p>}

      <CardDetail>
        <div className="energy-detail">
          {diagnostics.length > 0 && <DpeList diagnostics={diagnostics} m={m} />}
          {detailRows.length > 0 && (
            <>
              <h3>{m.compareTitle}</h3>
              <div className="dpe-bars">
                {detailRows.map((r) => (
                  <DpeBar key={r.key} label={r.label} total={r.total} counts={r.counts} approx={r.key !== "adresse"} m={m} />
                ))}
              </div>
              {essentialRows.length === 0 && <DpeLegend m={m} />}
            </>
          )}
          <h3>{m.rentalBanTitle}</h3>
          <p>
            <RichText text={m.rentalBan(calendar.steps, calendar.overseas)} />
          </p>
          <ul className="energy-caveats">
            {/* Ce que sont ces chiffres : en tête des précautions, au pied de la card. */}
            {[m.intro, ...m.caveats].map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="energy-source">{m.source(energy.miseAJour)}</p>
        </div>
      </CardDetail>
    </section>
  );
}

function DpeBar({
  label,
  approx,
  total,
  counts,
  m,
}: {
  label: string;
  /** Effectif arrondi (commune, France) : un ordre de grandeur suffit. */
  approx: boolean;
  total: number;
  counts: DpeCountsDto;
  m: EnergyMessages;
}) {
  const shares = dpeShares(counts, total);
  const drawn = DPE_CLASSES.filter((c) => counts[c] > 0);
  const summary = m.barSummary(
    label,
    drawn.map((c) => m.segmentTitle(c, counts[c], shares[c])),
  );
  return (
    <div className="dpe-bar-row">
      <span className="dpe-bar-label">
        {label}
        <span className="dpe-bar-count">{approx ? m.rowCountApprox(total) : m.rowCount(total)}</span>
      </span>
      <span className="dpe-bar" role="img" aria-label={summary}>
        {drawn.map((c) => (
          <span
            key={c}
            className="dpe-bar-seg"
            style={{ width: `${shares[c]}%`, background: DPE_COLORS[c], color: DPE_TEXT_COLORS[c] }}
            title={m.segmentTitle(c, counts[c], shares[c])}
          >
            {shares[c] >= MIN_SHARE_FOR_LETTER ? c : ""}
          </span>
        ))}
      </span>
    </div>
  );
}

function DpeLegend({ m }: { m: EnergyMessages }) {
  return (
    <div className="dpe-legend">
      <span className="dpe-legend-label">{m.legendLabel}</span>
      <span className="dpe-legend-chips" aria-hidden="true">
        {DPE_CLASSES.map((c) => (
          <span key={c} className="dpe-chip" style={{ background: DPE_COLORS[c], color: DPE_TEXT_COLORS[c] }}>
            {c}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Une étiquette en pastille, aux couleurs du DPE. */
function DpeChip({ cls }: { cls: DpeClassDto }) {
  return (
    <span className="dpe-chip" style={{ background: DPE_COLORS[cls], color: DPE_TEXT_COLORS[cls] }}>
      {cls}
    </span>
  );
}

/**
 * Les DPE de l'adresse, un par logement, du plus récent au plus ancien. Une longue liste se
 * replie en partie sous un `<details>` natif : la card reste un composant sans état.
 *
 * La période de construction n'est pas une colonne : saisie par chaque diagnostiqueur, elle
 * est la même partout à une erreur près. On donne en tête celle de la majorité.
 */
function DpeList({ diagnostics, m }: { diagnostics: DpeRecordDto[]; m: EnergyMessages }) {
  const older = diagnostics.reduce((sum, d) => sum + d.anterieurs, 0);
  const period = dominantBuildPeriod(diagnostics);
  const cut = diagnostics.length > DPE_LIST_MAX_FULL ? DPE_LIST_VISIBLE : diagnostics.length;
  const visible = diagnostics.slice(0, cut);
  const rest = diagnostics.slice(cut);
  const head = (
    <thead>
      <tr>
        <th scope="col">{m.list.head.date}</th>
        <th scope="col">{m.list.head.surface}</th>
        <th scope="col">{m.list.head.energy}</th>
        <th scope="col">{m.list.head.ghg}</th>
        <th scope="col">{m.list.head.conso}</th>
        <th scope="col">{m.list.head.number}</th>
      </tr>
    </thead>
  );
  const rows = (list: DpeRecordDto[]) =>
    list.map((d) => (
      <tr key={d.numero}>
        <td>{m.list.date(d.date)}</td>
        <td>{d.surface !== null ? m.list.surface(d.surface) : m.list.missing}</td>
        <td>
          <DpeChip cls={d.energie} />
        </td>
        <td>{d.ges ? <span className="dpe-ges">{d.ges}</span> : m.list.missing}</td>
        <td>{d.consoM2 !== null ? m.list.conso(d.consoM2) : m.list.missing}</td>
        <td>
          <a href={dpeVerifyUrl(d.numero)} target="_blank" rel="noopener noreferrer" title={m.list.verifyTitle}>
            {d.numero}
          </a>
        </td>
      </tr>
    ));

  return (
    <div className="dpe-list">
      <h3>{m.list.title}</h3>
      {period && (
        <p className="energy-built">
          {m.list.builtLead}
          <strong lang="fr">{period}</strong>
        </p>
      )}
      <p className="energy-note">{m.list.intro(older)}</p>
      <div className="dpe-table-wrap">
        <table className="dpe-table">
          {head}
          <tbody>{rows(visible)}</tbody>
        </table>
      </div>
      {rest.length > 0 && (
        <details className="dpe-list-more">
          <summary>{m.list.more(rest.length)}</summary>
          <div className="dpe-table-wrap">
            <table className="dpe-table">
              {head}
              <tbody>{rows(rest)}</tbody>
            </table>
          </div>
        </details>
      )}
      <p className="energy-note">{m.list.classNote}</p>
    </div>
  );
}
