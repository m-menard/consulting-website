const ACCENT = "#818cf8"
const ACCENT_DIM = "rgba(129,140,248,0.10)"
const ACCENT_BORDER = "rgba(129,140,248,0.25)"

const sources = [
  { label: "PubMed", sub: "Clinical literature" },
  { label: "ClinicalTrials.gov", sub: "Trial pipeline data" },
  { label: "SEC EDGAR", sub: "Financial filings" },
  { label: "Transcripts", sub: "Interview audio" },
]

const agents = [
  { label: "Research Agents", sub: "Evidence synthesis" },
  { label: "Strategy Agents", sub: "Positioning & framing" },
  { label: "Synthesizer", sub: "Unified brief" },
]

const outputs = [
  { label: "Research Brief", sub: "Disease landscape" },
  { label: "Strategy Doc", sub: "Competitive positioning" },
  { label: "Proposal", sub: "Audience-adaptive" },
]

export default function CgLifeWorkflow() {
  const colW = 148
  const boxH = 48
  const boxGap = 14
  const colGap = 60
  const svgW = 3 * colW + 2 * colGap + 40
  const totalH = Math.max(sources.length, agents.length, outputs.length) * (boxH + boxGap) + 60

  const colX = (col: number) => 20 + col * (colW + colGap)

  const boxY = (count: number, total: number, i: number) => {
    const blockH = count * (boxH + boxGap) - boxGap
    const startY = (totalH - blockH) / 2
    return startY + i * (boxH + boxGap)
  }

  return (
    <div className="w-full overflow-x-auto" aria-hidden="true">
      <div className="min-w-[520px]">
        <svg
          viewBox={`0 0 ${svgW} ${totalH}`}
          width="100%"
          className="overflow-visible"
        >
          <defs>
            <marker id="cgArrow" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill={ACCENT} opacity="0.5" />
            </marker>
            <linearGradient id="cgLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.1" />
              <stop offset="50%" stopColor={ACCENT} stopOpacity="0.4" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Column labels */}
          {[["Data Sources", 0], ["AI Agents", 1], ["Output", 2]].map(([label, col]) => (
            <text
              key={String(col)}
              x={colX(Number(col)) + colW / 2}
              y="18"
              textAnchor="middle"
              fill="var(--ill-text-dim)"
              fontSize="9"
              fontFamily="system-ui, sans-serif"
              fontWeight="600"
              letterSpacing="0.08em"
            >
              {String(label).toUpperCase()}
            </text>
          ))}

          {/* Connector lines: sources → agents (many-to-many through midpoint) */}
          {sources.map((_, si) => {
            const sy = boxY(sources.length, 0, si) + boxH / 2
            const midX = colX(0) + colW + colGap / 2
            return agents.map((_, ai) => {
              const ay = boxY(agents.length, 0, ai) + boxH / 2
              return (
                <path
                  key={`s${si}-a${ai}`}
                  d={`M${colX(0) + colW},${sy} C${midX},${sy} ${midX},${ay} ${colX(1)},${ay}`}
                  fill="none"
                  stroke={ACCENT}
                  strokeOpacity="0.12"
                  strokeWidth="1"
                />
              )
            })
          })}

          {/* Connector lines: agents → outputs */}
          {agents.map((_, ai) => {
            const ay = boxY(agents.length, 0, ai) + boxH / 2
            const midX = colX(1) + colW + colGap / 2
            return outputs.map((_, oi) => {
              const oy = boxY(outputs.length, 0, oi) + boxH / 2
              return (
                <path
                  key={`a${ai}-o${oi}`}
                  d={`M${colX(1) + colW},${ay} C${midX},${ay} ${midX},${oy} ${colX(2)},${oy}`}
                  fill="none"
                  stroke={ACCENT}
                  strokeOpacity="0.18"
                  strokeWidth="1"
                  markerEnd="url(#cgArrow)"
                />
              )
            })
          })}

          {/* Animated flow dots: sources → agents */}
          {sources.slice(0, 2).map((_, si) => {
            const sy = boxY(sources.length, 0, si) + boxH / 2
            const midX = colX(0) + colW + colGap / 2
            const ay = boxY(agents.length, 0, 1) + boxH / 2
            const path = `M${colX(0) + colW},${sy} C${midX},${sy} ${midX},${ay} ${colX(1)},${ay}`
            return (
              <circle key={`fd-s${si}`} r="2.5" fill="#a5b4fc" opacity="0.9">
                <animateMotion dur="2.2s" begin={`${si * 0.6}s`} repeatCount="indefinite" path={path} />
              </circle>
            )
          })}

          {/* Animated flow dots: agents → output */}
          {agents.map((_, ai) => {
            const ay = boxY(agents.length, 0, ai) + boxH / 2
            const midX = colX(1) + colW + colGap / 2
            const oy = boxY(outputs.length, 0, ai % outputs.length) + boxH / 2
            const path = `M${colX(1) + colW},${ay} C${midX},${ay} ${midX},${oy} ${colX(2)},${oy}`
            return (
              <circle key={`fd-a${ai}`} r="2.5" fill="#c7d2fe" opacity="0.9">
                <animateMotion dur="1.8s" begin={`${ai * 0.5 + 1}s`} repeatCount="indefinite" path={path} />
              </circle>
            )
          })}

          {/* Source boxes */}
          {sources.map((s, i) => {
            const y = boxY(sources.length, 0, i)
            return (
              <g key={`src-${i}`}>
                <rect x={colX(0)} y={y} width={colW} height={boxH} rx="8"
                  fill="var(--ill-surface-2)" stroke="var(--ill-stroke)" strokeWidth="0.8" />
                <text x={colX(0) + 10} y={y + 20} fill="var(--ill-text)" fontSize="9.5"
                  fontFamily="system-ui, sans-serif" fontWeight="600">{s.label}</text>
                <text x={colX(0) + 10} y={y + 34} fill="var(--ill-text-dim)" fontSize="8"
                  fontFamily="system-ui, sans-serif">{s.sub}</text>
              </g>
            )
          })}

          {/* Agent boxes */}
          {agents.map((a, i) => {
            const y = boxY(agents.length, 0, i)
            return (
              <g key={`agt-${i}`}>
                <rect x={colX(1)} y={y} width={colW} height={boxH} rx="8"
                  fill={ACCENT_DIM} stroke={ACCENT_BORDER} strokeWidth="0.8" />
                <circle cx={colX(1) + 10} cy={y + 16} r="2.5" fill={ACCENT} opacity="0.8" />
                <text x={colX(1) + 18} y={y + 20} fill="var(--ill-text)" fontSize="9.5"
                  fontFamily="system-ui, sans-serif" fontWeight="600">{a.label}</text>
                <text x={colX(1) + 10} y={y + 34} fill="var(--ill-text-dim)" fontSize="8"
                  fontFamily="system-ui, sans-serif">{a.sub}</text>
              </g>
            )
          })}

          {/* Output boxes */}
          {outputs.map((o, i) => {
            const y = boxY(outputs.length, 0, i)
            return (
              <g key={`out-${i}`}>
                <rect x={colX(2)} y={y} width={colW} height={boxH} rx="8"
                  fill="var(--ill-surface-3)" stroke="var(--ill-stroke-strong)" strokeWidth="0.8" />
                <text x={colX(2) + 10} y={y + 20} fill="var(--ill-text)" fontSize="9.5"
                  fontFamily="system-ui, sans-serif" fontWeight="600">{o.label}</text>
                <text x={colX(2) + 10} y={y + 34} fill="var(--ill-text-dim)" fontSize="8"
                  fontFamily="system-ui, sans-serif">{o.sub}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
