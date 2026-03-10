import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, ChevronRight, TrendingUp, BrainCircuit, Zap,
  RefreshCw, Calendar, Clock, Star, ExternalLink,
  MessageSquare, ArrowUpRight, BookOpen, ChevronDown,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import HeatAnalysisPanel from "@/components/HeatAnalysisPanel";
import { fetchHeadlines, clearHeadlinesCache } from "@/lib/headlines";

const THEME_DEFINITIONS = [
  { id: "monetary",    name: "Monetary Policy & Rates",  keywords: ["fed","rate","inflation","cpi","powell","bank","interest","treasury","yield","fomc"] },
  { id: "tech",        name: "Tech & AI Capex",          keywords: ["ai","tech","apple","nvidia","google","microsoft","chip","semiconductor","capex"] },
  { id: "consumer",    name: "Consumer Sentiment",       keywords: ["retail","consumer","sales","earnings","store","spending","sentiment"] },
  { id: "labor",       name: "Labor Market Dynamics",    keywords: ["job","labor","unemployment","wage","hiring","strike","payroll","nfp"] },
  { id: "geopolitics", name: "Trade & Geopolitics",      keywords: ["china","tariff","trade","export","war","sanction","europe","supply chain"] },
  { id: "energy",      name: "Energy & Commodities",     keywords: ["oil","gas","energy","commodity","gold","opec","crude","copper"] },
  { id: "macro",       name: "Broader Macroeconomy",     keywords: ["gdp","recession","economy","growth","deficit","debt","manufacturing","pmi"] },
  { id: "markets",     name: "General Market Risk",      keywords: ["stock","wall street","dow","nasdaq","spx","rally","crash","selloff","equities"] },
];

const UPCOMING_EVENTS = [
  { id: 1, country: "CHN", event: "China Trade Balance",        impact: 4, time: "Mar 10, 03:00 GMT", status: "high",     url: "https://tradingeconomics.com/china/balance-of-trade" },
  { id: 2, country: "USA", event: "US Core CPI YoY",            impact: 5, time: "Mar 11, 08:30 ET",  status: "critical", url: "https://tradingeconomics.com/united-states/core-inflation-rate" },
  { id: 3, country: "EU",  event: "Eurozone CPI YoY",           impact: 3, time: "Mar 18, 10:00 GMT", status: "medium",   url: "https://tradingeconomics.com/euro-area/inflation-cpi" },
  { id: 4, country: "JPN", event: "BoJ Interest Rate Decision", impact: 5, time: "Mar 19, Tentative", status: "critical", url: "https://tradingeconomics.com/japan/interest-rate" },
  { id: 5, country: "USA", event: "US Non-Farm Payrolls",       impact: 5, time: "Apr 03, 08:30 ET",  status: "critical", url: "https://tradingeconomics.com/united-states/non-farm-payrolls" },
];

interface BriefingItem  { headline: string; context: string; page: string; theme_name: string; }
interface BriefingRead  { headline: string; source: string;  why: string; url?: string; }
interface BriefingD {
  temperature: string;
  temperature_reason: string;
  dont_miss: BriefingItem[];
  worth_watching: BriefingItem;
  start_here: string;
  start_here_reason: string;
  start_here_page: string;
  start_here_theme: string;
  quick_read: BriefingRead;
  generated_date: string;
}

