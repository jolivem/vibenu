import type { CommuneEquipmentDto } from "@/types/location-analysis";
import type { NearbyMessages } from "@/i18n/messages/fr/analysis/nearby";
import {
  absentLine,
  familyTitle,
  rubricLabel,
  equipmentDensity,
  equipmentFootnote,
  showsDensity,
  splitRubrics,
} from "./communeEquipmentFormat";

/**
 * Les équipements d'une commune entière, en mode commune — la card Voisinage n'y a pas
 * de sens, ses distances partant du centre de la commune.
 *
 * Un nombre seul ne se compare pas d'une commune à l'autre : Rennes aura toujours plus de
 * médecins que Vannes. D'où la densité pour 10 000 habitants, comparée à la France, comme
 * les autres indicateurs de l'écran le sont à leur repère — sauf dans une petite commune,
 * où une seule unité fausse le ratio. Les rubriques absentes tiennent en une ligne par
 * famille plutôt qu'en une colonne de zéros.
 */
export function CommuneEquipmentCard({
  equipment,
  m,
}: {
  equipment: CommuneEquipmentDto;
  m: NearbyMessages["communeEquipment"];
}) {
  const withDensity = showsDensity(equipment.population);
  return (
    <section className="card">
      <h2>{m.title}</h2>

      {equipment.families.map((family) => {
        const { present, absent } = splitRubrics(family.rubrics);
        return (
          <div className="poi-family" key={family.key}>
            <h3>{familyTitle(family, m)}</h3>
            <ul>
              {present.map((rubric) => (
                <li key={rubric.key}>
                  {m.rubricLead(rubricLabel(rubric, m))}
                  <strong>{m.count(rubric.count)}</strong>
                  {withDensity && (
                    <>
                      {" "}
                      <span className="poi-distance">— {equipmentDensity(rubric, m)}</span>
                    </>
                  )}
                </li>
              ))}
              {absent.length > 0 && <li className="poi-distance">{absentLine(absent, m)}</li>}
            </ul>
          </div>
        );
      })}

      <p className="elections-footnote">{equipmentFootnote(equipment, m)}</p>
      {/* Paris, Lyon, Marseille : le recensement rattache des équipements à l'adresse de
          leur gestionnaire, et un arrondissement peut hériter de ceux de toute la ville. */}
      {equipment.isArrondissement && <p className="elections-footnote">{m.arrondissementNote}</p>}
    </section>
  );
}
