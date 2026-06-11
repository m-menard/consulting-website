const ACCENT = "#f59e0b"
const ACCENT_DIM = "rgba(245,158,11,0.10)"
const ACCENT_BORDER = "rgba(245,158,11,0.25)"

const steps = [
  { label: "Campaign DB", sub: "All campaigns", icon: "DB" },
  { label: "AI Analysis", sub: "GPT-4.1 mini", icon: "AI" },
  { label: "Scoring", sub: "Perf · Recency · Match", icon: "SC" },
  { label: "Top 6", sub: "LLM ranking", icon: "6" },
  { label: "Image Check", sub: "Visual quality", icon: "IMG" },
  { label: "Notion", sub: "Top 3 uploaded", icon: "✓" },
]

export default function GivebutterPipeline() {
  const boxW = 96
  const boxH = 72
  const gap = 28
  const svgW = steps.length * boxW + (steps.length - 1) * gap + 40
  const svgH = boxH + 80
  const startX = 20
  const startY = 36

  return (
    <div className="w-full overflow-x-auto" aria-hidden="true">
      <div className="min-w-[680px]">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" className="overflow-visible">
          <defs>
            <marker id="gbArrow" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill={ACCENT} opacity="0.5" />
            </marker>
          </defs>

          {/* Step number track */}
          <line
            x1={startX + boxW / 2} y1={svgH - 12}
            x2={startX + (steps.length - 1) * (boxW + gap) + boxW / 2} y2={svgH - 12}
            stroke="var(--ill-stroke)" strokeWidth="1"
          />

          {steps.map((step, i) => {
            const x = startX + i * (boxW + gap)
            const cx = x + boxW / 2
            const isHighlighted = i >= steps.length - 2

            return (
              <g key={step.label}>
                {/* Arrow connector */}
                {i < steps.length - 1 && (
                  <>
                    <line
                      x1={x + boxW} y1={startY + boxH / 2}
                      x2={x + boxW + gap - 4} y2={startY + boxH / 2}
                      stroke={ACCENT} strokeOpacity="0.25" strokeWidth="1"
                      markerEnd="url(#gbArrow)"
                    />
                    {/* Animated dot */}
                    <circle r="2.5" fill={ACCENT} opacity="0.8">
                      <animateMotion
                        dur="1.6s"
                        begin={`${i * 0.3}s`}
                        repeatCount="indefinite"
                        path={`M${x + boxW},${startY + boxH / 2} L${x + boxW + gap},${startY + boxH / 2}`}
                      />
                    </circle>
                  </>
                )}

                {/* Box */}
                <rect
                  x={x} y={startY} width={boxW} height={boxH} rx="10"
                  fill={isHighlighted ? ACCENT_DIM : "var(--ill-surface-3)"}
                  stroke={isHighlighted ? ACCENT_BORDER : "var(--ill-stroke)"}
                  strokeWidth="0.8"
                />

                {/* Icon circle */}
                <circle
                  cx={cx} cy={startY + 22} r="13"
                  fill={isHighlighted ? ACCENT : "var(--ill-text-dim)"}
                  opacity={isHighlighted ? 0.9 : 0.5}
                />
                <text
                  x={cx} y={startY + 26}
                  textAnchor="middle"
                  fill={isHighlighted ? "#1a1205" : "var(--ill-surface)"}
                  fontSize={step.icon.length > 2 ? "6" : "8"}
                  fontFamily="system-ui, sans-serif"
                  fontWeight="700"
                >
                  {step.icon}
                </text>

                {/* Label */}
                <text
                  x={cx} y={startY + 48}
                  textAnchor="middle"
                  fill="var(--ill-text)"
                  fontSize="8.5"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="600"
                >
                  {step.label}
                </text>

                {/* Sublabel */}
                <text
                  x={cx} y={startY + 60}
                  textAnchor="middle"
                  fill="var(--ill-text-dim)"
                  fontSize="7"
                  fontFamily="system-ui, sans-serif"
                >
                  {step.sub}
                </text>

                {/* Step number */}
                <circle cx={cx} cy={svgH - 12} r="7" fill="var(--ill-surface-2)" stroke="var(--ill-stroke)" strokeWidth="0.8" />
                <text
                  x={cx} y={svgH - 9}
                  textAnchor="middle"
                  fill={isHighlighted ? ACCENT : "var(--ill-text-dim)"}
                  fontSize="7"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="600"
                >
                  {i + 1}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
