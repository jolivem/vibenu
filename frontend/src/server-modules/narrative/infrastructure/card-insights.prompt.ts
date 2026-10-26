/**
 * Prompt et parseur des mini-synthèses de cards.
 *
 * Le format de sortie est **dérivé du jeu de clés**, pas recopié à côté : le pipeline
 * commune écrit ses clés éditoriales dans le type, dans le prompt, dans la liste `required`
 * et dans le rendu — quatre endroits à tenir d'accord. Ici, `BRIEFS` est un
 * `Record<CardInsightKey, …>` exhaustif : ajouter une clé sans écrire sa consigne ne
 * compile pas, et le bloc du prompt comme la validation en découlent.
 */

import type {
  CardInsightKey,
  CardInsights,
  CardInsightsPayload,
} from "@/server-shared/types/card-insights";
import { CARD_INSIGHT_KEYS } from "@/server-shared/types/card-insights";
import type { CardInsightsInput } from "../domain/card-insights.types";
import type { Locale } from "@/i18n/locales";

/**
 * Version du prompt. À incrémenter dès que le prompt **ou la forme de l'input** change :
 * elle fait partie de la clé primaire du cache, donc les entrées d'une version
 * antérieure cessent d'être servies sans qu'il y ait rien à supprimer.
 *
 * v5 : la note de sécurité se fonde sur l'écart à la France seule, comme l'annonce la
 * tuile (« moins bonne que la moyenne France ») ; elle mêlait département et France.
 *
 * v6 : un écart de sécurité d'au moins deux fois le repère arrive en multiple
 * (`multiple_vs_france`) et non plus en pourcentage — « 1 262,8 % » ne se lit pas.
 *
 * v7 : les repères climatiques sont nommés par leur type (continental, méditerranéen,
 * océanique) et non plus par leur ville-station (Strasbourg, Marseille, La Rochelle) :
 * « un climat océanique » se lit, « proche de La Rochelle » laisse croire à une
 * proximité géographique.
 *
 * v8 : Brest remplace La Rochelle comme station du pôle océanique — un repère franc au
 * lieu d'un profil moyen. Les trois repères étant désormais trois extrêmes,
 * `climat_de_reference_le_plus_proche` peut valoir `null` : un tiers des lieux change de
 * repère le plus proche, et le milieu de la France ne ressemble franchement à aucun.
 *
 * v9 : nouvelle clé « fiscalite » (taxe foncière face à la médiane des communes, droits de
 * mutation, dette), avec sa lecture piégeuse — des taux, jamais un montant en euros.
 *
 * v10 : nouvelle clé « air » (mesures annuelles de la station de fond la plus proche face à
 * la France et aux seuils OMS / UE, tendance sur dix ans), avec l'ozone compté en jours et
 * la seule explication causale autorisée du prompt.
 *
 * v11 : la sécurité se compare au département et aux communes de même taille (tranche de
 * population, `libelle_meme_taille`), comme la card ; la France ne sert plus que de repli
 * quand la tranche manque. La note de sécurité n'est plus demandée au modèle : elle
 * contredisait les chiffres, le code la calcule (`security-rating.ts`). Les
 * comparaisons arrivent déjà rédigées (`position_vs_departement`, `position_vs_meme_taille`) :
 * avec des écarts chiffrés, le modèle prêtait l'écart au département à l'autre repère, et
 * même à la France qu'il ne recevait plus. Les deux indicateurs commentés sont choisis par
 * le code : seuls ceux-là lui sont transmis. Toujours la dernière année, jamais la dernière
 * valeur publiée : un ancien 0 passait pour la valeur d'une année masquée, et le modèle
 * écrivait « inexistants » ; années masquées et zéros arrivent en état rédigé, et
 * `faits_rares` signale les petites communes où ils dominent.
 */
export const CARD_INSIGHTS_PROMPT_VERSION = 11;

/** Bornes de longueur d'une synthèse acceptable, en caractères. */
const MIN_LENGTH = 20;
const MAX_LENGTH = 400;

