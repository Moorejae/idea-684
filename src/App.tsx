import { useState, useEffect } from "react";
import { Sparkles, BookOpen, Save, Trash2, Copy, FileCode, Check, RefreshCw, Terminal, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PromptOptimizer from "./components/PromptOptimizer";
import Guidebook from "./components/Guidebook";
import { SavedPrompt } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"optimizer" | "guidebook" | "saved">("optimizer");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load saved prompts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("prompt_architect_saved");
      if (stored) {
        setSavedPrompts(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading saved prompts:", e);
    }
  }, []);

  // Save prompt helper
  const handleSavePrompt = (newPrompt: SavedPrompt) => {
    const updated = [newPrompt, ...savedPrompts];
    setSavedPrompts(updated);
    localStorage.setItem("prompt_architect_saved", JSON.stringify(updated));
    // Provide user feedback & change tab to see saved list
    setActiveTab("saved");
  };

  // Delete prompt helper
  const handleDeletePrompt = (id: string) => {
    const updated = savedPrompts.filter((p) => p.id !== id);
    setSavedPrompts(updated);
    localStorage.setItem("prompt_architect_saved", JSON.stringify(updated));
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load back to editor
  const handleLoadToWorkspace = (promptText: string) => {
    setInitialPrompt(promptText);
    setActiveTab("optimizer");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-slate-200 flex flex-col">
      {/* Top Header Panel */}
      <header className="sticky top-0 z-40 bg-[#0D0D10] border-b border-white/5 backdrop-blur-md bg-opacity-95 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold font-display shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              P
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-widest font-display text-white uppercase">
                Prompt<span className="font-bold text-indigo-400">Architect</span>
              </h1>
              <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-500 mt-1 font-mono">
                AI Prompt Engineering Laboratory
              </p>
            </div>
          </div>

          {/* Navigation Tab Controls */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("optimizer")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all border ${
                activeTab === "optimizer"
                  ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Workshop</span>
            </button>

            <button
              onClick={() => setActiveTab("guidebook")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all border ${
                activeTab === "guidebook"
                  ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Playbook</span>
            </button>

            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all border relative ${
                activeTab === "saved"
                  ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Saved Masterpieces</span>
              {savedPrompts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-indigo-600 animate-pulse">
                  {savedPrompts.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 py-8 px-6 md:px-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === "optimizer" && (
            <motion.div
              key="optimizer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <PromptOptimizer 
                initialPrompt={initialPrompt} 
                setInitialPrompt={setInitialPrompt}
                onSavePrompt={handleSavePrompt}
              />
            </motion.div>
          )}

          {activeTab === "guidebook" && (
            <motion.div
              key="guidebook"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <Guidebook />
            </motion.div>
          )}

          {activeTab === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {savedPrompts.length === 0 ? (
                <div className="bg-[#0D0D10] border border-white/5 rounded-2xl p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 border border-white/5 mb-4">
                    <Save className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-white text-base font-sans">No Saved Masterpiece Prompts</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mt-1.5">
                    Once you complete a prompt alignment interview, you can save your polished system prompt here for quick access.
                  </p>
                  <button
                    onClick={() => setActiveTab("optimizer")}
                    className="mt-6 flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs uppercase tracking-wider transition-all"
                  >
                    <span>Design Your First Prompt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-b border-white/5 pb-3">
                    <h2 className="text-lg font-bold text-white font-sans">Saved Prompts Archive</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Your library of custom engineered system prompts.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {savedPrompts.map((p) => (
                      <div 
                        key={p.id} 
                        className="bg-[#0D0D10]/50 border border-white/5 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-200"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 mb-4">
                            <div>
                              <h4 className="font-semibold text-white text-sm font-sans line-clamp-1">
                                {p.title}
                              </h4>
                              <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md mt-1.5 inline-block border border-indigo-500/20">
                                STYLE: {p.style.toUpperCase()}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopyPrompt(p.refined, p.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                                title="Copy refined prompt"
                              >
                                {copiedId === p.id ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() => handleLoadToWorkspace(p.original)}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                                title="Reload to editor workspace"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeletePrompt(p.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white/5 transition-colors"
                                title="Delete prompt"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-950 text-slate-300 p-4 rounded-xl border border-white/5 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                            {p.refined}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Saved on {p.createdAt}</span>
                          <button
                            onClick={() => handleLoadToWorkspace(p.original)}
                            className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            <span>Refine Again</span>
                            <ArrowRight className="w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer metadata */}
      <footer className="bg-[#0D0D10] border-t border-white/5 py-6 px-8 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>Prompt Architect &copy; 2026. All rights reserved.</span>
          <div className="flex items-center justify-center gap-4 text-[10px] font-mono">
            <span>Powered by Gemini 3.5 Flash</span>
            <span className="text-white/10">|</span>
            <span className="text-emerald-500">Cloud Sync: Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
