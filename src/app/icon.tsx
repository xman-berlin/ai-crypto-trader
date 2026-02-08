import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#0a0a0a",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width="28"
          height="28"
        >
          <rect x="156" y="120" width="200" height="160" rx="32" fill="#3b82f6" />
          <rect x="176" y="148" width="56" height="56" rx="12" fill="#0a0a0a" />
          <rect x="280" y="148" width="56" height="56" rx="12" fill="#0a0a0a" />
          <rect x="192" y="160" width="28" height="28" rx="6" fill="#22c55e" />
          <rect x="296" y="160" width="28" height="28" rx="6" fill="#22c55e" />
          <line x1="256" y1="120" x2="256" y2="80" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" />
          <circle cx="256" cy="72" r="12" fill="#22c55e" />
          <rect x="200" y="228" width="112" height="24" rx="8" fill="#0a0a0a" />
          <polyline points="80,400 160,380 240,340 300,370 360,300 432,320" fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
