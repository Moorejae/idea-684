import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Save, 
  Trash2, 
  Copy, 
  Check, 
  Terminal, 
  ArrowRight, 
  Search, 
  Layers, 
  Cpu, 
  ExternalLink,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PromptOptimizer from "./components/PromptOptimizer";
import { SavedPrompt } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"optimizer" | "saved">("optimizer");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vaultSearch, setVaultSearch] = useState<string>("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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

  const filteredVault = savedPrompts.filter((p) => 
    p.title.toLowerCase().includes(vaultSearch.toLowerCase()) ||
    p.refined.toLowerCase().includes(vaultSearch.toLowerCase()) ||
    p.original.toLowerCase().includes(vaultSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#060709] text-zinc-200 flex flex-col selection:bg-zinc-200 selection:text-zinc-950 font-sans">
      {/* Top Metallic Header */}
      <header className="sticky top-0 z-40 bg-[#08090C]/90 border-b border-zinc-800/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 via-slate-200 to-zinc-400 p-[1px] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-zinc-100" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-widest font-display bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent uppercase">
                  Prompt<span className="text-white font-black">Architect</span>
                </h1>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-800/80 border border-zinc-700 text-zinc-300">
                  v3.0
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-zinc-500 mt-0.5 font-mono">
                System Prompt Synthesis Studio
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("optimizer")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-150 border ${
                activeTab === "optimizer"
                  ? "bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 text-zinc-950 font-bold shadow-[0_0_20px_rgba(255,255,255,0.25)] border-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/80 border-transparent"
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === "optimizer" ? "text-zinc-950" : "text-zinc-400"}`} />
              <span>Studio Workshop</span>
            </button>

            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-150 border relative ${
                activeTab === "saved"
                  ? "bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 text-zinc-950 font-bold shadow-[0_0_20px_rgba(255,255,255,0.25)] border-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/80 border-transparent"
              }`}
            >
              <Save className={`w-3.5 h-3.5 ${activeTab === "saved" ? "text-zinc-950" : "text-zinc-400"}`} />
              <span>Masterpiece Vault</span>
              {savedPrompts.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  activeTab === "saved" ? "bg-zinc-950 text-white" : "bg-zinc-800 text-zinc-200 border border-zinc-700"
                }`}>
                  {savedPrompts.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-8 px-4 sm:px-6 md:px-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === "optimizer" && (
            <motion.div
              key="optimizer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PromptOptimizer 
                initialPrompt={initialPrompt} 
                setInitialPrompt={setInitialPrompt}
                onSavePrompt={handleSavePrompt}
              />
            </motion.div>
          )}

          {activeTab === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Vault Header Banner */}
              <div className="relative rounded-2xl bg-gradient-to-b from-zinc-900/90 via-[#0B0D11] to-[#08090C] border border-zinc-700/40 p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-600/50 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300 mb-3 shadow-[0_0_12px_rgba(255,255,255,0.06)]">
                      <Save className="w-3 h-3 text-zinc-200" />
                      <span>Persistent Vault</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight">
                      Saved Masterpieces
                    </h2>
                    <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-xl">
                      Your catalog of synthesized and verified system prompts. Ready for one-click deployment or re-engineering.
                    </p>
                  </div>

                  <div className="relative min-w-[260px]">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={vaultSearch}
                      onChange={(e) => setVaultSearch(e.target.value)}
                      placeholder="Search saved prompts..."
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
                    />
                  </div>
                </div>
              </div>

              {savedPrompts.length === 0 ? (
                <div className="p-16 rounded-2xl bg-[#0B0D11]/90 border border-dashed border-zinc-800 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                    <Save className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white font-display">
                    Your Masterpiece Vault is Empty
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-6 leading-relaxed">
                    Synthesize prompts in the Studio Workshop and click "Save to Vault" to catalog your production-grade system prompts here.
                  </p>
                  <button
                    onClick={() => setActiveTab("optimizer")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 text-zinc-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_16px_rgba(255,255,255,0.2)]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Open Workshop</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {filteredVault.map((item) => {
                    const isExpanded = expandedCardId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-[#0B0D11] border border-zinc-800/90 hover:border-zinc-700 p-6 flex flex-col justify-between transition-all shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                      >
                        <div>
                          {/* Card Top Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 mb-4">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300">
                                {item.style}
                              </span>
                              <h3 className="font-bold text-sm text-white font-display">
                                {item.title}
                              </h3>
                            </div>
                            <span className="text-[11px] font-mono text-zinc-500">
                              {item.createdAt}
                            </span>
                          </div>

                          {/* Raw draft reference */}
                          <div className="mb-4 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/70 text-xs font-mono text-zinc-400">
                            <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Original Draft:</span>
                            <p className="italic text-zinc-300 line-clamp-2">
                              "{item.original}"
                            </p>
                          </div>

                          {/* Refined Prompt Code Canvas */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-widest">
                              Engineered System Prompt
                            </span>
                            <div className={`p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed overflow-hidden transition-all ${
                              isExpanded ? "max-h-[600px] overflow-y-auto" : "max-h-36 line-clamp-4"
                            }`}>
                              {item.refined}
                            </div>
                            {item.refined.length > 250 && (
                              <button
                                onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                                className="text-[11px] font-mono text-zinc-400 hover:text-white underline cursor-pointer pt-1"
                              >
                                {isExpanded ? "Collapse View" : "Expand Full System Prompt"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                          <button
                            onClick={() => handleDeletePrompt(item.id)}
                            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleLoadToWorkspace(item.original)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Load into Workshop</span>
                            </button>

                            <button
                              onClick={() => handleCopyPrompt(item.refined, item.id)}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-zinc-200 via-slate-100 to-zinc-300 hover:from-white hover:to-zinc-200 text-zinc-950 text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_14px_rgba(255,255,255,0.2)] border border-white/60"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-zinc-950" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-zinc-950" />
                                  <span>Copy Prompt</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Minimalist High-End Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-[#060709] py-6 px-6 text-center text-xs font-mono text-zinc-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
            <span className="text-zinc-400 font-semibold tracking-wider">PROMPT ARCHITECT STUDIO</span>
          </div>
          <p className="text-zinc-500 text-[11px]">
            Engineered for high-precision model alignment and enterprise system prompts.
          </p>
        </div>
      </footer>
    </div>
  );
}
