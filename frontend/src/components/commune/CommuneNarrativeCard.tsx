import type { CommuneNarrativeContent } from "@/server-modules/narrative/domain/commune-narrative.types";

interface Props {
  content: CommuneNarrativeContent;
  nomCourt: string;
}

/**
 * Les clés éditoriales, à l'exclusion de `legendes` qui n'est pas du texte et vit sous les
 * sections chiffrées de la page, pas ici.
 */
type EditorialKey = Exclude<keyof CommuneNarrativeContent, "legendes">;

const SECTIONS: Array<{
  key: EditorialKey;
  title: string;
  id: string;
}> = [
  { key: "identite", title: "Identité", id: "identite" },
  { key: "cadre_de_vie", title: "Cadre de vie", id: "cadre" },
];

/**
 * Chapeau éditorial de la page, en card sous la carte de situation.
 *
 * Hors sommaire : ce n'est pas une tranche thématique mais l'introduction de toutes les
 * autres. Les sous-ancres `identite` et `cadre` restent, elles sont déjà servies.
 */
export function CommuneNarrativeCard({ content, nomCourt }: Props) {
  return (
    <section className="card commune-lede">
      <h2>Synthèse {nomCourt}</h2>

      <div className="commune-narrative">
        {SECTIONS.map((s) => (
          <article key={s.key} className="commune-narrative-block" id={s.id}>
            <h3 className="commune-narrative-title">{s.title}</h3>
            <p className="commune-narrative-text">{content[s.key]}</p>
          </article>
        ))}
      </div>

      <p className="elections-footnote">Rédigée par IA à partir des données publiques.</p>
    </section>
  );
}
