"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import type { NearbySchoolDto, NearbySchoolsDto, SchoolExamResultDto, SchoolIndicatorDto } from "@/types/location-analysis";
import type { SchoolsMessages } from "@/i18n/messages/fr/analysis/schools";
import {
  canSortByName,
  commonDepartmentRefs,
  DEFAULT_DIRECTION,
  hasNotPublished,
  type CommonDepartmentRefs,
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
  // En mode commune, la distance est mesurée depuis le centre de la commune : elle ne dit rien
  // d'un logement. La colonne disparaît, et la liste se range par nom.
  const isCommune = schools.scope === "commune";
  const [sort, setSort] = useState<{ key: SchoolSortKey; direction: SortDirection }>({
    key: isCommune ? "nom" : "distance",
    direction: "asc",
  });
  const rows = useMemo(() => sortSchools(list, sort.key, sort.direction), [list, sort]);
  const commonRefs = useMemo(() => commonDepartmentRefs(list), [list]);
  const hasCommonRef = commonRefs.reussite !== null || commonRefs.ips !== null || commonRefs.eleves !== null;
  const rayon = level === "college" ? schools.rayonColleges : schools.rayonLycees;
  // Sur téléphone, les définitions repoussent le tableau d'un écran entier : elles y sont
  // repliées derrière un bouton. Au-delà, le bouton est masqué et le cadre toujours visible (CSS).
  const [explainOpen, setExplainOpen] = useState(false);
  const explainId = useId();

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
      className={key === "distance" || key === "nom" ? undefined : "num"}
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
          <p className="schools-lead">
            {isCommune
              ? m.leadCommune(level, list.filter((s) => !s.horsCommune).length, list.filter((s) => s.horsCommune).length)
              : m.lead(level, list.length, rayon)}
          </p>
          {children && (
            <div className="card-map card-map--inline">
              <p className="card-map-hint">{m.map.hint}</p>
              {children}
              {hasSector && <p className="card-map-hint schools-sector-hint">{m.map.sectorHint}</p>}
            </div>
          )}
          {/* Tout ce qui ne se lit pas seul dans le tableau, expliqué avant lui ; le pied de card ne garde que la source. */}
          <button
            type="button"
            className="schools-explain-toggle"
            onClick={() => setExplainOpen((v) => !v)}
            aria-expanded={explainOpen}
            aria-controls={explainId}
          >
            {explainOpen ? m.explainToggle.hide : m.explainToggle.show}
          </button>
          <dl id={explainId} className={`schools-explain${explainOpen ? " is-open" : ""}`}>
            {[
              ...m.explain(level),
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
          {/* Téléphone seulement (CSS) : les moyennes répétées sur chaque fiche, dites une fois. */}
          {hasCommonRef && (
            <p className="schools-dept-summary">
              {m.departmentSummary({
                reussite: commonRefs.reussite !== null ? m.percent(commonRefs.reussite) : null,
                ips: commonRefs.ips !== null ? m.ips(commonRefs.ips) : null,
                eleves: commonRefs.eleves !== null ? m.eleves(commonRefs.eleves) : null,
              })}
            </p>
          )}
          <table className="schools-table">
            <thead>
              <tr>
                {isCommune && canSortByName(list) ? header("nom", m.columns.name) : <th scope="col">{m.columns.name}</th>}
                {!isCommune && header("distance", m.columns.distance)}
                {header("reussite", m.columns.reussite, m.columnHelp.reussite)}
                {header("va", m.columns.va, m.columnHelp.va)}
                {header("ips", m.columns.ips, m.columnHelp.ips)}
                {header("eleves", m.columns.eleves, m.columnHelp.eleves)}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <SchoolRow key={s.uai} school={s} m={m} showDistance={!isCommune} commonRefs={commonRefs} />
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="elections-footnote">{m.note(level)}</p>
    </section>
  );
}

function SchoolRow({
  school: s,
  m,
  showDistance,
  commonRefs,
}: {
  school: NearbySchoolDto;
  m: SchoolsMessages;
  showDistance: boolean;
  commonRefs: CommonDepartmentRefs;
}) {
  const exam = primaryExam(s);
  const second = secondaryExam(s);
  const examLabel = (e: SchoolExamResultDto) =>
    s.level === "college" ? null : e === s.bacPro ? m.exam.bacPro : m.exam.bacGt;

  return (
    <tr className={[s.estSecteur && "is-sector", showDistance && "has-distance"].filter(Boolean).join(" ") || undefined}>
      <th scope="row" className="schools-name">
        <span className="schools-title">{s.nom}</span>
        {s.horsCommune && <span className="schools-outside">{m.outside(s.nomCommune, s.distance)}</span>}
        <SchoolBadges school={s} m={m} />
        <SchoolDetails school={s} m={m} />
      </th>
      {showDistance && (
        <td className="schools-distance" data-label={m.columns.distance}>
          {m.distance(s.distance)}
        </td>
      )}
      <td className="num" data-label={m.columnsShort.reussite}>
        <ExamValue
          exams={[exam, second]}
          label={examLabel}
          value={(e) => e.tauxReussite}
          format={m.percent}
          reference={(e) => e.tauxReussiteDepartement}
          commonRef={commonRefs.reussite !== null}
          m={m}
        />
      </td>
      <td className="num" data-label={m.columnsShort.va}>
        <ExamValue exams={[exam, second]} label={examLabel} value={(e) => e.vaReussite} format={m.signed} m={m} />
      </td>
      <td className="num" data-label={m.columnsShort.ips}>
        <Indicator indicator={s.ips} format={m.ips} commonRef={commonRefs.ips !== null} m={m} />
      </td>
      <td className="num" data-label={m.columnsShort.eleves}>
        <Indicator indicator={s.elevesParDivision} format={m.eleves} commonRef={commonRefs.eleves !== null} m={m} />
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
  commonRef = false,
  m,
}: {
  exams: Array<SchoolExamResultDto | null>;
  label: (e: SchoolExamResultDto) => string | null;
  value: (e: SchoolExamResultDto) => number | null;
  format: (v: number) => string;
  reference?: (e: SchoolExamResultDto) => number | null;
  /** Moyenne identique sur toute la liste : masquée sur téléphone, dite au-dessus. */
  commonRef?: boolean;
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
            {ref !== null && <span className={refClass(commonRef)}>{m.department(format(ref))}</span>}
          </span>
        );
      })}
    </>
  );
}

