import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Un second serveur de dev (vérification de rendu) doit avoir son propre dossier : deux
  // `next dev` sur le même `.next` se réécrivent le CSS, et les polices de l'autre tombent.
  // Sans la variable, rien ne change — build Docker compris.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  // `mdx` doit figurer ici pour que Next applique aux articles les mêmes règles qu'au reste
  // de l'App Router (dont la version de React embarquée) ; sans, le MDX compilé lisait le
  // React 18 du projet et le pré-rendu échouait. Aucun `.mdx` ne vit sous `app/` : ce
  // ne sont pas des pages.
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
};

// Les articles (`src/content/articles/<slug>/index.mdx`) sont importés par leur page.
const withMDX = createMDX({});

export default withMDX(nextConfig);
