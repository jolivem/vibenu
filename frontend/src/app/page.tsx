import { SearchPanel } from "@/components/search/SearchPanel";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">BienVu</p>
        <h1>Analyse une adresse avant de louer ou acheter</h1>
        <p className="hero-text">
          Saisis une adresse en France pour obtenir une lecture simple de la mobilité, des risques
          et du contexte local.
        </p>
        <SearchPanel />
      </section>
    </main>
  );
}
