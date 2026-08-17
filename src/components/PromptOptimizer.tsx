import { useState, useId } from "react";
import { 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Copy, 
  RotateCcw, 
  Play, 
  Check, 
  Loader2, 
  Award, 
  ListChecks, 
  HelpCircle as QuestionIcon,
  ChevronRight, 
  Save, 
  ShieldCheck, 
  Sliders, 
  Layers,
  Cpu,
  FileCode2,
  Share2,
  Download,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnalysisResult, SavedPrompt } from "../types";
import TemplateLibrary from "./TemplateLibrary";

/**
 * Safely parse a fetch response body as JSON. The backend always tries to
 * return { error } on failure, but a proxy timeout / cold-boot can deliver an
 * empty or non-JSON body — which would otherwise surface as the cryptic
 * "unexpected end of JSON input". Falls back to a readable message.
 */
async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error(
      res.ok
        ? "The server returned an empty response. Please try again."
        : `Request failed (HTTP ${res.status}) with an empty response. Please try again.`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON — show a snippet of what came back instead of a parse crash.
    const snippet = text.replace(/\s+/g, " ").trim().substring(0, 120);
    throw new Error(
      `The server returned an unexpected response (HTTP ${res.status}). ${snippet}`
    );
  }
}

/**
 * API base. On the custom domain (myzelva.com) the frontend is served by
 * Cloudflare, whose Pages functions cap requests at ~30s — too short for the
 * Qwen cold-start. So on that host we call the Render backend DIRECTLY (CORS
 * enabled on the server) and let Cloudflare just serve the static site.
 */
const API_BASE = (() => {
  if (typeof window !== "undefined" && window.location?.hostname === "myzelva.com") {
    return "https://idea-684.onrender.com";
  }
  return "";
})();

interface PromptOptimizerProps {
  initialPrompt: string;
  setInitialPrompt: (prompt: string) => void;
  onSavePrompt: (prompt: SavedPrompt) => void;
}

