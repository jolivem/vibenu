import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Un second serveur de dev (vérification de rendu) doit avoir son propre dossier : deux
  // `next dev` sur le même `.next` se réécrivent le CSS, et les polices de l'autre tombent.
  // Sans la variable, rien ne change — build Docker compris.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
