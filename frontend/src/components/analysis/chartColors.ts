/**
 * Les couleurs partagées par les graphiques d'analyse.
 *
 * Elles vivaient en quatre exemplaires — `ageChart`, `inseeChart`, `securityChart`,
 * `climateChart` déclaraient chacun le sien, plus deux valeurs de repli dans le CSS.
 * Six endroits à tenir d'accord pour une seule idée : « la couleur du lieu consulté ».
 */

/**
 * La série du lieu consulté — quartier en mode adresse, commune en mode commune.
 *
 * C'est le vert des titres de card (`--accent` dans `globals.css`, `COLORS.accent` côté
 * PDF). Repris ici en dur et non lu depuis la variable CSS : ces modules alimentent
 * aussi l'export PDF, où `var(--accent)` ne veut rien dire — react-pdf ne connaît pas
 * les variables CSS. Les deux valeurs doivent donc être changées ensemble.
 *
 * ⚠️ `.line-chart-band` et `.line-chart-legend-band` répètent cette valeur dans
 * `globals.css` : la bande d'incertitude est la série locale, elle doit suivre.
 */
export const LOCAL_SERIES_COLOR = "#4B9319";