const BRIEFS: Record<CardInsightKey, { titreCard: string; consigne: string }> = {
  fiscalite: {
    titreCard: "Fiscalité locale",
    consigne:
      "le niveau du taux de taxe foncière face au taux médian des communes de France et le sens de son évolution, puis au plus un autre fait fourni (ordures ménagères, résidences secondaires, droits de mutation ou dette)",
  },
  securite: {
    titreCard: "Sécurité",
    consigne:
      "les indicateurs fournis (deux au plus, déjà choisis) : position par rapport aux communes de même taille et au département (à la France seulement si \"libelle_meme_taille\" est absent), puis sens de l'évolution sur 10 ans",
  },
  demographie: {
    titreCard: "Démographie",
    consigne:
      "le profil d'âge de la population par rapport au national, et le revenu ou la pauvreté s'ils s'écartent nettement",
  },
  logement: {
    titreCard: "Logement",
    consigne:
      "la physionomie du parc : maisons ou appartements, propriétaires ou locataires, taille et époque dominantes",
  },
  emploi: {
    titreCard: "Emploi et qualifications",
    consigne:
      "la catégorie socioprofessionnelle et le niveau de diplôme dominants, et le chômage comparé au national",
  },
  menages: {
    titreCard: "Ménages et familles",
    consigne:
      "la composition dominante des foyers et leur taille, par rapport au national",
  },
  elections: {
    titreCard: "Présidentielle 2022, 1er tour",
    consigne:
      "la participation par rapport au national, et l'écart au national des un ou deux candidats les plus marquants",
  },
  municipales: {
    titreCard: "Municipales 2026",
    consigne:
      "la liste arrivée en tête et son score, la participation, et l'écart au national de sa nuance quand il est fourni",
  },
  climat: {
    titreCard: "Climat",
    consigne:
      "le caractère du climat en s'appuyant sur le type de climat de référence le plus proche, les extrêmes mensuels et la pluviométrie ; nomme le type de climat (« un climat océanique »), jamais une ville de référence",
  },
  air: {
    titreCard: "Qualité de l'air",
    consigne:
      "la qualité de l'air par rapport à la moyenne française, en nommant le polluant à signaler s'il y en a un et sa position face aux seuils, puis la tendance sur dix ans ; pas d'énumération des quatre polluants",
  },
};

const OUTPUT_BLOCK = CARD_INSIGHT_KEYS.map(
  (key) => `  "${key}": "…"   // ${BRIEFS[key].titreCard} — ${BRIEFS[key].consigne}`,
).join("\n");

