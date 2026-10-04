import { notFound } from "next/navigation";
import { AboutPage, aboutMetadata } from "@/components/about/AboutPage";
import { about } from "@/i18n/messages/en/about";
import { landing } from "@/i18n/messages/en/landing";
import { withPseudo } from "@/i18n/pseudo";
import { FEATURES } from "@/lib/site-features";

export const metadata = aboutMetadata("en", about);

export default function Page() {
  if (!FEATURES.hasAboutPage) notFound();

  return <AboutPage locale="en" m={withPseudo(about)} landing={withPseudo(landing)} />;
}
