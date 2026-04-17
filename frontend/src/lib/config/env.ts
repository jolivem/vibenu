type DvfSource = "cerema" | "database";

function parseDvfSource(raw: string | undefined): DvfSource {
  return raw === "cerema" ? "cerema" : "database";
}

export const env = {
  debug: process.env.NEXT_PUBLIC_DEBUG === "true",
  dvfSource: parseDvfSource(process.env.NEXT_PUBLIC_DVF_SOURCE),
};
