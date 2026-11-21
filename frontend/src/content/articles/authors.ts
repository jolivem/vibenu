import type { ArticleAuthor } from "./types";

/**
 * Signature des articles. Un article signé d'une personne nommée (avec une page ou un lien
 * qui la présente) pèse plus pour Google qu'une signature d'organisation : à remplacer par
 * l'auteur réel quand il aura choisi de signer de son nom.
 */
export const REDACTION: ArticleAuthor = { nom: "ClaireAdresse", type: "Organization" };
