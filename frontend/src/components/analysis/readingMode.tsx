"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";

/**
 * Mode de lecture de l'écran d'analyse : « L'essentiel » (par défaut) ou « Détaillé ».
 *
 * Le mode vaut pour toute la page ; chaque card peut ensuite ouvrir ou refermer son propre
 * détail. Changer le mode en haut de page réaligne toutes les cards : chaque choix local
 * est attaché à la « version » du mode sous laquelle il a été fait, et périme avec elle.
 *
 * Hors de l'écran d'analyse (pas de fournisseur), tout est ouvert et aucun bouton ne
 * s'affiche : un composant qui s'en sert reste utilisable tel quel ailleurs.
 */
export type ReadingMode = "essentiel" | "detail";

export interface ReadingModeLabels {
  /** Nom du groupe de boutons, pour les lecteurs d'écran. */
  label: string;
  essential: string;
  detailed: string;
  /** Lien au pied d'une card. */
  show: string;
  hide: string;
}

interface ReadingModeContextValue {
  mode: ReadingMode;
  /** Incrémentée à chaque changement de mode : périme les choix faits card par card. */
  version: number;
  setMode: (mode: ReadingMode) => void;
  labels: ReadingModeLabels;
}

const ReadingModeContext = createContext<ReadingModeContextValue | null>(null);

/** Paramètre d'URL : un lien partagé s'ouvre dans le mode de celui qui l'a envoyé. */
const URL_PARAM = "vue";
/** Dernier choix du lecteur, repris quand l'URL n'en dit rien. */
const STORAGE_KEY = "claireadresse.vue";

function parseMode(value: string | null | undefined): ReadingMode | null {
  return value === "detail" || value === "essentiel" ? value : null;
}

export function ReadingModeProvider({
  urlValue,
  labels,
  children,
}: {
  /** Valeur du paramètre `vue` de l'URL au chargement. */
  urlValue: string | null;
  labels: ReadingModeLabels;
  children: ReactNode;
}) {
  const [state, setState] = useState<{ mode: ReadingMode; version: number }>(() => ({
    mode: parseMode(urlValue) ?? "essentiel",
    version: 0,
  }));

  // Le stockage local n'existe qu'au navigateur : lu après le montage, et seulement si
  // l'URL ne tranche pas. Il peut être indisponible (navigation privée) : on l'ignore.
  useEffect(() => {
    if (parseMode(urlValue)) return;
    try {
      const stored = parseMode(window.localStorage.getItem(STORAGE_KEY));
      if (stored) setState((s) => (s.mode === stored ? s : { mode: stored, version: s.version + 1 }));
    } catch {
      /* stockage indisponible */
    }
  }, [urlValue]);

  const setMode = useCallback((mode: ReadingMode) => {
    setState((s) => ({ mode, version: s.version + 1 }));
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* stockage indisponible */
    }
    // Remplace l'entrée d'historique plutôt que d'en ajouter une : le bouton « Précédent »
    // ne doit pas rejouer chaque bascule.
    const url = new URL(window.location.href);
    if (mode === "detail") url.searchParams.set(URL_PARAM, mode);
    else url.searchParams.delete(URL_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const value = useMemo(() => ({ ...state, setMode, labels }), [state, setMode, labels]);
  return <ReadingModeContext.Provider value={value}>{children}</ReadingModeContext.Provider>;
}

/** Les deux boutons du haut de page. */
export function ReadingModeSwitch({ className }: { className?: string }) {
  const ctx = useContext(ReadingModeContext);
  if (!ctx) return null;
  const { mode, setMode, labels } = ctx;
  const options: Array<{ value: ReadingMode; text: string }> = [
    { value: "essentiel", text: labels.essential },
    { value: "detail", text: labels.detailed },
  ];
  return (
    <div className={["reading-mode", className].filter(Boolean).join(" ")} role="group" aria-label={labels.label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="reading-mode-option"
          aria-pressed={mode === o.value}
          onClick={() => mode !== o.value && setMode(o.value)}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

/**
 * Le détail d'une card est-il ouvert ? Suit le mode de la page tant que le lecteur n'a pas
 * cliqué dans cette card depuis le dernier changement de mode.
 */
export function useCardDetail(): { open: boolean; toggle: (event: MouseEvent<HTMLElement>) => void; enabled: boolean } {
  const ctx = useContext(ReadingModeContext);
  const [override, setOverride] = useState<{ version: number; open: boolean } | null>(null);
  if (!ctx) return { open: true, toggle: () => {}, enabled: false };

  const open = override && override.version === ctx.version ? override.open : ctx.mode === "detail";
  const toggle = (event: MouseEvent<HTMLElement>) => {
    setOverride({ version: ctx.version, open: !open });
    // Refermer depuis le pied d'une longue card laisserait le lecteur loin sous elle :
    // on ramène le haut de la card à l'écran s'il en est sorti.
    if (open) {
      const card = event.currentTarget.closest(".card");
      if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: "start" });
    }
  };
  return { open, toggle, enabled: true };
}

/** Lien « Voir plus » / « Réduire » au pied d'une card. */
export function CardDetailToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: (event: MouseEvent<HTMLElement>) => void;
}) {
  const ctx = useContext(ReadingModeContext);
  if (!ctx) return null;
  return (
    <button type="button" className="card-detail-toggle" aria-expanded={open} onClick={onToggle}>
      {open ? ctx.labels.hide : ctx.labels.show}
    </button>
  );
}

/**
 * Le détail d'une card, replié en mode « L'essentiel », suivi de son lien. Pour une card
 * dont le détail n'est pas un bloc d'un seul tenant (le tableau des écoles), utiliser
 * `useCardDetail` et `CardDetailToggle` directement.
 */
export function CardDetail({
  children,
  when = true,
}: {
  children: ReactNode;
  /** `false` quand la card n'a pas de détail à montrer : ni bloc, ni lien. */
  when?: boolean;
}) {
  const { open, toggle, enabled } = useCardDetail();
  if (!when) return null;
  if (!enabled) return <>{children}</>;
  return (
    <>
      {open && <div className="card-detail">{children}</div>}
      <CardDetailToggle open={open} onToggle={toggle} />
    </>
  );
}
