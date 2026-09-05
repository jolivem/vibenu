import type { ReactNode } from "react";
import type { AnalysisMode, DemographicsAnalysisDto } from "@/types/location-analysis";

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  /**
   * Carte du quartier, montée par l'appelant — comme le font déjà `RealEstateCard` et
   * `SchoolSectorCard`. Absente en mode commune, et quand le contour IRIS manque.
   */
  children?: ReactNode;
}

/**
 * En-tête de zone de la section Population.
 *
 * Les quatre cards qui suivent — démographie, logement, emploi, ménages — décrivent
 * toutes le même périmètre : la requête localise un IRIS par son contour, puis joint
 * les trois tables INSEE sur ce même code. Le périmètre est donc nommé une seule fois,
 * au-dessus d'elles, avec la carte qui en montre les limites. Auparavant la carte et le
 * nom du quartier vivaient dans la card Démographie : qui arrivait sur la card Logement
 * n'avait aucun moyen de savoir à quoi « Quartier » renvoyait.
 *
 * En mode commune il n'y a pas d'IRIS à montrer — celui que renvoie le serveur est celui
 * du centroïde, sans rapport avec l'étendue de la ville. Le bandeau se réduit alors à sa
 * ligne de texte, qui dit que tout ce qui suit porte sur la commune entière.
 */
export function PopulationScope({ demographics, mode, children }: Props) {
  const { nomIris, nomCommune, codeIris, communeStats, communeIrisCount } = demographics;

  if (mode === "commune") {
    return (
      <div className="section-scope">
        <p className="section-scope-zone">
          <span className="section-scope-kicker">Commune :</span> {nomCommune || codeIris}
        </p>
        <p className="section-scope-text">
          Toutes les données ci-dessous décrivent la commune entière, sans découpage par
          quartier.
        </p>
      </div>
    );
  }

  // Même prédicat que la colonne « Commune » des quatre tableaux : dans une commune à
  // IRIS unique, elle répéterait le quartier à l'identique.
  const showCommune = communeIrisCount > 1 && communeStats !== null;

  return (
    <div className="section-scope">
      <p className="section-scope-zone">
        <span className="section-scope-kicker">Quartier :</span> {nomIris || codeIris}
        {nomCommune && <span className="section-scope-kicker"> — {nomCommune}</span>}
      </p>
      <p className="section-scope-text">
        Toutes les données ci-dessous décrivent ce quartier IRIS, le découpage de
        l&apos;INSEE en zones d&apos;environ 2 000 habitants
        {children ? ", dont la carte montre les limites." : "."}
      </p>

      {/* Migrée depuis la card Démographie : elle expliquait pourquoi un tableau n'avait
          pas de colonne « Commune », elle explique maintenant pourquoi les quatre n'en
          ont pas — ce que les trois autres cards masquaient jusqu'ici sans le dire. */}
      {!showCommune && nomCommune && (
        <p className="demographics-note">
          Quartier unique pour cette commune — les chiffres du quartier et de la commune
          sont identiques.
        </p>
      )}

      {children ? (
        <div
          className="section-scope-map"
          role="group"
          aria-label={`Limites du quartier ${nomIris || codeIris}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
