import { Fragment } from "react";
import type { Emphasis, Rich } from "@/i18n/types";

/** Rend un titre à emphase : la partie centrale en italique. */
export function Emphasized({ parts }: { parts: Emphasis }) {
  const [before, emphasis, after] = parts;
  return (
    <>
      {before}
      <i>{emphasis}</i>
      {after}
    </>
  );
}

/** Rend un paragraphe de dictionnaire, segments en gras compris. */
export function RichText({ text }: { text: Rich }) {
  if (typeof text === "string") return <>{text}</>;
  return (
    <>
      {text.map((segment, i) =>
        typeof segment === "string" ? (
          <Fragment key={i}>{segment}</Fragment>
        ) : (
          <strong key={i}>{segment.strong}</strong>
        ),
      )}
    </>
  );
}
