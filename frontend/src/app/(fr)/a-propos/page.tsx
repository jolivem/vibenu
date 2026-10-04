import { notFound } from "next/navigation";
import { AboutPage, aboutMetadata } from "@/components/about/AboutPage";
import { about } from "@/i18n/messages/fr/about";
import { landing } from "@/i18n/messages/fr/landing";
import { withPseudo } from "@/i18n/pseudo";
import { FEATURES } from "@/lib/site-features";

export const metadata = aboutMetadata("fr", about);

export default function Page() {
  // En PRO, la page /a-propos n'a pas de contenu adapté (copy spécifique
  // ClaireAdresse). On 404 jusqu'à ce qu'un contenu PRO soit rédigé.
  if (!FEATURES.hasAboutPage) notFound();

  return <AboutPage locale="fr" m={withPseudo(about)} landing={withPseudo(landing)} />;
}
