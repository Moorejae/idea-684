import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Terminal, CheckCircle2, AlertCircle, ArrowRight, Copy, RotateCcw,
  Play, Check, Loader2, HelpCircle, Award, ListChecks, HelpCircle as QuestionIcon,
  ChevronRight, Save, Layout, ShieldCheck, ChevronDown, CheckSquare, Settings2, BrainCircuit,
  Mic, MicOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnalysisResult, ClarifyingQuestion, SavedPrompt } from "../types";
import TemplateLibrary from "./TemplateLibrary";

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
  const [promptCategory, setPromptCategory] = useState<string>("Basic/General");

  const API_BASE = import.meta.env.VITE_API_URL || "";

  // Q&A answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedStyle, setSelectedStyle] = useState<'standard' | 'xml' | 'persona' | 'sequential'>('standard');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [finalResult, setFinalResult] = useState<{
    refinedPrompt: string;
    explanation: string;
    keyAdditions: string[];
    suggestedTestInput: string;
  } | null>(null);

  // Simulation state
  const [testInput, setTestInput] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedOutput, setSimulatedOutput] = useState<string>("");
  const [simulatedAnalysis, setSimulatedAnalysis] = useState<string>("");

  // Brain Context (Eyeno)
  const [brainContext, setBrainContext] = useState<string | null>(null);
  const [useEyenoGuide, setUseEyenoGuide] = useState<boolean>(true);

  // UI state
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Toggle Recording
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setIsTranscribing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64AudioMessage = reader.result as string;
            
            try {
              const res = await fetch(`${API_BASE}/api/transcribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioBase64: base64AudioMessage })
              });

              if (!res.ok) throw new Error("Transcription failed");
              
              const data = await res.json();
              setInitialPrompt(prev => {
                const sep = prev.trim().length > 0 ? "\\n\\n" : "";
                return prev + sep + data.transcription;
              });
            } catch (err: any) {
              setApiError("Failed to transcribe audio: " + err.message);
            } finally {
              setIsTranscribing(false);
              stream.getTracks().forEach(track => track.stop());
            }
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err: any) {
        setApiError("Microphone access denied: " + err.message);
      }
    }
  };

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
    setBrainContext(null);
  };

  const handleOptionToggle = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const currentAns = prev[questionId] || "";
      let segments = currentAns.split(",").map(s => s.trim()).filter(Boolean);
      
      if (segments.includes(option)) {
        segments = segments.filter(s => s !== option);
      } else {
        segments.push(option);
      }
      
      return { ...prev, [questionId]: segments.join(", ") };
    });
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
        body: JSON.stringify({ prompt: initialPrompt, category: promptCategory })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to analyze prompt.");
      }

      const data: AnalysisResult = await res.json();
      setAnalysis(data);

      // Seed initial empty answers
      const initialAnswers: Record<string, string> = {};
      data.clarifyingQuestions.forEach((q) => {
        initialAnswers[q.id] = "";
      });
      setAnswers(initialAnswers);
      setStep(2);
      // NOTE: Brain query intentionally removed from here.
      // It will be re-queried in handleSynthesize using the full context
      // (original prompt + all compiled answers) for much better relevance.
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Unexpected end of JSON input") || err.message?.includes("Unexpected token <")) {
        setApiError("Server Not Connecting");
      } else {
        setApiError(err.message || "Something went wrong.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Synthesize → Auto-Test → Move to Step 3
  // This is the correct full pipeline:
  //   1. Query AI Brain with full context (original prompt + all compiled answers)
  //   2. Synthesize refined prompt (with Eyeno blueprint if toggle is ON)
  //   3. Auto-run simulation using the AI-suggested test input
  //   4. Land on Step 3 with everything already done
  const handleSynthesize = async () => {
    setIsRegenerating(true);
    setApiError(null);

    // Format compiled answers for both the brain query and synthesis
    const compiledAnswers = (analysis?.clarifyingQuestions || []).map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || "No input provided"
    }));

    // Build the full-context query string for the brain
    const fullContextQuery = `${initialPrompt}\n\n${compiledAnswers.map(a => `${a.question}: ${a.answer}`).join("\n")}`;

    try {
      // STEP 1: Query AI Brain with full context (answers are now compiled)
      // This gives Eyeno the complete picture — not just the vague initial draft
      let freshBrainContext: string | null = null;
      try {
        const brainRes = await fetch(`${API_BASE}/api/brain-query?query=${encodeURIComponent(fullContextQuery)}`);
        const brainData = await brainRes.json();
        if (brainData.idea && !brainData.idea.includes("No strongly related ideas") && !brainData.idea.includes("No highly relevant")) {
          freshBrainContext = brainData.idea;
          setBrainContext(freshBrainContext);
        }
      } catch (brainErr) {
        console.warn("Brain query failed silently — continuing without Eyeno context:", brainErr);
      }

      // STEP 2: Synthesize the refined prompt
      const synthRes = await fetch(`${API_BASE}/api/regenerate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPrompt: initialPrompt,
          answers: compiledAnswers,
          style: selectedStyle,
          eyenoBlueprint: useEyenoGuide ? freshBrainContext : null
        })
      });

      if (!synthRes.ok) {
        const errorData = await synthRes.json();
        throw new Error(errorData.error || "Failed to synthesize prompt.");
      }

      const synthData = await synthRes.json();
      setFinalResult(synthData);

      // STEP 3: Auto-simulate using the AI-suggested test input
      // Pre-populate the testInput box with what Gemini suggested
      const autoTestInput = synthData.suggestedTestInput || "Run a realistic demonstration of this prompt.";
      setTestInput(autoTestInput);
      setIsSimulating(true);

      try {
        const simRes = await fetch(`${API_BASE}/api/simulate-prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: synthData.refinedPrompt,
            userInput: autoTestInput
          })
        });

        if (simRes.ok) {
          const simData = await simRes.json();
          setSimulatedOutput(simData.simulatedOutput);
          setSimulatedAnalysis(simData.analysis);
        } else {
          console.warn("Auto-simulation failed — user can still run it manually.");
        }
      } catch (simErr) {
        console.warn("Auto-simulation network error — continuing:", simErr);
      } finally {
        setIsSimulating(false);
      }

      // All done — move to Step 3
      setStep(3);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Unexpected end of JSON input") || err.message?.includes("Unexpected token <")) {
        setApiError("Server Not Connecting");
      } else {
        setApiError(err.message || "Failed to synthesize final prompt.");
      }
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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to run simulation.");
      }

      const data = await res.json();
      setSimulatedOutput(data.simulatedOutput);
      setSimulatedAnalysis(data.analysis);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Unexpected end of JSON input") || err.message?.includes("Unexpected token <")) {
        setApiError("Server Not Connecting");
      } else {
        setApiError(err.message || "Simulation failed.");
      }
    } finally {
      setIsSimulating(false);
    }
  };


  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = () => {
    if (!finalResult) return;
    const newSaved: SavedPrompt = {
      id: crypto.randomUUID(),
      title: initialPrompt.slice(0, 30) + (initialPrompt.length > 30 ? "..." : ""),
      original: initialPrompt,
      refined: finalResult.refinedPrompt,
      style: selectedStyle,
      createdAt: new Date().toLocaleDateString()
    };
    onSavePrompt(newSaved);
  };

  // Load starter template directly
  const handleSelectTemplate = (prompt: string) => {
    setInitialPrompt(prompt);
    // Smooth scroll to top of workspace
    document.getElementById("workspace-entry")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Progress timeline */}
      <div className="bg-[#0D0D10] border border-white/5 p-5 rounded-2xl flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-xl border border-white/5">
            <Settings2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Prompt Construction Workspace</h2>
            <p className="text-xs text-slate-400">Transform raw drafts into robust system prompts.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-4 text-xs font-medium text-slate-400">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${step === 1 ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/20" : "border-transparent"}`}>
            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] border border-white/5">1</span>
            <span>Paste Draft</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-600 hidden md:block" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${step === 2 ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/20" : "border-transparent"}`}>
            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] border border-white/5">2</span>
            <span>Align Details</span>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-600 hidden md:block" />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${step === 3 ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/20" : "border-transparent"}`}>
            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] border border-white/5">3</span>
            <span>Review & Test</span>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-medium animate-fade-in w-fit mb-6">
          <AlertCircle className="w-4 h-4" />
          <span>Connection lost</span>
        </div>
      )}

      {/* Main interactive workflow stages */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 gap-8"
          >
            {/* Upper Editor Workspace */}
            <div id="workspace-entry" className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6 md:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-white font-sans text-sm md:text-base">
                    Draft Your Prompt Here
                  </h3>
                </div>
                {initialPrompt && (
                  <button
                    onClick={() => setInitialPrompt("")}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Draft</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="Paste or write your raw prompt/idea here... (e.g., 'Make me a task manager component with drag and drop, calendar summaries, and stats.')"
                  rows={8}
                  className="w-full bg-white/[0.02] border border-white/10 p-5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all font-mono text-sm leading-relaxed text-indigo-100 placeholder-slate-500"
                />
                
                <button
                  onClick={toggleRecording}
                  disabled={isTranscribing}
                  className={`absolute bottom-4 right-4 p-3 rounded-full transition-all flex items-center justify-center ${
                    isRecording 
                      ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]" 
                      : isTranscribing
                        ? "bg-indigo-500/50 text-white cursor-not-allowed"
                        : "bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400"
                  }`}
                  title={isRecording ? "Stop Recording" : "Start Voice Recording"}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="mt-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t border-white/5 pt-5">
                <div className="flex-1 w-full max-w-xs space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Prompt Category</label>
                  <select 
                    value={promptCategory}
                    onChange={(e) => setPromptCategory(e.target.value)}
                    className="w-full bg-[#16161D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Basic/General">Basic / General Purpose</option>
                    <option value="Full Stack Development">Full Stack Development</option>
                    <option value="Web App / Website">Web App / Website</option>
                    <option value="UI Build / Visual Design">UI Build / Visual Design</option>
                    <option value="Data Analysis">Data Analysis</option>
                    <option value="Writing / Content Creation">Writing / Content Creation</option>
                  </select>
                </div>
                
                <button
                  onClick={handleAnalyze}
                  disabled={!initialPrompt.trim() || isAnalyzing}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs uppercase tracking-widest rounded-xl cursor-pointer shadow-[0_4px_12px_rgba(79,70,229,0.2)] transition-all disabled:opacity-55 disabled:cursor-not-allowed group"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Diagnosing & Mapping Gaps...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract Gaps & Align Parameters</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Template library helper */}
            <TemplateLibrary onSelect={handleSelectTemplate} />
          </motion.div>
        )}

        {step === 2 && analysis && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left side: diagnostic summary (Strengths, Gaps, Evaluation scores) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
                  <Award className="w-4.5 h-4.5 text-indigo-400" />
                  <h4 className="font-bold text-white text-sm">
                    Prompt Diagnosis Summary
                  </h4>
                </div>

                {/* Scorecards */}
                <div className="space-y-3.5">
                  {analysis.evaluation.map((evalItem, index) => {
                    const isExcellent = evalItem.rating === "excellent";
                    const isGood = evalItem.rating === "good";
                    return (
                      <div key={index} className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-slate-300">
                            {evalItem.criteria}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${isExcellent
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isGood
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                            {evalItem.rating.toUpperCase().replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                          {evalItem.feedback}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Strengths / Gaps bullets */}
                <div className="mt-6 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">Strengths Detected</span>
                    <ul className="space-y-1.5">
                      {analysis.strengths.map((str, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">Gaps (Missing Details)</span>
                    <ul className="space-y-1.5">
                      {analysis.gaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Interactive alignment interview Q&A */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-white font-sans text-sm md:text-base">
                      Interactive Detail Alignment
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 font-mono">
                    Question {activeQuestionIndex + 1} of {analysis.clarifyingQuestions.length}
                  </span>
                </div>

                {/* Question item container with slider */}
                <div className="min-h-56">
                  {analysis.clarifyingQuestions.map((q, idx) => {
                    if (idx !== activeQuestionIndex) return null;
                    return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div className="bg-indigo-600/5 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3">
                          <QuestionIcon className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block font-mono mb-0.5">RATIONALE / WHY IT MATTERS:</span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {q.context}
                            </p>
                          </div>
                        </div>

                        <h4 className="font-semibold text-white text-base leading-relaxed">
                          {q.question}
                        </h4>

                        {/* Pre-baked option suggestion chips */}
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-2.5 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const currentAns = answers[q.id] || "";
                              const segments = currentAns.split(",").map(s => s.trim()).filter(Boolean);
                              const isSelected = segments.includes(opt);
                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleOptionToggle(q.id, opt)}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all ${isSelected
                                      ? "bg-indigo-600 text-white border-indigo-500/50 shadow-sm"
                                      : "bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300"
                                    }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Manual Custom Answer Input */}
                        <div className="space-y-1.5 pt-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Custom or Specific Answer</label>
                          <input
                            type="text"
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            placeholder="Write your custom detailed answer here..."
                            className="w-full bg-[#16161D] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder-slate-500"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Interview Footer Controls */}
                <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6">
                  <button
                    onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
                    disabled={activeQuestionIndex === 0}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
                  >
                    Back
                  </button>

                  <div className="flex items-center gap-3">
                    {activeQuestionIndex < analysis.clarifyingQuestions.length - 1 ? (
                      <button
                        onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                        className="flex items-center gap-1 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer border border-white/5"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex flex-col gap-4 w-full">
                        {/* Prompt Style Selector block before final synthesis */}
                        <div className="border-t border-white/5 pt-5 mt-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-3 font-mono">Choose Output Structure Style</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {[
                              { id: "standard", name: "Standard", desc: "Markdown headers" },
                              { id: "xml", name: "XML Tagged", desc: "Structured boxes" },
                              { id: "persona", name: "Persona", desc: "Roleplay focus" },
                              { id: "sequential", name: "CoT Steps", desc: "Stepwise logic" }
                            ].map((s) => {
                              const isSelected = selectedStyle === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => setSelectedStyle(s.id as any)}
                                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${isSelected
                                      ? "bg-indigo-600/20 border border-indigo-500/50 text-indigo-300"
                                      : "bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400"
                                    }`}
                                >
                                  <span className="font-bold text-xs block">{s.name}</span>
                                  <span className="text-[9px] text-slate-500 block mt-0.5">{s.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Optional Eyeno Guide Toggle */}
                        {brainContext && (
                          <div className="border border-emerald-500/30 bg-emerald-950/20 rounded-xl p-4 flex items-center justify-between gap-4 mt-2">
                            <div className="flex items-center gap-3">
                              <BrainCircuit className="w-5 h-5 text-emerald-400" />
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Guide with Eyeno (Second Brain)</h4>
                                <p className="text-[10px] text-emerald-300/70 mt-0.5">Inject your cognitive mental models into the generated prompt.</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={useEyenoGuide}
                                onChange={(e) => setUseEyenoGuide(e.target.checked)}
                              />
                              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                          </div>
                        )}

                        <button
                          onClick={handleSynthesize}
                          disabled={isRegenerating}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs uppercase tracking-widest rounded-xl cursor-pointer shadow-[0_4px_12px_rgba(79,70,229,0.2)] transition-all disabled:opacity-50"
                        >
                          {isRegenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {isSimulating 
                                ? <span>Auto-Testing Prompt...</span>
                                : <span>Synthesizing with Eyeno...</span>
                              }
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 animate-pulse" />
                              <span>Synthesize, Test & Learn →</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reset helper */}
                <div className="mt-8 text-center">
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-slate-300 underline cursor-pointer"
                  >
                    Start Over from Scratch
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && finalResult && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8 animate-fade-in"
          >
            {/* Split layout: Side-by-side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Brain Context Box (Left Pane) */}
              <div className="lg:col-span-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div>
                  <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3 mb-4">
                    <BrainCircuit className="w-4.5 h-4.5 text-emerald-400" />
                    <h4 className="font-bold text-emerald-300 text-sm">
                      Eyeno's Perspective
                    </h4>
                  </div>
                  {brainContext ? (
                    <div className="text-[10px] text-emerald-200/80 leading-relaxed whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {brainContext}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400/50 leading-relaxed italic">
                      Eyeno's brain is empty for this topic.
                      Gemini optimized this draft using standard knowledge.
                    </p>
                  )}
                </div>
                <div className="border-t border-emerald-500/20 pt-4 mt-6 flex flex-col gap-3">
                  {brainContext && !brainContext.includes("successfully fused") && !brainContext.includes("Eyeno is offline") && !brainContext.includes("No highly relevant") ? (
                    <button
                      onClick={handleMerge}
                      disabled={isMerging}
                      className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-semibold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                      {isMerging ? "Fusing Perspectives..." : "Merge with Eyeno"}
                    </button>
                  ) : null}
                  <div>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider font-mono block">Status: Symbiotic Mode</span>
                    <p className="text-[10px] text-emerald-400/60 leading-tight mt-1">If Eyeno contributes an idea, you can forcefully fuse it into the Main Prompt.</p>
                  </div>
                </div>
              </div>

              {/* Refined Masterpiece Box (Right Pane) */}
              <div className="lg:col-span-8 bg-gradient-to-br from-[#0A0A0C] to-[#121218] border border-white/10 rounded-xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
                {/* Decorative border highlight */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500" />

                <div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                      <h4 className="font-bold text-white text-base font-sans">
                        Engineered Masterpiece Prompt
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-medium text-slate-300 cursor-pointer transition-colors"
                        title="Save to session checklist"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Prompt</span>
                      </button>

                      <button
                        onClick={() => handleCopy(finalResult.refinedPrompt, "masterpiece")}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        {copiedId === "masterpiece" ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Refined Prompt Code area */}
                  <div className="bg-slate-950 rounded-xl border border-white/5 p-5 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto select-all shadow-inner">
                    {finalResult.refinedPrompt}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      STYLE: {selectedStyle.toUpperCase()}
                    </span>
                  </div>

                  <button
                    onClick={handleReset}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Refine Another Prompt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Explanatory improvements */}
            <div className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6">
              <h4 className="font-bold text-white text-sm mb-3">
                Prompt Architect Assessment
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {finalResult.explanation}
              </p>

              {brainContext && useEyenoGuide && (
                <div className="mb-5 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <BrainCircuit className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Guided by Eyeno Cognitive Architecture
                  </span>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5 font-mono">Key Architectural Upgrades Added</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(finalResult.keyAdditions || []).map((add, index) => (
                    <div key={index} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{add}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt testing simulator sandbox */}
            <div className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6 md:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white font-sans text-sm md:text-base">
                    Interactive Prompt Simulator (Sandbox)
                  </h3>
                </div>
                {simulatedOutput && (
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded font-mono font-bold">✓ Auto-Tested</span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-5 max-w-2xl">
                The prompt was automatically tested below using an AI-suggested test case. You can edit the input and re-run to try any custom scenario.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Input parameters */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Test Case Input</label>
                    <textarea
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Edit the auto-generated test input or write your own..."
                      rows={5}
                      className="w-full bg-white/[0.02] p-4 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 text-xs font-mono leading-relaxed text-indigo-100 placeholder-slate-500"
                    />
                  </div>

                  <button
                    onClick={handleSimulate}
                    disabled={isSimulating}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-[#4f46e5]/85 text-white font-semibold text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-all disabled:opacity-55 shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
                  >
                    {isSimulating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Simulating Model Run...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>{simulatedOutput ? "Re-Run Simulation" : "Run Simulation Test"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right: Output sandbox & Evaluation */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  {isSimulating && !simulatedOutput ? (
                    <div className="h-full border border-dashed border-indigo-500/20 rounded-xl flex flex-col items-center justify-center p-6 text-center">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                      <span className="text-xs font-semibold text-indigo-400">Running Auto-Simulation...</span>
                      <p className="text-[10px] max-w-xs mt-1 leading-relaxed text-slate-500">Testing your prompt against a realistic scenario. This also trains the AI Brain.</p>
                    </div>
                  ) : simulatedOutput ? (
                    <div className="space-y-4">
                      {/* Response Box */}
                      <div className="bg-slate-950 border border-white/5 rounded-xl p-5 font-sans">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Simulated Model Response</span>
                          <button
                            onClick={() => handleCopy(simulatedOutput, "simulation")}
                            className="text-slate-500 hover:text-slate-300 p-1"
                          >
                            {copiedId === "simulation" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                          {simulatedOutput}
                        </div>
                      </div>

                      {/* Evaluation critique box */}
                      {simulatedAnalysis && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4.5 rounded-xl">
                          <div className="flex items-center gap-2 mb-1.5">
                            <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                            <span className="font-bold text-[10px] uppercase text-emerald-400 font-mono">Expert Validation Checklist</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {simulatedAnalysis}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-500">
                      <Terminal className="w-8 h-8 opacity-40 mb-2 text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-400">Ready for Test Simulation</span>
                      <p className="text-[10px] max-w-xs mt-1 leading-relaxed text-slate-500">
                        Enter a test input and run the sandbox simulation.
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
