import { Sparkles, Bot, BarChart, Code2, ArrowRight, FileText } from "lucide-react";

export interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: any;
  roughPrompt: string;
}

interface TemplateLibraryProps {
  onSelect: (prompt: string) => void;
}

export default function TemplateLibrary({ onSelect }: TemplateLibraryProps) {
  const templates: Template[] = [
    {
      id: "code-gen",
      title: "Full-Stack Feature Generator",
      category: "Coding & Dev",
      description: "A draft prompt for building UI features, currently lacking framework context and precise guidelines.",
      icon: Code2,
      roughPrompt: "Write a React component for a fitness tracker dashboard that has charts showing workout streaks, calendar planning, and calorie summaries. Make it look nice and clean."
    },
    {
      id: "chatbot",
      title: "Interactive Customer Support AI",
      category: "Conversational",
      description: "A basic customer service bot prompt missing personality rules, policy contexts, and safety boundaries.",
      icon: Bot,
      roughPrompt: "You are a customer support agent for our company. Answer questions from users who are angry about missing packages. Be nice and help them get refunds."
    },
    {
      id: "data-analysis",
      title: "Market Report Summarizer",
      category: "Analytics & Data",
      description: "An open-ended analysis prompt lacking details on structural requirements, math checking, and key focus tables.",
      icon: BarChart,
      roughPrompt: "Summarize this quarterly financial statement sheet. Highlight any major drops in revenue or increases in costs, and tell me if the company is doing well."
    },
    {
      id: "marketing-copy",
      title: "SaaS Launch Email Campaign",
      category: "Content & Writing",
      description: "A draft copywriter prompt that doesn't define tone parameters, Call To Actions, or target demographic constraints.",
      icon: FileText,
      roughPrompt: "Write a launching email series for our new productivity planner tool. Make it exciting so people sign up for the premium trial. Keep it short."
    }
  ];

  return (
    <div className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
          <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
        </div>
        <h2 className="text-lg font-bold font-sans text-white">
          Template Starter Library
        </h2>
      </div>
      <p className="text-xs text-slate-400 mb-6 max-w-xl">
        Select an unrefined, rough draft prompt template below to load it directly into the Prompt Optimizer and see how prompt engineering elevates it.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => {
          const IconComponent = tpl.icon;
          return (
            <div
              key={tpl.id}
              className="group border border-white/5 rounded-xl p-5 bg-white/[0.01] hover:border-white/10 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {tpl.category}
                  </span>
                  <div className="p-1.5 bg-white/5 rounded-lg text-slate-400 group-hover:text-indigo-400 transition-colors">
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-white mb-1 group-hover:text-indigo-400 transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {tpl.description}
                </p>

                {/* Rough draft preview */}
                <div className="bg-slate-950 rounded-lg p-3 border border-white/5 mb-4 text-[11px] font-mono text-slate-300 line-clamp-2 leading-relaxed">
                  <span className="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[9px]">Draft:</span>
                  "{tpl.roughPrompt}"
                </div>
              </div>

              <button
                onClick={() => onSelect(tpl.roughPrompt)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer group/btn shadow-[0_4px_12px_rgba(79,70,229,0.15)]"
              >
                <span>Load & Refine This Draft</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
