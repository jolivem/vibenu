import type { ReactNode } from "react";
import type { RentAnalysisDto, RentIndicatorDto } from "@/types/location-analysis";
import type { RentsMessages } from "@/i18n/messages/fr/analysis/rents";
import { CardInsight } from "@/components/CardInsight";
import { rentDeltaPct, rentExamples, rentOf } from "./rentsModel";
import { CardDetail } from "./readingMode";

/** Repère des pages commune : la moyenne de la ville, absent de l'écran d'analyse. */
export interface RentBenchmark {
  /** « parisienne », « lyonnaise », « marseillaise ». */
  adjectif: string;
  values: Partial<Record<RentIndicatorDto["type"], number>>;
}

/**
 * Loyers d'annonce de la commune (« Carte des loyers », ANIL), par type de bien, avec deux
 * exemples en euros par mois et, en `children`, la carte des communes alentour.
 *
 * Aucun repère départemental ni national : la card dit ce que coûte la location ici ; la
 * carte situe la commune parmi ses voisines, ce qui parle davantage qu'une moyenne nationale.
 *
 * En mode « L'essentiel », les loyers au m² ; les exemples en euros et la carte passent dans
 * le détail. Sur les pages commune (sans mode de lecture), tout est affiché.
 */
export function RentsCard({
  rents,
  m,
  title,
  benchmark,
  insight,
  children,
}: {
  rents: RentAnalysisDto;
  m: RentsMessages;
  /** Titre de remplacement : « Location » sur les pages commune, face à la card « Achat ». */
  title?: string;
  /** Pages commune seulement : écart de chaque loyer à la moyenne de la ville. */
  benchmark?: RentBenchmark | null;
  /** « En bref » des pages commune (légende `legende_loyers`), rendu côté serveur. */
  insight?: string | null;
  /** Carte des communes alentour et sa légende (`.card-map`), construites par l'écran (client). */
  children?: ReactNode;
}) {
  const apartments = (["app", "app12", "app3"] as const)
    .map((t) => rentOf(rents, t))
    .filter((r): r is RentIndicatorDto => r !== null);
  const house = rentOf(rents, "maison");
  const examples = rentExamples(rents);

  return (
    <section className="card rents-card">
      <h2>{title ?? m.title}</h2>

      <CardInsight text={insight} animate={false} />

      <p className="rents-intro">{m.caveat(rents.nomCommune, rents.annee)}</p>

      {apartments.length > 0 && (
        <div className="rents-group">
          <h3>{m.groups.appartements}</h3>
          <RentRows rows={apartments} m={m} benchmark={benchmark} />
        </div>
      )}
      {house && (
        <div className="rents-group">
          <h3>{m.groups.maisons}</h3>
          <RentRows rows={[house]} m={m} benchmark={benchmark} />
        </div>
      )}

      <CardDetail when={examples.length > 0 || Boolean(children)}>
      {examples.length > 0 && (
        <div className="rents-examples">
          <p>{m.examplesLead}</p>
          <table className="rents-examples-table">
            <thead>
              <tr>
                <th scope="col">{m.examplesHead.dwelling}</th>
                <th scope="col">{m.examplesHead.low}</th>
                <th scope="col">{m.examplesHead.estimate}</th>
                <th scope="col">{m.examplesHead.high}</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((e) => (
                <tr key={e.surface}>
                  <th scope="row">
                    {m.exampleRooms(e.pieces)}
                    <strong>{m.exampleSurface(e.surface)}</strong>
                  </th>
                  <td>{e.low !== null ? m.monthly(e.low) : "—"}</td>
                  <td>
                    <strong>{m.monthly(e.monthly)}</strong>
                  </td>
                  <td>{e.high !== null ? m.monthly(e.high) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* La carte ferme la card, débordant jusqu'à ses bords comme celle des ventes DVF. */}
      {children}
      </CardDetail>
    </section>
  );
}

function RentRows({
  rows,
  m,
  benchmark,
}: {
  rows: RentIndicatorDto[];
  m: RentsMessages;
  benchmark?: RentBenchmark | null;
}) {
  return (
    <ul className="rents-rows">
      {rows.map((r) => {
        const note = r.niveau !== "commune" ? m.levelNote[r.niveau] : !r.fiable ? m.fewListings : null;
        const reference = benchmark?.values[r.type];
        const delta = rentDeltaPct(r.loyerM2, reference);
        return (
          <li key={r.type} className="rents-row">
            <span className="rents-type">{m.types[r.type]}</span>
            <strong className="rents-value">{m.perM2(r.loyerM2)}</strong>
            {r.icBas !== null && r.icHaut !== null && (
              <span className="rents-range">{m.range(r.icBas, r.icHaut)}</span>
            )}
            {benchmark && delta !== null && reference !== undefined && (
              <span className={`rents-delta commune-stat-delta ${delta >= 0 ? "is-up" : "is-down"}`}>
                {m.vsCity(delta, benchmark.adjectif, reference)}
              </span>
            )}
            {note && <span className="rents-note">{note}</span>}
          </li>
        );
      })}
    </ul>
  );
}
