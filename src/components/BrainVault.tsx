import { useState, useEffect } from "react";
import { BrainCircuit, ShieldCheck, Network, Database } from "lucide-react";
import { motion } from "motion/react";

// Generate mock node positions for the Obsidian-style graph
const generateNodes = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: 10 + Math.random() * 80, // percentage 10-90
    y: 10 + Math.random() * 80, // percentage 10-90
    size: Math.random() * 8 + 4, // 4-12px
    color: i === 0 ? "#10B981" : i % 4 === 0 ? "#8B5CF6" : i % 3 === 0 ? "#F59E0B" : "#3B82F6",
  }));
};

const MOCK_NODES = generateNodes(30);
const MOCK_EDGES = MOCK_NODES.map((n, i) => {
  const target1 = MOCK_NODES[Math.floor(Math.random() * MOCK_NODES.length)];
  const target2 = MOCK_NODES[Math.floor(Math.random() * MOCK_NODES.length)];
  return [
    { id: `e${i}-1`, source: n, target: target1 },
    { id: `e${i}-2`, source: n, target: target2 }
  ];
}).flat();

export default function BrainVault() {
  const [nodes, setNodes] = useState(MOCK_NODES);

  // Pulse animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(n => ({
        ...n,
        x: n.x + (Math.random() * 2 - 1),
        y: n.y + (Math.random() * 2 - 1)
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

        <div className="mt-8 border border-white/5 rounded-xl bg-[#08080A] relative overflow-hidden h-[400px]">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
            <Network className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Semantic Knowledge Graph</span>
          </div>

          <svg className="absolute inset-0 w-full h-full">
            {/* Edges */}
            {MOCK_EDGES.map(edge => (
              <motion.line
                key={edge.id}
                x1={`${edge.source.x}%`}
                y1={`${edge.source.y}%`}
                x2={`${edge.target.x}%`}
                y2={`${edge.target.y}%`}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            ))}

            {/* Nodes */}
            {nodes.map(node => (
              <motion.circle
                key={node.id}
                cx={`${node.x}%`}
                cy={`${node.y}%`}
                r={node.size}
                fill={node.color}
                className="cursor-pointer"
                whileHover={{ scale: 1.5, filter: "brightness(1.5)" }}
                animate={{ 
                  cx: [`${node.x}%`, `${node.x + (Math.random() * 2 - 1)}%`],
                  cy: [`${node.y}%`, `${node.y + (Math.random() * 2 - 1)}%`]
                }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              />
            ))}
          </svg>
          
          <div className="absolute bottom-4 right-4 z-10 flex gap-2">
            {[
              { label: "Core Prompts", color: "bg-emerald-500" },
              { label: "Mental Models", color: "bg-purple-500" },
              { label: "Domain Logic", color: "bg-amber-500" },
              { label: "Constraints", color: "bg-blue-500" }
            ].map(legend => (
              <div key={legend.label} className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded backdrop-blur border border-white/5">
                <span className={`w-2 h-2 rounded-full ${legend.color}`} />
                <span className="text-[9px] text-slate-400 uppercase">{legend.label}</span>
              </div>
            ))}
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
