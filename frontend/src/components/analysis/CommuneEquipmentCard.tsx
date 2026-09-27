import type { CommuneEquipmentDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import {
  absentLine,
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
export function CommuneEquipmentCard({ equipment }: { equipment: CommuneEquipmentDto }) {
  const withDensity = showsDensity(equipment.population);
  return (
    <section className="card">
      <h2>Équipements de la commune</h2>

      {equipment.families.map((family) => {
        const { present, absent } = splitRubrics(family.rubrics);
        return (
          <div className="poi-family" key={family.title}>
            <h3>{family.title}</h3>
            <ul>
              {present.map((rubric) => (
                <li key={rubric.key}>
                  {rubric.label} : <strong>{formatFr(rubric.count)}</strong>
                  {withDensity && (
                    <>
                      {" "}
                      <span className="poi-distance">— {equipmentDensity(rubric)}</span>
                    </>
                  )}
                </li>
              ))}
              {absent.length > 0 && <li className="poi-distance">{absentLine(absent)}</li>}
            </ul>
          </div>
        );
      })}

      <p className="elections-footnote">{equipmentFootnote(equipment)}</p>
      {/* Paris, Lyon, Marseille : le recensement rattache des équipements à l'adresse de
          leur gestionnaire, et un arrondissement peut hériter de ceux de toute la ville. */}
      {equipment.isArrondissement && (
        <p className="elections-footnote">
          Le recensement rattache certains équipements à l&apos;adresse de leur
          gestionnaire : à l&apos;échelle d&apos;un arrondissement, les nombres peuvent être
          surestimés ou sous-estimés. La comparaison à la France n&apos;est pas affichée
          quand l&apos;arrondissement concentre plus de la moitié des équipements de sa
          ville.
        </p>
      )}
    </section>
  );
}
