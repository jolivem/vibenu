"use client";

import { useId } from "react";
import { HISTORICAL_ERAS } from "./historicalLayers";

/** La pastille « Aujourd'hui » : pas une époque, l'absence de surcouche. */
const TODAY_VALUE = "";

interface TimelineProps {
  /** `null` = aujourd'hui. */
  value: string | null;
  onChange: (eraId: string | null) => void;
}

/**
 * Frise des époques.
 *
 * Des `<input type="radio">` natifs, pas un `role="radiogroup"` reconstruit : le HTML
 * donne gratuitement la navigation ←/→ qui sélectionne au passage — exactement le geste
 * « je remonte le temps » —, le focus roving et l'annonce « 1 sur 7 » aux lecteurs
 * d'écran. Les réimplémenter en JavaScript serait plus de code pour moins bien.
 */
export function EraTimeline({ value, onChange }: TimelineProps) {
  // Deux frises sur une même page se piloteraient l'une l'autre sans nom distinct.
  const name = useId();
  const selected = value ?? TODAY_VALUE;

  const chips = [
    ...HISTORICAL_ERAS.map((era) => ({
      value: era.id,
      year: era.shortLabel,
      label: era.label,
    })),
    { value: TODAY_VALUE, year: "Aujourd'hui", label: "Vue actuelle" },
  ];

  return (
    <fieldset className="era-timeline" aria-label="Époque affichée">
      <div className="era-timeline-track">
        {chips.map((chip) => (
          <label
            key={chip.value || "today"}
            className={chip.value === selected ? "era-chip is-selected" : "era-chip"}
            title={chip.label}
          >
            <input
              type="radio"
              className="visually-hidden"
              name={name}
              value={chip.value}
              checked={chip.value === selected}
              onChange={() => onChange(chip.value === TODAY_VALUE ? null : chip.value)}
            />
            <span className="era-chip-year">{chip.year}</span>
            <span className="era-chip-label">{chip.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface OpacityProps {
  /** 0 à 100. */
  value: number;
  onChange: (value: number) => void;
  /** Désactivé quand aucune époque n'est affichée : il n'y a rien à faire varier. */
  disabled?: boolean;
}

export function OpacitySlider({ value, onChange, disabled }: OpacityProps) {
  return (
    <label className={disabled ? "opacity-slider is-disabled" : "opacity-slider"}>
      <span className="opacity-slider-label">
        Opacité <span className="opacity-slider-value">{value} %</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        // Sans lui, le lecteur d'écran annonce « 60 », sans unité.
        aria-valuetext={`${value} %`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
