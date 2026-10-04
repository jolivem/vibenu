"use client";

import { useState } from "react";
import type { ElectionsAnalysisDto } from "@/types/location-analysis";
import { CardInsight } from "@/components/CardInsight";
import type { ElectionsMessages } from "@/i18n/messages/fr/analysis/elections";
import { NEUTRAL_COLOR, PARTI_COLOR } from "./electionFormat";


export function ElectionsCard({
  elections,
  m,
  insight,
}: {
  elections: ElectionsAnalysisDto;
  m: ElectionsMessages;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  // Tri par score communal décroissant
  const sorted = [...elections.candidates].sort(
    (a, b) => b.pctCommune - a.pctCommune,
  );
  // Échelle commune à toutes les barres (pour comparaison visuelle cohérente)
  const max = Math.max(
    ...sorted.flatMap((c) => [c.pctCommune, c.pctNational]),
    1,
  );

  const visibleCount = Math.ceil(sorted.length / 2);
  const visible = expanded ? sorted : sorted.slice(0, visibleCount);
  const hiddenCount = sorted.length - visibleCount;

  return (
    <section className="card elections-card">
      <h2>{m.presidential.title}</h2>
      <p className="muted">
        {m.presidential.participation(elections.participationPct, elections.nationalParticipationPct)}
      </p>

      <CardInsight text={insight} />

      <ul className="elections-list">
        {visible.map((c) => {
          const delta = c.pctCommune - c.pctNational;
          const wCommune = (c.pctCommune / max) * 100;
          const wNational = (c.pctNational / max) * 100;
          const color = PARTI_COLOR[c.parti] ?? NEUTRAL_COLOR;
          return (
            <li key={c.candidat} className="elections-row">
              <div className="elections-row-head">
                <span className="elections-name">
                  {c.candidat}
                  <span className="elections-parti">{c.parti}</span>
                </span>
                <span
                  className={
                    delta > 0
                      ? "elections-delta-pill elections-delta-up"
                      : delta < 0
                        ? "elections-delta-pill elections-delta-down"
                        : "elections-delta-pill"
                  }
                >
                  {m.delta(delta)}
                </span>
              </div>

              <div className="elections-bar-row">
                <span className="elections-bar-label">{m.communeBar}</span>
                <div className="elections-bar">
                  <div
                    className="elections-bar-fill"
                    style={{ width: `${wCommune}%`, background: color }}
                  />
                </div>
                <span className="elections-bar-pct">{m.pct(c.pctCommune)}</span>
              </div>

              <div className="elections-bar-row">
                <span className="elections-bar-label">{m.franceBar}</span>
                <div className="elections-bar">
                  <div
                    className="elections-bar-fill elections-bar-fill--national"
                    style={{ width: `${wNational}%`, background: color }}
                  />
                </div>
                <span className="elections-bar-pct elections-bar-pct--national">
                  {m.pct(c.pctNational)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          className="elections-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? m.presidential.hideOthers : m.presidential.showOthers(hiddenCount)}
        </button>
      )}

      <p className="elections-footnote">{m.presidential.footnote}</p>
    </section>
  );
}
