import type { CommuneEquipmentDto } from "@/types/location-analysis";
import { formatFr } from "@/lib/format";
import { equipmentDensity } from "./communeEquipmentFormat";

/**
 * Les équipements d'une commune entière, en mode commune — la card Voisinage n'y a pas
 * de sens, ses distances partant du centre de la commune.
 *
 * Un nombre seul ne se compare pas d'une commune à l'autre : Rennes aura toujours plus de
 * médecins que Vannes. D'où la densité pour 10 000 habitants, comparée à la France, comme
 * les autres indicateurs de l'écran le sont à leur repère.
 */
export function CommuneEquipmentCard({ equipment }: { equipment: CommuneEquipmentDto }) {
  return (
    <section className="card">
      <h2>Équipements de la commune</h2>

      {equipment.families.map((family) => (
        <div className="poi-family" key={family.title}>
          <h3>{family.title}</h3>
          <ul>
            {family.rubrics.map((rubric) => (
              <li key={rubric.key}>
                {rubric.label} : <strong>{formatFr(rubric.count)}</strong>{" "}
                <span className="poi-distance">— {equipmentDensity(rubric)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="elections-footnote">
        Équipements recensés dans la commune ({formatFr(equipment.population)} habitants),
        et leur densité pour 10 000 habitants comparée à celle de la France entière.
      </p>
      {/* Paris, Lyon, Marseille : la BPE rattache des équipements à l'adresse de leur
          gestionnaire, et un arrondissement peut hériter de ceux de toute la ville. */}
      {equipment.isArrondissement && (
        <p className="elections-footnote">
          La BPE rattache certains équipements à l&apos;adresse de leur gestionnaire : à
          l&apos;échelle d&apos;un arrondissement, les nombres peuvent être surestimés ou
          sous-estimés. La comparaison à la France n&apos;est pas affichée quand
          l&apos;arrondissement concentre plus de la moitié des équipements de sa ville.
        </p>
      )}
      <p className="elections-footnote">Source : INSEE · Base permanente des équipements 2025.</p>
    </section>
  );
}
