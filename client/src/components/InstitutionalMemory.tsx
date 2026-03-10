import { useState } from "react";
import { Library, ArrowUpRight, ArrowDownRight, Info, Search } from "lucide-react";

interface MarketImpact {
  [key: string]: string;
}

interface HistoricalCase {
  id: string;
  title: string;
  date: string;
  summary: string;
  trigger_event: string;
  market_impact: MarketImpact;
  key_lessons: string[];
  similar_situations: string[];
  tags: string[];
}

const InstitutionalMemory = () => {
  const [similarCases] = useState<HistoricalCase[]>([
    {
      "id": "case-001",
      "title": "2022 UK Gilt Crisis",
      "date": "2022-09-23",
      "summary": "UK government 'mini-budget' triggered a surge in gilt yields, leading to margin calls for pension funds",
      "trigger_event": "Chancellor Kwasi Kwarteng announces £45bn tax cut plan",
      "market_impact": {
        "Gilt Yields": "+100bps",
        "GBP/USD": "-3.5%",
        "FTSE 250": "-5%"
      },
      "key_lessons": [
        "Leveraged investment strategies can trigger chain reactions during volatility",
        "Central bank policy shifts can expose structural market vulnerabilities"
      ],
      "similar_situations": ["Current UK debt trajectory analogues"],
      "tags": ["Bond Market", "Pensions", "UK", "2022"]
    },
    {
      "id": "case-002",
      "title": "2023 SVB Collapse",
      "date": "2023-03-10",
      "summary": "Rising interest rates led to losses in bond portfolios, triggering a bank run",
      "trigger_event": "SVB announces $1.8bn loss on bond sales and capital raise attempt",
      "market_impact": {
        "Bank Index": "-15%",
        "Rate Expectations": "-50bps",
        "Credit Spreads": "+30bps"
      },
      "key_lessons": [
        "Rapid rate hikes pose duration risks for institutions with long-term assets",
        "Digital-age bank runs move significantly faster than traditional models"
      ],
      "similar_situations": ["Regional bank commercial real estate exposure"],
      "tags": ["Banking", "Rate Risk", "USA", "2023"]
    },
    {
      "id": "case-004",
      "title": "2025 DeepSeek AI Shock",
      "date": "2025-01-27",
      "summary": "Release of low-cost Chinese AI model triggered valuation re-rating for tech giants",
      "trigger_event": "DeepSeek R1 released with training costs 1/10th of GPT-4",
      "market_impact": {
        "NVIDIA": "-17%",
        "NASDAQ": "-3%",
        "SOX Index": "-5%"
      },
      "key_lessons": [
        "Technological disruption can instantly alter industry competitive landscapes",
        "High-valuation growth stocks are hyper-sensitive to competitive threats"
      ],
      "similar_situations": ["Open-source AI breakthroughs"],
      "tags": ["Tech Stocks", "AI", "China", "2025"]
    }
  ]);
  
  return (
    <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-800 rounded-3xl shadow-2xl p-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Library className="h-32 w-32" />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <h3 className="font-black text-3xl flex items-center text-slate-100 tracking-tight">
          <div className="p-3 bg-blue-500/20 rounded-2xl mr-4">
            <Library className="h-8 w-8 text-blue-500" />
          </div>
          Institutional Memory - Historical Analogues
        </h3>
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
           <input className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-blue-500 outline-none transition-colors" placeholder="Filter cases..." />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        {similarCases.map(case_ => (
          <div key={case_.id} className="relative group bg-slate-800/30 rounded-2xl p-6 border border-white/5 hover:border-blue-500/30 transition-all duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-black text-xl text-slate-100 group-hover:text-blue-400 transition-colors">{case_.title}</h4>
                <p className="text-sm text-blue-500/70 font-bold uppercase tracking-widest mt-1">{case_.date}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {case_.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-blue-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <p className="text-slate-300 leading-relaxed mb-6 font-medium italic border-l-4 border-blue-500/50 pl-4 bg-blue-500/5 py-2 rounded-r-xl">
              {case_.summary}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {Object.entries(case_.market_impact).map(([key, value]) => (
                <div key={key} className="bg-black/20 p-4 rounded-xl border border-white/5 text-center group/impact">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">{key}</div>
                  <div className={`text-lg font-black flex items-center justify-center ${
                    value.startsWith('+') ? 'text-emerald-500' : 
                    value.startsWith('-') ? 'text-rose-500' : 'text-slate-300'
                  }`}>
                    {value.startsWith('+') ? <ArrowUpRight className="h-4 w-4 mr-1" /> : value.startsWith('-') ? <ArrowDownRight className="h-4 w-4 mr-1" /> : null}
                    {value}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <div className="flex items-center text-xs font-black text-blue-400 uppercase tracking-widest mb-2">
                  <Info className="h-3 w-3 mr-2" />
                  Key Lessons Learned
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {case_.key_lessons.map((lesson, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start">
                      <span className="text-blue-500 mr-2 mt-0.5">•</span>
                      {lesson}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InstitutionalMemory;
