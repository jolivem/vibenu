import { Font } from "@react-pdf/renderer";

// Use the same Fraunces serif as the frontend. Files are served from /public/fonts.
// react-pdf fetches them once per session at PDF render time.
const origin = typeof window !== "undefined" ? window.location.origin : "";

Font.register({
  family: "Fraunces",
  fonts: [
    { src: `${origin}/fonts/Fraunces-Regular.ttf`, fontWeight: 400 },
    { src: `${origin}/fonts/Fraunces-Medium.ttf`, fontWeight: 500 },
  ],
});
