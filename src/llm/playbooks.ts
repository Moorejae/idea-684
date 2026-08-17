/**
 * Category taxonomy + per-category questioning playbooks.
 *
 * Each playbook lists the HIGH-LEVERAGE, domain-specific parameters that MUST be
 * probed for that kind of build. The question-generation step injects the
 * detected category's playbook so questions are specific, not interchangeable.
 */

export const CATEGORIES = [
  "coding",
  "conversational-agent",
  "content-writing",
  "data-analysis",
  "marketing",
  "research",
  "education",
  "automation",
  "general",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  coding: "Coding & Development",
  "conversational-agent": "Conversational Agent / Bot",
  "content-writing": "Content & Writing",
  "data-analysis": "Data & Analytics",
  marketing: "Marketing & Sales",
  research: "Research & Analysis",
  education: "Education & Tutoring",
  automation: "Automation & Workflows",
  general: "General / Other",
};

export interface Playbook {
  category: Category;
  label: string;
  description: string;
  /** Parameters this build type absolutely needs defined. */
  parameters: string[];
  /** Anticipated edge cases / hidden complexity the user usually forgets. */
  edgeCases: string[];
}

export const PLAYBOOKS: Record<Category, Playbook> = {
  coding: {
    category: "coding",
    label: "Coding & Development",
    description: "Building software: components, apps, scripts, or full systems.",
    parameters: [
      "programming language and version",
      "framework / library and its version",
      "target runtime and OS (browser, Node, mobile, CLI, embedded)",
      "exact input -> output contract (types, schema, return shape)",
      "error handling and edge cases",
      "security / auth / input validation constraints",
      "performance budget and scale",
      "existing codebase / integrations / APIs to respect",
      "test strategy and quality bar",
    ],
    edgeCases: [
      "empty inputs, null/undefined, malformed data",
      "unicode / i18n / timezones",
      "rate limits, timeouts, retries",
      "state management and side effects",
      "accessibility / responsiveness if frontend",
    ],
  },
  "conversational-agent": {
    category: "conversational-agent",
    label: "Conversational Agent / Bot",
    description: "Chatbots, assistants, agents with memory, tools, or multi-turn behavior.",
    parameters: [
      "tool / function access and permissions",
      "memory and context-window strategy",
      "multi-turn behavior and state",
      "persona, tone, and guardrails (what it must NEVER do)",
      "failure / fallback policy when it can't answer",
      "latency budget and streaming",
      "platform / channel constraints",
      "user identity and personalization",
      "cost / quota limits per session",
    ],
    edgeCases: [
      "off-topic or adversarial prompts",
      "hallucination policy and citations",
      "session reset / timeout behavior",
      "PII handling and data retention",
      "multi-language switching",
    ],
  },
  "content-writing": {
    category: "content-writing",
    label: "Content & Writing",
    description: "Articles, emails, copy, scripts, docs, social posts.",
    parameters: [
      "audience segment and decision-maker",
      "channel / platform and format",
      "brand voice and tone (with examples)",
      "length / word count and structure",
      "must-include points and key messages",
      "SEO / keywords / metadata (if web)",
      "call-to-action and desired outcome",
      "do-not-say / banned topics and compliance",
    ],
    edgeCases: [
      "factual accuracy and citations",
      "localization / language",
      "reading level",
      "plagiarism / originality bar",
      "A/B variants or multiple versions needed",
    ],
  },
  "data-analysis": {
    category: "data-analysis",
    label: "Data & Analytics",
    description: "Analyzing data, generating insights, visualizations, or reports.",
    parameters: [
      "data source and schema / columns",
      "the precise question(s) to answer",
      "analysis method (statistical, exploratory, predictive)",
      "tooling (SQL, Python, BI tool, spreadsheet)",
      "output artifacts (charts, tables, written insights)",
      "correctness / validation expectations",
      "audience for the output (technical vs business)",
      "data quality assumptions and missing data",
    ],
    edgeCases: [
      "outliers, nulls, duplicates",
      "causation vs correlation framing",
      "time ranges and granularity",
      "privacy / data handling rules",
    ],
  },
  marketing: {
    category: "marketing",
    label: "Marketing & Sales",
    description: "Campaigns, ads, landing pages, launches, outreach.",
    parameters: [
      "funnel stage (awareness, consideration, conversion)",
      "platform and format (email, ad, landing page, social)",
      "offer and unique selling proposition",
      "audience segments and personalization",
      "compliance / disclaimers / regulated claims",
      "budget / scale of testing",
      "metrics of success (CTR, conversions, replies)",
      "brand guidelines and assets",
    ],
    edgeCases: [
      "localization and cultural nuance",
      "spam / deliverability constraints",
      "competitor differentiation",
      "urgency vs trust balance",
    ],
  },
  research: {
    category: "research",
    label: "Research & Analysis",
    description: "Deep research, literature review, synthesis, or briefs.",
    parameters: [
      "scope and research questions",
      "sources allowed (academic, web, internal docs)",
      "citation style and evidence requirements",
      "depth / length of deliverable",
      "bias and conflicting-evidence handling",
      "deadline and freshness of sources",
      "output structure (brief, memo, report)",
    ],
    edgeCases: [
      "contradictory findings",
      "uncertainty / confidence framing",
      "out-of-scope topics",
      "source reliability tiers",
    ],
  },
  education: {
    category: "education",
    label: "Education & Tutoring",
    description: "Lessons, explanations, quizzes, curricula, tutoring.",
    parameters: [
      "learner level and prior knowledge",
      "learning objective / outcome",
      "format (lesson, quiz, flashcard, explanation)",
      "teaching style and scaffolding",
      "difficulty progression",
      "assessment and feedback mechanism",
      "subject constraints and curriculum alignment",
    ],
    edgeCases: [
      "misconception handling",
      "learner frustration / motivation",
      "accessibility and learning differences",
      "verify-answers vs teach-strategy balance",
    ],
  },
  automation: {
    category: "automation",
    label: "Automation & Workflows",
    description: "Scripts, pipelines, schedulers, integrations, agentic workflows.",
    parameters: [
      "trigger and schedule",
      "input sources and formats",
      "steps / workflow order and dependencies",
      "failure handling, retries, and alerts",
      "idempotency and duplicate prevention",
      "security / secrets and permissions",
      "logging and observability",
      "rollback / stop conditions",
      "integration points (APIs, webhooks, files)",
    ],
    edgeCases: [
      "partial failure mid-workflow",
      "concurrent runs",
      "rate limits and throttling",
      "data drift / schema changes",
    ],
  },
  general: {
    category: "general",
    label: "General / Other",
    description: "Anything that doesn't fit a specific category.",
    parameters: [
      "the precise goal and success criteria",
      "target audience",
      "input / source material available",
      "output format and structure",
      "tone and constraints",
      "examples of desired output",
    ],
    edgeCases: [
      "edge inputs",
      "failure modes",
      "constraints on length / style",
    ],
  },
};

