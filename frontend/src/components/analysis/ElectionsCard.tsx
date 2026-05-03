"use client";

import { useState } from "react";
import type { ElectionsAnalysisDto } from "@/types/location-analysis";

const PARTI_COLOR: Record<string, string> = {
  LO: "#bf3f3f",
  PCF: "#cc0000",
  REN: "#ffc000",
  RES: "#7e857e",
  RN: "#0d3a6b",
  REC: "#1f4068",
  LFI: "#cc0066",
  PS: "#ff8da1",
  EELV: "#3aaa35",
  LR: "#1f5fbf",
  NPA: "#7a1f1f",
  DLF: "#205d96",
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

export function ElectionsCard({ elections }: { elections: ElectionsAnalysisDto }) {
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
      <h2>Présidentielle 2022 — 1er tour</h2>
      <p className="muted">
        Participation : {formatPct(elections.participationPct)} ·{" "}
        France : {formatPct(elections.nationalParticipationPct)}
      </p>

      <ul className="elections-list">
        {visible.map((c) => {
          const delta = c.pctCommune - c.pctNational;
          const wCommune = (c.pctCommune / max) * 100;
          const wNational = (c.pctNational / max) * 100;
          const color = PARTI_COLOR[c.parti] ?? "#6b7280";
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
                  {deltaLabel(delta)}
                </span>
              </div>

              <div className="elections-bar-row">
                <span className="elections-bar-label">Commune</span>
                <div className="elections-bar">
                  <div
                    className="elections-bar-fill"
                    style={{ width: `${wCommune}%`, background: color }}
                  />
                </div>
                <span className="elections-bar-pct">{formatPct(c.pctCommune)}</span>
              </div>

              <div className="elections-bar-row">
                <span className="elections-bar-label">France</span>
                <div className="elections-bar">
                  <div
                    className="elections-bar-fill elections-bar-fill--national"
                    style={{ width: `${wNational}%`, background: color }}
                  />
                </div>
                <span className="elections-bar-pct elections-bar-pct--national">
                  {formatPct(c.pctNational)}
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
          {expanded
            ? "Masquer les autres candidats"
            : `Voir les ${hiddenCount} autres candidats`}
        </button>
      )}

      <p className="elections-footnote">
        Source : Ministère de l&apos;Intérieur · Comparaison commune ↔ France à la même échelle.
      </p>
    </section>
  );
}
