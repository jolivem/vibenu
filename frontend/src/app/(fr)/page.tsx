import { LandingPage } from "@/components/landing/LandingPage";
import { sections } from "@/i18n/messages/fr/analysis/sections";
import { landing } from "@/i18n/messages/fr/landing";
import { withPseudo } from "@/i18n/pseudo";

export default function HomePage() {
  return <LandingPage locale="fr" m={withPseudo(landing)} sections={withPseudo(sections)} />;
}
