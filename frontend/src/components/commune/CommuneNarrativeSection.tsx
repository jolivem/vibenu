import type { CommuneNarrativeContent } from "@/server-modules/narrative/domain/commune-narrative.types";

interface Props {
  content: CommuneNarrativeContent;
  nomCourt: string;
}

/**
 * Les quatre clés éditoriales, à l'exclusion de `legendes` qui n'est pas du texte et
 * vit sous les sections chiffrées de la page, pas ici.
 */
type EditorialKey = Exclude<keyof CommuneNarrativeContent, "legendes">;

const SECTIONS: Array<{
  key: EditorialKey;
  title: string;
  num: string;
  id: string;
}> = [
  { key: "identite", title: "Identité", num: "A", id: "identite" },
  { key: "marche_immobilier", title: "Marché immobilier", num: "B", id: "marche" },
  { key: "cadre_de_vie", title: "Cadre de vie", num: "C", id: "cadre" },
  { key: "profil", title: "À qui s'adresse cet arrondissement", num: "D", id: "profil" },
];

export function CommuneNarrativeSection({ content, nomCourt }: Props) {
  return (
    <section className="commune-section commune-section--alt" id="synthese">
      <div className="commune-section-head">
        <span className="section-num">00</span>
        <h2 className="commune-section-title">
          Synthèse <i>{nomCourt}</i>
        </h2>
        <span className="section-meta">Rédigée par IA · données publiques</span>
      </div>

      <div className="commune-narrative">
        {SECTIONS.map((s) => (
          <article key={s.key} className="commune-narrative-block" id={s.id}>
            <span className="commune-narrative-num">{s.num}</span>
            <h3 className="commune-narrative-title">{s.title}</h3>
            <p className="commune-narrative-text">{content[s.key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