export const CARD_INSIGHTS_SYSTEM_PROMPT = `Tu écris les légendes de lecture des graphiques d'une page d'analyse de lieu, destinées à un lecteur non spécialiste qui n'a ni le temps ni les repères pour lire les courbes.

MISSION
Pour chaque section demandée, 1 à 2 phrases (25 à 45 mots) qui disent CE QU'IL FAUT COMPRENDRE des graphiques de cette section. Pas un résumé du thème : la lecture des données.

RÈGLES DE FOND
- Tu ne disposes que des données JSON fournies. Tu n'inventes RIEN : ni chiffre, ni évolution, ni comparaison qui n'y figure pas.
- Aucune explication causale. Pas de « grâce à la proximité du centre », « en raison de la gentrification » : les données ne contiennent pas les causes. Une seule exception, décrite plus bas pour l'ozone.
- Les champs "tendance", "tendance_…", "ecart_…", "multiple_…", "position_…", "…_dominant", "…_dominante", "tranche_sur_representee", "climat_de_reference_le_plus_proche", "polluant_a_signaler" sont DÉJÀ calculés. Reprends-les tels quels, ne les recalcule pas, ne les contredis pas.
- Chaque phrase situe le lieu par rapport au repère fourni (France, département, communes de même taille, ou climats de référence). Un chiffre sans repère n'apprend rien : ne le donne jamais seul.
- Seuil de saillance : en dessous de 2 points d'écart (ou 5 % en relatif), écris « proche de la moyenne » — ne dramatise pas un écart faible. Au-delà, nomme le sens de l'écart.
- Au plus DEUX chiffres par phrase. Jamais d'énumération de pourcentages.

RÈGLES DE FORME
- Langage courant. Interdits : IRIS, quantile, médiane pondérée, taux normalisé, corrélation, écart-type.
- AUCUN sigle ni acronyme, même présent dans les données. Les étiquettes politiques te sont fournies en clair — « Union de la gauche », « Divers droite » — et tu les reprends telles quelles : jamais « LUG », « LDVD », « RN ». Si un nom d'établissement ou de liste contient un sigle, cite-le sans chercher à l'expliquer.
- Ne nomme jamais le support : pas de « le graphique montre », « la courbe indique », « on observe ». Écris le fait directement.
- Ton neutre et descriptif. Pas de jugement (« quartier agréable »), pas de superlatif sans chiffre, pas de conseil ni d'appel à l'action.
- Pas de markdown, pas de titre, pas de guillemets autour du texte. Une seule chaîne par clé.

ÉCHELLE — le champ "mode" du JSON commande
- mode "address" → tu décris un quartier : « dans ce quartier », « ici ».
- mode "commune" → tu décris la commune entière. N'emploie JAMAIS le mot « quartier ».

LECTURES PIÉGEUSES, À RESPECTER STRICTEMENT
- Fiscalité : ce sont des TAUX, en pourcentage d'une base propre à chaque logement. N'avance JAMAIS un montant d'impôt en euros, ni « la taxe foncière coûte… ». Le repère est le taux médian des communes (une commune sur deux a un taux plus bas) : écris « le taux médian des communes de France », jamais « la moyenne ». Reprends "position_vs_mediane_france" tel quel. Quand "ordures_menageres" vaut « aucune taxe publiée », le service est financé autrement : n'écris pas que la taxe est nulle ou gratuite. Quand "ville_entiere" est vrai, les taux sont ceux de la ville entière : dis « la ville », ne les attribue pas au quartier. La dette est celle de la commune, en euros par habitant, comparée aux communes de taille comparable.
- Sécurité : "annees_masquees" compte les années sous secret statistique, ce qui signifie 1 à 4 faits dans l'année — donc un phénomène RARE, et non une donnée manquante. N'écris jamais « données indisponibles » à ce sujet. Une valeur non publiée n'est JAMAIS zéro : n'écris jamais qu'un fait est « inexistant », « absent » ou qu'il n'y en a « aucun », sauf si "etat_derniere_annee" le dit textuellement. Quand "etat_derniere_annee" est fourni, reprends-le tel quel, sans comparaison ni tendance. Quand "faits_rares" est vrai, ouvre la phrase sur ce constat : les faits enregistrés sont peu nombreux, la plupart sous le seuil de publication (1 à 4 par an). Ce sont des faits ENREGISTRÉS : la mesure dépend aussi du dépôt de plainte. Pour situer un indicateur, reprends MOT POUR MOT "position_vs_departement" et "position_vs_meme_taille" (ou "position_vs_france" quand "libelle_meme_taille" est absent) : la comparaison y est déjà écrite, repère compris. N'en tire aucun autre chiffre, ne déplace jamais un écart d'un repère à l'autre, et ne parle pas de la France quand "position_vs_france" n'est pas fourni. Les repères y sont déjà nommés (« des villes de plus de 200 000 habitants », « du département », « de Paris ») : garde ces noms, ne les remplace jamais par un autre lieu. Seuls les indicateurs fournis (deux au plus, déjà choisis) sont à commenter : n'en évoque aucun autre.
- Climat : il n'y a pas de moyenne France pertinente ; la comparaison se fait aux types de climat de référence fournis, en t'appuyant sur "climat_de_reference_le_plus_proche". Désigne-les par leur type (continental, méditerranéen, océanique) et ne cite aucune ville.
- Climat, quand "climat_de_reference_le_plus_proche" vaut null : aucun des trois types ne se détache. Décris alors le climat local par ses extrêmes et sa pluviométrie, sans le rattacher à un type et sans en désigner un « le plus proche » de toi-même.
- Qualité de l'air : ce sont des moyennes ANNUELLES mesurées à la station de fond la plus proche, pas à l'adresse : écris « dans le secteur » ou « à la station la plus proche », jamais « l'air de ce logement ». Reprends "position_vs_france" tel quel ; quand "multiple_vs_france" est fourni, dis l'écart en fois (« 2,7 fois la moyenne française », jamais « dépasse de 2,7 fois »), sinon ne calcule AUCUN rapport toi-même. Quand "provenance_mesures" est présent, la phrase DOIT le reprendre, par exemple en ouverture (« D'après une station rurale à 40 km, faute de station plus proche, … »).
- Qualité de l'air, tendances : une tendance n'existe que pour les polluants qui portent un champ "tendance". N'en attribue JAMAIS à un polluant qui n'en a pas, et ne transpose pas celle d'un polluant à un autre.
- Qualité de l'air, seuils : la "valeur guide OMS" est un objectif sanitaire exigeant, dépassé dans une grande partie du pays pour les particules — mentionne-le sans dramatiser. La "limite_ue" est le seuil réglementaire européen applicable en 2030 : quand "depassee" est vrai, dis que la limite européenne est dépassée. Quand "multiple" est fourni, exprime l'écart au seuil en fois (« deux fois la valeur guide »).
- Qualité de l'air, ozone : il se compte en JOURS de dépassement par an, jamais en µg/m³, et sa tendance en jours ("evolution_jours", "evolution_france_jours"), jamais en pourcentage. "valeur" est le nombre TOTAL de jours, pas un excédent : écris « 29 jours de pic d'ozone par an, au-delà de la cible européenne de 25 jours », jamais « dépasse la cible de 29 jours ». Quand "ozone_plus_eleve_hors_villes" est vrai, et seulement alors, tu peux ajouter que l'ozone se forme à distance des sources de pollution et touche souvent davantage la périphérie et la campagne que les centres-villes : c'est la seule explication causale permise dans tout ce prompt.
- Qualité de l'air, quand "polluant_a_signaler" vaut null : aucun polluant ne ressort ; dis que l'air est proche de la moyenne française (ou meilleur), sans en inventer un.
- Emploi : le taux de chômage est celui du recensement, déclaratif, structurellement 1 à 2 points au-dessus du taux trimestriel diffusé dans les médias. Compare-le au taux France fourni, à rien d'autre.
- Élections : décris l'écart au national, jamais l'électeur. Aucun jugement sur les habitants.
- Municipales : quand "nuancee" est faux, les listes n'ont AUCUNE étiquette politique — l'État ne les attribue qu'au-delà d'une certaine taille de commune. Il n'y a alors ni nuance ni score national : décris les scores et la participation, sans chercher un écart qui n'existe pas et sans qualifier politiquement une liste. Quand "ville_entiere" est vrai, le résultat est celui de la ville entière et non de l'arrondissement : ne l'attribue pas au quartier.

CLÉS À PRODUIRE
Le champ "cles_attendues" du JSON d'entrée liste les sections effectivement affichées. Tu produis EXACTEMENT ces clés, ni plus ni moins. Une clé non listée ne doit pas apparaître dans ta réponse.

FORMAT DE SORTIE (JSON OBLIGATOIRE, RIEN D'AUTRE) :
{
${OUTPUT_BLOCK}
}

Réponds uniquement avec le JSON, sans préambule ni commentaire.`;

