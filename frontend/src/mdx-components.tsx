import type { MDXComponents } from "mdx/types";

/** Exigé par `@next/mdx` avec l'App Router. Les composants d'article sont importés par chaque `.mdx`. */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return components;
}
