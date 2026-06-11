export interface Capability {
  title: string
  description: string
}

export interface Solution {
  title: string
  description: string
  capabilities: Capability[]
}

export interface Result {
  value: string
  label: string
  note?: string
}

export interface CaseStudyImage {
  src: string
  alt: string
}

export interface CaseStudyFeaturePanel extends CaseStudyImage {
  eyebrow: string
  headline: string
}

export interface CaseStudy {
  slug: string
  client: string
  industry: string
  tagline: string
  heroStat: { value: string; label: string; note?: string }
  overview: string
  challengeHeadline: string
  challenge: string
  solutionHeadline: string
  solutions: Solution[]
  results: Result[]
  quote?: { text: string; author: string; role: string }
  whatsNext: string[]
  accent: string
  /** Darker accent for sufficient contrast on the light theme. */
  accentInk: string
  accentDim: string
  /** Data sources / tools, used in the storytelling ticker. */
  tools: string[]
  publishedAt: string
  heroImage: CaseStudyImage
  overviewImage: CaseStudyImage
  challengeImage: CaseStudyImage
  challengeBadges: [string, string]
  workflow: {
    label: string
    kind: "cg-life" | "givebutter"
  }
  solutionFeature?: CaseStudyFeaturePanel
  depthFeature: CaseStudyFeaturePanel
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "cg-life",
    client: "CG Life",
    industry: "Life Sciences",
    tagline: "Accelerating new business proposals with AI-orchestrated research.",
    heroStat: {
      value: "$5–8M",
      label: "Projected annual revenue impact",
      note: "Based on client business case at project inception",
    },
    overview:
      "CG Life is a science-based commercialization agency founded in 2003 and headquartered in Chicago. With around 150 employees, the firm serves biopharma and life sciences clients across strategy, creative, content, PR, and media, helping bring medical products to market.",
    challengeHeadline: "Four weeks. Six to eight senior experts. Every single proposal.",
    challenge:
      "Winning new business in life sciences requires deep, credible research. A typical CG Life proposal demanded four weeks of preparation and the focused attention of six to eight senior staff members. With five to six pitches per year and a 25% win rate, the firm's growth was constrained by the sheer time cost of producing competitive, evidence-based proposals, leaving little room to pursue more opportunities without adding headcount.",
    solutionHeadline: "Two AI products, engineered for life sciences commercialization",
    solutions: [
      {
        title: "RFP Co-Pilot",
        description:
          "A multi-agent AI system that orchestrates the full research and strategy workflow for new business proposals. Research agents, strategy agents, and a synthesizer run in parallel across multiple data sources, delivering structured, audience-ready artifacts in a fraction of the time.",
        capabilities: [
          {
            title: "Clinical Literature Research",
            description:
              "Surfaces disease-area evidence and treatment landscape data from PubMed and peer-reviewed sources automatically.",
          },
          {
            title: "Interview Transcript Analysis",
            description:
              "Transcribes and synthesizes qualitative interviews, extracting key themes, patient pain points, and messaging opportunities.",
          },
          {
            title: "Competitive & Market Intelligence",
            description:
              "Queries Exa, ClinicalTrials.gov, and SEC EDGAR for competitor positioning, pipeline data, and financial context.",
          },
          {
            title: "Pre-Qualification Scoring",
            description:
              "Evaluates opportunity fit before the team commits significant resources, surfacing a structured go/no-go assessment.",
          },
          {
            title: "Audience-Adaptive Reporting",
            description:
              "Reformats the same underlying research for different stakeholders (medical, marketing, and commercial) without manual rework.",
          },
        ],
      },
      {
        title: "Archetype Builder",
        description:
          "A second AI product that turns research and real-world social signal into living, queryable patient and HCP archetypes, giving strategists a durable model of their target audiences that they can interrogate directly.",
        capabilities: [
          {
            title: "Archetype Generation",
            description:
              "Synthesizes patient and HCP archetypes from research data, using pattern analysis to surface the attitudes, behaviors, and motivations that define each audience.",
          },
          {
            title: "Social Listening",
            description:
              "Scrapes and analyzes audience signal across TikTok, YouTube, Reddit, X, and Facebook, grounding every archetype in what real people are actually saying.",
          },
          {
            title: "Interactive Persona Chat",
            description:
              "Lets strategists converse directly with a generated archetype, pressure-testing messaging and creative against the audience model in real time.",
          },
        ],
      },
    ],
    results: [
      {
        value: "4 weeks",
        label: "Typical proposal prep time (before)",
      },
      {
        value: "6–8",
        label: "Senior staff per proposal (before)",
      },
      {
        value: "~50%",
        label: "Projected reduction in research & strategy resourcing",
        note: "Projected",
      },
      {
        value: "+30%",
        label: "More pitches per year, without adding headcount",
        note: "Projected",
      },
    ],
    quote: {
      text: "Great work everyone!",
      author: "Jay",
      role: "CG Life Leadership",
    },
    whatsNext: [
      "Commercial AI Strategist: extending the platform from proposal support to always-on commercial intelligence",
      "Tighter RFP × Archetype integration: feeding live audience models directly into proposal strategy",
      "Broader social listening: expanding signal sources and adding real-time trend detection",
    ],
    accent: "#818cf8",
    accentInk: "#4f46e5",
    accentDim: "rgba(129, 140, 248, 0.10)",
    tools: [
      "PubMed",
      "ClinicalTrials.gov",
      "SEC EDGAR",
      "Exa",
      "Interview Transcripts",
      "TikTok",
      "YouTube",
      "Reddit",
      "X",
      "Facebook",
    ],
    publishedAt: "June 2026",
    heroImage: {
      src: "/images/cg-life/cg3.png",
      alt: "CG Life executives reviewing an AI-generated research proposal",
    },
    overviewImage: {
      src: "/images/cg-life/cg1.png",
      alt: "Strategy team reviewing multi-screen research analytics",
    },
    challengeImage: {
      src: "/images/cg-life/cg4.png",
      alt: "Before and after: manual research overwhelm vs. an AI-generated brief",
    },
    challengeBadges: ["Before", "After"],
    workflow: {
      label: "RFP Co-Pilot: how it works",
      kind: "cg-life",
    },
    depthFeature: {
      src: "/images/cg-life/cg5.png",
      alt: "Clinical intelligence dashboard: molecular structures, competitive landscape, trial outcomes",
      eyebrow: "Data depth",
      headline:
        "Molecular pathways. Competitive pipelines. Clinical trial outcomes. All synthesized automatically.",
    },
  },
  {
    slug: "givebutter",
    client: "Givebutter",
    industry: "Nonprofit Technology",
    tagline: "Scaling content and campaign discovery with AI workflows.",
    heroStat: {
      value: "3",
      label: "Production AI workflows shipped",
    },
    overview:
      "Givebutter is a modern fundraising platform serving nonprofits, offering fundraising pages, events, auctions, ticketing, and a built-in donor CRM. The platform powers thousands of campaigns across the nonprofit sector.",
    challengeHeadline: "Thousands of campaigns. A crowded market. All triaged by hand.",
    challenge:
      "Givebutter faced two distinct scale problems: producing high-quality SEO and marketing content efficiently across a crowded, competitive landscape, and surfacing standout fundraising campaigns from a large, growing pool of customer activity to use in success stories and marketing. Both problems were being solved manually, limiting output and consuming team time that could go elsewhere.",
    solutionHeadline: "Two AI workflows that turn manual effort into automated scale",
    solutions: [
      {
        title: "Content & SEO Workflow",
        description:
          "A multi-agent content intelligence system covering three prioritized use cases: competitor benchmarking, URL refresh, and content brief generation.",
        capabilities: [
          {
            title: "Competitor Benchmarking",
            description:
              "Automated positioning analysis across 14+ competitor platforms, surfacing gaps and differentiators without manual research.",
          },
          {
            title: "URL Refresh",
            description:
              "Identifies existing content with SEO improvement opportunities, analyzes keyword coverage against live SERP data, and generates specific optimization recommendations.",
          },
          {
            title: "Content Brief Generation",
            description:
              "Produces research-backed briefs (keyword targets, audience intent, content outline, related product pages), ready for writers to execute.",
          },
        ],
      },
      {
        title: "Success Stories Pipeline",
        description:
          "A two-phase AI pipeline that automatically discovers and nominates standout customer campaigns from the full Givebutter campaign database, replacing a manual discovery process with a scalable, scoring-based system.",
        capabilities: [
          {
            title: "Refresh Phase",
            description:
              "Syncs hitlist criteria from Notion, generates AI campaign summaries, and tags each campaign by theme using GPT-4.1 mini.",
          },
          {
            title: "Nominate Phase",
            description:
              "Scores candidates using a weighted algorithm (similarity 30% / performance 40% / recency 30%), LLM ranking selects the top 6, then image analysis finalizes the top 3 for Notion review.",
          },
        ],
      },
    ],
    results: [
      {
        value: "14+",
        label: "Competitors benchmarked automatically",
      },
      {
        value: "3-phase",
        label: "Algorithmic scoring replacing manual campaign review",
      },
      {
        value: "Self-serve",
        label: "Platform handed off for team self-configuration",
      },
    ],
    whatsNext: [
      "Acceptance Likelihood Predictor: an LLM-as-judge layer to further reduce manual review on success story nominations",
      "Hitlist match-quality scorer: improving precision of campaign-to-theme matching",
      "Full self-service configuration: Givebutter's team connecting their own Notion, Slack, and VideoAsk accounts directly",
    ],
    accent: "#f59e0b",
    accentInk: "#b45309",
    accentDim: "rgba(245, 158, 11, 0.10)",
    tools: [
      "Notion",
      "Slack",
      "GPT-4.1 mini",
      "SERP Data",
      "VideoAsk",
      "14+ Competitors",
      "Campaign DB",
      "Image Analysis",
    ],
    publishedAt: "June 2026",
    heroImage: {
      src: "/images/givebutter/gb4.png",
      alt: "Givebutter volunteers reviewing a live fundraising dashboard at a sunset event",
    },
    overviewImage: {
      src: "/images/givebutter/gb1.png",
      alt: "A nonprofit team celebrating in front of a live Givebutter fundraising dashboard",
    },
    challengeImage: {
      src: "/images/givebutter/gb2.png",
      alt: "Abstract visualization of a standout campaign surfacing from thousands",
    },
    challengeBadges: ["Thousands of campaigns", "One standout"],
    workflow: {
      label: "Success Stories Pipeline",
      kind: "givebutter",
    },
    solutionFeature: {
      src: "/images/givebutter/gb3.png",
      alt: "AI-generated content brief with competitive gap analysis and an SEO opportunity score",
      eyebrow: "Content & SEO Workflow",
      headline:
        "Research-backed briefs, competitive gaps, and SEO scoring. Generated, not hand-assembled.",
    },
    depthFeature: {
      src: "/images/givebutter/gb5.png",
      alt: "Success Stories nominations dashboard: AI activity feed, impact scoring, and auto-generated content",
      eyebrow: "In production",
      headline:
        "Campaigns scored, ranked, and nominated automatically. The team just reviews the top three.",
    },
  },
]

export const CADRIAN_CASE_STUDIES_PATH = "/case-studies/cadrian"

export function caseStudyPath(slug: string): string {
  return `/case-studies/${slug}`
}

/** @deprecated Use caseStudyPath for individual studies */
export function cadrianCaseStudyPath(slug: string): string {
  return caseStudyPath(slug)
}

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((cs) => cs.slug === slug)
}
