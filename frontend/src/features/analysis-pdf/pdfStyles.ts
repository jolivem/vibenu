import { StyleSheet } from "@react-pdf/renderer";

export const COLORS = {
  bg: "#f6f7fb",
  card: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  accent: "#78be20",
  accentLight: "#edf7e1",
} as const;

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontSize: 10,
    fontFamily: "Helvetica",
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 28,
  },

  header: {
    backgroundColor: COLORS.accent,
    color: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 6,
    marginBottom: 14,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingLeft: 6,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginTop: 6,
    marginBottom: 4,
  },
  p: {
    fontSize: 10,
    color: COLORS.text,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  muted: {
    color: COLORS.muted,
  },
  small: {
    fontSize: 8,
    color: COLORS.muted,
  },

  bullet: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },

  badge: {
    alignSelf: "flex-start",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },

  // Risk badge variants
  badgeEleve: { backgroundColor: "#fde8e8", color: "#991b1b" },
  badgeModere: { backgroundColor: "#fff3cd", color: "#92400e" },
  badgeFaible: { backgroundColor: "#e8f5e9", color: "#166534" },
  badgeAbsent: { backgroundColor: "#f3f4f6", color: COLORS.muted },

  // Air badge variants
  airBon: { backgroundColor: "#e8f5e9", color: "#166534" },
  airMoyen: { backgroundColor: "#fff3cd", color: "#92400e" },
  airDegrade: { backgroundColor: "#fed7aa", color: "#9a3412" },
  airMauvais: { backgroundColor: "#fde8e8", color: "#991b1b" },
  airTresMauvais: { backgroundColor: "#581c87", color: "#f3e8ff" },

  // Zone badge variants
  zoneU: { backgroundColor: "#dbeafe", color: "#1e40af" },
  zoneAU: { backgroundColor: "#fef3c7", color: "#92400e" },
  zoneA: { backgroundColor: "#d1fae5", color: "#065f46" },
  zoneN: { backgroundColor: "#ecfdf5", color: "#047857" },
  zoneDefault: { backgroundColor: "#f3f4f6", color: COLORS.muted },

  // Risk row
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  riskHighlight: {
    backgroundColor: "#fef9ee",
    borderWidth: 1,
    borderColor: "#f5c542",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },

  // Two-column summary grid (strengths / warnings)
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },

  // Tables
  table: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableHeaderCell: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f9fafb",
    color: COLORS.text,
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    color: COLORS.text,
  },
  tableCellLabel: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#fafbfc",
    color: COLORS.text,
  },

  // Map snapshot
  mapImage: {
    width: "100%",
    height: 240,
    objectFit: "cover",
    borderRadius: 6,
  },

  footer: {
    marginTop: 10,
    fontSize: 7,
    color: COLORS.muted,
    textAlign: "center",
  },
});
