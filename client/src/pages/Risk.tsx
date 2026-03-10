import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowDown, AlertTriangle, ChevronRight, Activity, Loader2, RefreshCw } from "lucide-react";
import { fetchHeadlines } from "@/lib/headlines";



const THEME_DEFINITIONS = [
  { id: "monetary",    name: "Monetary Policy & Rates",  keywords: ["fed","rate","inflation","cpi","powell","interest","treasury","yield","fomc"] },
  { id: "tech",        name: "Tech & AI Capex",          keywords: ["ai","tech","nvidia","microsoft","chip","semiconductor","capex"] },
  { id: "consumer",    name: "Consumer Sentiment",       keywords: ["retail","consumer","sales","earnings","spending","sentiment"] },
  { id: "labor",       name: "Labor Market Dynamics",    keywords: ["job","labor","unemployment","wage","payroll","nfp","hiring"] },
  { id: "geopolitics", name: "Trade & Geopolitics",      keywords: ["china","tariff","trade","war","sanction","supply chain","conflict"] },
  { id: "energy",      name: "Energy & Commodities",     keywords: ["oil","gas","energy","commodity","gold","opec","crude"] },
  { id: "macro",       name: "Broader Macroeconomy",     keywords: ["gdp","recession","economy","growth","deficit","debt","pmi"] },
  { id: "markets",     name: "General Market Risk",      keywords: ["stock","nasdaq","spx","rally","selloff","equities","volatility"] },
];