function Indicator({
  indicator,
  format,
  commonRef = false,
  m,
}: {
  indicator: SchoolIndicatorDto | null;
  format: (v: number) => string;
  commonRef?: boolean;
  m: SchoolsMessages;
}) {
  if (!indicator) return <NotPublished m={m} />;
  return (
    <span className="schools-value">
      <strong>{format(indicator.valeur)}</strong>
      {indicator.departement !== null && (
        <span className={refClass(commonRef)}>{m.department(format(indicator.departement))}</span>
      )}
    </span>
  );
}

const refClass = (common: boolean) => (common ? "schools-ref is-common" : "schools-ref");

function NotPublished({ m }: { m: SchoolsMessages }) {
  return (
    <span className="schools-np" title={m.notPublishedHelp}>
      {m.notPublished}
    </span>
  );
}

/** Secteur, public/privé, éducation prioritaire, voies, puis l'offre (cantine, sections…). */
function SchoolBadges({ school: s, m }: { school: NearbySchoolDto; m: SchoolsMessages }) {
  const badges: Array<{ key: string; text: string; strong?: boolean }> = [];
  if (s.estSecteur) badges.push({ key: "secteur", text: m.sectorBadge, strong: true });
  badges.push({ key: "secteur-pp", text: m.secteur[s.secteur] });
  if (s.educationPrioritaire) badges.push({ key: "ep", text: m.educationPrioritaire[s.educationPrioritaire] });
  for (const v of s.voies) badges.push({ key: `voie-${v}`, text: m.voies[v] });
  for (const code of s.offre) {
    // La section sportive est détaillée avec ses disciplines, plus bas.
    if (code === "sport" && s.sports.length > 0) continue;
    badges.push({ key: code, text: m.offre[code] });
  }
  return (
    <span className="schools-badges">
      {badges.map((b) => (
        <span key={b.key} className={b.strong ? "schools-badge is-strong" : "schools-badge"}>
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
  // Seule la fiche ONISEP est liée : le site web vient de l'annuaire de l'Éducation
  // nationale, souvent périmé, et la fiche ONISEP y renvoie déjà.
  if (lines.length === 0 && !s.ficheOnisep) return null;
  return (
    <span className="schools-details">
      {lines.map((l) => (
        <span key={l.key} className="schools-detail">
          {l.text}
        </span>
      ))}
      {s.ficheOnisep && (
        <span className="schools-links">
          <a href={s.ficheOnisep} target="_blank" rel="noopener noreferrer">
            {m.links.onisep}
          </a>
        </span>
      )}
    </span>
  );
}
