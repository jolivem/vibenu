"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Ne monte sa carte qu'une fois le conteneur approché du viewport.
 *
 * L'écran d'analyse porte 4 cartes. Les faire booter toutes au chargement, c'est 4 contextes
 * WebGL et 4 jeux de tuiles pour une seule carte réellement visible — coûteux sur mobile.
 *
 * ⚠️ À ne pas mettre autour de la carte de localisation : c'est elle que la génération du PDF
 * capture, et une carte jamais montée n'a pas de canvas à photographier.
 *
 * Le montage est définitif : on ne démonte pas en sortie de viewport, sinon un aller-retour
 * de scroll relancerait le téléchargement des tuiles.
 */
export function LazyMap({ height, children }: { height: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;

    // Sans IntersectionObserver (navigateur ancien), on monte tout de suite : mieux vaut
    // une page lourde qu'une carte qui n'apparaît jamais.
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      // Marge généreuse : la carte a le temps de charger ses tuiles avant d'être à l'écran.
      { rootMargin: "300px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <div ref={ref} className="lazy-map" style={{ minHeight: height }}>
      {mounted ? children : <div className="lazy-map-skeleton" style={{ height }} aria-hidden />}
    </div>
  );
}
