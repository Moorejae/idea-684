import { useState, useMemo } from "react";
import { 
  Sparkles, 
  Code2, 
  Bot, 
  BarChart3, 
  PenTool, 
  ShieldAlert, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import { StarterTemplate } from "../types";

interface TemplateLibraryProps {
  onSelect: (prompt: string) => void;
}

const TEMPLATES: StarterTemplate[] = [
  {
    id: "fullstack-architect",
    title: "NextGen Full-Stack Web Module",
    category: "Coding & Architecture",
    level: "Complex Task",
    description: "Transforms a brief coding request into an enterprise-grade component architecture with type-safety, error boundaries, and state management.",
    roughPrompt: "Write a React component for a fitness tracker dashboard that has charts showing workout streaks, calendar planning, and calorie summaries. Make it look nice and clean.",
    architecturalFlaws: [
      "No state management pattern specified (Zustand, Redux, React Context)",
      "Zero responsive layout or accessible keyboard navigation requirements",
      "Missing error handling and loading fallback skeleton states"
    ],
    engineeredHighlights: [
      "Explicit TypeScript interface models for daily metrics and workouts",
      "Modular Tailwind CSS structure with micro-interactions",
      "Strict defense against edge cases and empty state conditions"
    ]
  },
  {
    id: "autonomous-support-agent",
    title: "Autonomous Tier-1 Customer Resolution Bot",
    category: "Agents & Logic",
    level: "Complex Task",
    description: "Replaces naive customer service prompts with a strict policy-enforcing, empathetic agent with fallback escalations.",
    roughPrompt: "You are a customer support agent for our company. Answer questions from users who are angry about missing packages. Be nice and help them get refunds.",
    architecturalFlaws: [
      "High hallucination risk without verifiable refund rules & validation limits",
      "No tone de-escalation framework for volatile customer inquiries",
      "Missing escalation boundaries for critical edge cases"
    ],
    engineeredHighlights: [
      "Structured 4-step empathetic resolution framework",
      "Strict XML boundary separation for company knowledge vs user context",
      "Hard rules against unauthorized guarantees with seamless human-handoff triggers"
    ]
  },
  {
    id: "executive-financial-intelligence",
    title: "Executive Financial & KPI Synthesis",
    category: "Analytics & Data",
    level: "Intermediate",
    description: "Converts ambiguous financial summary requests into boardroom-ready variance analysis with actionable risk matrices.",
    roughPrompt: "Summarize this quarterly financial statement sheet. Highlight any major drops in revenue or increases in costs, and tell me if the company is doing well.",
    architecturalFlaws: [
      "Subjective criteria on 'doing well' leading to speculative AI opinions",
      "No mathematical verification standard for percentage variance calculations",
      "Missing structured executive table layouts"
    ],
    engineeredHighlights: [
      "Strict step-by-step mathematical reasoning for YoY and QoQ calculations",
      "Standardized Markdown KPI matrix (EBITDA, OpEx, Gross Margin)",
      "Risk assessment scoring based on concrete financial ratios"
    ]
  },
  {
    id: "high-conversion-launch",
    title: "High-Conversion SaaS Product Launch",
    category: "Creative & Copy",
    level: "Intermediate",
    description: "Elevates standard copywriting into psychological persuasion sequences tailored for tech decision-makers.",
    roughPrompt: "Write a launching email series for our new productivity planner tool. Make it exciting so people sign up for the premium trial. Keep it short.",
    architecturalFlaws: [
      "Undefined buyer persona, pain points, or competitive differentiators",
      "Vague constraints ('make it exciting', 'keep it short') with no exact word targets",
      "Lack of structured narrative arc across the email sequence"
    ],
    engineeredHighlights: [
      "PAS (Problem-Agitate-Solution) copy methodology",
      "Defined psychological hooks and friction-free Call-to-Actions (CTAs)",
      "Segmented 3-part drip framework with A/B subject line alternatives"
    ]
  },
  {
    id: "api-contract-designer",
    title: "REST / GraphQL API Schema Architect",
    category: "Coding & Architecture",
    level: "Complex Task",
    description: "Constructs production-ready, idempotent API endpoint contracts with validation schemas and rate limit specs.",
    roughPrompt: "Create an API for an ecommerce cart and checkout. Include user addresses and payment methods.",
    architecturalFlaws: [
      "No HTTP status code mapping (409 Conflict, 422 Unprocessable)",
      "Missing idempotency key requirements for payment operations",
      "No pagination, sorting, or concurrency control guidelines"
    ],
    engineeredHighlights: [
      "OpenAPI 3.1 / JSON Schema compliant payload definitions",
      "Idempotency token headers and webhook retry semantics",
      "OWASP security headers and rate-limit error structures"
    ]
  },
  {
    id: "incident-postmortem-analyst",
    title: "SRE Incident Postmortem & RCA Engine",
    category: "Operations & Support",
    level: "Complex Task",
    description: "Generates thorough blameless postmortems with timeline reconstructions and preventative action items.",
    roughPrompt: "Write a postmortem for our database outage yesterday morning that caused 45 minutes of downtime.",
    architecturalFlaws: [
      "Missing standard 5-Whys root cause analysis methodology",
      "No separation between immediate mitigation vs long-term architectural remediation",
      "Unquantified impact metrics (SLO/SLA breach, affected ARR)"
    ],
    engineeredHighlights: [
      "Structured chronologically timestamped incident timeline",
      "5-Whys systematic root-cause breakdown",
      "Prioritized P0-P3 action item tracking with owner assignments"
    ]
  }
];

export default function TemplateLibrary({ onSelect }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTemplateForDetail, setSelectedTemplateForDetail] = useState<StarterTemplate | null>(null);

  const categories = ["All", "Coding & Architecture", "Agents & Logic", "Analytics & Data", "Creative & Copy", "Operations & Support"];

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((tpl) => {
      const matchesCat = selectedCategory === "All" || tpl.category === selectedCategory;
      const matchesSearch = 
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.roughPrompt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Coding & Architecture":
        return <Code2 className="w-4 h-4 text-zinc-300" />;
      case "Agents & Logic":
        return <Bot className="w-4 h-4 text-zinc-300" />;
      case "Analytics & Data":
        return <BarChart3 className="w-4 h-4 text-zinc-300" />;
      case "Creative & Copy":
        return <PenTool className="w-4 h-4 text-zinc-300" />;
      default:
        return <Zap className="w-4 h-4 text-zinc-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-b from-zinc-900/90 via-[#0B0D11] to-[#08090C] border border-zinc-700/40 p-6 md:p-8 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        {/* Subtle Neon Silver Gradient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-gradient-to-b from-zinc-400/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-600/50 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300 mb-3 shadow-[0_0_12px_rgba(255,255,255,0.06)]">
              <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
              <span>Prompt Design Archetypes</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight">
              Curated Starter Drafts
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
              Real-world imperfect prompt drafts demonstrating common architectural pitfalls. Select any blueprint to load into the Refinement Engine and witness how deep context, structural constraints, and persona calibration transform vague ideas into reliable system prompts.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300 font-semibold">
              {filteredTemplates.length} Blueprints
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Categories Tab Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 text-zinc-950 font-bold shadow-[0_0_18px_rgba(255,255,255,0.2)] border border-white/60"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blueprints..."
              className="w-full bg-zinc-950/80 border border-zinc-800/90 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/30 transition-all font-sans"
            />
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((tpl) => {
          return (
            <div
              key={tpl.id}
              className="group relative rounded-2xl bg-[#0B0D11]/90 border border-zinc-800/80 hover:border-zinc-600/70 p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            >
              {/* Category & Badge */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                    {getCategoryIcon(tpl.category)}
                    <span>{tpl.category}</span>
                  </div>

                  <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-300">
                    {tpl.level}
                  </span>
                </div>

                <h3 className="font-bold text-base font-display text-white group-hover:text-zinc-100 transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                  {tpl.description}
                </p>

                {/* Raw Prompt Preview Box */}
                <div className="mt-4 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/70 font-mono text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400/90" />
                    <span>Raw Unrefined Draft</span>
                  </div>
                  <p className="italic text-zinc-300 line-clamp-3 leading-relaxed">
                    "{tpl.roughPrompt}"
                  </p>
                </div>

                {/* Architectural Analysis Points */}
                <div className="mt-4 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                    Target Fixes
                  </div>
                  <ul className="space-y-1">
                    {tpl.architecturalFlaws.slice(0, 2).map((flaw, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{flaw}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-zinc-800/60">
                <button
                  onClick={() => onSelect(tpl.roughPrompt)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-[0_0_16px_rgba(226,232,240,0.15)] border border-white/60 active:scale-[0.99]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
                  <span>Load Into Workshop</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-900" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-zinc-950/60 border border-zinc-800 text-zinc-500">
          <p className="text-sm">No starter blueprints match your search criteria.</p>
          <button
            onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
            className="mt-3 text-xs text-zinc-300 underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
