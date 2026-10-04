import { redirect } from "next/navigation";

/**
 * /commune redirige vers /commune/paris (hub canonique de la phase 0).
 * En phase 2, ce point d'entrée listera plusieurs métropoles.
 */
export default function CommuneIndexPage() {
  redirect("/commune/paris");
}
