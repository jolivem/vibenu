import { landing } from "@/i18n/messages/en/landing";
import { site } from "@/i18n/messages/en/site";
import { OPEN_GRAPH_IMAGE_SIZE, renderOpenGraphImage } from "@/lib/og-image";
import { BRANDING } from "@/lib/site-features";

export const alt = `${BRANDING.name} · ${site.tagline}`;
export const size = OPEN_GRAPH_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOpenGraphImage({
    title: landing.hero.title,
    emphasis: landing.hero.emphasis,
    strapline: "Prices · Planning · Risks · Transport · Climate · Safety",
  });
}