export default function Risk() {
  const [themes,       setThemes]       = useState<any[]>([]);
  const [selected,     setSelected]     = useState<any>(null);
  const [chain,        setChain]        = useState<any>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [liveAlert,    setLiveAlert]    = useState<any>(null);

  // Load themes from sessionStorage (set by Dashboard) or fetch fresh
  const loadThemes = async () => {
    setLoading(true);
    const stored = sessionStorage.getItem("macroThemes");
    if (stored) {
      const parsed = JSON.parse(stored);
      setThemes(parsed);
      // Use briefing-selected theme if provided, otherwise default to first
      const briefingTheme = sessionStorage.getItem("briefingSelectedTheme");
      if (briefingTheme) {
        try { setSelected(JSON.parse(briefingTheme)); } catch { setSelected(parsed[0] || null); }
        sessionStorage.removeItem("briefingSelectedTheme");
      } else {
        setSelected(parsed[0] || null);
      }
      const alertStored = sessionStorage.getItem("macroAlert");
      if (alertStored) setLiveAlert(JSON.parse(alertStored));
      setLoading(false);
      return;
    }
    // Fetch fresh if not in session
    try {
      const articles = await fetchHeadlines();
      const buckets: Record<string, { count: number; articles: any[]; name: string }> = {};
      THEME_DEFINITIONS.forEach(td => { buckets[td.id] = { count: 0, articles: [], name: td.name }; });
      articles.forEach((article: any) => {
        const text = (article.title + " " + (article.description || "")).toLowerCase();
        for (const td of THEME_DEFINITIONS) {
          if (td.keywords.some(kw => new RegExp(`\\b${kw}\\b`, "i").test(text))) {
            buckets[td.id].count++;
            buckets[td.id].articles.push(article);
            break;
          }
        }
      });
      const active = Object.values(buckets)
        .filter(b => b.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((b, i) => ({
          id: Object.keys(buckets).find(k => buckets[k] === b)!,
          name: b.name,
          heat: Math.min(98, 55 + b.count * 7),
          headline: b.articles[0]?.title?.split(" - ")[0] || "",
          category: b.articles[0]?.source?.name || "Market News",
          url: b.articles[0]?.url || null,
        }));
      setThemes(active);
      if (active.length > 0) setSelected(active[0]);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  const generateChain = useCallback(async (theme: any) => {
    if (!theme) return;
    setChainLoading(true);
    setChain(null);
    try {
      const res = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 700,
          messages: [{ role: "user", content:
            `You are a senior risk analyst. The current macro trigger is: "${theme.name}". ${theme.headline ? `Latest headline: "${theme.headline}"` : ""}

Generate a propagation chain with:
- trigger: { title: (headline or theme name), type: "Macro Catalyst: {theme name}" }
- effects: array of 2 objects, each { title: "direct market impact" }
- secondOrder: array of 2 objects, each { title: "second-order systemic effect" }
- assets: array of 3 objects, each { name: "asset name", impact: "Positive or Negative or Neutral", reason: "brief reason" }

Be specific to this theme, not generic. Use real asset names (e.g. "USD Index", "Gold", "S&P 500 Financials", "EUR/USD", "Oil Futures", "US 10Y Yield").

Respond ONLY with valid JSON, no markdown:
{"trigger":{"title":"...","type":"..."},"effects":[{"title":"..."},{"title":"..."}],"secondOrder":[{"title":"..."},{"title":"..."}],"assets":[{"name":"...","impact":"...","reason":"..."},{"name":"...","impact":"...","reason":"..."},{"name":"...","impact":"...","reason":"..."}]}`
          }]
        })
      });
      const json = await res.json();
      const raw  = json.choices?.[0]?.message?.content?.replace(/```json|```/g, "").trim() || "{}";
      setChain(JSON.parse(raw));
    } catch { setChain(null); }
    finally { setChainLoading(false); }
  }, []);

  useEffect(() => { loadThemes(); }, []);
  useEffect(() => { if (selected) generateChain(selected); }, [selected]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Risk Deduction Engine</h1>
          <p className="text-gray-400 mt-1 text-sm">AI-powered causal chain reasoning for live macroeconomic events</p>
        </div>
        <div className="flex items-center gap-3">
          {themes.length > 0 && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-md flex items-center gap-2 text-red-400 text-sm font-medium">
              <Activity className="w-4 h-4" />{themes.length} Active Triggers
            </div>
          )}
          <Button onClick={loadThemes} disabled={loading} variant="outline" size="sm" className="border-[#2D5A88] text-gray-300 hover:text-white hover:bg-[#1E3A5F]">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {liveAlert && (
        <div className="bg-gradient-to-r from-red-900/40 to-[#0A1929] border border-red-500/30 rounded-lg p-4 flex items-start gap-4">
          <div className="bg-red-500/20 p-2 rounded-full mt-0.5"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-red-200">Live Alert: {liveAlert.title}</h3>
              <Badge variant="outline" className="text-red-400 border-red-400/50 bg-red-400/10 text-[10px]">LIVE</Badge>
            </div>
            <p className="text-sm text-gray-300 line-clamp-2">{liveAlert.description}</p>
          </div>
          {liveAlert.url && (
            <Button variant="ghost" size="sm" className="text-red-300 hover:text-red-100 hover:bg-red-500/20 shrink-0"
              onClick={() => window.open(liveAlert.url, "_blank")}>
              Source <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: theme list */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-[#1E3A5F] pb-2">Live Triggers</h2>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-[#132F4C] rounded-lg animate-pulse" />)
          ) : themes.length === 0 ? (
            <div className="text-gray-500 text-sm italic p-4 text-center border border-[#1E3A5F] border-dashed rounded-lg">
              No live vectors detected. <button className="text-blue-400 hover:underline" onClick={loadThemes}>Retry</button>
            </div>
          ) : themes.map(trigger => {
            const isActive   = selected?.id === trigger.id;
            const isHighRisk = trigger.heat > 80;
            return (
              <div key={trigger.id} onClick={() => setSelected(trigger)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${isActive ? "bg-[#1E3A5F] border-[#FFB347] shadow-[0_0_15px_rgba(255,179,71,0.15)]" : "bg-[#132F4C] border-[#1E3A5F] hover:border-[#2D5A88]"}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-medium text-sm leading-tight pr-2 ${isActive ? "text-white" : "text-gray-300"}`}>{trigger.name}</h3>
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${isHighRisk ? "text-red-400" : "text-yellow-400"}`} />
                </div>
                <p className="text-xs text-gray-400 line-clamp-1 mb-3">{trigger.headline}</p>
                <div className="pt-2 border-t border-[#1E3A5F] text-[10px] text-gray-500 flex items-center justify-between font-mono">
                  <span>HEAT: {trigger.heat}</span>
                  <span className="flex items-center text-[#FFB347]">View Chain <ChevronRight className="w-3 h-3 ml-1" /></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: propagation chain */}
        <div className="lg:col-span-2">
          <Card className="bg-[#132F4C] border-[#1E3A5F] min-h-[500px]">
            <CardHeader className="border-b border-[#1E3A5F]">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5 text-[#FFB347]" />
                Propagation Path
                {chainLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              {!chain && !chainLoading && (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  Select a trigger to generate causal chain...
                </div>
              )}
              {chainLoading && (
                <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FFB347]" />
                  <p className="text-sm">Generating causal chain...</p>
                </div>
              )}
              {chain && !chainLoading && (
                <div className="max-w-2xl mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">

                  {/* Trigger */}
                  <div className="w-full bg-red-950/40 border border-red-500/50 p-4 rounded-xl text-center shadow-[0_0_20px_rgba(220,38,38,0.15)]">
                    <div className="text-xs text-red-400 uppercase font-bold tracking-wider mb-1">Trigger Event</div>
                    <div className="text-base text-white font-semibold leading-snug">{chain.trigger?.title}</div>
                    <div className="text-sm text-gray-400 mt-1">{chain.trigger?.type}</div>
                  </div>

                  <div className="h-8 border-l-2 border-dashed border-gray-600 my-2" />
                  <ArrowDown className="w-5 h-5 text-gray-500 mb-2" />

                  {/* Level 1 */}
                  <div className="w-full flex gap-4 justify-center">
                    {(chain.effects || []).map((e: any, i: number) => (
                      <div key={i} className="flex-1 bg-[#1E3A5F]/50 border border-[#2D5A88] p-4 rounded-xl text-center">
                        <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-1">Direct Impact</div>
                        <div className="text-sm text-white font-medium">{e.title}</div>
                      </div>
                    ))}
                  </div>

                  <div className="h-8 border-l-2 border-dashed border-gray-600 my-2" />
                  <ArrowDown className="w-5 h-5 text-gray-500 mb-2" />

                  {/* Level 2 */}
                  <div className="w-full flex gap-4 justify-center">
                    {(chain.secondOrder || []).map((e: any, i: number) => (
                      <div key={i} className="flex-1 bg-[#1E3A5F]/30 border border-[#2D5A88]/50 p-4 rounded-xl text-center">
                        <div className="text-xs text-yellow-500 uppercase font-bold tracking-wider mb-1">2nd Order Effect</div>
                        <div className="text-sm text-white font-medium">{e.title}</div>
                      </div>
                    ))}
                  </div>

                  {/* Asset impacts */}
                  <div className="w-full border-t border-[#1E3A5F] mt-10 pt-8">
                    <h4 className="text-center text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Asset Implications</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {(chain.assets || []).map((asset: any, i: number) => (
                        <div key={i} className="bg-[#0A1929] border border-[#1E3A5F] p-3 rounded-xl text-center">
                          <div className="text-sm font-semibold text-gray-200 mb-1">{asset.name}</div>
                          <div className={`text-xs font-bold mb-2 ${asset.impact === "Positive" ? "text-emerald-400" : asset.impact === "Negative" ? "text-red-400" : "text-gray-400"}`}>
                            {asset.impact}
                          </div>
                          {asset.reason && <p className="text-[10px] text-gray-500 leading-relaxed">{asset.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="mt-6 border-[#1E3A5F] text-gray-400 hover:text-white"
                    onClick={() => generateChain(selected)}>
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />Regenerate Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}