// Server component. Renders a thematic SVG overlay over the hero, scaled to
// the parent container. The motif is purely visual — never interactive —
// and ships as inline SVG so it's free to cache/CDN with the page.

import type { TemplateDecoration } from "@/lib/campaign-templates";

function r(seed: number) {
  // Deterministic pseudo-random based on a numeric seed so SSR/CSR match.
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function CampaignDecoration({
  kind,
  color,
}: {
  kind: TemplateDecoration;
  color: string;
}) {
  if (kind === "none") return null;

  const N = 18;
  const points = Array.from({ length: N }, (_, i) => ({
    x: r(i * 13 + 1) * 100,
    y: r(i * 13 + 2) * 100,
    s: 0.4 + r(i * 13 + 3) * 0.8,
    rot: r(i * 13 + 4) * 360,
  }));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {points.map((p, i) => (
        <g
          key={i}
          transform={`translate(${p.x} ${p.y}) scale(${p.s * 0.6}) rotate(${p.rot})`}
          opacity={0.55}
        >
          <Motif kind={kind} color={color} />
        </g>
      ))}
    </svg>
  );
}

function Motif({
  kind,
  color,
}: {
  kind: TemplateDecoration;
  color: string;
}) {
  switch (kind) {
    case "snowflakes":
      return (
        <g stroke={color} strokeWidth={0.5} strokeLinecap="round" fill="none">
          {[0, 60, 120].map((a) => (
            <line
              key={a}
              x1={-3}
              y1={0}
              x2={3}
              y2={0}
              transform={`rotate(${a})`}
            />
          ))}
        </g>
      );
    case "hearts":
      return (
        <path
          d="M0 -1.5 C 1 -2.5, 2.5 -2, 2.5 -0.5 C 2.5 1, 0 2.5, 0 2.5 C 0 2.5, -2.5 1, -2.5 -0.5 C -2.5 -2, -1 -2.5, 0 -1.5 Z"
          fill={color}
        />
      );
    case "lightning":
      return (
        <path
          d="M 0 -3 L -1 0 L 0.5 0 L -0.5 3 L 2 -0.5 L 0.5 -0.5 L 1.5 -3 Z"
          fill={color}
        />
      );
    case "stars":
      return (
        <path
          d="M 0 -2 L 0.6 -0.6 L 2 -0.4 L 0.9 0.5 L 1.2 2 L 0 1.2 L -1.2 2 L -0.9 0.5 L -2 -0.4 L -0.6 -0.6 Z"
          fill={color}
        />
      );
    case "sun":
      return (
        <g fill={color}>
          <circle r={1.2} />
          {Array.from({ length: 8 }, (_, i) => i * 45).map((a) => (
            <rect
              key={a}
              x={-0.15}
              y={-2.4}
              width={0.3}
              height={1}
              transform={`rotate(${a})`}
            />
          ))}
        </g>
      );
    case "leaves":
      return (
        <path
          d="M 0 -2 Q 1.5 -1, 1 1 Q 0 2, -1 1 Q -1.5 -1, 0 -2 Z"
          fill={color}
        />
      );
    case "confetti":
      return (
        <rect x={-0.6} y={-0.2} width={1.2} height={0.4} fill={color} />
      );
    case "sparkles":
      return (
        <g stroke={color} strokeWidth={0.3} strokeLinecap="round">
          <line x1={-1.4} y1={0} x2={1.4} y2={0} />
          <line x1={0} y1={-1.4} x2={0} y2={1.4} />
        </g>
      );
    default:
      return null;
  }
}