export default function PromptOptimizer({ 
  initialPrompt, 
  setInitialPrompt, 
  onSavePrompt 
}: PromptOptimizerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  
  // Q&A answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedStyle, setSelectedStyle] = useState<'standard' | 'xml' | 'persona' | 'sequential'>('xml');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [finalResult, setFinalResult] = useState<{
    refinedPrompt: string;
    explanation: string;
    keyAdditions: string[];
  } | null>(null);

  // Simulation state
  const [testInput, setTestInput] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedOutput, setSimulatedOutput] = useState<string>("");
  const [simulatedAnalysis, setSimulatedAnalysis] = useState<string>("");

  // UI state
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Character & Token estimation
  const charCount = initialPrompt.length;
  const wordCount = initialPrompt.trim() ? initialPrompt.trim().split(/\s+/).length : 0;
  const tokenEstimate = Math.ceil(charCount / 4);

  // Reset helper
  const handleReset = () => {
    setStep(1);
    setAnalysis(null);
    setAnswers({});
    setFinalResult(null);
    setTestInput("");
    setSimulatedOutput("");
    setSimulatedAnalysis("");
    setApiError(null);
    setActiveQuestionIndex(0);
  };

  // Step 1: Submit draft for analysis
  const handleAnalyze = async () => {
    if (!initialPrompt.trim()) return;
    setIsAnalyzing(true);
    setApiError(null);

    try {
      const res = await fetch(`${API_BASE}/api/analyze-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: initialPrompt })
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze prompt.");
      }

      setAnalysis(data);
      
      // Seed initial empty answers
      const initialAnswers: Record<string, string> = {};
      data.clarifyingQuestions.forEach((q) => {
        initialAnswers[q.id] = "";
      });
      setAnswers(initialAnswers);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Something went wrong during prompt diagnosis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Submit answers and style to synthesize final optimized prompt
  const handleSynthesize = async () => {
    setIsRegenerating(true);
    setApiError(null);

    // Format compiled answers
    const compiledAnswers = (analysis?.clarifyingQuestions || []).map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || "Standard best practices default"
    }));

    try {
      const res = await fetch(`${API_BASE}/api/regenerate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPrompt: initialPrompt,
          answers: compiledAnswers,
          style: selectedStyle
        })
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to synthesize prompt.");
      }

      setFinalResult(data);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to synthesize final prompt.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Step 3: Simulate running the prompt
  const handleSimulate = async () => {
    if (!finalResult?.refinedPrompt) return;
    setIsSimulating(true);
    setApiError(null);

    try {
      const res = await fetch(`${API_BASE}/api/simulate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalResult.refinedPrompt,
          userInput: testInput
        })
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to run simulation.");
      }

      setSimulatedOutput(data.simulatedOutput);
      setSimulatedAnalysis(data.analysis);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Simulation failed.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    if (!finalResult) return;
    const blob = new Blob([finalResult.refinedPrompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system_prompt_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (!finalResult) return;
    const newSaved: SavedPrompt = {
      id: crypto.randomUUID(),
      title: initialPrompt.slice(0, 32) + (initialPrompt.length > 32 ? "..." : ""),
      original: initialPrompt,
      refined: finalResult.refinedPrompt,
      style: selectedStyle,
      createdAt: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      tags: [selectedStyle.toUpperCase(), "VERIFIED"]
    };
    onSavePrompt(newSaved);
  };

  const handleSelectTemplate = (prompt: string) => {
    setInitialPrompt(prompt);
    document.getElementById("refinement-workspace")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Precision Step Navigation Ribbon */}
      <div className="bg-[#0B0D11]/90 border border-zinc-800/80 p-4 md:p-5 rounded-2xl flex flex-wrap md:flex-nowrap justify-between items-center gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.05)]">
            <Cpu className="w-4 h-4 text-zinc-200" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-display text-white tracking-wide">
              Engineering Pipeline
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono">
              Diagnostic, alignment, & master synthesis
            </p>
          </div>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-2 md:gap-3 text-xs font-mono">
          {/* Step 1 */}
          <div 
            onClick={() => { if (step > 1) setStep(1); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              step === 1 
                ? "bg-zinc-800/90 border-zinc-500/50 text-white shadow-[0_0_14px_rgba(255,255,255,0.1)] font-semibold"
                : step > 1 
                ? "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer" 
                : "border-transparent text-zinc-600"
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
              step === 1 ? "bg-white text-zinc-950" : step > 1 ? "bg-zinc-800 text-zinc-300" : "bg-zinc-900 text-zinc-600"
            }`}>
              01
            </span>
            <span className="hidden sm:inline">Draft Ingestion</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Step 2 */}
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              step === 2 
                ? "bg-zinc-800/90 border-zinc-500/50 text-white shadow-[0_0_14px_rgba(255,255,255,0.1)] font-semibold"
                : step > 2 
                ? "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer" 
                : "border-transparent text-zinc-600"
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
              step === 2 ? "bg-white text-zinc-950" : step > 2 ? "bg-zinc-800 text-zinc-300" : "bg-zinc-900 text-zinc-600"
            }`}>
              02
            </span>
            <span className="hidden sm:inline">Diagnostic Alignment</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Step 3 */}
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              step === 3 
                ? "bg-zinc-800/90 border-zinc-500/50 text-white shadow-[0_0_14px_rgba(255,255,255,0.1)] font-semibold"
                : "border-transparent text-zinc-600"
            }`}
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
              step === 3 ? "bg-white text-zinc-950" : "bg-zinc-900 text-zinc-600"
            }`}>
              03
            </span>
            <span className="hidden sm:inline">Masterpiece & Sandbox</span>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="bg-rose-950/40 border border-rose-600/40 text-rose-300 p-4 rounded-xl flex items-start gap-3 text-xs md:text-sm font-sans animate-fade-in shadow-[0_0_20px_rgba(225,29,72,0.1)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <span className="font-semibold text-rose-200">System Alert: </span>
            {apiError}
          </div>
        </div>
      )}

      {/* Main Workflow Stages */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-10"
          >
            {/* Upper Editor Workspace */}
            <div 
              id="refinement-workspace" 
              className="relative rounded-2xl bg-[#0B0D11] border border-zinc-800/90 p-6 md:p-8 shadow-[0_8px_35px_rgba(0,0,0,0.6)]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-zinc-300" />
                  <h3 className="font-bold text-white font-display text-base">
                    Draft Input Studio
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    Raw Ingestion
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                  <span>{wordCount} words</span>
                  <span className="text-zinc-700">|</span>
                  <span>~{tokenEstimate} tokens</span>
                  {initialPrompt && (
                    <button 
                      onClick={() => setInitialPrompt("")}
                      className="ml-2 text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="Paste or write your raw prompt/idea here... (e.g., 'Make me a high-performance web dashboard with drag-and-drop task widgets, real-time metrics, and custom filter presets.')"
                  rows={8}
                  className="w-full bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-5 font-mono text-sm leading-relaxed text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/30 transition-all shadow-inner"
                />
              </div>

              {/* Controls Bar */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
                <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-400" />
                  <span>The AI Architect will audit for hallucination risks, missing schemas, and ambiguity.</span>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!initialPrompt.trim() || isAnalyzing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-widest transition-all duration-150 cursor-pointer shadow-[0_0_20px_rgba(226,232,240,0.2)] border border-white/60 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Diagnosing Draft Architecture...</span>
                    </>
                  ) : (
                    <>
                      <span>Begin Diagnostic Alignment</span>
                      <ArrowRight className="w-4 h-4 text-zinc-950 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Template Library Section */}
            <div>
              <TemplateLibrary onSelect={handleSelectTemplate} />
            </div>
          </motion.div>
        )}

        {step === 2 && analysis && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Diagnostics Matrix */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="rounded-2xl bg-[#0B0D11] border border-zinc-800/90 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5 mb-5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-zinc-200" />
                    <h4 className="font-bold text-white text-sm font-display">
                      Diagnostic Audit Matrix
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    Live Evaluation
                  </span>
                </div>

                {/* Scorecards */}
                <div className="space-y-3">
                  {analysis.evaluation.map((evalItem, index) => {
                    const isExcellent = evalItem.rating === "excellent";
                    const isGood = evalItem.rating === "good";
                    return (
                      <div 
                        key={index} 
                        className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-zinc-200">
                            {evalItem.criteria}
                          </span>
                          <span className={`text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border ${
                            isExcellent 
                              ? "bg-zinc-100 text-zinc-950 border-white shadow-[0_0_10px_rgba(255,255,255,0.15)]" 
                              : isGood 
                              ? "bg-zinc-800 text-zinc-300 border-zinc-600"
                              : "bg-rose-950/40 text-rose-300 border-rose-700/50"
                          }`}>
                            {evalItem.rating.toUpperCase().replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                          {evalItem.feedback}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Strengths & Missing Elements */}
                <div className="mt-6 pt-5 border-t border-zinc-800/80 space-y-4 font-sans">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
                      Detected Foundations
                    </span>
                    <ul className="space-y-1.5">
                      {analysis.strengths.map((str, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 mt-0.5 flex-shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">
                      Architectural Voids (To Be Solved)
                    </span>
                    <ul className="space-y-1.5">
                      {analysis.gaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Alignment Interview */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="rounded-2xl bg-[#0B0D11] border border-zinc-800/90 p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-zinc-200" />
                    <h3 className="font-bold text-white font-display text-base">
                      Interactive Parameter Alignment
                    </h3>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 bg-zinc-900 text-zinc-300 rounded-md border border-zinc-700 font-mono font-bold">
                    Item {activeQuestionIndex + 1} of {analysis.clarifyingQuestions.length}
                  </span>
                </div>

                {/* Question item container */}
                <div className="min-h-56">
                  {analysis.clarifyingQuestions.map((q, idx) => {
                    if (idx !== activeQuestionIndex) return null;
                    return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        className="space-y-5"
                      >
                        <div className="bg-zinc-950/90 border border-zinc-800/80 p-4 rounded-xl flex items-start gap-3">
                          <QuestionIcon className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-mono mb-0.5">
                              Architect Rationale & Context
                            </span>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {q.context}
                            </p>
                          </div>
                        </div>

                        <h4 className="font-bold text-white text-base leading-relaxed font-sans">
                          {q.question}
                        </h4>

                        {/* Suggestion Chips */}
                        {q.options && q.options.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">
                              Quick Select Architecture Patterns
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = answers[q.id] === opt;
                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs text-left font-medium border cursor-pointer transition-all ${
                                      isSelected
                                        ? "bg-zinc-100 text-zinc-950 border-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                        : "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Custom Answer Input */}
                        <div className="space-y-1.5 pt-2">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">
                            Or Specify Exact Constraint / Rule
                          </label>
                          <input
                            type="text"
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            placeholder="Type custom directive (e.g., 'Use strict RFC 3339 timestamps and JSON only')..."
                            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/30 transition-all font-mono"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Interview Footer Controls */}
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-6 mt-6">
                  <button
                    onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
                    disabled={activeQuestionIndex === 0}
                    className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-3">
                    {activeQuestionIndex < analysis.clarifyingQuestions.length - 1 ? (
                      <button
                        onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-xl border border-zinc-700 transition-all cursor-pointer shadow-[0_0_12px_rgba(255,255,255,0.03)]"
                      >
                        <span>Next Directive</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex flex-col gap-4 w-full">
                        {/* Prompt Style Selector block before final synthesis */}
                        <div className="border-t border-zinc-800/80 pt-5 mt-2">
                          <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-3 font-mono">
                            Select Output Framing Methodology
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {[
                              { id: "xml", name: "XML Tagged", desc: "Enterprise isolated syntax" },
                              { id: "standard", name: "Structured", desc: "Markdown header blocks" },
                              { id: "persona", name: "Persona Role", desc: "Specialist system directives" },
                              { id: "sequential", name: "Stepwise Logic", desc: "Chain-of-thought protocols" }
                            ].map((s) => {
                              const isSelected = selectedStyle === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => setSelectedStyle(s.id as any)}
                                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-zinc-200 text-zinc-950 border-white shadow-[0_0_14px_rgba(255,255,255,0.18)]"
                                      : "bg-zinc-950/80 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                                  }`}
                                >
                                  <span className="font-bold text-xs block">{s.name}</span>
                                  <span className={`text-[9px] block mt-0.5 ${isSelected ? "text-zinc-800" : "text-zinc-500"}`}>
                                    {s.desc}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          onClick={handleSynthesize}
                          disabled={isRegenerating}
                          className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-widest transition-all duration-150 cursor-pointer shadow-[0_0_22px_rgba(226,232,240,0.25)] border border-white/60 active:scale-[0.99] disabled:opacity-50"
                        >
                          {isRegenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                              <span>Compiling Master System Prompt...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-zinc-950" />
                              <span>Compile Masterpiece System Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button 
                    onClick={handleReset}
                    className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                  >
                    Reset & Edit Raw Draft
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && finalResult && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 animate-fade-in"
          >
            {/* Split Comparison Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Rough Draft Column */}
              <div className="lg:col-span-4 rounded-2xl bg-[#0B0D11] border border-zinc-800/80 p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div>
                  <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 mb-4">
                    <AlertCircle className="w-4 h-4 text-zinc-500" />
                    <h4 className="font-bold text-zinc-300 text-sm font-display">
                      Original Rough Draft
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono leading-relaxed italic whitespace-pre-wrap">
                    "{initialPrompt}"
                  </p>
                </div>
                <div className="border-t border-zinc-800/80 pt-4 mt-6 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>State: Raw & Ambiguous</span>
                  <span className="text-zinc-600">~{tokenEstimate} tokens</span>
                </div>
              </div>

              {/* Masterpiece Engineered Prompt Column */}
              <div className="lg:col-span-8 rounded-2xl bg-gradient-to-b from-zinc-900/90 via-[#0B0D11] to-[#07080A] border border-zinc-600/50 p-6 md:p-8 flex flex-col justify-between relative shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
                {/* Silver Accent Stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent opacity-80" />

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-5">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-zinc-200" />
                      <h4 className="font-bold text-white text-base font-display">
                        Engineered Masterpiece Prompt
                      </h4>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200">
                        {selectedStyle.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/80 text-xs font-mono text-zinc-300 hover:text-white cursor-pointer transition-colors"
                        title="Download Markdown"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Export</span>
                      </button>

                      <button
                        onClick={handleSave}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-900 text-xs font-mono text-zinc-200 hover:text-white cursor-pointer transition-colors"
                        title="Save to Masterpiece Vault"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save to Vault</span>
                      </button>

                      <button
                        onClick={() => handleCopy(finalResult.refinedPrompt, "masterpiece")}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-zinc-950 text-xs font-bold font-mono uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] border border-white/60 transition-all"
                      >
                        {copiedId === "masterpiece" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-zinc-950" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-950" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Refined Prompt Code Canvas */}
                  <div className="bg-zinc-950 rounded-xl border border-zinc-800/80 p-5 font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-[440px] overflow-y-auto select-all shadow-inner">
                    {finalResult.refinedPrompt}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-300 animate-ping" />
                    <span>Format: Validated System Prompt Architecture</span>
                  </div>

                  <button
                    onClick={handleReset}
                    className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Refine Another</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Architectural Upgrades Added Assessment */}
            <div className="rounded-2xl bg-[#0B0D11] border border-zinc-800/80 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              <h4 className="font-bold text-white text-sm font-display mb-2">
                Architectural Breakdown & Strategy
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {finalResult.explanation}
              </p>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2.5 font-mono">
                  Applied Engineering Guards
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {finalResult.keyAdditions.map((add, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/70 text-xs text-zinc-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-zinc-200 flex-shrink-0 mt-0.5" />
                      <span>{add}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Prompt Simulator Sandbox */}
            <div className="rounded-2xl bg-[#0B0D11] border border-zinc-800/80 p-6 md:p-8 shadow-[0_8px_35px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4 mb-4">
                <Play className="w-4 h-4 text-zinc-200" />
                <h3 className="font-bold text-white font-display text-base">
                  Interactive Simulation Terminal (Sandbox)
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6 max-w-2xl">
                Test your newly synthesized prompt with actual user inputs. The simulation passes your engineered system prompt to the underlying model and executes your explicit formatting, safety bounds, and persona constraints.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Test Case Input */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                      Sample User Test Input
                    </label>
                    <textarea
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Type a sample test query to verify your system prompt (e.g., 'What is my workout schedule for tomorrow?')..."
                      rows={5}
                      className="w-full bg-zinc-950/80 p-4 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/30 text-xs font-mono leading-relaxed text-zinc-100 placeholder-zinc-600 shadow-inner"
                    />
                  </div>

                  <button
                    onClick={handleSimulate}
                    disabled={isSimulating}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_18px_rgba(226,232,240,0.2)] border border-white/60 active:scale-[0.99]"
                  >
                    {isSimulating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                        <span>Simulating Model Response...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-zinc-950" />
                        <span>Execute Live Simulation</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Execution Output */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  {simulatedOutput ? (
                    <div className="space-y-4">
                      {/* Response Box */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 font-sans shadow-inner">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                            Model Execution Output
                          </span>
                          <button
                            onClick={() => handleCopy(simulatedOutput, "simulation")}
                            className="text-zinc-400 hover:text-white p-1 cursor-pointer transition-colors"
                          >
                            {copiedId === "simulation" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                          {simulatedOutput}
                        </div>
                      </div>

                      {/* Evaluation critique box */}
                      {simulatedAnalysis && (
                        <div className="bg-zinc-900/90 border border-zinc-700/60 p-4.5 rounded-xl">
                          <div className="flex items-center gap-2 mb-1.5">
                            <ShieldCheck className="w-4 h-4 text-zinc-200" />
                            <span className="font-bold text-[10px] uppercase text-zinc-300 font-mono tracking-wider">
                              Constraint Verification Checklist
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {simulatedAnalysis}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full min-h-[180px] border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-zinc-500 bg-zinc-950/40">
                      <Terminal className="w-8 h-8 opacity-30 mb-2 text-zinc-400" />
                      <span className="text-xs font-semibold text-zinc-400">Simulation Terminal Ready</span>
                      <p className="text-[11px] max-w-xs mt-1 leading-relaxed text-zinc-500">
                        Type a user test case on the left and run the sandbox to see how strictly the AI abides by your new rules.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
