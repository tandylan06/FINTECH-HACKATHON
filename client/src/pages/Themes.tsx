import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, TrendingUp, TrendingDown, AlertCircle,
  RefreshCw, ExternalLink, Flame, BarChart2, X, Minus
} from "lucide-react";
import { fetchHeadlines, clearHeadlinesCache } from "@/lib/headlines";

const THEME_DEFINITIONS = [
  { id: "monetary",    name: "Monetary Policy & Rates",  category: "Central Banks",  keywords: ["fed","rate","inflation","cpi","powell","bank","interest","treasury","yield","fomc","hike","cut","pivot"] },
  { id: "tech",        name: "Tech & AI Capex",          category: "Technology",     keywords: ["ai","tech","apple","nvidia","google","microsoft","chip","semiconductor","capex","openai","llm"] },
  { id: "consumer",    name: "Consumer Sentiment",       category: "Macro",          keywords: ["retail","consumer","sales","earnings","store","spending","sentiment","confidence","household"] },
  { id: "labor",       name: "Labor Market Dynamics",    category: "Employment",     keywords: ["job","labor","unemployment","wage","hiring","strike","payroll","nfp","workforce","layoff"] },
  { id: "geopolitics", name: "Trade & Geopolitics",      category: "Geopolitics",    keywords: ["china","tariff","trade","export","war","sanction","europe","supply chain","tension","conflict"] },
  { id: "energy",      name: "Energy & Commodities",     category: "Commodities",    keywords: ["oil","gas","energy","commodity","gold","opec","crude","copper","lithium"] },
  { id: "macro",       name: "Broader Macroeconomy",     category: "Macro",          keywords: ["gdp","recession","economy","growth","deficit","debt","manufacturing","pmi","output"] },
  { id: "markets",     name: "General Market Risk",      category: "Markets",        keywords: ["stock","wall street","dow","nasdaq","spx","rally","crash","selloff","equities","volatility"] },
];

const CATEGORIES = ["All","Central Banks","Technology","Macro","Employment","Geopolitics","Commodities","Markets"];

