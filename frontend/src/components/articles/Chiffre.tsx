/** Un chiffre clé d'article, encadré : la valeur, puis ce qu'elle mesure. */
export function Chiffre({ valeur, children }: { valeur: string; children: React.ReactNode }) {
  return (
    <p className="article-chiffre">
      <strong>{valeur}</strong>
      <span>{children}</span>
    </p>
  );
}

/** Une rangée de chiffres clés. */
export function Chiffres({ children }: { children: React.ReactNode }) {
  return <div className="article-chiffres">{children}</div>;
}
