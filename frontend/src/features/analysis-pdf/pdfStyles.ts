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
  serif: "Times-Roman",
  serifBold: "Times-Bold",
  serifItalic: "Times-Italic",
  serifBoldItalic: "Times-BoldItalic",
  mono: "Courier",
} as const;

export const pdfStyles = StyleSheet.create({
  // Page base — editorial cream
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: FONTS.sans,
    fontSize: 10,
    paddingTop: 38,
    paddingBottom: 40,
    paddingHorizontal: 42,
    flexDirection: "column",
  },

  // === Running header (pages 2..5) ===
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
    fontFamily: FONTS.serifItalic,
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
    marginTop: "auto",
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

  // === Chapter heading ===
  chapterEyebrow: {
    fontSize: 9,
    color: COLORS.accent,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginBottom: 4,
  },
  chapterTitle: {
    fontFamily: FONTS.serif,
    fontSize: 28,
    color: COLORS.accent,
    marginBottom: 4,
    lineHeight: 1.05,
  },
  chapterTitleItalic: {
    fontFamily: FONTS.serifItalic,
    color: COLORS.accent,
  },
  chapterSub: {
    fontFamily: FONTS.serifItalic,
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 16,
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
    fontFamily: FONTS.serifItalic,
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
    fontFamily: FONTS.sansBold,
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
    fontSize: 44,
    color: COLORS.text,
    lineHeight: 1.05,
    marginBottom: 6,
  },
  coverTitleItalic: {
    fontFamily: FONTS.serifItalic,
    color: COLORS.accent,
  },
  coverSubtitle: {
    fontFamily: FONTS.serifItalic,
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 22,
  },
  coverMeta: {
    flexDirection: "row",
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairlineStrong,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairlineStrong,
    marginBottom: 22,
  },
  coverMetaItem: {
    flex: 1,
    paddingHorizontal: 14,
  },
  coverMetaItemBordered: {
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.hairline,
  },
  coverMetaLabel: {
    fontSize: 8.5,
    color: COLORS.mutedSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
    fontFamily: FONTS.sansBold,
  },
  coverMetaValue: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: COLORS.text,
  },

  // Green resume block on cover
  resumeBlock: {
    backgroundColor: COLORS.accent,
    color: COLORS.cream,
    padding: 22,
    marginBottom: 8,
  },
  resumeEyebrow: {
    fontSize: 9,
    color: COLORS.cream,
    opacity: 0.85,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginBottom: 8,
  },
  resumeTitle: {
    fontFamily: FONTS.serifItalic,
    fontSize: 19,
    color: COLORS.cream,
    marginBottom: 10,
    lineHeight: 1.2,
  },
  resumeLede: {
    fontSize: 10.5,
    color: COLORS.cream,
    opacity: 0.95,
    lineHeight: 1.6,
  },
  resumeColsWrap: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.3)",
    gap: 18,
  },
  resumeCol: {
    flex: 1,
  },
  resumeColTitle: {
    fontSize: 8.5,
    color: COLORS.cream,
    opacity: 0.85,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginBottom: 6,
  },
  resumeBullet: {
    flexDirection: "row",
    marginBottom: 4,
  },
  resumeBulletDot: {
    fontSize: 10,
    color: COLORS.cream,
    width: 10,
  },
  resumeBulletText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.cream,
    lineHeight: 1.45,
  },

  coverFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: "auto",
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairlineStrong,
  },

  // === Map ===
  mapImage: {
    width: "100%",
    height: 300,
    objectFit: "cover",
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: COLORS.hairlineStrong,
  },

  // === Mobility band ===
  mobilityBand: {
    flexDirection: "row",
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairlineStrong,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairlineStrong,
    marginBottom: 16,
  },
  mobilityStatus: {
    width: 110,
    paddingRight: 14,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.hairline,
  },
  mobilityStatusLabel: {
    fontSize: 8,
    color: COLORS.mutedSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginBottom: 4,
  },
  mobilityStatusValue: {
    fontFamily: FONTS.serifItalic,
    fontSize: 20,
    color: COLORS.accent,
  },
  mobilityList: {
    flex: 1,
    paddingLeft: 18,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mobilityStop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 5,
    width: "50%",
    paddingRight: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
  },
  mobilityStopName: {
    fontSize: 10,
    color: COLORS.text,
    flex: 1,
    paddingRight: 6,
  },
  mobilityStopDist: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.accent,
  },

  // === Global risk green block ===
  globalRisk: {
    backgroundColor: COLORS.accent,
    color: COLORS.cream,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
  },
  globalRiskLeft: {
    width: 130,
    paddingRight: 12,
    borderRightWidth: 0.5,
    borderRightColor: "rgba(255,255,255,0.3)",
  },
  globalRiskLabel: {
    fontSize: 8.5,
    color: COLORS.cream,
    opacity: 0.85,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginBottom: 4,
  },
  globalRiskValue: {
    fontFamily: FONTS.serifItalic,
    fontSize: 28,
    color: COLORS.cream,
  },
  globalRiskRight: {
    flex: 1,
    paddingLeft: 14,
    fontSize: 10,
    color: COLORS.cream,
    opacity: 0.95,
    lineHeight: 1.5,
    justifyContent: "center",
  },
  globalRiskRightText: {
    fontSize: 10,
    color: COLORS.cream,
    opacity: 0.95,
    lineHeight: 1.5,
  },

  // Modéré card highlighted
  modereCard: {
    borderWidth: 0.5,
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amberBg,
    padding: 11,
    marginBottom: 12,
  },
  modereHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  moderePill: {
    backgroundColor: COLORS.amberLight,
    color: COLORS.amberDark,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontFamily: FONTS.sansBold,
    marginRight: 8,
  },
  modereName: {
    fontSize: 10.5,
    color: COLORS.text,
    fontFamily: FONTS.sansBold,
  },
  modereNote: {
    fontFamily: FONTS.serifItalic,
    fontSize: 10,
    color: COLORS.textSoft,
    lineHeight: 1.5,
  },

  // Faibles grid
  faiblesHeader: {
    fontSize: 8.5,
    color: COLORS.mutedSoft,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginTop: 6,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairlineStrong,
  },
  faiblesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  faibleItem: {
    width: "50%",
    paddingRight: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5.5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
  },
  faibleName: {
    fontSize: 10,
    color: COLORS.text,
    flex: 1,
    paddingRight: 6,
  },
  faiblePill: {
    backgroundColor: COLORS.accentLight,
    color: COLORS.accentDark,
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    fontFamily: FONTS.sansBold,
  },

  // === Air quality compact band ===
  airBand: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 12,
  },
  airBandTitle: {
    fontFamily: FONTS.serifItalic,
    fontSize: 14,
    color: COLORS.accent,
    marginRight: 14,
  },
  airBandLevel: {
    fontFamily: FONTS.serif,
    fontSize: 13,
    color: COLORS.text,
    marginRight: 12,
  },
  airBandText: {
    fontSize: 10,
    color: COLORS.muted,
    flex: 1,
    fontFamily: FONTS.serifItalic,
  },

  // === Voisinage ===
  voisStatus: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairlineStrong,
  },
  voisStatusLabel: {
    fontSize: 9,
    color: COLORS.mutedSoft,
    letterSpacing: 1.7,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginRight: 12,
  },
  voisStatusValue: {
    fontFamily: FONTS.serifItalic,
    fontSize: 18,
    color: COLORS.accent,
  },
  voisGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  voisCat: {
    width: "50%",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
  },
  voisCatTitle: {
    fontFamily: FONTS.serifItalic,
    fontSize: 12.5,
    color: COLORS.text,
    marginBottom: 6,
  },
  voisItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 3,
  },
  voisItemName: {
    fontSize: 10,
    color: COLORS.textSoft,
    flex: 1,
    paddingRight: 6,
  },
  voisItemDist: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.accent,
  },

  // === Demographics + Cadastre ===
  demoIris: {
    fontFamily: FONTS.serifItalic,
    fontSize: 12,
    color: COLORS.accent,
    marginBottom: 12,
  },
  demoTable: {
    width: "100%",
    marginBottom: 12,
  },
  demoTableHead: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairlineStrong,
    paddingBottom: 6,
    marginBottom: 4,
  },
  demoTableHeadCell: {
    fontSize: 8.5,
    color: COLORS.mutedSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    flex: 1,
    textAlign: "right",
  },
  demoTableHeadCellFirst: {
    fontSize: 8.5,
    color: COLORS.mutedSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    flex: 1,
    textAlign: "left",
  },
  demoTableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
  },
  demoTableCell: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 9.5,
    color: COLORS.text,
    textAlign: "right",
  },
  demoTableCellIris: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 9.5,
    color: COLORS.accent,
    textAlign: "right",
    fontWeight: 700,
  },
  demoTableCellLabel: {
    flex: 1,
    fontSize: 10,
    color: COLORS.textSoft,
    textAlign: "left",
  },

  chartWrap: {
    backgroundColor: COLORS.paleCream,
    borderWidth: 0.5,
    borderColor: COLORS.hairline,
    padding: 12,
    marginBottom: 14,
  },
  chartHead: {
    fontFamily: FONTS.serifItalic,
    fontSize: 11,
    color: COLORS.accent,
    marginBottom: 8,
  },
  chartNote: {
    fontFamily: FONTS.serifItalic,
    fontSize: 8.5,
    color: COLORS.mutedSoft,
    marginTop: 6,
  },

  // Elections
  elecHeading: {
    fontFamily: FONTS.serifItalic,
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 14,
    marginBottom: 4,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.accent,
  },
  elecSub: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 8,
  },
  elecList: {
    flexDirection: "column",
    gap: 6,
  },
  elecRow: {
    flexDirection: "column",
    gap: 2,
  },
  elecRowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  elecName: {
    fontSize: 9.5,
    color: COLORS.text,
    fontFamily: FONTS.sansBold,
  },
  elecParti: {
    fontSize: 8,
    color: COLORS.mutedSoft,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  elecPct: {
    width: 38,
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.text,
    textAlign: "right",
  },
  elecPairRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  elecBarLabel: {
    width: 42,
    fontSize: 7,
    color: COLORS.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  elecBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#EDEAE0",
    borderRadius: 2.5,
    position: "relative",
  },
  elecBarFill: {
    height: 5,
    borderRadius: 2.5,
  },
  elecBarFillNational: {
    opacity: 0.4,
  },
  elecPctNational: {
    width: 38,
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.muted,
    textAlign: "right",
  },

  // Climate — réutilise la grille des élections avec valeurs plus larges
  climPctValue: {
    width: 70,
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.text,
    textAlign: "right",
  },
  climPctValueNational: {
    width: 70,
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.muted,
    textAlign: "right",
  },
  elecDelta: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: COLORS.muted,
  },
  elecDeltaUp: {
    color: COLORS.accentDark,
  },
  elecDeltaDown: {
    color: COLORS.amberDark,
  },

  // Cadastre
  cadHeading: {
    fontFamily: FONTS.serifItalic,
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 14,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.accent,
  },
  cadCols: {
    flexDirection: "row",
    gap: 18,
  },
  cadCol: {
    flex: 1,
  },
  cadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
  },
  cadRowKey: {
    fontSize: 9.5,
    color: COLORS.muted,
    letterSpacing: 0.4,
  },
  cadRowVal: {
    fontFamily: FONTS.mono,
    fontSize: 9.5,
    color: COLORS.text,
  },
  zonePill: {
    backgroundColor: COLORS.accentLight,
    color: COLORS.accentDark,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
    fontFamily: FONTS.mono,
    fontSize: 9.5,
  },
  prescList: {
    marginTop: 0,
  },
  prescItem: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
  },
  prescBullet: {
    fontFamily: FONTS.serifItalic,
    fontSize: 12,
    color: COLORS.accent,
    width: 12,
  },
  prescText: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.textSoft,
    lineHeight: 1.5,
  },

  // === Real estate compact ===
  immoBlock: {
    marginTop: 10,
  },
  immoHeading: {
    fontFamily: FONTS.serifItalic,
    fontSize: 14,
    color: COLORS.accent,
    marginBottom: 10,
  },
  immoRow: {
    flexDirection: "row",
  },
  immoStat: {
    flex: 1,
    paddingHorizontal: 8,
  },
  immoStatBordered: {
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.hairline,
  },
  immoStatLabel: {
    fontSize: 8,
    color: COLORS.mutedSoft,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontFamily: FONTS.sansBold,
    marginBottom: 4,
  },
  immoStatValue: {
    fontFamily: FONTS.serifItalic,
    fontSize: 16,
    color: COLORS.accent,
  },
  immoStatValueSmall: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    color: COLORS.text,
  },

  // End mark
  endMark: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 6,
    gap: 12,
  },
  endMarkLine: {
    width: 50,
    height: 0.5,
    backgroundColor: COLORS.accent,
    opacity: 0.55,
  },
  endMarkText: {
    fontFamily: FONTS.serifItalic,
    color: COLORS.accent,
    fontSize: 12,
  },

  // Legacy aliases (used by AgeChartPdf)
  small: {
    fontSize: 8.5,
    color: COLORS.muted,
  },
});