/** Lightweight keyword heuristic — fast, no LLM needed. Falls back to "general". */
export function detectCategory(prompt: string): Category {
  const p = (prompt || "").toLowerCase();
  const hits: Array<[Category, RegExp]> = [
    ["coding", /\b(react|component|code|function|api|app|script|python|javascript|typescript|framework|website|web app|cli|database|program|software|backend|frontend)\b/],
    ["conversational-agent", /\b(chatbot|bot|assistant|agent|chat|conversation|telegram bot|support bot|llm app)\b/],
    ["data-analysis", /\b(data|analy|analytics|csv|excel|sql|chart|dashboard|report|insight|statistic|table|database|dataset)\b/],
    ["marketing", /\b(marketing|email campaign|ad copy|landing page|sales|launch|seo|social media|outreach|funnel|advertis)\b/],
    ["research", /\b(research|literature|study|brief|investigat|review|synthes|report)\b/],
    ["education", /\b(lesson|teach|tutor|explain|quiz|learn|curriculum|course|study guide|flashcard)\b/],
    ["automation", /\b(automate|automation|pipeline|workflow|scheduler|cron|integration|sync|scrape|notify|deploy)\b/],
    ["content-writing", /\b(write|article|blog|email|copy|post|essay|script|newsletter|document|content|story|essay)\b/],
  ];
  let best: Category = "general";
  let bestScore = 0;
  for (const [cat, re] of hits) {
    const m = p.match(re);
    const score = m ? m.length : 0;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return bestScore > 0 ? best : "general";
}

/** Resolve a UI-provided category string to a known Category. */
export function resolveCategory(raw: string | undefined): Category {
  if (!raw || raw.trim() === "" || raw.trim() === "Basic/General") return "general";
  const lower = raw.trim().toLowerCase();
  for (const c of CATEGORIES) {
    if (lower === c) return c;
    if (lower === CATEGORY_LABELS[c].toLowerCase()) return c;
    // allow partial match, e.g. "Coding & Dev" -> coding
    if (CATEGORY_LABELS[c].toLowerCase().includes(lower) || lower.includes(CATEGORY_LABELS[c].toLowerCase().split(" ")[0].toLowerCase())) {
      return c;
    }
  }
  return "general";
}
