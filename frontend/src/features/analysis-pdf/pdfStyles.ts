import { StyleSheet } from "@react-pdf/renderer";

export const COLORS = {
  bg: "#FAF8F2",
  text: "#1A1A1A",
  textSoft: "#2A2A2A",
  muted: "#5A5A5A",
  mutedSoft: "#8A8A8A",
  hairline: "#E5DFCD",
  hairlineStrong: "#CDC6B3",
  accent: "#4B9319",
  accentDark: "#3B6D11",
  accentLight: "#EEF5E2",
  amber: "#BA7517",
  amberDark: "#854F0B",
  amberLight: "#FAEEDA",
  amberBg: "#FDF6E9",
  white: "#FFFFFF",
  cream: "#FAF8F2",
  darkCream: "#ECE8DD",
  paleCream: "#FAF6E8",
} as const;

export const FONTS = {
  sans: "Helvetica",
  sansBold: "Helvetica-Bold",
  serif: "Fraunces",
  serifBold: "Fraunces",
  // Italic aliases retained for type compatibility but render upright (italics removed by design).
  serifItalic: "Fraunces",
  serifBoldItalic: "Fraunces",
  mono: "Courier",
} as const;

export const pdfStyles = StyleSheet.create({
  // Page base — fond blanc : le crème de l'écran coûtait une page d'encre à l'impression.
  page: {
    backgroundColor: COLORS.white,
    color: COLORS.text,
    fontFamily: FONTS.sans,
    fontSize: 10,
    paddingTop: 38,
    // Place réservée au pied de page, positionné en absolu (cf. `runningFooter`).
    paddingBottom: 62,
    paddingHorizontal: 42,
    flexDirection: "column",
  },

  // === Running header ===
  runningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairlineStrong,
    marginBottom: 18,
  },
  runningHeaderLabel: {
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    flex: 1,
  },
  runningHeaderLabelRight: {
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    flex: 1,
    textAlign: "right",
  },
  runningHeaderBrand: {
    fontFamily: FONTS.serif,
    fontSize: 11,
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
  },
  runningHeaderBrandItalic: {
    color: COLORS.accent,
  },

  // === Running footer ===
  runningFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairlineStrong,
    // Fixe et en absolu : répété sur chaque page physique, hors du flux du contenu.
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 22,
  },
  runningFooterDate: {
    fontSize: 8.5,
    color: COLORS.mutedSoft,
    flex: 1,
  },
  runningFooterAddress: {
    fontFamily: FONTS.serif,
    fontSize: 9,
    color: COLORS.muted,
    flex: 2,
    textAlign: "center",
  },
  runningFooterPage: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.accent,
    flex: 1,
    textAlign: "right",
  },

  // === Mini-synthèse IA ===
  /**
   * Mini-synthèse IA, pendant PDF de `.card-insight`.
   *
   * Le liseré d'accent a disparu avec celui de l'écran : le libellé « EN BREF » posé en
   * surtitre (`insightTag`) est le seul marqueur du commentaire généré — et le PDF n'en
   * affichait aucun jusqu'ici, le liseré seul y étant muet.
   */
  insight: {
    fontFamily: FONTS.sans,
    fontSize: 8.5,
    lineHeight: 1.45,
    color: COLORS.textSoft,
    marginBottom: 10,
  },
  /** Surtitre du bloc ci-dessus — le pendant de `.card-insight-tag`, même vert d'accent. */
  insightTag: {
    fontFamily: FONTS.sansBold,
    fontSize: 6.5,
    letterSpacing: 0.6,
    color: COLORS.accent,
    marginTop: 4,
    marginBottom: 1,
  },

  // === Cover page ===
  coverTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  coverBrand: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    color: COLORS.text,
  },
  coverBrandItalic: {
    color: COLORS.accent,
  },
  coverStamp: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  coverEyebrow: {
    fontSize: 9.5,
    color: COLORS.accent,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontFamily: FONTS.serif,
    marginBottom: 12,
  },
  coverEyebrowRule: {
    width: 50,
    height: 0.5,
    backgroundColor: COLORS.accent,
    marginBottom: 14,
  },
  coverTitle: {
    fontFamily: FONTS.serif,
    fontSize: 32,
    color: COLORS.text,
    lineHeight: 1.05,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    color: COLORS.text,
    lineHeight: 1.05,
    marginBottom: 22,
  },

  // Carte de repérage de la fiche : on y situe l'adresse, on ne la lit pas.
  mapImage: {
    width: "100%",
    height: 170,
    objectFit: "cover",
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: COLORS.hairlineStrong,
  },

  // === Pied de fiche — mention IA, sources, lien vers la page en ligne ===
  ficheNotes: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairlineStrong,
  },
  ficheNote: {
    fontSize: 7.5,
    lineHeight: 1.4,
    color: COLORS.muted,
    marginBottom: 2,
  },
  ficheLink: {
    color: COLORS.accent,
  },
});
