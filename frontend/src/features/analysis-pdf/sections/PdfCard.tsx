import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLORS, FONTS } from "../pdfStyles";

/**
 * Le gabarit d'une card de l'écran, en PDF.
 *
 * Le dossier avait sa propre grammaire — tableaux libellé / valeur, grilles à deux
 * colonnes, pastilles de niveau — si bien qu'une même donnée ne se présentait pas de la
 * même façon à l'écran et sur papier. Ces briques reprennent celles des cards :
 * titre de section (`.page-section-title`), card encadrée (`.card`), titre de card
 * (`h2`), sous-titre (`h3`), ligne d'unité (`.metric-unit`), valeur principale
 * (`.cadastre-headline`), liste à puces et note de bas de card (`.elections-footnote`).
 */
const s = StyleSheet.create({
  sectionTitle: {
    fontFamily: FONTS.serif,
    fontSize: 19,
    color: COLORS.accent,
    marginTop: 4,
    marginBottom: 7,
    lineHeight: 1.1,
  },
  // Sur fond blanc, la card ne se détache plus par sa couleur : c'est le liseré qui la
  // délimite, d'où un trait plus soutenu que le filet de l'écran.
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 0.75,
    borderColor: COLORS.hairlineStrong,
    borderRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 6,
  },
  h3: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.text,
    marginTop: 9,
    marginBottom: 3,
  },
  unit: {
    fontSize: 8.5,
    color: COLORS.muted,
    marginBottom: 4,
  },
  headline: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    color: COLORS.accent,
    lineHeight: 1.15,
  },
  subline: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 3,
  },
  text: {
    fontSize: 9.5,
    color: COLORS.textSoft,
    lineHeight: 1.45,
  },
  strong: {
    fontFamily: FONTS.sansBold,
    color: COLORS.text,
  },
  muted: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 6,
  },
  groupLabel: {
    fontSize: 7.5,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLORS.mutedSoft,
    marginTop: 5,
    marginBottom: 1,
  },
  bullet: {
    fontSize: 9.5,
    color: COLORS.textSoft,
    lineHeight: 1.4,
    paddingVertical: 1,
  },
  bulletDetail: {
    fontSize: 8.5,
    color: COLORS.mutedSoft,
  },
  footnote: {
    fontSize: 7.5,
    color: COLORS.mutedSoft,
    lineHeight: 1.4,
    marginTop: 8,
  },
  badge: {
    fontFamily: FONTS.sansBold,
    fontSize: 7.5,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
});

export const pdfCardStyles = s;

/**
 * `minPresenceAhead` : un titre qui n'a plus la place d'être suivi d'un début de contenu
 * passe à la page suivante, plutôt que de rester seul en bas de page.
 */
export function PdfSectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={s.sectionTitle} minPresenceAhead={120}>
      {children}
    </Text>
  );
}

/**
 * `wrap` à `false` pour les cards courtes, qu'on ne veut pas voir coupées en deux.
 *
 * Le repère vide qui précède le cadre porte `minPresenceAhead` : il exige qu'un début
 * de card tienne avec lui sur la page, faute de quoi repère et card passent ensemble à la
 * suivante. Posé sur le titre, il renvoyait le titre seul et laissait en bas de page le
 * haut vide du cadre ; posé sur le cadre, il portait sur la card *suivante* et renvoyait
 * une card entière à la page d'après.
 */
export function PdfCardBox({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) {
  return (
    <>
      <View minPresenceAhead={90} />
      <View style={s.card} wrap={wrap}>
        {children}
      </View>
    </>
  );
}

/**
 * Les polices standard du PDF (Helvetica, Courier) n'ont ni le signe moins typographique
 * (U+2212) ni l'espace fine insécable (U+202F) que `toLocaleString("fr-FR")` insère entre
 * les milliers : « −293 mm » sortait « 293mm » et « 1 716 h » un glyphe parasite. On les
 * ramène à leurs équivalents ASCII dans les valeurs formatées du PDF, sans toucher aux
 * formats partagés avec l'écran, qui les rend correctement.
 *
 * Même traitement pour les emojis, que les polices du PDF n'ont pas non plus.
 */
export function pdfSafe(text: string): string {
  return text
    .replace(/\u2212/g, "-")
    .replace(/[\u00a0\u202f]/g, " ")
    // Les emojis (« ⚠️ » en tête de certains messages Géorisques) n'existent dans aucune
    // police du PDF : ils sortaient en blanc, comme une espace parasite.
    .replace(/\p{Extended_Pictographic}\uFE0F?\s*/gu, "")
    .trim();
}

export function PdfCardTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={s.cardTitle} minPresenceAhead={60}>
      {children}
    </Text>
  );
}

export function PdfH3({ children }: { children: ReactNode }) {
  return <Text style={s.h3}>{children}</Text>;
}

export function PdfUnit({ children }: { children: ReactNode }) {
  return <Text style={s.unit}>{children}</Text>;
}

export function PdfHeadline({ children }: { children: ReactNode }) {
  return <Text style={s.headline}>{children}</Text>;
}

export function PdfSubline({ children }: { children: ReactNode }) {
  return <Text style={s.subline}>{children}</Text>;
}

export function PdfText({ children }: { children: ReactNode }) {
  return <Text style={s.text}>{children}</Text>;
}

/** Ligne grise sous le titre — le pendant de `.card > .muted`. */
export function PdfMuted({ children }: { children: ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}

/** Libellé de groupe en petites capitales — le pendant de `.poi-group-label`. */
export function PdfGroupLabel({ children }: { children: ReactNode }) {
  return <Text style={s.groupLabel}>{children}</Text>;
}

/** Une entrée de liste, suivie d'un détail discret (« — 5 min à pied »). */
export function PdfBullet({ children, detail }: { children: ReactNode; detail?: string | null }) {
  return (
    <Text style={s.bullet}>
      {"•  "}
      {children}
      {detail ? <Text style={s.bulletDetail}>{` — ${detail}`}</Text> : null}
    </Text>
  );
}

export function PdfFootnote({ children }: { children: ReactNode }) {
  return <Text style={s.footnote}>{children}</Text>;
}

export function PdfBadge({
  label,
  background,
  color,
  dashed = false,
}: {
  label: string;
  background: string;
  color: string;
  dashed?: boolean;
}) {
  return (
    <Text
      style={[
        s.badge,
        { backgroundColor: background, color },
        dashed ? { borderWidth: 0.5, borderStyle: "dashed", borderColor: COLORS.hairlineStrong } : {},
      ]}
    >
      {label}
    </Text>
  );
}