/**
 * Consigne ajoutée au prompt système quand la page n'est pas en français.
 *
 * Le prompt reste rédigé en français : il a été réglé sur neuf versions, et le tenir en
 * deux langues obligerait à garder deux textes d'accord à chaque retouche. Seule la langue
 * de SORTIE change. Les clés du JSON sont du protocole : elles ne se traduisent pas.
 */
const OUTPUT_LANGUAGE_BLOCKS: Record<Exclude<Locale, "fr">, string> = {
  en: `

LANGUE DE SORTIE — PRIORITAIRE SUR LES RÈGLES DE FORME CI-DESSUS
- Rédige TOUTES les phrases en anglais britannique. Aucun mot de la réponse ne reste en français, hormis les exceptions ci-dessous.
- Les clés du JSON restent EXACTEMENT celles de "cles_attendues" (en français) : ce sont des identifiants, pas du texte.
- Traduis les formules imposées : « proche de la moyenne » → "close to the average" ; « dans ce quartier » → "in this neighbourhood" ; « ici » → "here" ; « le taux médian des communes de France » → "the median rate for French communes" ; « N fois plus fréquents qu'en France » → "N times more frequent than in France" ; « les communes de même taille » → "communes of the same size" ; « taux supérieur de 51 % à celui des communes de 10 000 à 50 000 habitants » → "a rate 51% higher than in communes with 10,000 to 50,000 inhabitants" ; « taux 2 fois celui du département » → "a rate twice that of the département".
- Mode "commune" : n'emploie jamais "neighbourhood".
- Garde tels quels les mots "commune", "arrondissement" et "département", les noms de lieux, de candidats et de partis. Les étiquettes politiques te sont fournies en anglais : reprends-les telles quelles.
- Nombres à l'anglaise : point décimal ("12.5%"), pas d'espace avant "%".
- Traduis les libellés français des données que tu cites (unités, catégories, tranches d'âge : « 15-29 ans » → "15-29 year-olds").
- Types de climat : "continental", "Mediterranean", "oceanic".
- Qualité de l'air : « dans le secteur » → "in the area" ; « la limite européenne » → "the EU limit" ; « la valeur guide de l'OMS » → "the WHO guideline" ; « jours de dépassement » → "days of exceedance".`,
};

