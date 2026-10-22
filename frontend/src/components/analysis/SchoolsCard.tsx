"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { NearbySchoolDto, NearbySchoolsDto, SchoolExamResultDto, SchoolIndicatorDto } from "@/types/location-analysis";
import type { SchoolsMessages } from "@/i18n/messages/fr/analysis/schools";
import {
  DEFAULT_DIRECTION,
  hasNotPublished,
  primaryExam,
  secondaryExam,
  sortSchools,
  type SchoolSortKey,
  type SortDirection,
} from "./schoolsModel";

/**
 * Card « Collèges » ou « Lycées » de la section Enseignement : un tableau des
 * établissements alentour, trié par distance, que le lecteur retrie par colonne.
 *
 * Pas de note ni de rang : la DEPP déconseille les palmarès, et le principe de l'écran est
 * de montrer chaque indicateur dans son unité, à côté de sa référence — ici la moyenne du
 * département. Sur téléphone, chaque ligne devient une fiche (CSS, `data-label`).
 */
export function SchoolsCard({
  level,
  schools,
  m,
  hasSector = false,
  children,
}: {
  level: "college" | "lycee";
  schools: NearbySchoolsDto;
  m: SchoolsMessages;
  /** Collèges, à Paris : la carte montre le secteur de l'adresse, qu'on explique dessous. */
  hasSector?: boolean;
  /**
   * Carte des établissements du niveau, construite par l'écran (client). Posée sous la
   * ligne de tête plutôt qu'en fin de card : elle resterait sinon sous dix lignes de tableau.
   */
  children?: ReactNode;
}) {
  const list = level === "college" ? schools.colleges : schools.lycees;
  const [sort, setSort] = useState<{ key: SchoolSortKey; direction: SortDirection }>({
    key: "distance",
    direction: "asc",
  });
  const rows = useMemo(() => sortSchools(list, sort.key, sort.direction), [list, sort]);
  const rayon = level === "college" ? schools.rayonColleges : schools.rayonLycees;

  function toggle(key: SchoolSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: DEFAULT_DIRECTION[key] },
    );
  }

  const header = (key: SchoolSortKey, label: string, help?: string) => (
    <th
      scope="col"
      className={key === "distance" ? undefined : "num"}
      aria-sort={sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
    >
      <button type="button" onClick={() => toggle(key)} title={help ?? m.sortBy(label)}>
        {label}
        <span className="schools-sort-arrow" aria-hidden>
          {sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );

  return (
    <section className="card schools-card">
      <h2>{m.titles[level]}</h2>
      {list.length === 0 ? (
        <p className="schools-lead">{m.none[level]}</p>
      ) : (
        <>
          <p className="schools-lead">{m.lead(level, list.length, schools.scope, rayon)}</p>
          {children && (
            <div className="card-map card-map--inline">
              <p className="card-map-hint">{m.map.hint}</p>
              {children}
              {hasSector && <p className="card-map-hint schools-sector-hint">{m.map.sectorHint}</p>}
            </div>
          )}
          {/* Les deux colonnes qui ne se lisent pas seules, expliquées avant le tableau. */}
          <dl className="schools-explain">
            {[
              ...m.explain(level),
              // Un sigle n'est défini que si un établissement de la liste l'affiche.
              ...(["ulis", "segpa"] as const)
                .filter((code) => list.some((s) => s.offre.includes(code)))
                .map((code) => m.explainOffer[code]),
              ...(hasNotPublished(list) ? [m.explainNotPublished] : []),
            ].map((e) => (
              <div key={e.term}>
                <dt>
                  {e.term}
                  {m.labelSeparator}
                </dt>
                <dd>{e.definition}</dd>
              </div>
            ))}
          </dl>
          <table className="schools-table">
            <thead>
              <tr>
                <th scope="col">{m.columns.name}</th>
                {header("distance", m.columns.distance)}
                {header("reussite", m.columns.reussite, m.columnHelp.reussite)}
                {header("va", m.columns.va, m.columnHelp.va)}
                {header("ips", m.columns.ips, m.columnHelp.ips)}
                {header("eleves", m.columns.eleves, m.columnHelp.eleves)}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <SchoolRow key={s.uai} school={s} m={m} />
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="elections-footnote">{m.note(level)}</p>
    </section>
  );
}

function SchoolRow({ school: s, m }: { school: NearbySchoolDto; m: SchoolsMessages }) {
  const exam = primaryExam(s);
  const second = secondaryExam(s);
  const examLabel = (e: SchoolExamResultDto) =>
    s.level === "college" ? null : e === s.bacPro ? m.exam.bacPro : m.exam.bacGt;

  return (
    <tr className={s.estSecteur ? "is-sector" : undefined}>
      <th scope="row" className="schools-name">
        <span className="schools-title">{s.nom}</span>
        <SchoolBadges school={s} m={m} />
        <SchoolDetails school={s} m={m} />
      </th>
      <td data-label={m.columns.distance}>{m.distance(s.distance)}</td>
      <td className="num" data-label={m.columns.reussite}>
        <ExamValue
          exams={[exam, second]}
          label={examLabel}
          value={(e) => e.tauxReussite}
          format={m.percent}
          reference={(e) => e.tauxReussiteDepartement}
          m={m}
        />
      </td>
      <td className="num" data-label={m.columns.va}>
        <ExamValue exams={[exam, second]} label={examLabel} value={(e) => e.vaReussite} format={m.signed} m={m} />
      </td>
      <td className="num" data-label={m.columns.ips}>
        <Indicator indicator={s.ips} format={m.ips} m={m} />
      </td>
      <td className="num" data-label={m.columns.eleves}>
        <Indicator indicator={s.elevesParDivision} format={m.eleves} m={m} />
      </td>
    </tr>
  );
}

/** Une valeur par examen (deux pour un lycée polyvalent), chacune avec sa référence. */
function ExamValue({
  exams,
  label,
  value,
  format,
  reference,
  m,
}: {
  exams: Array<SchoolExamResultDto | null>;
  label: (e: SchoolExamResultDto) => string | null;
  value: (e: SchoolExamResultDto) => number | null;
  format: (v: number) => string;
  reference?: (e: SchoolExamResultDto) => number | null;
  m: SchoolsMessages;
}) {
  const present = exams.filter((e): e is SchoolExamResultDto => e !== null);
  if (present.length === 0) return <NotPublished m={m} />;
  return (
    <>
      {present.map((e, i) => {
        const v = value(e);
        const ref = reference?.(e) ?? null;
        const tag = present.length > 1 ? label(e) : null;
        return (
          <span key={i} className="schools-value">
            {tag && <span className="schools-exam">{tag}</span>}
            {v === null ? <NotPublished m={m} /> : <strong>{format(v)}</strong>}
            {ref !== null && <span className="schools-ref">{m.department(format(ref))}</span>}
          </span>
        );
      })}
    </>
  );
}

function Indicator({
  indicator,
  format,
  m,
}: {
  indicator: SchoolIndicatorDto | null;
  format: (v: number) => string;
  m: SchoolsMessages;
}) {
  if (!indicator) return <NotPublished m={m} />;
  return (
    <span className="schools-value">
      <strong>{format(indicator.valeur)}</strong>
      {indicator.departement !== null && (
        <span className="schools-ref">{m.department(format(indicator.departement))}</span>
      )}
    </span>
  );
}

function NotPublished({ m }: { m: SchoolsMessages }) {
  return (
    <span className="schools-np" title={m.notPublishedHelp}>
      {m.notPublished}
    </span>
  );
}

/** Secteur, public/privé, éducation prioritaire, voies, puis l'offre (cantine, sections…). */
function SchoolBadges({ school: s, m }: { school: NearbySchoolDto; m: SchoolsMessages }) {
  const badges: Array<{ key: string; text: string; title?: string; strong?: boolean }> = [];
  if (s.estSecteur) badges.push({ key: "secteur", text: m.sectorBadge, strong: true });
  badges.push({ key: "secteur-pp", text: m.secteur[s.secteur] });
  if (s.educationPrioritaire) badges.push({ key: "ep", text: m.educationPrioritaire[s.educationPrioritaire] });
  for (const v of s.voies) badges.push({ key: `voie-${v}`, text: m.voies[v] });
  for (const code of s.offre) {
    // La section sportive est détaillée avec ses disciplines, plus bas.
    if (code === "sport" && s.sports.length > 0) continue;
    badges.push({ key: code, text: m.offre[code], title: m.offreHelp[code] });
  }
  return (
    <span className="schools-badges">
      {badges.map((b) => (
        <span key={b.key} className={b.strong ? "schools-badge is-strong" : "schools-badge"} title={b.title}>
          {b.text}
        </span>
      ))}
    </span>
  );
}

/** Lignes secondaires : sections sportives, langues, insertion (lycée pro), liens. */
function SchoolDetails({ school: s, m }: { school: NearbySchoolDto; m: SchoolsMessages }) {
  const lines: Array<{ key: string; text: string }> = [];
  if (s.sports.length > 0) lines.push({ key: "sports", text: m.sports(s.sports) });
  // Au collège, la LV1 est presque toujours l'anglais : c'est l'offre de LV2 qui distingue.
  if (s.level === "lycee" && s.langues.lv1.length > 0) lines.push({ key: "lv1", text: m.langues.lv1(s.langues.lv1) });
  if (s.langues.lv2.length > 0) lines.push({ key: "lv2", text: m.langues.lv2(s.langues.lv2) });
  if (s.langues.lca.length > 0) lines.push({ key: "lca", text: m.langues.lca(s.langues.lca) });
  if (s.insertion?.tauxEmploi6Mois != null) {
    lines.push({ key: "insertion", text: m.insertion(s.insertion.tauxEmploi6Mois, s.insertion.annee) });
  }
  const hasLinks = s.ficheOnisep || s.siteWeb;
  if (lines.length === 0 && !hasLinks) return null;
  return (
    <span className="schools-details">
      {lines.map((l) => (
        <span key={l.key} className="schools-detail">
          {l.text}
        </span>
      ))}
      {hasLinks && (
        <span className="schools-links">
          {s.ficheOnisep && (
            <a href={s.ficheOnisep} target="_blank" rel="noopener noreferrer">
              {m.links.onisep}
            </a>
          )}
          {s.siteWeb && (
            <a href={s.siteWeb} target="_blank" rel="noopener noreferrer">
              {m.links.site}
            </a>
          )}
        </span>
      )}
    </span>
  );
}
