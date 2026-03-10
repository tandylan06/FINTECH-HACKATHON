import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, History, ArrowRight, Loader2, AlertCircle, BookOpen, TrendingUp } from "lucide-react";



const SUGGESTED = [
  { label: "Rate hikes & bank stress",     query: "Rapid rate hikes causing bank stress and credit tightening" },
  { label: "Oil shock & inflation",         query: "Oil supply shock driving persistent inflation and recession fears" },
  { label: "Tech bubble unwinding",         query: "Tech sector valuation collapse after years of easy money" },
  { label: "EM currency crisis",            query: "Emerging market currency crisis driven by strong dollar and capital flight" },
  { label: "Trade war & tariffs",           query: "Escalating trade war with broad tariffs disrupting global supply chains" },
  { label: "Yield curve inversion",         query: "Yield curve inversion signalling recession with central bank uncertainty" },
  { label: "Credit market freeze",          query: "Credit markets seizing up as spreads widen and liquidity dries up" },
  { label: "Geopolitical commodity shock",  query: "Geopolitical conflict causing commodity price spike and stagflation risk" },
];

export default function Memory() {
  const [query,   setQuery]   = useState(SUGGESTED[0].query);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const findParallels = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResults(null);
    setError("");
    try {
      const res = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 2500,
          messages: [{ role: "user", content:
            `You are a senior macro historian. A user has described a current market scenario: "${q}"

Find exactly 2 historical analogues. For each, provide:
- year: the year/period (e.g. "1994", "2008–09")
- title: short name (e.g. "1994 Bond Massacre")
- similarity: percentage 0–100
- context: 2 sentences about what happened then
- then_bullets: 3 key events/characteristics from that period (short phrases)
- now_bullets: 3 current parallels to today (short phrases)
- outcome: what happened next (1 sentence)
- lesson: the key takeaway for a trader/investor today (1 sentence)

Respond ONLY with valid JSON array, no markdown:
[{"year":"...","title":"...","similarity":85,"context":"...","then_bullets":["...","...","..."],"now_bullets":["...","...","..."],"outcome":"...","lesson":"..."}]`
          }]
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const raw = json.choices?.[0]?.message?.content || "";
      // Extract the JSON array robustly — find [ ... ] bounds
      const start = raw.indexOf("[");
      const end   = raw.lastIndexOf("]");
      if (start === -1 || end === -1) throw new Error("No JSON array in response");
      const parsed = JSON.parse(raw.slice(start, end + 1));
      setResults(parsed);
    } catch (e: any) {
      setError("Failed to find parallels: " + (e.message || "unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Auto-load first suggestion on mount
  useEffect(() => { findParallels(SUGGESTED[0].query); }, []);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); findParallels(query); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Institutional Memory</h1>
        <p className="text-gray-400 mt-1 text-sm">Find historical analogues to current market conditions using AI</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-2xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Describe a current market scenario (e.g. 'rapid rate hikes causing bank stress')..."
              className="w-full bg-[#132F4C] border-[#1E3A5F] text-white pl-9 h-12"
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()} className="px-6 h-12 bg-[#FFB347] text-black font-bold hover:bg-[#ffba5e]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Parallels"}
          </Button>
        </div>
      </form>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 shrink-0">Explore:</span>
          {SUGGESTED.map(s => (
            <button key={s.label} onClick={() => { setQuery(s.query); findParallels(s.query); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${query === s.query ? "bg-[#FFB347]/20 border-[#FFB347]/50 text-[#FFB347]" : "bg-[#132F4C] border-[#1E3A5F] text-gray-400 hover:text-white hover:border-[#2D5A88]"}`}>
              {s.label}
            </button>
          ))}
        </div>

      {error && <div className="text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading && (
        <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFB347]" />
          <p className="text-sm">Searching historical archives...</p>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#FFB347]" />
            <h2 className="text-lg font-semibold text-white">Historical Analogues for: <span className="text-[#FFB347]">{query}</span></h2>
          </div>

          {results.map((r, i) => (
            <Card key={i} className="bg-[#132F4C] border-l-4 border-l-[#FFB347] border-y-[#1E3A5F] border-r-[#1E3A5F]">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm text-[#FFB347] font-black tracking-wider uppercase mb-1">{r.similarity}% Similarity Match</div>
                    <h3 className="text-xl font-bold text-white">{r.title}</h3>
                    <span className="text-xs text-gray-500">{r.year}</span>
                  </div>
                  <Badge variant="outline" className="text-gray-300 border-gray-600">Historical Analogue</Badge>
                </div>

                <p className="text-gray-300 mb-5 leading-relaxed">{r.context}</p>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-[#0A1929]/50 p-4 rounded-xl border border-[#1E3A5F]">
                    <h4 className="text-xs font-black text-gray-400 mb-3 uppercase tracking-wider">Then ({r.year})</h4>
                    <ul className="space-y-2">
                      {(r.then_bullets || []).map((b: string, j: number) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                          <ArrowRight className="w-4 h-4 text-[#FFB347] shrink-0 mt-0.5" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-[#0A1929]/50 p-4 rounded-xl border border-[#1E3A5F]">
                    <h4 className="text-xs font-black text-gray-400 mb-3 uppercase tracking-wider">Now (Today)</h4>
                    <ul className="space-y-2">
                      {(r.now_bullets || []).map((b: string, j: number) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                          <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-amber-400">What Happened Next</span>
                    </div>
                    <p className="text-sm text-gray-300">{r.outcome}</p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-blue-400">Key Lesson</span>
                    </div>
                    <p className="text-sm text-gray-300">{r.lesson}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-gray-600 text-center">Historical analysis generated by AI. Not financial advice.</p>
        </div>
      )}

      {results && results.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No strong historical parallels found. Try rephrasing your scenario.</p>
        </div>
      )}
    </div>
  );
}