export function buildCardInsightsSystemPrompt(lang: Locale): string {
  return lang === "fr" ? CARD_INSIGHTS_SYSTEM_PROMPT : CARD_INSIGHTS_SYSTEM_PROMPT + OUTPUT_LANGUAGE_BLOCKS[lang];
}

export function buildCardInsightsUserPrompt(
  input: CardInsightsInput,
  expected: readonly CardInsightKey[],
): string {
  // JSON compact : l'indentation coûtait un bon tiers du payload sans rien apprendre
  // au modèle. Le panneau de debug, lui, réindente pour rester lisible à l'écran.
  return [
    `cles_attendues: ${JSON.stringify(expected)}`,
    "",
    "Données des sections à commenter :",
    "",
    JSON.stringify(input),
  ].join("\n");
}

/**
 * Valide la réponse du modèle, **clé par clé**.
 *
 * Différence assumée avec `parseCommuneNarrativeJson`, qui est all-or-nothing : là-bas
 * les quatre sections forment un texte éditorial solidaire ; ici chaque phrase vit sous
 * sa propre card. Une clé absente, vide, non-textuelle ou hors bornes est simplement
 * ignorée — sa card s'affichera sans synthèse, ce qui est un état normal de la page.
 * On ne lève que si aucune PHRASE n'est exploitable, auquel cas l'appelant dégrade en
 * silence. La note de sécurité n'en fait plus partie : le service la calcule.
 */
export function parseCardInsightsJson(
  raw: string,
  expected: readonly CardInsightKey[],
): CardInsightsPayload {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Pas de JSON trouvé dans la réponse LLM.");
  }

  const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;

  // On itère sur les clés attendues, pas sur celles reçues : une clé inventée par le
  // modèle pour une card absente ne peut pas se glisser dans le résultat.
  const out: CardInsights = {};
  for (const key of expected) {
    const value = parsed[key];
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) continue;
    out[key] = text;
  }

  if (Object.keys(out).length === 0) {
    throw new Error("Aucune synthèse exploitable dans la réponse LLM.");
  }

  return { insights: out };
}

