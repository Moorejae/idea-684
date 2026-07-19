import { useState, useEffect, useRef } from "react";
import { BrainCircuit, ShieldCheck, Network, Database } from "lucide-react";
import { motion } from "motion/react";
import ForceGraph2D from "react-force-graph-2d";

// Generate mock node positions for the Obsidian-style graph
const generateNodes = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `n${i}`,
    val: Math.random() * 2 + 1, // Node size scaling
    color: i === 0 ? "#10B981" : i % 4 === 0 ? "#8B5CF6" : i % 3 === 0 ? "#F59E0B" : "#3B82F6",
    name: i === 0 ? "Core Engine" : i % 4 === 0 ? "Mental Model" : i % 3 === 0 ? "Domain Logic" : "Constraint"
  }));
};

const MOCK_NODES = generateNodes(40);
const MOCK_EDGES = MOCK_NODES.map((n, i) => {
  const target1 = MOCK_NODES[Math.floor(Math.random() * MOCK_NODES.length)];
  const target2 = MOCK_NODES[Math.floor(Math.random() * MOCK_NODES.length)];
  return [
    { source: n.id, target: target1.id },
    { source: n.id, target: target2.id }
  ];
}).flat();

export default function BrainVault() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({ width: containerRef.current.clientWidth, height: 400 });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: 400 });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

        <div ref={containerRef} className="mt-8 border border-white/5 rounded-xl bg-[#08080A] relative overflow-hidden h-[400px]">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md cursor-default">
            <Network className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Semantic Knowledge Graph (Interactive)</span>
          </div>

          <div className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing">
            {dimensions.width > 0 && (
              <ForceGraph2D
                graphData={{ nodes: MOCK_NODES, links: MOCK_EDGES }}
                width={dimensions.width}
                height={dimensions.height}
                nodeRelSize={6}
                nodeColor={node => node.color}
                nodeLabel={node => node.name}
                linkColor={() => "rgba(255,255,255,0.05)"}
                backgroundColor="#08080A"
                d3VelocityDecay={0.3}
                enableNodeDrag={true}
                enableZoomPanInteraction={true}
              />
            )}
          </div>
          
          <div className="absolute bottom-4 right-4 left-4 z-10 flex flex-wrap justify-end gap-2 cursor-default pointer-events-none">
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