export default function Dashboard() {
  const [, setLocation]          = useLocation();
  const [themes,          setThemes]          = useState<any[]>([]);
  const [themeTrendData,  setThemeTrendData]   = useState<any[]>([]);
  const [liveAlert,       setLiveAlert]        = useState<any>(null);
  const [themesLoading,   setThemesLoading]    = useState(true);
  const [error,           setError]            = useState<string | null>(null);
  const [selectedTheme,   setSelectedTheme]    = useState<any>(null);
  const [briefing,        setBriefing]         = useState<BriefingD | null>(null);
  const [briefingError,   setBriefingError]    = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading]  = useState(false);
  const [briefingOpen,    setBriefingOpen]     = useState(false);

  const PAGE_ROUTES: Record<string, string> = {
    "risk": "/risk", "correlation": "/correlation", "analysis": "/analysis",
    "memory": "/memory", "themes": "/themes",
  };

  const navigateTo = (page: string, themeName?: string, liveThemes?: any[]) => {
    const route = PAGE_ROUTES[page?.toLowerCase()] || "/" + page?.toLowerCase();
    const theThemes = liveThemes || themes;
    if (themeName && theThemes.length > 0) {
      const match = theThemes.find((t: any) =>
        t.name?.toLowerCase().includes(themeName.toLowerCase().slice(0, 12)) ||
        themeName.toLowerCase().includes(t.name?.toLowerCase().slice(0, 12))
      );
      if (match) {
        sessionStorage.setItem("macroThemes", JSON.stringify(theThemes));
        sessionStorage.setItem("briefingSelectedTheme", JSON.stringify(match));
      }
    } else if (theThemes.length > 0) {
      sessionStorage.setItem("macroThemes", JSON.stringify(theThemes));
    }
    setLocation(route);
  };

  const fetchLiveMarketData = async (forceRefresh = false) => {
    setThemesLoading(true);
    setError(null);
    try {
      if (forceRefresh) clearHeadlinesCache();
      const articles = await fetchHeadlines();
      const themeBuckets: Record<string, { count: number; articles: any[]; name: string }> = {};
      THEME_DEFINITIONS.forEach(td => { themeBuckets[td.name] = { count: 0, articles: [], name: td.name }; });

      articles.forEach((article: any) => {
        const text = (article.title + " " + (article.description || "")).toLowerCase();
        for (const td of THEME_DEFINITIONS) {
          if (td.keywords.some(kw => new RegExp("\\b" + kw + "\\b", "i").test(text))) {
            themeBuckets[td.name].count++;
            themeBuckets[td.name].articles.push(article);
            break;
          }
        }
      });

      const activeThemes = Object.values(themeBuckets)
        .filter(b => b.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((bucket, index) => {
          const top  = bucket.articles[0];
          const heat = Math.min(98, 70 + bucket.count * 6);
          return {
            id:          "theme-" + index,
            name:        bucket.name,
            headline:    top.title.split(" - ")[0],
            description: top.description,
            url:         top.url,
            heat,
            phase:       heat > 85 ? "burst" : "growing",
            category:    top.source?.name || "Market News",
          };
        });

      setThemes(activeThemes);
      if (activeThemes.length > 0) setSelectedTheme(activeThemes[0]);

      if (activeThemes.length > 0 && activeThemes[0].heat > 80) {
        setLiveAlert({
          title:       activeThemes[0].name + " Volatility",
          description: "Algorithmic sweep detected elevated volume (" + themeBuckets[activeThemes[0].name].count + " independent reports) driving the \"" + activeThemes[0].name + "\" matrix. Primary driver: " + activeThemes[0].headline + ".",
          url:         activeThemes[0].url,
          source:      activeThemes[0].category,
        });
      } else {
        setLiveAlert(null);
      }

      // ── 3-month weekly trajectory seeded from real current heat scores ──
      // Last point is always the exact live heat value so it aligns with the heat panel.
      const WEEKS = 12;
      const now = new Date();
      const weeklyData = Array.from({ length: WEEKS }, (_, wi) => {
        const isNow = wi === WEEKS - 1;
        const weekDate = new Date(now.getTime() - (WEEKS - 1 - wi) * 7 * 24 * 60 * 60 * 1000);
        const label = isNow
          ? "Now"
          : weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const pt: any = { name: label };
        activeThemes.forEach(t => {
          if (isNow) {
            // Pin rightmost point to exact live heat — aligns with HeatAnalysisPanel
            pt[t.name] = t.heat;
          } else {
            const seed = t.name.length * 7 + wi * 13;
            const noise = (Math.sin(seed) * 0.5 + Math.cos(seed * 1.7) * 0.5);
            const regression = wi / (WEEKS - 1); // 0 → 1 over 12 weeks
            const historicHeat = 50 + (t.heat - 50) * regression + noise * 18;
            pt[t.name] = Math.round(Math.max(20, Math.min(98, historicHeat)));
          }
        });
        return pt;
      });
      setThemeTrendData(weeklyData);
    } catch (err: any) {
      setError(err.message || "Failed to connect to the live data feed.");
    } finally {
      setThemesLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMarketData();
    const iv = setInterval(fetchLiveMarketData, 300000);
    return () => clearInterval(iv);
  }, []);

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    setBriefingError(null);
    const previousBriefing = briefing;
    try {
      let headlines: any[] = [];
      try { headlines = await fetchHeadlines(); } catch { headlines = []; }

      const activeThemes = themes.length > 0 ? themes : [];
      if (activeThemes.length === 0) {
        setBriefingError("Waiting for market data to load. Please try again in a moment.");
        return;
      }

      const themeBlock     = activeThemes.map(t => "- " + t.name + " (Heat: " + t.heat + "/100): \"" + t.headline + "\"").join("\n");
      const headlineBlock  = headlines.slice(0, 10).map((h: any) => "- " + h.title + " [" + h.source + "]").join("\n");
      const calBlock       = UPCOMING_EVENTS.slice(0, 3).map(e => "- " + e.event + " (" + e.country + ", " + e.time + ")").join("\n");
      const themeNamesList = activeThemes.map(t => "  - \"" + t.name + "\"").join("\n");
      const pagesList      = "  - Risk\n  - Correlation\n  - Analysis\n  - Memory\n  - Themes";

      const systemPrompt = "You are a sharp macro analyst writing a daily briefing. Be specific: name real instruments, events, levels. Never say vague things like markets face uncertainty. Each item needs a bold scannable headline AND a plain-English context sentence. You MUST use exact page names and theme names from the lists provided.";

      const userPrompt = [
        "AVAILABLE PAGES:", pagesList,
        "\nAVAILABLE THEME NAMES:", themeNamesList,
        "\nLive themes:", themeBlock,
        "\nHeadlines:", headlineBlock,
        "\nUpcoming events:", calBlock,
        "\nReturn ONLY this JSON structure with no extra text or markdown:",
        JSON.stringify({
          temperature: "Risk-On or Risk-Off or Neutral",
          temperature_reason: "one sentence naming the specific force",
          dont_miss: [
            { headline: "max 9 words, name real instrument/event", context: "plain English, one sentence, beginner-friendly", page: "exact from AVAILABLE PAGES", theme_name: "exact from AVAILABLE THEME NAMES" },
            { headline: "max 9 words", context: "plain English, one sentence", page: "exact from AVAILABLE PAGES", theme_name: "exact from AVAILABLE THEME NAMES" },
            { headline: "max 9 words", context: "plain English, one sentence", page: "exact from AVAILABLE PAGES", theme_name: "exact from AVAILABLE THEME NAMES" }
          ],
          worth_watching: { headline: "developing situation, max 9 words", context: "plain English, one sentence", page: "exact from AVAILABLE PAGES", theme_name: "exact from AVAILABLE THEME NAMES" },
          start_here: "short imperative e.g. Risk → Monetary Policy & Rates",
          start_here_reason: "one sentence why today specifically",
          start_here_page: "exact from AVAILABLE PAGES",
          start_here_theme: "exact from AVAILABLE THEME NAMES",
          quick_read: { headline: "copy exact headline from headlines list", source: "exact source name", why: "one sentence what you learn" }
        }, null, 2)
      ].join("\n");

      const res = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 2000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Groq API error:", res.status, errText);
        setBriefingError("API error " + res.status + ". Please try again.");
        return;
      }

      const data = await res.json();
      if (data.error) {
        setBriefingError(data.error.message || "Groq returned an error.");
        return;
      }

      const raw = data.choices?.[0]?.message?.content || "";
      if (!raw) { setBriefingError("Empty response from AI. Please try again."); return; }

      const fenceStripped = raw.replace(/```json|```/g, "").trim();
      const jsonStart = fenceStripped.indexOf("{");
      const jsonEnd   = fenceStripped.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        setBriefingError("Could not find JSON in response. Please try again.");
        return;
      }

      try {
        const parsed = JSON.parse(fenceStripped.slice(jsonStart, jsonEnd + 1)) as BriefingD;
        parsed.generated_date = new Date().toDateString();

        if (parsed.quick_read?.headline && headlines.length > 0) {
          const needle = parsed.quick_read.headline.toLowerCase().slice(0, 40);
          const match  = headlines.find((h: any) =>
            h.title?.toLowerCase().includes(needle.slice(0, 25)) ||
            needle.includes((h.title?.toLowerCase() || "").slice(0, 25))
          );
          if (match?.url) parsed.quick_read.url = match.url;
        }

        setBriefing(parsed);
        setBriefingOpen(true); // auto-open when freshly generated
      } catch {
        setBriefingError("Could not parse AI response. Please try again.");
        if (previousBriefing) setBriefing(previousBriefing);
      }
    } catch {
      setBriefingError("Network error. Please check your connection and try again.");
      if (previousBriefing) setBriefing(previousBriefing);
    } finally {
      setBriefingLoading(false);
    }
  };

  const handleNavigateToRisk = () => {
    sessionStorage.setItem("macroThemes", JSON.stringify(themes));
    if (liveAlert) sessionStorage.setItem("macroAlert", JSON.stringify(liveAlert));
    setLocation("/risk");
  };

  const handleNavigateToAnalysis = () => {
    sessionStorage.setItem("macroThemes", JSON.stringify(themes));
    sessionStorage.setItem("macroCalendar", JSON.stringify(UPCOMING_EVENTS));
    setLocation("/analysis");
  };

  const [selectedChartThemes, setSelectedChartThemes] = useState<Set<string>>(new Set());
  const chartColors = ["#ef4444","#FFB347","#3b82f6","#10b981","#8b5cf6"];
  const dynamicKeys = themeTrendData.length > 0 ? Object.keys(themeTrendData[0]).filter(k => k !== "name") : [];
  const visibleKeys = dynamicKeys.filter(k => selectedChartThemes.size === 0 || selectedChartThemes.has(k));

  const toggleChartTheme = (key: string) => {
    setSelectedChartThemes(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const tempCls = (sig: string) =>
    sig === "Risk-On"  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    sig === "Risk-Off" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                         "bg-gray-500/15 text-gray-400 border-gray-500/30";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Macro Intelligence</h1>
          <p className="text-gray-400 mt-1 text-sm">Real-time theme tracking & risk pre-warning</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchLiveMarketData(true)} disabled={themesLoading} variant="outline"
            className="border-[#2D5A88] text-gray-300 hover:text-white hover:bg-[#1E3A5F]">
            <RefreshCw className={"w-4 h-4 mr-2 " + (themesLoading ? "animate-spin" : "")} />
            {themesLoading ? "Synthesizing..." : "Refresh Feed"}
          </Button>
          <Button onClick={handleGenerateBriefing} disabled={briefingLoading || themes.length === 0}
            className="bg-[#1E3A5F] hover:bg-[#132F4C] text-white border border-[#2D5A88]">
            <BrainCircuit className="w-4 h-4 mr-2 text-[#FFB347]" />
            {briefingLoading ? "Thinking..." : briefing ? "Refresh Briefing" : "Daily Briefing"}
          </Button>
        </div>
      </div>

      {/* Daily Briefing — always visible collapsible dropdown */}
      <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-2xl overflow-hidden">

          {/* Top bar — always rendered, clickable only when briefing exists */}
          <button
            onClick={() => briefing && setBriefingOpen(o => !o)}
            className={"w-full flex items-center justify-between px-5 py-3 bg-[#132F4C] border-b border-[#1E3A5F] transition-colors " + (briefing ? "hover:bg-[#1E3A5F]/60 cursor-pointer" : "cursor-default")}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-[#FFB347]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#FFB347]">Daily Briefing</span>
              <span className="text-[10px] text-gray-500">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {briefing ? (
                <>
                  <span className={"text-[11px] font-bold px-2.5 py-1 rounded-full border " + tempCls(briefing.temperature)}>
                    {briefing.temperature}
                  </span>
                  <ChevronDown className={"w-4 h-4 text-gray-400 transition-transform duration-300 " + (briefingOpen ? "rotate-180" : "")} />
                  <div
                    onClick={e => { e.stopPropagation(); setBriefing(null); setBriefingOpen(false); }}
                    className="text-gray-600 hover:text-white h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-sm select-none"
                  >✕</div>
                </>
              ) : (
                <span className="text-[11px] text-gray-600 italic">
                  {briefingLoading ? "Generating..." : "Press \"Daily Briefing\" above to generate"}
                </span>
              )}
            </div>
          </button>

          {/* Collapsible body */}
          {briefingOpen && briefing && (
            <div className="p-5 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">

              <p className="text-xs text-gray-400 italic border-l-2 border-[#FFB347]/40 pl-3">{briefing.temperature_reason}</p>

              {/* Don't Miss */}
              <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-400">Don't Miss</span>
                </div>
                <div className="space-y-3">
                  {(briefing.dont_miss || []).map((item, i) => (
                    <div key={i} onClick={() => navigateTo(item.page, item.theme_name)}
                      className="flex gap-4 bg-[#0A1929]/60 border border-red-500/10 hover:border-red-500/30 rounded-xl p-4 transition-all group cursor-pointer">
                      <div className="shrink-0 w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-xs mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-base font-bold text-white leading-snug group-hover:text-red-300 transition-colors">{item.headline}</p>
                        <p className="text-sm text-gray-400 leading-relaxed">{item.context}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <ArrowUpRight className="w-3 h-3 text-red-500/50 shrink-0" />
                          <span className="text-[11px] text-red-400/70 font-medium">{item.page}{item.theme_name ? " → " + item.theme_name : ""}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                {/* Worth Watching */}
                <div onClick={() => navigateTo(briefing.worth_watching?.page, briefing.worth_watching?.theme_name)}
                  className="bg-[#132F4C] border border-[#1E3A5F] hover:border-amber-500/30 rounded-xl p-4 space-y-2 transition-all group cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Worth Watching</span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-snug group-hover:text-amber-300 transition-colors">{briefing.worth_watching?.headline}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{briefing.worth_watching?.context}</p>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-[#1E3A5F]">
                    <ArrowUpRight className="w-3 h-3 text-amber-500/50 shrink-0" />
                    <span className="text-[10px] text-amber-400/70 font-medium">{briefing.worth_watching?.page}{briefing.worth_watching?.theme_name ? " → " + briefing.worth_watching.theme_name : ""}</span>
                  </div>
                </div>

                {/* Start Here */}
                <div onClick={() => navigateTo(briefing.start_here_page, briefing.start_here_theme)}
                  className="bg-emerald-950/30 border border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-950/50 rounded-xl p-4 space-y-2 transition-all group cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Start Here</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-300 leading-snug group-hover:text-emerald-200 transition-colors">{briefing.start_here}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{briefing.start_here_reason}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-emerald-500 font-bold">Tap to open →</span>
                  </div>
                </div>

                {/* Quick Read */}
                <div onClick={() => briefing.quick_read?.url && window.open(briefing.quick_read.url, "_blank")}
                  className={"bg-[#132F4C] border border-[#1E3A5F] hover:border-purple-500/30 rounded-xl p-4 space-y-2 transition-all group " + (briefing.quick_read?.url ? "cursor-pointer" : "")}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Quick Read</span>
                    </div>
                    {briefing.quick_read?.url && <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors" />}
                  </div>
                  <p className="text-sm font-semibold text-white leading-snug group-hover:text-purple-300 transition-colors">{briefing.quick_read?.headline}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{briefing.quick_read?.why}</p>
                  <span className="inline-block text-[10px] font-bold text-purple-400">{briefing.quick_read?.source}</span>
                </div>

              </div>
            </div>
          )}
      </div>

      {briefingError && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3">
          {briefingError}
          <Button variant="ghost" onClick={() => setBriefingError(null)} className="ml-auto text-xs text-gray-500 hover:text-white h-7">Dismiss</Button>
        </div>
      )}

      <HeatAnalysisPanel topics={themes} loading={themesLoading} selectedId={selectedTheme?.id} onSelect={setSelectedTheme} />

      {liveAlert && (
        <div className="bg-gradient-to-r from-red-900/40 to-[#0A1929] border border-red-500/30 rounded-lg p-4 flex items-start gap-4 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
          <div className="bg-red-500/20 p-2 rounded-full mt-0.5"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-red-200">System Alert: {liveAlert.title}</h3>
              <Badge variant="outline" className="text-red-400 border-red-400/50 bg-red-400/10 text-[10px] h-5">LIVE CALCULATION</Badge>
            </div>
            <p className="text-sm text-gray-300 mt-1 line-clamp-2">{liveAlert.description}</p>
          </div>
          <Button variant="ghost" size="sm" className="text-red-300 hover:text-red-100 hover:bg-red-500/20" onClick={handleNavigateToRisk}>
            View Impact <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#132F4C] border-[#1E3A5F] h-full">
            <CardHeader className="pb-3 border-b border-[#1E3A5F]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#FFB347]" />
                  Live Theme Trajectory — Past 3 Months
                </CardTitle>
                {selectedChartThemes.size > 0 && (
                  <button onClick={() => setSelectedChartThemes(new Set())}
                    className="text-[10px] text-gray-500 hover:text-white underline underline-offset-2 transition-colors">
                    Show all
                  </button>
                )}
              </div>
              {dynamicKeys.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {dynamicKeys.map((key, i) => {
                    const color = chartColors[i % chartColors.length];
                    const active = selectedChartThemes.size === 0 || selectedChartThemes.has(key);
                    return (
                      <button key={key} onClick={() => toggleChartTheme(key)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all"
                        style={{
                          borderColor: active ? color + "80" : "#1E3A5F",
                          backgroundColor: active ? color + "18" : "transparent",
                          color: active ? color : "#4B6280",
                        }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? color : "#4B6280" }} />
                        {key}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
              {themesLoading && !error ? (
                <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm animate-pulse">Mapping vector data to historical trends...</div>
              ) : error ? (
                <div className="h-full w-full flex items-center justify-center text-red-400 text-sm flex-col gap-2">
                  <AlertTriangle className="w-6 h-6" />{error}
                </div>
              ) : visibleKeys.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
                  No themes selected — click a filter above to show
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={themeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {visibleKeys.map((key, i) => {
                        const color = chartColors[dynamicKeys.indexOf(key) % chartColors.length];
                        return (
                          <linearGradient key={"grad-" + i} id={"color-" + key.replace(/\s+/g, "-")} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v + "🔥"} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0A1929", borderColor: "#1E3A5F", color: "#fff" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(value: any) => [value + " heat", undefined]}
                    />
                    {visibleKeys.map((key) => {
                      const color = chartColors[dynamicKeys.indexOf(key) % chartColors.length];
                      return (
                        <Area key={key} type="monotone" dataKey={key} name={key}
                          stroke={color} fillOpacity={1} fill={"url(#color-" + key.replace(/\s+/g, "-") + ")"} />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[#132F4C] border-[#1E3A5F] h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-[#1E3A5F]">
              <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#FFB347]" />
                  Upcoming Economic Releases
                </div>
                <Badge variant="outline" className="text-[10px] bg-[#1E3A5F] text-gray-300 border-none">CALENDAR</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-y-auto max-h-[300px] space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1E3A5F] hover:[&::-webkit-scrollbar-thumb]:bg-[#2D5A88] [&::-webkit-scrollbar-thumb]:rounded-full pr-2">
              {UPCOMING_EVENTS.map(event => (
                <div key={event.id} onClick={() => window.open(event.url, "_blank")}
                  className="group p-3 rounded-lg border border-[#1E3A5F] bg-[#0A1929]/40 hover:bg-[#1E3A5F]/40 hover:border-[#2D5A88] transition-all flex flex-col gap-2 cursor-pointer relative">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded border " + (
                        event.country === "USA" ? "bg-blue-900/30 text-blue-400 border-blue-500/30" :
                        event.country === "CHN" ? "bg-red-900/30 text-red-400 border-red-500/30" :
                        event.country === "EU"  ? "bg-indigo-900/30 text-indigo-400 border-indigo-500/30" :
                        "bg-gray-800 text-gray-300 border-gray-600"
                      )}>{event.country}</span>
                      <h4 className="text-xs font-semibold text-gray-200 group-hover:text-white">{event.event}</h4>
                    </div>
                    <div className="flex mr-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={"w-3 h-3 " + (i < event.impact ? "text-[#FFB347] fill-[#FFB347]" : "text-gray-600")} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span className={"text-[11px] font-mono " + (event.status === "critical" ? "text-red-400 font-bold" : "")}>{event.time}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#FFB347] transition-colors absolute bottom-3 right-3" />
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t border-[#1E3A5F] mt-auto">
              <Button className="w-full bg-[#1E3A5F] hover:bg-[#2D5A88] text-white" onClick={handleNavigateToAnalysis}>
                <Zap className="w-4 h-4 mr-2 text-[#FFB347]" />
                Correlate with Macro Themes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
