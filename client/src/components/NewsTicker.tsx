import { fetchHeadlines } from "@/lib/headlines";
import { useState, useEffect } from "react";

const ECONOMIC_CALENDAR = [
  { id: "e01", name: "China Trade Balance",             country: "CHN", importance: 4, releaseISO: "2026-03-10T03:00:00Z" },
  { id: "e02", name: "US Core CPI YoY",                 country: "USA", importance: 5, releaseISO: "2026-03-11T12:30:00Z" },
  { id: "e03", name: "US PPI MoM",                      country: "USA", importance: 3, releaseISO: "2026-03-12T12:30:00Z" },
  { id: "e04", name: "US Retail Sales MoM",             country: "USA", importance: 4, releaseISO: "2026-03-14T12:30:00Z" },
  { id: "e05", name: "UMich Consumer Sentiment",        country: "USA", importance: 3, releaseISO: "2026-03-14T14:00:00Z" },
  { id: "e06", name: "Eurozone CPI Final YoY",          country: "EU",  importance: 3, releaseISO: "2026-03-18T10:00:00Z" },
  { id: "e07", name: "BoJ Rate Decision",               country: "JPN", importance: 5, releaseISO: "2026-03-19T03:00:00Z" },
  { id: "e08", name: "FOMC Rate Decision",              country: "USA", importance: 5, releaseISO: "2026-03-19T18:00:00Z" },
  { id: "e09", name: "UK CPI YoY",                      country: "GBP", importance: 4, releaseISO: "2026-03-26T07:00:00Z" },
  { id: "e10", name: "US GDP Q4 Final",                 country: "USA", importance: 4, releaseISO: "2026-03-27T12:30:00Z" },
  { id: "e11", name: "US Core PCE MoM",                 country: "USA", importance: 5, releaseISO: "2026-03-28T12:30:00Z" },
  { id: "e12", name: "US Non-Farm Payrolls",            country: "USA", importance: 5, releaseISO: "2026-04-03T12:30:00Z" },
];

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const MACRO_KEYWORDS = [
  "fed","rate","inflation","cpi","ppi","gdp","recession","tariff","trade",
  "china","bank","interest","treasury","yield","fomc","oil","gold","energy",
  "market","nasdaq","dow","s&p","stocks","economy","unemployment","jobs",
  "war","conflict","sanction","geopolit","ukraine","russia","israel","iran",
  "trump","powell","lagarde","imf","world bank","opec","semiconductor","ai",
];

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE";
  const totalMins = Math.floor(ms / 60000);
  const days  = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins  = totalMins % 60;
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function NewsTicker() {
  const [now,       setNow]       = useState(Date.now());
  const [newsItems, setNewsItems] = useState<{ id: string; title: string; url: string; source: string }[]>([]);

  // Tick every 30s for countdown updates
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch live headlines from our server RSS proxy
  useEffect(() => {
    const load = async () => {
      try {
        const allArticles = await fetchHeadlines();
        const articles: any[] = allArticles.filter((a: any) => {
          if (!a.title || !a.url) return false;
          const text = (a.title + " " + (a.description || "")).toLowerCase();
          return MACRO_KEYWORDS.some(kw => text.includes(kw));
        });
        // Take top 12 most relevant
        const items = articles.slice(0, 12).map((a: any, i: number) => ({
          id:     `news-${i}`,
          title:  a.title.split(" - ")[0].split(" | ")[0].trim(),
          url:    a.url,
          source: a.source || "News",
        }));
        setNewsItems(items);
      } catch {
        setNewsItems([]);
      }
    };
    load();
    const iv = setInterval(load, 8 * 60 * 1000); // refresh every 8 min
    return () => clearInterval(iv);
  }, []);

  const upcoming = ECONOMIC_CALENDAR
    .map(e => ({ ...e, ms: new Date(e.releaseISO).getTime() - now }))
    .filter(e => e.ms > -3600000 && e.ms <= THREE_DAYS_MS)
    .sort((a, b) => a.ms - b.ms);

  // Interleave: news items first, then econ events
  const allItems: any[] = [
    ...newsItems.map(n => ({ ...n, type: "news" as const })),
    ...upcoming.map(e => ({ ...e, type: "econ" as const })),
  ];

  if (allItems.length === 0) return null;

  const looped = [...allItems, ...allItems];
  const speed  = Math.max(30, allItems.length * 9);

  return (
    <div className="ticker-outer bg-[#030c18] text-white py-1.5 sticky top-0 left-0 right-0 z-50 border-b border-white/8 overflow-hidden">
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #030c18, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #030c18, transparent)" }} />

      <div className="ticker-track whitespace-nowrap py-0.5" style={{ display: "inline-flex", willChange: "transform", ["--ticker-speed" as any]: `${speed}s` }}>
        {looped.map((item, idx) => {
          if (item.type === "news") {
            return (
              <a
                key={`${item.id}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center mx-5 px-3.5 py-1.5 rounded-full text-sm font-medium border border-slate-600/40 bg-slate-800/50 text-slate-200 hover:bg-slate-700/60 hover:border-slate-400/60 hover:text-white transition-all cursor-pointer no-underline"
                style={{ animationPlayState: "inherit" }}
              >
                <span className="text-[9px] font-black tracking-widest mr-2 px-1.5 py-0.5 rounded bg-black/30 text-slate-400 uppercase">
                  {item.source}
                </span>
                <span className="font-medium">{item.title}</span>
                <span className="ml-2 text-[10px] text-slate-500">↗</span>
              </a>
            );
          }

          // Econ event
          const hours = item.ms / 3600000;
          const cls =
            hours <= 2 || item.importance === 5
              ? "bg-red-600/20 text-red-400 border border-red-500/30"
              : hours <= 24 || item.importance >= 4
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";

          // Link to TradingEconomics for the event
          const teLink = `https://tradingeconomics.com/${item.country === "USA" ? "united-states" : item.country === "EU" ? "euro-area" : item.country === "JPN" ? "japan" : item.country === "GBP" ? "united-kingdom" : "china"}/calendar`;

          return (
            <a
              key={`${item.id}-${idx}`}
              href={teLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className={`inline-flex items-center mx-5 px-3.5 py-1.5 rounded-full text-sm font-medium hover:brightness-125 transition-all cursor-pointer no-underline ${cls}`}
              style={{ animationPlayState: "inherit" }}
            >
              <span className="opacity-70 px-1.5 py-0.5 rounded bg-black/20 mr-2 text-[10px] font-black tracking-wide">{item.country}</span>
              <span className="font-semibold">{item.name}</span>
              <div className="ml-2.5 flex space-x-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-[10px] ${i < item.importance ? "text-yellow-400" : "text-slate-700"}`}>★</span>
                ))}
              </div>
              <span className="ml-3 tabular-nums bg-black/40 px-2 py-0.5 rounded-full border border-white/5 text-xs font-mono">
                {formatCountdown(item.ms)}
              </span>
            </a>
          );
        })}
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker var(--ticker-speed) linear infinite;
        }
        .ticker-outer:hover .ticker-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}