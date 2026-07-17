import { useState } from "react";
import { BookOpen, Sparkles, CheckCircle2, ChevronRight, Copy, Terminal, Compass } from "lucide-react";
import { motion } from "motion/react";
import { GuidebookSection } from "../types";

export default function Guidebook() {
  const [activeTab, setActiveTab] = useState<string>("google");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sections: GuidebookSection[] = [
    {
      id: "google",
      title: "Google Gemini Guidelines",
      provider: "google",
      description: "Google's Gemini models excel at structural understanding, multimodal prompting, and following strict, task-oriented developer instructions.",
      keyPrinciples: [
        {
          title: "1. Explicit System Instructions",
          description: "Establish the behavioral rules, boundary guidelines, and persona of the AI outside of the dynamic conversation content.",
          example: "System Instruction:\n\"You are a scientific advisor. Your tone is dry and precise. Never use exclamation marks.\""
        },
        {
          title: "2. Task-Oriented Hierarchical Structure",
          description: "Order information logically. Define the goal first, provide background context, and list instructions using clear bullet points.",
          example: "# Objective\nExtract geological data.\n\n# Context\nWe are analyzing borehole reports.\n\n# Instructions\n- Identify bedrock depth\n- Log core recovery rates"
        },
        {
          title: "3. Direct Input Separators",
          description: "Separate systemic instructions from variable user data using clear delimiters such as triple hyphens (---) or triple asterisks (***).",
          example: "Analyze the tone of the article below.\n---\n[Article Text Here]\n---"
        }
      ],
      proTip: "Define schemas explicitly! For JSON output, Gemini thrives when provided with exact schemas or type definitions to match rather than vague descriptions."
    },
    {
      id: "anthropic",
      title: "Anthropic Claude Guidelines",
      provider: "anthropic",
      description: "Anthropic's research emphasizes utilizing XML tags for clear separation of concerns, providing high-quality few-shot examples, and pre-filling assistant responses.",
      keyPrinciples: [
        {
          title: "1. XML Tags for Segmentation",
          description: "Wrap distinct prompt sections (such as context, rules, examples, and inputs) in descriptive XML-like tags. Claude is trained to respect these boundaries.",
          example: "<instructions>\nSummarize the text in <source_text>.\n</instructions>\n\n<source_text>\n[Content]\n</source_text>"
        },
        {
          title: "2. Chain-of-Thought (CoT) Thinking Tags",
          description: "Explicitly instruct the model to perform a step-by-step thinking process before returning its answer, often wrapped in `<thinking>` tags.",
          example: "Please analyze the financial balance sheet. Show your step-by-step reasoning inside <thinking>...</thinking> tags, then return the final summary in <analysis>."
        },
        {
          title: "3. Input Variables in Curly Braces",
          description: "When designing reusable prompt templates, represent variables in double braces to make the insertion points clear.",
          example: "You are editing a manuscript written by {{AUTHOR_NAME}}.\nFocus exclusively on checking the chapter: {{CHAPTER_TITLE}}."
        }
      ],
      proTip: "Instructions at the End! For Claude, placing the primary task instruction at the very end of the prompt (after any long contextual documents or examples) yields substantially higher accuracy."
    },
    {
      id: "openai",
      title: "OpenAI GPT Guidelines",
      provider: "openai",
      description: "OpenAI's playbook focuses on specifying steps, providing reference texts to avoid hallucination, and specifying negative constraints.",
      keyPrinciples: [
        {
          title: "1. Specify the Steps to Complete",
          description: "Provide a detailed step-by-step procedure. This keeps the model on a predictable execution path and reduces logical jumps.",
          example: "Step 1: Summarize the user's feedback in one sentence.\nStep 2: Classify the feedback as positive, neutral, or negative.\nStep 3: Generate a draft email response."
        },
        {
          title: "2. Golden Reference Texts",
          description: "Instruct the model to answer using ONLY the facts provided in a trustworthy reference text, eliminating external knowledge hallucination.",
          example: "Answer the user question using ONLY the facts in the text below. If you cannot find the answer, state 'Information not found.'\n\nReference: [Text]"
        },
        {
          title: "3. Clear Delimiters (Triple Quotes)",
          description: "Use triple quotation marks (\"\"\") or markdown section separators to prevent prompt-injection by clearly dividing system directives from untrusted user content.",
          example: "Rewrite the following text to be professional:\n\"\"\"\n[Untrusted User Text Here]\n\"\"\""
        }
      ],
      proTip: "State what NOT to do! Explicitly list negative constraints (e.g., 'Do not write any markdown code blocks, do not explain your code, and do not use technical jargon') to keep responses brief and focused."
    },
    {
      id: "universal",
      title: "Universal Prompting Principles",
      provider: "universal",
      description: "These foundational techniques are highly effective across all LLM systems, including Gemini, Claude, and GPT models.",
      keyPrinciples: [
        {
          title: "1. The 'Role-Context-Task-Constraint' (RCTC) Formula",
          description: "Every master prompt should combine these four items: Role (who is the AI), Context (why is this happening), Task (what needs to be built), and Constraints (rules of engagement).",
          example: "Role: Senior UI/UX Engineer\nContext: Redesigning a landing page for elderly users\nTask: Generate 5 design principles\nConstraints: Each principle must be under 12 words"
        },
        {
          title: "2. Few-Shot Pattern Matching",
          description: "Do not just explain what you want; show it. Providing 1 to 3 actual input-output examples helps the model mirror your exact structural and stylistic preferences.",
          example: "Input: Add 3 to 5\nOutput: 8\n\nInput: Multiply 2 and 10\nOutput: 20\n\nInput: Subtract 1 from 7\nOutput: [Placeholder]"
        },
        {
          title: "3. Output Schema Specification",
          description: "To use LLM outputs programmatically, request structures like markdown tables, YAML, or valid JSON, and provide an empty template block for the model to fill.",
          example: "Output exactly in this JSON format:\n{\n  \"status\": \"success\" | \"error\",\n  \"message\": \"Detailed text\"\n}"
        }
      ],
      proTip: "Iterate and Sandbox! Prompt engineering is an empirical science. Always test your engineered prompts with standard 'edge-case' user inputs to find failure modes and insert corrective instructions."
    }
  ];

  const currentSection = sections.find((s) => s.id === activeTab) || sections[0];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${activeTab}-${index}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case "google":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "anthropic":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "openai":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    }
  };

  return (
    <div id="guidebook-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto p-1">
      {/* Sidebar navigation */}
      <div className="lg:col-span-3 flex flex-col gap-2">
        <div className="p-4 bg-[#0D0D10]/50 border border-white/5 rounded-xl mb-2">
          <div className="flex items-center gap-2 text-white font-semibold mb-1">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Prompt Playbook</span>
          </div>
          <p className="text-xs text-slate-500">Research compiled from official engineering playbooks.</p>
        </div>

        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveTab(section.id)}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left border text-sm transition-all duration-200 ${
              activeTab === section.id
                ? "bg-indigo-600/10 text-indigo-300 border-indigo-500/30 font-medium shadow-[0_4px_12px_rgba(79,70,229,0.1)]"
                : "bg-[#0D0D10]/50 text-slate-400 border-white/5 hover:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${
                section.provider === 'google' ? 'bg-blue-500' :
                section.provider === 'anthropic' ? 'bg-amber-500' :
                section.provider === 'openai' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`} />
              <span>{section.title.split(' ')[0] + ' ' + (section.title.split(' ')[1] || '')}</span>
            </div>
            <ChevronRight className={`w-4 h-4 opacity-50 transition-transform ${activeTab === section.id ? 'translate-x-1' : ''}`} />
          </button>
        ))}
      </div>

      {/* Main content display */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        <motion.div
          key={currentSection.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6 md:p-8"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-bold font-sans text-white">
                  {currentSection.title}
                </h2>
                <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${getProviderBadgeColor(currentSection.provider)}`}>
                  {currentSection.provider.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                {currentSection.description}
              </p>
            </div>
            <div className="flex-shrink-0 self-start md:self-center bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/20">
              <Compass className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          {/* Key Principles */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold font-sans uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Core Guidelines & Implementations</span>
            </h3>

            <div className="grid grid-cols-1 gap-6">
              {currentSection.keyPrinciples.map((principle, index) => (
                <div 
                  key={index} 
                  className="group bg-white/[0.01] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        {principle.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {principle.description}
                      </p>
                    </div>
                  </div>

                  {/* Code Example box */}
                  <div className="relative mt-3.5 bg-black/40 rounded-lg border border-white/5 overflow-hidden font-mono text-xs text-slate-300">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#121218]/50">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>EXAMPLE TEMPLATE</span>
                      </div>
                      <button
                        onClick={() => handleCopy(principle.example, index)}
                        className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title="Copy template example"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 text-slate-200 select-all">
                      {principle.example}
                    </pre>

                    {copiedId === `${activeTab}-${index}` && (
                      <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center text-xs text-emerald-400 font-semibold font-sans gap-2 backdrop-blur-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                        <span>Copied to Clipboard!</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip Callout */}
          <div className="mt-8 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 flex items-start gap-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h4 className="font-semibold text-indigo-300 text-xs uppercase tracking-wider mb-1">
                Pro Engineering Tip
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentSection.proTip}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
