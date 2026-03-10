import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ArrowRightLeft, TrendingDown, TrendingUp, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { fetchHeadlines } from "@/lib/headlines";



const THEME_DEFINITIONS = [
  { id: "monetary",    name: "Monetary Policy & Rates",  keywords: ["fed","rate","inflation","cpi","powell","interest","treasury","yield","fomc"] },
  { id: "tech",        name: "Tech & AI Capex",          keywords: ["ai","tech","nvidia","microsoft","chip","semiconductor","capex"] },
  { id: "geopolitics", name: "Trade & Geopolitics",      keywords: ["china","tariff","trade","war","sanction","supply chain","conflict"] },
  { id: "energy",      name: "Energy & Commodities",     keywords: ["oil","gas","energy","commodity","gold","opec","crude","copper"] },
  { id: "labor",       name: "Labor Market Dynamics",    keywords: ["job","labor","unemployment","wage","payroll","nfp"] },
  { id: "markets",     name: "General Market Risk",      keywords: ["stock","nasdaq","spx","rally","selloff","equities","volatility"] },
];

export default function Correlation() {
  const [themes,       setThemes]       = useState<any[]>([]);
  const [selected,     setSelected]     = useState<string>("monetary");
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [error,        setError]        = useState("");

  // Fetch live themes from news
  const fetchThemes = async () => {
    setLoading(true);
    try {
      const articles = await fetchHeadlines();
      const buckets: Record<string, { count: number; headline: string; name: string }> = {};
      THEME_DEFINITIONS.forEach(td => { buckets[td.id] = { count: 0, headline: "", name: td.name }; });
      articles.forEach((article: any) => {
        const text = (article.title + " " + (article.description || "")).toLowerCase();
        for (const td of THEME_DEFINITIONS) {
          if (td.keywords.some(kw => new RegExp(`\\b${kw}\\b`, "i").test(text))) {
            buckets[td.id].count++;
            if (!buckets[td.id].headline) buckets[td.id].headline = article.title.split(" - ")[0];
            break;
          }
        }
      });
      const active = Object.entries(buckets)
        .filter(([, v]) => v.count > 0)
        .map(([id, v]) => ({ id, name: v.name, count: v.count, headline: v.headline, heat: Math.min(98, 55 + v.count * 7) }))
        .sort((a, b) => b.heat - a.heat);
      setThemes(active);
      // Honour briefing-selected theme if provided
      const briefingTheme = sessionStorage.getItem("briefingSelectedTheme");
      if (briefingTheme) {
        try {
          const bt = JSON.parse(briefingTheme);
          const match = active.find(t => t.name === bt.name || t.id === bt.id);
          if (match) setSelected(match.id);
          else if (active.length > 0) setSelected(active[0].id);
        } catch { if (active.length > 0) setSelected(active[0].id); }
        sessionStorage.removeItem("briefingSelectedTheme");
      } else if (active.length > 0) {
        setSelected(active[0].id);
      }
    } catch { setError("Failed to load news"); }
    finally { setLoading(false); }
  };

  // Ask Groq for correlations from the selected theme to other assets
  const fetchCorrelations = async (themeId: string, themes: any[]) => {
    const theme = themes.find(t => t.id === themeId) || THEME_DEFINITIONS.find(t => t.id === themeId);
    if (!theme) return;
    setAiLoading(true);
    setCorrelations([]);
    try {
      const res = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 600,
          messages: [{ role: "user", content:
            `You are a macro analyst. The dominant market theme right now is: "${theme.name}". ${(theme as any).headline ? `Latest headline: "${(theme as any).headline}"` : ""}

List exactly 5 asset correlations to this theme. For each, provide:
- source: the theme name (short)
- target: specific asset or market (e.g. "EUR/USD", "Gold", "US 10Y Yield", "Nasdaq 100", "Crude Oil", "Emerging Market FX")
- direction: "direct" (same direction) or "inverse" (opposite direction)  
- strength: "Strong", "Medium", or "Weak"
- reason: one sentence why

Respond ONLY with valid JSON array, no markdown:
[{"source":"...","target":"...","direction":"direct or inverse","strength":"...","reason":"..."}]`
          }]
        })
      });
      const json = await res.json();
      const raw  = json.choices?.[0]?.message?.content?.replace(/```json|```/g, "").trim() || "[]";
      const parsed = JSON.parse(raw);
      setCorrelations(parsed);
    } catch { setCorrelations([]); }
    finally { setAiLoading(false); }
  };

  useEffect(() => { fetchThemes(); }, []);
  useEffect(() => { if (themes.length > 0 && selected) fetchCorrelations(selected, themes); }, [selected, themes]);

  const selectedTheme = themes.find(t => t.id === selected) || THEME_DEFINITIONS.find(t => t.id === selected);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Global Correlation Engine</h1>
          <p className="text-gray-400 mt-1 text-sm">AI-powered causal links from live macro themes to asset classes</p>
        </div>
        <Button onClick={fetchThemes} disabled={loading} variant="outline" className="border-[#2D5A88] text-gray-300 hover:text-white hover:bg-[#1E3A5F]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && <div className="text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left: Theme selector */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b border-[#1E3A5F] pb-2">Select Theme</h2>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-[#132F4C] rounded-lg animate-pulse" />)
          ) : themes.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No live themes found</p>
          ) : themes.map(theme => (
            <button key={theme.id} onClick={() => setSelected(theme.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selected === theme.id ? "bg-[#1E3A5F] border-[#FFB347] shadow-[0_0_12px_rgba(255,179,71,0.12)]" : "bg-[#132F4C] border-[#1E3A5F] hover:border-[#2D5A88]"}`}>
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium leading-tight ${selected === theme.id ? "text-white" : "text-gray-300"}`}>{theme.name}</span>
                <span className="text-[10px] text-amber-400 font-bold shrink-0 ml-1">{theme.heat}🔥</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{theme.headline}</p>
            </button>
          ))}
        </div>

        {/* Right: Correlation map */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-[#132F4C] border-[#1E3A5F]">
            <CardHeader className="border-b border-[#1E3A5F] py-3 px-5">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-200">
                <Network className="w-4 h-4 text-[#FFB347]" />
                Transmission Map: <span className="text-white ml-1">{selectedTheme?.name || "—"}</span>
                {aiLoading && <span className="text-xs text-gray-500 ml-2 animate-pulse">Analyzing...</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">

              {/* Central node */}
              {selectedTheme && (
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-[#0A1929] border-2 border-[#FFB347] rounded-2xl px-6 py-4 text-center shadow-[0_0_24px_rgba(255,179,71,0.15)] max-w-sm">
                    <span className="text-[10px] text-[#FFB347] uppercase font-bold tracking-widest block mb-1">Core Theme</span>
                    <span className="text-white font-bold text-base">{selectedTheme.name}</span>
                    {(selectedTheme as any).headline && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{(selectedTheme as any).headline}</p>}
                  </div>
                </div>
              )}

              {/* Correlations grid */}
              {aiLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-[#0A1929] rounded-lg animate-pulse" />)}
                </div>
              ) : correlations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {correlations.map((link, i) => (
                    <div key={i} className={`p-4 rounded-xl border bg-[#0A1929]/60 ${link.direction === "direct" ? "border-emerald-500/30" : "border-red-500/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <ArrowRightLeft className={`w-4 h-4 ${link.direction === "direct" ? "text-emerald-400" : "text-red-400"}`} />
                          <span className="text-sm font-bold text-white">{link.target}</span>
                        </div>
                        <Badge variant="outline" className={`ml-auto text-[10px] ${
                          link.strength === "Strong" ? "border-red-400/40 text-red-400" :
                          link.strength === "Medium" ? "border-amber-400/40 text-amber-400" :
                          "border-gray-500/40 text-gray-400"
                        }`}>{link.strength}</Badge>
                      </div>
                      <div className={`flex items-center gap-1 text-xs mb-2 ${link.direction === "direct" ? "text-emerald-400" : "text-red-400"}`}>
                        {link.direction === "direct" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {link.direction === "direct" ? "Positive correlation" : "Inverse correlation"}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{link.reason}</p>
                    </div>
                  ))}
                </div>
              ) : !aiLoading && (
                <p className="text-center text-gray-500 text-sm py-8 italic">Select a theme to generate correlations</p>
              )}

              <p className="text-[10px] text-gray-600 mt-4 text-center">Correlations generated by AI based on current macro conditions. Not financial advice.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}