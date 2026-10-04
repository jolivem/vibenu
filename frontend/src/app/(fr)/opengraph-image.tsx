import { OPEN_GRAPH_IMAGE_SIZE, renderOpenGraphImage } from "@/lib/og-image";
import { BRANDING, isPro } from "@/lib/site-features";

export const alt = `${BRANDING.name} · ${BRANDING.tagline}`;
export const size = OPEN_GRAPH_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOpenGraphImage({
    title: BRANDING.heroTitle,
    emphasis: BRANDING.heroEmphasis,
    strapline: isPro
      ? "Voisinage · Mobilité · Données publiques officielles"
      : "Prix · Urbanisme · Risques · Transports · Climat · Sécurité",
  });
}
