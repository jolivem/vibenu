import type { ReactNode } from "react";
import type { RealEstateMessages } from "@/i18n/messages/fr/analysis/realEstate";
import type { DvfBuildingDto, RealEstateAnalysisDto } from "@/types/location-analysis";
import { CardDetail } from "./readingMode";
import { EXAMPLE_SURFACES, examplePrice, isAddressParcel, marketsShown, parcelParts, visibleBuildingCount } from "./realEstateModel";

interface Props {
  realEstate: RealEstateAnalysisDto;
  m: RealEstateMessages;
  /** Mode de l'analyse : le message d'Alsace-Moselle parle de l'adresse ou de la commune. */
  mode?: "address" | "commune";
  /** Parcelle de l'adresse (cadastre) : ses ventes sont dites « à l'adresse ». */
  addressParcel?: { section: string; numero: string } | null;
  /** Carte thématique, rendue en fin de card et débordant jusqu'à ses bords. */
  children?: ReactNode;
}

export function RealEstateCard({ realEstate, m, mode, addressParcel, children }: Props) {
  const { period, buildings, nearbyTransactionsCount: count } = realEstate;
  const markets = marketsShown(realEstate);
  // Le tableau ne sert qu'autour d'une adresse : en mode commune, l'ordre par distance n'a
  // pas de sens et 500 ventes n'y seraient pas lisibles.
  const showList = Boolean(period && buildings?.length);
  return (
    <section className="card">
      <h2>{m.title}</h2>
      {realEstate.notPublished ? (
        <p>{m.notPublished(mode === "commune")}</p>
      ) : (
        markets.length === 0 && <p>{m.noSale}</p>
      )}
      {markets.map(({ kind, market }) => (
        <div key={kind} className="real-estate-market">
          {market.medianPricePerSqm !== null ? (
            <>
              <p className="real-estate-median">{m.median(m.kinds[kind], market.medianPricePerSqm, market.count)}</p>
              <p className="real-estate-example">{m.example(EXAMPLE_SURFACES[kind], examplePrice(kind, market.medianPricePerSqm))}</p>
            </>
          ) : (
            <p className="real-estate-too-few">{m.tooFew(m.kinds[kind], market.count)}</p>
          )}
        </div>
      ))}
      {markets.length > 0 && count ? (
        <p className="real-estate-period">
          {period && realEstate.radiusMeters !== undefined
            ? m.nearby(count, period.from, period.to, realEstate.radiusMeters)
            : m.communeBasis(count)}
        </p>
      ) : null}
      {children ? (
        <div className="card-map">
          <p className="card-map-hint">{m.mapHint}</p>
          {children}
        </div>
      ) : null}
      <CardDetail when={showList}>
        {buildings && count ? <SalesByBuilding buildings={buildings} sales={count} m={m} addressParcel={addressParcel} /> : null}
      </CardDetail>
    </section>
  );
}

/**
 * Les ventes, immeuble par immeuble : une ligne d'en-tête par immeuble (adresse, distance,
 * fiche BDNB, médiane), puis ses ventes de la plus récente à la plus ancienne. Lisible d'un
 * coup d'œil, sans cliquer sur chaque parcelle de la carte.
 */
function SalesByBuilding({
  buildings,
  sales,
  m,
  addressParcel,
}: {
  buildings: DvfBuildingDto[];
  sales: number;
  m: RealEstateMessages;
  addressParcel?: { section: string; numero: string } | null;
}) {
  const l = m.list;
  const cut = visibleBuildingCount(buildings);
  const visible = buildings.slice(0, cut);
  const rest = buildings.slice(cut);
  const table = (list: DvfBuildingDto[]) => (
    <div className="dvf-table-wrap">
      <table className="dvf-table">
        <thead>
          <tr>
            <th scope="col">{l.head.date}</th>
            <th scope="col">{l.head.type}</th>
            <th scope="col" className="num">{l.head.surface}</th>
            <th scope="col" className="num">{l.head.price}</th>
            <th scope="col" className="num">{l.head.perSqm}</th>
          </tr>
        </thead>
        {list.map((b) => (
          <BuildingRows key={b.key} building={b} m={m} atAddress={isAddressParcel(b, addressParcel)} />
        ))}
      </table>
    </div>
  );
  return (
    <div className="dvf-list">
      <h3>{l.title}</h3>
      <p className="dvf-note">{l.intro(sales, buildings.length)}</p>
      {table(visible)}
      {rest.length > 0 && (
        <details className="dvf-list-more">
          <summary>{l.more(rest.length)}</summary>
          {table(rest)}
        </details>
      )}
      <p className="dvf-note">{l.source}</p>
    </div>
  );
}

function BuildingRows({ building: b, m, atAddress }: { building: DvfBuildingDto; m: RealEstateMessages; atAddress: boolean }) {
  const l = m.list;
  const info = b.building;
  const parts = parcelParts(b.parcelId);
  const name = info?.address ?? (parts ? l.parcel(parts.section, parts.number) : l.unknownParcel);
  // Un usage inconnu d'ici s'affiche tel que les Fichiers fonciers l'écrivent, en français.
  const usageLabel = info?.usage ? l.usages[info.usage] : undefined;
  const facts: ReactNode[] = [
    atAddress ? l.atAddress : l.distance(b.distanceMeters),
    info?.usage ? <span lang={usageLabel ? undefined : "fr"}>{usageLabel ?? info.usage}</span> : null,
    info?.dwellings ? l.dwellings(info.dwellings) : null,
    info?.floors ? l.floors(info.floors) : null,
    info?.periodCode ? (
      <span title={info.periodSource ? l.periodSource[info.periodSource] : undefined}>
        {l.built(l.periods[info.periodCode])}
      </span>
    ) : null,
    l.median(b.medianPricePerSqm),
  ].filter(Boolean);

  return (
    <tbody>
      <tr className="dvf-building">
        <th scope="rowgroup" colSpan={5}>
          {/* Adresse BAN telle que la BDNB la publie : en français dans toutes les langues. */}
          <span className="dvf-building-name" lang={info?.address ? "fr" : undefined}>{name}</span>
          <span className="dvf-building-facts">
            {facts.map((fact, i) => (
              <span key={i}>{fact}</span>
            ))}
          </span>
        </th>
      </tr>
      {b.sales.map((s, i) => (
        <tr key={i}>
          <td data-label={l.head.date}>{l.date(s.date)}</td>
          <td data-label={l.head.type}>
            {l.propertyTypes[s.propertyType] ?? s.propertyType}
            {s.dwellings && s.dwellings > 1 ? ` (${l.saleDwellings(s.dwellings)})` : ""}
          </td>
          <td data-label={l.head.surface} className="num">{l.surface(s.surface)}</td>
          <td data-label={l.head.price} className="num">{l.price(s.price)}</td>
          <td data-label={l.head.perSqm} className="num">{l.perSqm(s.pricePerSqm)}</td>
        </tr>
      ))}
    </tbody>
  );
}
