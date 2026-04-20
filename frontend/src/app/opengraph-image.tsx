import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ClaireAdresse — Analysez une adresse avant de louer ou acheter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #edf7e1 0%, #ffffff 60%, #edf7e1 100%)",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            marginBottom: "40px",
          }}
        >
          <svg width="120" height="120" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M32 4 C19 4 10 13 10 26 C10 41 32 60 32 60 S54 41 54 26 C54 13 45 4 32 4 Z"
              fill="#78be20"
            />
            <circle cx="32" cy="25" r="10" fill="#ffffff" />
            <circle cx="30" cy="23" r="5.5" fill="none" stroke="#78be20" strokeWidth="2.5" />
            <line
              x1="34"
              y1="27"
              x2="38.5"
              y2="31.5"
              stroke="#78be20"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-2px",
            }}
          >
            ClaireAdresse
          </span>
        </div>
        <div
          style={{
            fontSize: "54px",
            fontWeight: 700,
            color: "#111827",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: "900px",
          }}
        >
          Analysez une adresse
          <br />
          <span style={{ color: "#78be20" }}>avant de louer ou acheter</span>
        </div>
        <div
          style={{
            fontSize: "26px",
            color: "#6b7280",
            textAlign: "center",
            marginTop: "36px",
            maxWidth: "900px",
          }}
        >
          Transports · Risques · Cadastre · Prix immobiliers · Urbanisme
        </div>
      </div>
    ),
    size,
  );
}
