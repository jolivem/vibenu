"use client";

import { useId } from "react";
import type { HistoricalEra } from "./historicalLayers";

/** La pastille « Aujourd'hui » : pas une époque, l'absence de surcouche. */
const TODAY_VALUE = "";

interface TimelineProps {
  /** `null` = aujourd'hui. */
  value: string | null;
  onChange: (eraId: string | null) => void;
  /**
   * Les époques à proposer — celles que la sonde de couverture a retenues, et non la
   * liste complète : une pastille qui découvre le fond actuel au lieu de la vue
   * ancienne ne se distingue pas d'une pastille qui marche.
   */
  eras: readonly HistoricalEra[];
}

/**
 * Frise des époques.
 *
 * Des `<input type="radio">` natifs, pas un `role="radiogroup"` reconstruit : le HTML
 * donne gratuitement la navigation ←/→ qui sélectionne au passage — exactement le geste
 * « je remonte le temps » —, le focus roving et l'annonce « 1 sur 7 » aux lecteurs
 * d'écran. Les réimplémenter en JavaScript serait plus de code pour moins bien.
 */
export function EraTimeline({ value, onChange, eras }: TimelineProps) {
  // Deux frises sur une même page se piloteraient l'une l'autre sans nom distinct.
  const name = useId();
  const selected = value ?? TODAY_VALUE;

  const chips = [
    ...eras.map((era) => ({
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

interface EraBlendProps {
  /** 0 à 100 : la part de la vue ancienne dans le mélange. */
  value: number;
  onChange: (value: number) => void;
  /** L'époque en cours, pour nommer le pôle droit. `null` = aucune, curseur inactif. */
  era: HistoricalEra | null;
}

/**
 * Le dosage entre la vue d'aujourd'hui et l'époque choisie.
 *
 * S'est longtemps appelé « Opacité », ce qui nommait le mécanisme — `raster-opacity` —
 * et non le geste : le pourcentage n'avait pas de référent (60 % de quoi, vers quoi ?),
 * et c'était le seul terme de logiciel graphique dans une card dont tout le reste est en
 * langage courant. Les deux pôles répondent à la question sans qu'on ait à la poser :
 * chaque extrémité dit ce qu'on voit en y arrivant.
 *
 * Le pourcentage disparaît donc de l'écran, mais pas de l'accessibilité : un curseur qui
 * n'annoncerait que « 60 » à un lecteur d'écran ne dirait rien du tout, d'où le
 * `aria-valuetext` qui le rattache à l'époque. Les pôles sont `aria-hidden` : ils
 * seraient sinon lus en plus du nom du curseur, qui les reprend déjà.
 */
export function EraBlendSlider({ value, onChange, era }: EraBlendProps) {
  // Sans époque il n'y a rien à mélanger. Le curseur reste affiché, inactif : le retirer
  // ferait sauter la mise en page à chaque passage par « Aujourd'hui ».
  const disabled = era === null;
  const oldView = era ? era.shortLabel : "Vue ancienne";

  return (
    <label className={disabled ? "era-blend is-disabled" : "era-blend"}>
      <span className="era-blend-pole" aria-hidden="true">
        Aujourd&apos;hui
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        aria-label={
          era
            ? `Fondu entre la vue actuelle et ${era.label.toLowerCase()} ${era.period}`
            : "Fondu entre la vue actuelle et la vue ancienne"
        }
        aria-valuetext={era ? `${era.period} à ${value} %` : `${value} %`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="era-blend-pole" aria-hidden="true">
        {oldView}
      </span>
    </label>
  );
}
