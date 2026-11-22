/* eslint-disable @next/next/no-img-element -- images statiques déjà dimensionnées et compressées */
import data from "./data.json";

type Lieu = (typeof data.lieux)[number];
type Epoque = (typeof data.epoques)[number];

const periode = (e: Epoque) => (e.fin ? `${e.debut}-${e.fin}` : e.environ ? `vers ${e.debut}` : String(e.debut));

/** Une paire avant / après pour un lieu. */
export function AvantApres({ lieu: id, note }: { lieu: string; note?: string }) {
  const lieu: Lieu | undefined = data.lieux.find((l) => l.id === id);
  if (!lieu) throw new Error(`Lieu absent de l'instantané : ${id}`);
  const { largeur, hauteur } = data.capture;
  return (
    <figure className="article-avant-apres">
      <div className="article-avant-apres-paire">
        <figure>
          <img
            src={lieu.images["1950"]}
            width={largeur}
            height={hauteur}
            loading="lazy"
            alt={`${lieu.nom}, photographie aérienne des années 1950-1965`}
          />
          <figcaption>1950-1965</figcaption>
        </figure>
        <figure>
          <img
            src={lieu.images.aujourdhui}
            width={largeur}
            height={hauteur}
            loading="lazy"
            alt={`${lieu.nom}, photographie aérienne actuelle`}
          />
          <figcaption>Aujourd&apos;hui</figcaption>
        </figure>
      </div>
      <figcaption className="article-avant-apres-legende">
        {lieu.nom}, {lieu.precision}. {note ? `${note} ` : ""}Photographies aériennes © IGN.
      </figcaption>
    </figure>
  );
}

/** Les époques de la frise de la card « Le lieu autrefois ». */
export function Epoques() {
  return (
    <div className="article-table-wrap">
      <table className="article-table">
        <caption>Les {data.nbEpoques} époques de la fiche « Le lieu autrefois »</caption>
        <thead>
          <tr>
            <th scope="col">Époque</th>
            <th scope="col">Document</th>
          </tr>
        </thead>
        <tbody>
          {data.epoques.map((e) => (
            <tr key={e.id}>
              <th scope="row">{periode(e)}</th>
              <td>{e.nom}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
