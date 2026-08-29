"use client";

import { useEffect, useRef, useState } from "react";
import { BRANDING } from "@/lib/site-features";

/**
 * Partage de l'analyse courante.
 *
 * Rien à générer : l'URL de `/analyze` porte déjà tous les paramètres (coordonnées, libellé,
 * commune, code INSEE), elle rejoue donc l'analyse à l'identique chez le destinataire.
 *
 * Le menu est un `<details>` natif — ouverture au clavier et au clic sans code. On ne lui
 * ajoute que la fermeture au clic extérieur et à Échap, que le navigateur ne fournit pas.
 *
 * Le champ affichant le lien est là pour le cas où l'écriture dans le presse-papiers échoue :
 * l'API `clipboard` exige un contexte sécurisé (HTTPS ou localhost) et peut être refusée par
 * l'utilisateur. Le lien reste alors sélectionnable à la main.
 */
export function ShareLinks({ label }: { label: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canUseNativeShare, setCanUseNativeShare] = useState(false);

  // Après montage seulement : `window` n'existe pas au rendu serveur, et faire dépendre le
  // balisage de `navigator.share` dès le premier rendu provoquerait un écart d'hydratation.
  useEffect(() => {
    setUrl(window.location.href);
    setCanUseNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const close = () => {
      details.open = false;
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!details.open) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.open) {
        close();
        details.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Le message repart à zéro quelques secondes après la copie, pour rester vrai si
  // l'utilisateur rouvre le menu plus tard.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const shareTitle = `${label} — analyse ${BRANDING.name}`;
  const shareText = `Voici l'analyse de ${label} sur ${BRANDING.name} :`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Presse-papiers refusé ou hors contexte sécurisé : on sélectionne le champ pour que
      // la copie manuelle ne demande qu'un Ctrl+C.
      detailsRef.current?.querySelector("input")?.select();
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url });
      if (detailsRef.current) detailsRef.current.open = false;
    } catch {
      // Partage annulé par l'utilisateur : rien à signaler.
    }
  }

  // Facebook n'accepte plus de texte pré-rempli : son partageur ne lit que `u` et reconstruit
  // le titre depuis les balises Open Graph de la page.
  const targets = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
      icon: <WhatsAppIcon />,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: <FacebookIcon />,
    },
    {
      key: "x",
      label: "X",
      href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
      icon: <XIcon />,
    },
    {
      key: "email",
      label: "E-mail",
      href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${url}`)}`,
      icon: <MailIcon />,
    },
  ];

  return (
    <details className="share-menu" ref={detailsRef}>
      <summary className="share-trigger">Partager</summary>
      <div className="share-panel">
        <p className="share-panel-title">Partager cette analyse</p>

        <div className="share-copy">
          <input type="text" readOnly value={url} aria-label="Lien de l'analyse" />
          <button type="button" onClick={handleCopy}>
            {copied ? "Copié" : "Copier"}
          </button>
        </div>

        <ul className="share-targets">
          {targets.map((target) => (
            <li key={target.key}>
              <a
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`share-icon share-icon-${target.key}`}
                aria-label={`Partager par ${target.label}`}
                title={target.label}
              >
                {target.icon}
              </a>
            </li>
          ))}
          {canUseNativeShare && (
            <li>
              <button
                type="button"
                onClick={handleNativeShare}
                className="share-icon share-icon-native"
                aria-label="Partager via une autre application"
                title="Autre application…"
              >
                <ShareIcon />
              </button>
            </li>
          )}
        </ul>
      </div>
    </details>
  );
}

/*
 * Marques déposées, reproduites telles quelles : les tracés viennent de Simple Icons (CC0) et
 * ne sont ni redessinés ni recolorés. Ils sont inline plutôt que chargés en fichiers pour que
 * le panneau reste autonome — cinq requêtes en moins, et la couleur suit `currentColor`.
 */

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zm-1.291 19.49h2.039L6.486 3.24H4.298z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M1.5 4h21a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 0 18.5v-13A1.5 1.5 0 0 1 1.5 4m20.018 2H2.482L12 13.713zM2 18V8.183l10 8.104 10-8.104V18z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92" />
    </svg>
  );
}