export default function Themes() {
  const [themes,         setThemes]         = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [search,         setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy,         setSortBy]         = useState<"heat"|"name">("heat");
  const [expanded,       setExpanded]       = useState<string|null>(null);

  const fetchThemes = async (bustCache = false) => {
    if (bustCache) clearHeadlinesCache();
    setLoading(true); setError("");
    try {
      const articles = await fetchHeadlines();

      const buckets: Record<string, { count: number; articles: any[]; def: typeof THEME_DEFINITIONS[0] }> = {};
      THEME_DEFINITIONS.forEach(td => { buckets[td.id] = { count: 0, articles: [], def: td }; });

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

      const built = Object.values(buckets).map(b => {
        const heat   = Math.min(98, 55 + b.count * 7);
        const top    = b.articles[0];
        const recent = b.articles.slice(0, 3);
        return {
          id:          b.def.id,
          name:        b.def.name,
          category:    b.def.category,
          heat,
          trend:       heat > 75 ? "up" : heat > 50 ? "flat" : "down",
          phase:       heat > 85 ? "burst" : heat > 65 ? "growing" : "stable",
          count:       b.count,
          headline:    top?.title?.split(" - ")[0] || "No recent activity",
          description: top?.description || b.def.name + " — no recent articles found.",
          url:         top?.url || null,
          articles:    recent,
          keywords:    b.def.keywords.slice(0, 5),
        };
      });
      setThemes(built);
    } catch (e: any) {
      setError(e.message || "Failed to load themes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchThemes(); }, []);

  const filtered = useMemo(() => {
    let t = [...themes];
    if (activeCategory !== "All") t = t.filter(x => x.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      t = t.filter(x =>
        x.name.toLowerCase().includes(q) ||
        x.category.toLowerCase().includes(q) ||
        x.headline.toLowerCase().includes(q) ||
        x.keywords.some((k: string) => k.includes(q))
      );
    }
    return sortBy === "heat" ? t.sort((a,b) => b.heat - a.heat) : t.sort((a,b) => a.name.localeCompare(b.name));
  }, [themes, search, activeCategory, sortBy]);

  const heatCls = (heat: number) =>
    heat > 85 ? "text-red-400 bg-red-500/10 border-red-500/30" :
    heat > 65 ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
                "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

  const phaseCls = (p: string) =>
    p === "burst"   ? "text-red-400 border-red-400/40" :
    p === "growing" ? "text-amber-400 border-amber-400/40" :
                      "text-blue-400 border-blue-400/40";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Theme Explorer</h1>
          <p className="text-gray-400 mt-1 text-sm">Live macroeconomic themes from real-time news</p>
        </div>
        <Button onClick={() => fetchThemes(true)} disabled={loading} variant="outline" className="border-[#2D5A88] text-gray-300 hover:text-white hover:bg-[#1E3A5F]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search themes, keywords..."
            className="w-full bg-[#132F4C] border-[#1E3A5F] text-white pl-9 pr-8" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeCategory === cat ? "bg-blue-600 text-white border-blue-500" : "bg-[#132F4C] text-gray-400 border-[#1E3A5F] hover:text-white hover:border-[#2D5A88]"}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-500 mr-1">Sort:</span>
          <button onClick={() => setSortBy("heat")} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${sortBy === "heat" ? "bg-[#FFB347]/20 text-[#FFB347] border-[#FFB347]/40" : "bg-[#132F4C] text-gray-400 border-[#1E3A5F] hover:text-white"}`}>
            <Flame className="w-3 h-3 inline mr-1" />Heat
          </button>
          <button onClick={() => setSortBy("name")} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${sortBy === "name" ? "bg-[#FFB347]/20 text-[#FFB347] border-[#FFB347]/40" : "bg-[#132F4C] text-gray-400 border-[#1E3A5F] hover:text-white"}`}>
            A–Z
          </button>
        </div>
      </div>

      {!loading && !error && <p className="text-xs text-gray-500">{filtered.length} theme{filtered.length !== 1 ? "s" : ""} · {themes.filter(t => t.count > 0).length} active today</p>}

      {error && (
        <div className="text-center py-10 text-red-400 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8" /><p>{error}</p>
          <Button onClick={fetchThemes} size="sm" variant="outline" className="border-red-500/30 text-red-400 mt-2">Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-[#132F4C] border border-[#1E3A5F] rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-gray-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No themes match your filters.</p>
              <button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="text-blue-400 text-sm mt-2 hover:underline">Clear filters</button>
            </div>
          ) : filtered.map(theme => (
            <Card key={theme.id} onClick={() => setExpanded(expanded === theme.id ? null : theme.id)}
              className={`bg-[#132F4C] border-[#1E3A5F] hover:border-[#2D5A88] transition-all cursor-pointer group ${expanded === theme.id ? "border-blue-500/50" : ""}`}>
              <CardHeader className="pb-3 border-b border-[#1E3A5F]/50">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600/50 bg-[#0A1929]/50">{theme.category}</Badge>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${heatCls(theme.heat)}`}>{theme.heat}🔥</span>
                </div>
                <CardTitle className="text-base text-gray-100 group-hover:text-[#FFB347] transition-colors leading-tight">{theme.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{theme.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5" />{theme.count} articles</span>
                  <Badge variant="outline" className={`text-[10px] ${phaseCls(theme.phase)}`}>{theme.phase}</Badge>
                  <span className={`flex items-center gap-0.5 ml-auto ${theme.trend === "up" ? "text-red-400" : theme.trend === "down" ? "text-emerald-400" : "text-gray-500"}`}>
                    {theme.trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : theme.trend === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {theme.trend}
                  </span>
                </div>
                {expanded === theme.id && theme.articles.length > 0 && (
                  <div className="pt-3 border-t border-[#1E3A5F] space-y-2 animate-in fade-in duration-200">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Top Articles</p>
                    {theme.articles.map((a: any, i: number) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-start gap-2 p-2 rounded-lg bg-[#0A1929]/60 hover:bg-[#1E3A5F]/60 transition-colors group/link">
                        <ExternalLink className="w-3 h-3 text-gray-600 group-hover/link:text-[#FFB347] mt-0.5 shrink-0" />
                        <span className="text-xs text-gray-300 line-clamp-2">{a.title}</span>
                      </a>
                    ))}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {theme.keywords.map((kw: string) => (
                        <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-[#0A1929] border border-[#1E3A5F] rounded text-gray-600">#{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {theme.count === 0 && <p className="text-xs text-gray-600 italic">No articles matched today</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}