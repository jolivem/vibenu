import { LandingPage } from "@/components/landing/LandingPage";
import { sections } from "@/i18n/messages/en/analysis/sections";
import { landing } from "@/i18n/messages/en/landing";
import { withPseudo } from "@/i18n/pseudo";

export default function HomePage() {
  return <LandingPage locale="en" m={withPseudo(landing)} sections={withPseudo(sections)} />;
}
