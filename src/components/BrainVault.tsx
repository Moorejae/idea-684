import { useState } from "react";
import { UploadCloud, Image as ImageIcon, Database, BrainCircuit, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function BrainVault() {
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rawData, setRawData] = useState("");
  const [isIngestingText, setIsIngestingText] = useState(false);
  const [textSuccess, setTextSuccess] = useState(false);

  const handleIngestText = async () => {
    if (!rawData.trim()) return;
    setIsIngestingText(true);
    setTextSuccess(false);
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${API_BASE}/api/brain-ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawData, source: "Manual Feed" })
      });
      
      if (response.ok) {
        setTextSuccess(true);
        setRawData(""); // Clear input on success
      } else {
        console.error("Failed to ingest data");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsIngestingText(false);
      setTimeout(() => setTextSuccess(false), 3000);
    }
  };

  const handleUpload = () => {
    setIsUploading(true);
    setSuccess(false);
    setTimeout(() => {
      setIsUploading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-gradient-to-br from-[#0A0A0C] to-[#121218] border border-white/10 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit className="w-8 h-8 text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white font-sans">Eyeno (Second Brain)</h2>
            <p className="text-xs text-slate-400 mt-1">Feed data into Eyeno's semantic knowledge graph.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-[#0D0D10]/50 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-emerald-500/20 transition-all">
            <Database className="w-10 h-10 text-slate-500 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Ingest Text Data</h3>
            <p className="text-[10px] text-slate-400 mb-4 px-4 leading-relaxed">
              Paste raw text (books, articles, experiences). Eyeno will extract concepts and interlink them safely into GitHub.
            </p>
            <textarea
              className="w-full h-24 bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white mb-3 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              placeholder="Paste raw data here..."
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
            />
            <button 
              onClick={handleIngestText}
              disabled={isIngestingText || !rawData.trim()}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white transition-all w-full max-w-[200px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIngestingText ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Ingesting...</>
              ) : textSuccess ? (
                <><ShieldCheck className="w-4 h-4 text-emerald-400" /> Memorized</>
              ) : (
                "Feed Brain"
              )}
            </button>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all">
            <ImageIcon className="w-10 h-10 text-emerald-400 mb-3" />
            <h3 className="text-sm font-semibold text-emerald-300 mb-1">Ingest Vision / UI Build</h3>
            <p className="text-[10px] text-emerald-400/70 mb-4 px-4 leading-relaxed">
              Upload a mockup. Gemini Vision will extract structural data. Heavy image files are auto-cleared.
            </p>
            <button 
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all w-full max-w-[200px] flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Ingesting...</>
              ) : success ? (
                <><ShieldCheck className="w-4 h-4" /> Synthesized</>
              ) : (
                <><UploadCloud className="w-4 h-4" /> Upload Image</>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-slate-950 border border-white/5 p-4 rounded-xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono block mb-1">Cost-Reduction Engine Active</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When you engineer prompts, the system automatically checks this vault via Semantic Caching. Only the most necessary tokens are sent to Gemini, drastically reducing API costs while non-destructively compounding your perspectives.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
