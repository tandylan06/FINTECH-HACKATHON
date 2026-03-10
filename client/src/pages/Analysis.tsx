import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchHeadlines } from "@/lib/headlines";
import {
  Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, ReferenceLine, LineChart
} from "recharts";
import {
  Search, AlertTriangle, TrendingUp, TrendingDown, BookOpen,
  Newspaper, ChevronRight, Timer, Play, Sparkles, Lock, Check,
  MousePointer2, LineChart as LineChartIcon, BoxSelect, Eraser,
  ExternalLink, Loader2, BarChart2, X, RefreshCw, Brain,
  ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { useDemoAccount } from "@/hooks/use-demo-account";

// ─── Types ────────────────────────────────────────────────────────────────────
type DrawingTool = 'select' | 'trendline' | 'box' | 'eraser';
type Timeframe   = '1H' | '4H' | 'D' | 'W' | '1MO' | '1Y' | '5Y' | '10Y';
type Pt          = { x: number; y: number };
type Drawing     = { id: string; kind: 'trendline' | 'box'; p1: Pt; p2: Pt };

// ─── Crosshair tooltip type ───────────────────────────────────────────────────
type Crosshair = {
  x: number;
  y: number;
  candle: any;
} | null;

const SYMBOL_MAP: Record<string, string> = {
  "EURUSD": "EUR/USD",  "EUR/USD": "EUR/USD",
  "GBPUSD": "GBP/USD",  "GBP/USD": "GBP/USD",
  "USDJPY": "USD/JPY",  "USD/JPY": "USD/JPY",
  "AUDUSD": "AUD/USD",  "AUD/USD": "AUD/USD",
  "USDCAD": "USD/CAD",  "USD/CAD": "USD/CAD",
  "USDCHF": "USD/CHF",  "USD/CHF": "USD/CHF",
  "NZDUSD": "NZD/USD",  "NZD/USD": "NZD/USD",
  "USDCNH": "USD/CNH",  "USD/CNH": "USD/CNH",
  "BTCUSD": "BTC/USD",  "BTC/USD": "BTC/USD", "BTC": "BTC/USD",
  "ETHUSD": "ETH/USD",  "ETH/USD": "ETH/USD", "ETH": "ETH/USD",
  "SOLUSD": "SOL/USD",  "SOL": "SOL/USD",
  "XAUUSD": "XAU/USD",  "GOLD": "XAU/USD",    "XAU": "XAU/USD",
  "XAGUSD": "XAG/USD",  "SILVER": "XAG/USD",
  "WTIUSD": "WTI/USD",  "OIL": "WTI/USD",     "CRUDE": "WTI/USD",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const resolveSymbol = (query: string): string => {
  const upper = query.trim().toUpperCase();
  if (SYMBOL_MAP[upper]) return SYMBOL_MAP[upper];
  if (upper.includes("/")) return upper;
  return upper;
};

const fmtPrice = (v: number, sym: string) => {
  if (!v) return "-";
  if (v >= 10000) return v.toFixed(2);
  if (v >= 100)   return v.toFixed(2);
  if (v >= 10)    return v.toFixed(3);
  return v.toFixed(5);
};

const fmtTime = (ts: number, tf: Timeframe) => {
  const d = new Date(ts);
  if (tf === "10Y" || tf === "5Y" || tf === "1Y")
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  if (tf === "1MO")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (tf === "W")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
           d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  // 1H, 4H, D — intraday HH:MM
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
};

// ─── SVG Candlestick Chart ────────────────────────────────────────────────────
const CandlestickChart = ({
  candles, bollinger, support, resistance, timeframe, height = 340,
  onCandleHover, onChartLeave
}: {
  candles: any[]; bollinger: any[]; support: number; resistance: number;
  timeframe: Timeframe; height?: number;
  onCandleHover?: (candle: any, svgX: number, svgY: number) => void;
  onChartLeave?: () => void;
}) => {
  const W = 1200;
  const H = height;
  const PAD = { top: 10, right: 65, bottom: 28, left: 8 };

  if (!candles || candles.length === 0) return null;

  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);
  const bbUpper = bollinger.map(b => b.upper).filter(Boolean);
  const bbLower = bollinger.map(b => b.lower).filter(Boolean);

  const priceMax   = Math.max(...highs, ...bbUpper) * 1.0005;
  const priceMin   = Math.min(...lows,  ...bbLower) * 0.9995;
  const priceRange = priceMax - priceMin || 1;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const px = (price: number) => PAD.top + ((priceMax - price) / priceRange) * chartH;
  const cx = (i: number, total: number) => PAD.left + (i + 0.5) * (chartW / total);

  const candleW = Math.max(2, Math.min(12, (chartW / candles.length) * 0.7));

  const tickCount = 6;
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const price = priceMin + (priceRange * i) / (tickCount - 1);
    return { price, y: px(price) };
  });

  const xStep = Math.max(1, Math.floor(candles.length / 6));
  const xTicks = candles
    .map((c, i) => ({ i, time: c.time, x: cx(i, candles.length) }))
    .filter((_, i) => i % xStep === 0 || i === candles.length - 1);

  const fmtPriceLocal = (p: number) => {
    if (p >= 10000) return p.toFixed(0);
    if (p >= 100)   return p.toFixed(2);
    return p.toFixed(4);
  };

  const bollingerPath = (() => {
    const pts = bollinger.filter(b => b.upper && b.lower);
    if (pts.length < 2) return null;
    const idxOffset = candles.length - bollinger.length;
    const upperPts = pts.map((b, i) => `${cx(i + idxOffset, candles.length)},${px(b.upper)}`).join(" L ");
    const lowerPts = [...pts].reverse().map((b, i) => `${cx(pts.length - 1 - i + idxOffset, candles.length)},${px(b.lower)}`).join(" L ");
    return `M ${upperPts} L ${lowerPts} Z`;
  })();

  const bollingerMidLine = (() => {
    const pts = bollinger.filter(b => b.mid);
    if (pts.length < 2) return null;
    const idxOffset = candles.length - bollinger.length;
    return pts.map((b, i) => `${i === 0 ? "M" : "L"} ${cx(i + idxOffset, candles.length)},${px(b.mid)}`).join(" ");
  })();

  // SVG ref to convert mouse coords from screen to viewBox space
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onCandleHover || !svgRef.current) return;
    const svgEl  = svgRef.current;
    const rect   = svgEl.getBoundingClientRect();
    // Map screen coords → viewBox coords
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const vx     = (e.clientX - rect.left) * scaleX;
    const vy     = (e.clientY - rect.top)  * scaleY;

    // Find nearest candle
    const colWidth = chartW / candles.length;
    const idx = Math.round((vx - PAD.left) / colWidth - 0.5);
    const clamped = Math.max(0, Math.min(candles.length - 1, idx));
    const candle  = candles[clamped];

    // Pass back screen coords (not viewBox) for tooltip positioning
    onCandleHover(candle, e.clientX - rect.left, e.clientY - rect.top);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ display: "block", cursor: "crosshair" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={onChartLeave}
    >
      {/* Grid */}
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
          stroke="#1E3A5F" strokeWidth={0.5} strokeDasharray="3,4" opacity={0.6} />
      ))}

      {/* Bollinger band fill */}
      {bollingerPath && (
        <path d={bollingerPath} fill="#3b82f6" fillOpacity={0.05} />
      )}
      {bollinger.filter(b => b.upper).length > 1 && (() => {
        const idxOffset = candles.length - bollinger.length;
        const upperLine = bollinger.filter(b => b.upper).map((b, i) =>
          `${i === 0 ? "M" : "L"} ${cx(i + idxOffset, candles.length)},${px(b.upper)}`).join(" ");
        const lowerLine = bollinger.filter(b => b.lower).map((b, i) =>
          `${i === 0 ? "M" : "L"} ${cx(i + idxOffset, candles.length)},${px(b.lower)}`).join(" ");
        return (
          <>
            <path d={upperLine} fill="none" stroke="#3b82f6" strokeWidth={0.8} strokeOpacity={0.5} strokeDasharray="3,3" />
            <path d={lowerLine} fill="none" stroke="#3b82f6" strokeWidth={0.8} strokeOpacity={0.5} strokeDasharray="3,3" />
          </>
        );
      })()}
      {bollingerMidLine && (
        <path d={bollingerMidLine} fill="none" stroke="#3b82f6" strokeWidth={1.2} strokeOpacity={0.8} />
      )}

      {/* Support / Resistance */}
      {support > priceMin && support < priceMax && (
        <>
          <line x1={PAD.left} y1={px(support)} x2={W - PAD.right} y2={px(support)}
            stroke="#10b981" strokeWidth={1} strokeDasharray="5,4" strokeOpacity={0.7} />
          <text x={W - PAD.right + 3} y={px(support) + 3} fill="#10b981" fontSize={9} fontFamily="monospace">
            S {fmtPriceLocal(support)}
          </text>
        </>
      )}
      {resistance > priceMin && resistance < priceMax && (
        <>
          <line x1={PAD.left} y1={px(resistance)} x2={W - PAD.right} y2={px(resistance)}
            stroke="#ef4444" strokeWidth={1} strokeDasharray="5,4" strokeOpacity={0.7} />
          <text x={W - PAD.right + 3} y={px(resistance) + 3} fill="#ef4444" fontSize={9} fontFamily="monospace">
            R {fmtPriceLocal(resistance)}
          </text>
        </>
      )}

      {/* Candlesticks */}
      {candles.map((c, i) => {
        const x    = cx(i, candles.length);
        const yH   = px(c.high);
        const yL   = px(c.low);
        const yO   = px(c.open);
        const yC   = px(c.close);
        const bull = c.close >= c.open;
        const col  = bull ? "#10b981" : "#ef4444";
        const bTop = Math.min(yO, yC);
        const bBot = Math.max(yO, yC);
        const bH   = Math.max(bBot - bTop, 1);
        const hw   = candleW / 2;
        return (
          <g key={i}>
            <line x1={x} y1={yH} x2={x} y2={bTop}  stroke={col} strokeWidth={1} />
            <rect x={x - hw} y={bTop} width={candleW} height={bH}
              fill={col} fillOpacity={bull ? 0.85 : 0.9}
              stroke={col} strokeWidth={0.5} />
            <line x1={x} y1={bBot} x2={x} y2={yL} stroke={col} strokeWidth={1} />
          </g>
        );
      })}

      {/* Y-axis labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={W - PAD.right + 4} y={t.y + 3}
          fill="#94A3B8" fontSize={10} fontFamily="monospace" fontWeight="500">{fmtPriceLocal(t.price)}</text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((t) => {
        const d = new Date(t.time);
        let label = "";
        if (timeframe === "10Y" || timeframe === "5Y" || timeframe === "1Y")
          label = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
        else if (timeframe === "1MO")
          label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        else if (timeframe === "W")
          label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        else
          label = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        return (
          <text key={t.i} x={t.x} y={H - 6} fill="#94A3B8" fontSize={15} textAnchor="middle" fontFamily="monospace" fontWeight="500">{label}</text>
        );
      })}
    </svg>
  );
};

// ─── Teaching Panel ───────────────────────────────────────────────────────────
const TeachingPanel = ({ selection }: { selection: any }) => {
  if (!selection) return (
    <div className="bg-[#132F4C] border border-[#1E3A5F] p-5 rounded-2xl h-full flex flex-col justify-center items-center text-center gap-3">
      <div className="p-3 bg-[#1E3A5F] rounded-xl">
        <BookOpen className="w-6 h-6 text-gray-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-400 mb-1">Teaching Notes</p>
        <p className="text-xs text-gray-600">Hover over chart elements, indicators, or stats below to learn how they work</p>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center mt-1">
        {["SMA Line","Support","Resistance","RSI","Candlesticks","Bias"].map(label => (
          <span key={label} className="text-[10px] px-2 py-0.5 bg-[#0A1929] border border-[#1E3A5F] rounded-full text-gray-600">{label}</span>
        ))}
      </div>
    </div>
  );
  return (
    <div className="bg-[#132F4C] border border-blue-500/40 p-5 rounded-2xl h-full flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <BookOpen className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-blue-400/70 font-bold">Teaching Note</p>
          <h3 className="font-bold text-white text-sm">{selection.type}</h3>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed flex-1">{selection.explanation}</p>
      {selection.formula && (
        <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-lg px-3 py-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Formula</span>
          <code className="text-xs text-cyan-400 font-mono">{selection.formula}</code>
        </div>
      )}
      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">💡 Trading Tip</span>
        <p className="text-xs text-amber-200/80 leading-relaxed">{selection.tip}</p>
      </div>
    </div>
  );
};

// ─── Monte Carlo Modal ────────────────────────────────────────────────────────
const MonteCarloModal = ({ ai, symbol, onClose }: { ai: any; symbol: string; onClose: () => void }) => {
  const [running, setRunning] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setRunning(false); setDone(true); return 100; }
        return p + 3;
      });
    }, 60);
    return () => clearInterval(iv);
  }, []);

  const bullProb = ai?.bias === "Bullish" ? 62 : ai?.bias === "Bearish" ? 28 : 45;
  const bearProb = ai?.bias === "Bearish" ? 60 : ai?.bias === "Bullish" ? 22 : 38;
  const flatProb = 100 - bullProb - bearProb;
  const conf     = ai?.confidence ?? 70;

  return (
    <div className="absolute inset-0 bg-[#0A1929]/90 backdrop-blur-sm flex items-center justify-center z-40 p-6 animate-in fade-in duration-300">
      <Card className="w-full max-w-md bg-[#132F4C] border-[#1E3A5F] shadow-2xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-blue-700 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-white" />
            <h3 className="text-lg font-black text-white">Monte Carlo — {symbol}</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <CardContent className="p-6 space-y-5">
          {running ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                Running 10,000 path simulations based on live data...
              </div>
              <div className="w-full bg-[#0A1929] rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-75" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 text-right font-mono">{progress}%</p>
            </div>
          ) : done && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {ai?.pattern && (
                <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 text-sm">
                  <span className="text-blue-400 font-bold">Pattern: </span>
                  <span className="text-white">{ai.pattern}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="text-2xl font-black text-emerald-400">{bullProb}%</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Bull</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <div className="text-2xl font-black text-red-400">{bearProb}%</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Bear</div>
                </div>
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-3">
                  <div className="text-2xl font-black text-gray-400">{flatProb}%</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Flat</div>
                </div>
              </div>
              <div className="bg-[#0A1929] rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">AI Bias</span><span className={`font-bold ${ai?.bias === "Bullish" ? "text-emerald-400" : ai?.bias === "Bearish" ? "text-red-400" : "text-gray-300"}`}>{ai?.bias ?? "Neutral"}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Key Level</span><span className="text-white font-mono">{ai?.keyLevel ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Confidence</span><span className="text-[#FFB347] font-bold">{conf}%</span></div>
                {ai?.riskNote && <div className="pt-2 border-t border-[#1E3A5F] text-gray-400 text-xs">{ai.riskNote}</div>}
              </div>
              <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-10 rounded-xl">Close</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── RSI Chart ────────────────────────────────────────────────────────────────
const RSIChart = ({ data, timeframe }: { data: any[]; timeframe: Timeframe }) => {
  const lastRsi = data[data.length - 1]?.rsi;
  const rsiColor = lastRsi > 70 ? "#ef4444" : lastRsi < 30 ? "#10b981" : "#a78bfa";

  return (
    <div className="h-24 w-full">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">RSI-14</span>
        {lastRsi && (
          <span className={`text-xs font-bold ${rsiColor === "#ef4444" ? "text-red-400" : rsiColor === "#10b981" ? "text-emerald-400" : "text-purple-400"}`}>
            {lastRsi.toFixed(1)} {lastRsi > 70 ? "(Overbought)" : lastRsi < 30 ? "(Oversold)" : ""}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} hide />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={50} stroke="#ffffff" strokeDasharray="2 4" strokeOpacity={0.15} />
          <Line type="monotone" dataKey="rsi" stroke={rsiColor} dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Drawing Overlay SVG ─────────────────────────────────────────────────────
const DrawingOverlay = ({
  drawings, draft, selectedId, activeTool,
  onMouseDown, onMouseMove, onMouseUp, onSelectDrawing, svgRef
}: {
  drawings: Drawing[]; draft: Drawing | null; selectedId: string | null;
  activeTool: DrawingTool;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp:   (e: React.MouseEvent<SVGSVGElement>) => void;
  onSelectDrawing: (id: string) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) => {
  const cursor =
    activeTool === "trendline" ? "crosshair" :
    activeTool === "box"       ? "crosshair" :
    activeTool === "eraser"    ? "not-allowed" : "default";

  const renderShape = (d: Drawing, isSelected: boolean, isEraser: boolean) => {
    const { p1, p2 } = d;
    const stroke = isSelected ? "#FFB347" : isEraser ? "#ef4444" : d.kind === "trendline" ? "#60a5fa" : "#a78bfa";
    if (d.kind === "trendline") {
      return (
        <g key={d.id} onClick={() => onSelectDrawing(d.id)} style={{ cursor: activeTool === "eraser" ? "not-allowed" : "pointer" }}>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={12} />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={stroke} strokeWidth={isSelected ? 2.5 : 1.5} strokeLinecap="round" />
          {isSelected && <>
            <circle cx={p1.x} cy={p1.y} r={5} fill={stroke} stroke="#0A1929" strokeWidth={1.5} />
            <circle cx={p2.x} cy={p2.y} r={5} fill={stroke} stroke="#0A1929" strokeWidth={1.5} />
          </>}
        </g>
      );
    } else {
      const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
      return (
        <g key={d.id} onClick={() => onSelectDrawing(d.id)} style={{ cursor: activeTool === "eraser" ? "not-allowed" : "pointer" }}>
          <rect x={x} y={y} width={w} height={h} fill="transparent" stroke="transparent" strokeWidth={8} />
          <rect x={x} y={y} width={w} height={h} fill={stroke + "18"} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray="4 3" rx={2} />
        </g>
      );
    }
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full z-30"
      style={{ cursor, pointerEvents: activeTool === "select" && drawings.length === 0 ? "none" : "all" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {drawings.map(d => renderShape(d, d.id === selectedId, activeTool === "eraser"))}
      {draft && renderShape(draft, false, false)}
    </svg>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Analysis() {
  const [searchQuery, setSearchQuery]         = useState("EURUSD");
  const [activeSymbol, setActiveSymbol]       = useState("EUR/USD");
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("D");
  const [chartData, setChartData]             = useState<any>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [upcomingEvent, setUpcomingEvent]     = useState<any>(null);
  const [liveThemes, setLiveThemes]           = useState<any[]>([]);
  const [hoveredElement, setHoveredElement]   = useState<any>(null);
  const [showUpgrade, setShowUpgrade]         = useState(false);
  const [showMonteCarlo, setShowMonteCarlo]   = useState(false);
  const [activeTool, setActiveTool]           = useState<DrawingTool>("select");
  const [connectedTheme, setConnectedTheme]   = useState<any>(null);

  // ── NEW: crosshair state ──────────────────────────────────────────────────
  const [crosshair, setCrosshair] = useState<Crosshair>(null);

  const { isDemoMode, demoTimeRemaining, activateDemo } = useDemoAccount();
  const abortRef   = useRef<AbortController | null>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef<{ active: boolean; start: Pt | null }>({ active: false, start: null });
  const [drawings, setDrawings]     = useState<Drawing[]>([]);
  const [draft, setDraft]           = useState<Drawing | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const THEME_DEFINITIONS = [
    { name: "Monetary Policy & Rates",  keywords: ["fed","rate","inflation","cpi","powell","bank","interest","treasury","yield","fomc"] },
    { name: "Tech & AI Capex",          keywords: ["ai","tech","apple","nvidia","google","microsoft","chip","semiconductor","capex"] },
    { name: "Consumer Sentiment",       keywords: ["retail","consumer","sales","earnings","store","spending","sentiment"] },
    { name: "Labor Market Dynamics",    keywords: ["job","labor","unemployment","wage","hiring","strike","payroll","nfp"] },
    { name: "Trade & Geopolitics",      keywords: ["china","tariff","trade","export","war","sanction","europe","supply chain"] },
    { name: "Energy & Commodities",     keywords: ["oil","gas","energy","commodity","gold","opec","crude","copper"] },
    { name: "Broader Macroeconomy",     keywords: ["gdp","recession","economy","growth","deficit","debt","manufacturing","pmi"] },
    { name: "General Market Risk",      keywords: ["stock","wall street","dow","nasdaq","spx","rally","crash","selloff","equities"] },
  ];

  const UPCOMING_EVENTS = [
    { id: 1, event: "China Trade Balance",       impact: 4, time: "Mar 10, 03:00 GMT" },
    { id: 2, event: "US Core CPI YoY",           impact: 5, time: "Mar 11, 08:30 ET"  },
    { id: 4, event: "BoJ Interest Rate Decision",impact: 5, time: "Mar 19, Tentative"  },
  ];

  const fetchChart = useCallback(async (sym: string, tf: Timeframe) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoading(true);
    setError("");
    setCrosshair(null); // clear tooltip on new fetch

    // serverTf = interval string sent to /api/chart
    // pointsMap = candles needed to fill the window
    //
    // Button → interval → candles → window
    // 1H     → 1min     → 60      → 60 × 1min  = 1 hour
    // 4H     → 5min     → 48      → 48 × 5min  = 4 hours
    // D      → 5min     → 288     → 288 × 5min = 24 hours
    // W      → 1h       → 168     → 168 × 1h   = 7 days
    // 1MO    → 1day     → 30      → 30 days
    // 1Y     → 1week    → 52      → 52 weeks   = 1 year
    // 5Y     → 1week    → 260     → 260 weeks  = 5 years
    // 10Y    → 1month   → 120     → 120 months = 10 years
    const serverTf: Record<string, string> = {
      "1H": "1min", "4H": "5min", "D": "5min",
      "W": "1h", "1MO": "1day",
      "1Y": "1week", "5Y": "1week", "10Y": "1month",
    };
    const pointsMap: Record<string, number> = {
      "1H": 60, "4H": 48, "D": 288,
      "W": 168, "1MO": 30,
      "1Y": 52, "5Y": 260, "10Y": 120,
    };
    const serverInterval = serverTf[tf] || "D";
    const points         = pointsMap[tf] || 252;

    const buildFallback = (s: string, count: number) => {
      const prices: Record<string,number> = {
        "EUR/USD":1.0845,"GBP/USD":1.2650,"USD/JPY":149.5,"AUD/USD":0.6520,
        "USD/CAD":1.3580,"USD/CHF":0.9020,"NZD/USD":0.6050,"USD/CNH":7.2450,
        "BTC/USD":83500,"ETH/USD":3150,"SOL/USD":142,
        "XAU/USD":2320,"XAG/USD":27.5,"WTI/USD":78.5,
      };
      const base   = prices[s] || prices[sym] || 1.1000;
      const vol    = base > 10000 ? 0.012 : base > 1000 ? 0.015 : base > 100 ? 0.010 : 0.0035;
      const msStepMap: Record<string,number> = {
        "1H":  60 * 1000,             // 1min candles
        "4H":  5  * 60 * 1000,        // 5min candles
        "D":   5  * 60 * 1000,        // 5min candles → 288 × 5min = 24h
        "W":   60 * 60 * 1000,        // 1h candles   → 168 × 1h  = 7 days
        "1MO": 86400000,              // 1day candles
        "1Y":  7  * 86400000,         // 1week candles
        "5Y":  7  * 86400000,         // 1week candles
        "10Y": 30 * 86400000,         // 1month candles
      };
      const msStep = msStepMap[tf] ?? 86400000;
      let seed = s.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
      const rnd  = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };
      const dp   = base >= 100 ? 2 : 5;
      let p = base;
      const now = Date.now();
      return Array.from({length: count}, (_,i) => {
        const move = (rnd() - 0.497) * base * vol;
        p = Math.max(p + move, base * 0.6);
        const o = p;
        const bodySize = (rnd() * 0.8 + 0.2) * base * vol;
        const c = rnd() > 0.5 ? o + bodySize : o - bodySize;
        const wickMult = rnd() * 0.6 + 0.2;
        const h = Math.max(o, c) + rnd() * base * vol * wickMult;
        const l = Math.min(o, c) - rnd() * base * vol * wickMult;
        p = c;
        return {
          time: now-(count-1-i)*msStep,
          open:  parseFloat(o.toFixed(dp)),
          high:  parseFloat(h.toFixed(dp)),
          low:   parseFloat(l.toFixed(dp)),
          close: parseFloat(c.toFixed(dp)),
          volume: Math.floor(rnd()*5000+500),
        };
      });
    };

    try {
      let candles: any[] = buildFallback(sym, points);

      let json: any = null;
      try {
        const res = await fetch(`/api/chart?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(serverInterval)}`, { signal });
        if (res.ok) {
          json = await res.json();
          if (json.candles?.length > 4) {
            candles = json.candles.slice(-points);
          }
        }
      } catch (_) { /* keep fallback */ }

      if (signal.aborted) return;

      const closes = candles.map((c: any) => c.close as number);
      const last   = closes[closes.length-1];
      const prev   = closes[closes.length-2];
      const change = (prev && last) ? ((last-prev)/prev*100) : 0;
      const dp     = last > 100 ? 2 : 5;

      const smaMap: Record<number,number> = {};
      candles.forEach((_: any, i: number) => {
        if (i < 19) return;
        const avg = candles.slice(i-19,i+1).reduce((s: number,c: any) => s+c.close, 0) / 20;
        smaMap[candles[i].time] = parseFloat(avg.toFixed(dp));
      });

      const bollingerData: any[] = [];
      candles.forEach((_: any, i: number) => {
        if (i < 19) return;
        const slice    = candles.slice(i-19,i+1).map((c: any) => c.close as number);
        const mid      = slice.reduce((a: number,b: number) => a+b, 0) / 20;
        const variance = slice.reduce((a: number, b: number) => a + Math.pow(b - mid, 2), 0) / 20;
        const sigma    = Math.sqrt(variance);
        bollingerData.push({
          time:  candles[i].time,
          upper: parseFloat((mid + 2 * sigma).toFixed(dp)),
          mid:   parseFloat(mid.toFixed(dp)),
          lower: parseFloat((mid - 2 * sigma).toFixed(dp)),
        });
      });

      const rsiData: any[] = [];
      for (let i = 14; i < candles.length; i++) {
        let g = 0, l = 0;
        for (let j = i-13; j <= i; j++) {
          const d = candles[j].close - candles[j-1].close;
          if (d > 0) g += d; else l -= d;
        }
        const rs = l === 0 ? 100 : g/l;
        rsiData.push({ time: candles[i].time, rsi: parseFloat((100-100/(1+rs)).toFixed(2)) });
      }

      const ema = (data: number[], period: number): number[] => {
        const k = 2 / (period + 1);
        const result: number[] = [];
        let prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        data.forEach((v, i) => {
          if (i < period - 1) { result.push(NaN); return; }
          const val = i === period - 1 ? prev : prev * (1 - k) + v * k;
          prev = val;
          result.push(parseFloat(val.toFixed(dp)));
        });
        return result;
      };
      const ema12    = ema(closes, 12);
      const ema26    = ema(closes, 26);
      const macdLine = ema12.map((v, i) => isNaN(v) || isNaN(ema26[i]) ? NaN : parseFloat((v - ema26[i]).toFixed(dp)));
      const validMacd = macdLine.filter(v => !isNaN(v));
      const signalRaw = ema(validMacd, 9);
      const macdData: any[] = [];
      let sigIdx = 0;
      macdLine.forEach((m, i) => {
        if (isNaN(m)) return;
        const signal = signalRaw[sigIdx] ?? NaN;
        const hist   = isNaN(signal) ? NaN : parseFloat((m - signal).toFixed(dp));
        macdData.push({ time: candles[i].time, macd: m, signal: isNaN(signal) ? null : signal, hist: isNaN(hist) ? null : hist });
        sigIdx++;
      });

      const recent     = candles.slice(-20);
      const resistance = parseFloat(Math.max(...recent.map((c: any) => c.high as number)).toFixed(dp));
      const support    = parseFloat(Math.min(...recent.map((c: any) => c.low  as number)).toFixed(dp));
      const chartHigh  = Math.max(...candles.map((c: any) => c.high as number));
      const chartLow   = Math.min(...candles.map((c: any) => c.low  as number));

      setChartData({
        symbol: sym, interval: tf,
        last:    parseFloat(last.toFixed(dp)),
        change:  parseFloat(change.toFixed(3)),
        candles,
        bollinger: bollingerData,
        sma:     Object.entries(smaMap).map(([t,s]) => ({ time: Number(t), sma: s })),
        rsi:     rsiData,
        macd:    macdData,
        support, resistance, chartHigh, chartLow,
        chartRange: (chartHigh-chartLow) || 1,
        ai: json?.ai || {},
      });
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message || "Failed to load chart");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  const fetchThemesFromNews = async () => {
    try {
      const articles = await fetchHeadlines().catch(() => []);
      const buckets: Record<string, { count: number; articles: any[]; name: string }> = {};
      THEME_DEFINITIONS.forEach(td => { buckets[td.name] = { count: 0, articles: [], name: td.name }; });
      articles.forEach((article: any) => {
        const text = (article.title + " " + article.description).toLowerCase();
        for (const td of THEME_DEFINITIONS) {
          if (td.keywords.some(kw => new RegExp(`\\b${kw}\\b`, "i").test(text))) {
            buckets[td.name].count++; buckets[td.name].articles.push(article); break;
          }
        }
      });
      const themes = Object.values(buckets).filter(b => b.count > 0)
        .sort((a, b) => b.count - a.count).slice(0, 5)
        .map((bucket, i) => {
          const top  = bucket.articles[0];
          const heat = Math.min(98, 70 + bucket.count * 6);
          return { id: `theme-${i}`, name: bucket.name, headline: top.title.split(" - ")[0], url: top.url, heat, phase: heat > 85 ? "burst" : "growing", category: top.source?.name || "Market News" };
        });
      setLiveThemes(themes);
      sessionStorage.setItem("macroThemes", JSON.stringify(themes));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const storedThemes = sessionStorage.getItem("macroThemes");
    if (storedThemes) setLiveThemes(JSON.parse(storedThemes));
    else fetchThemesFromNews();

    const crit = UPCOMING_EVENTS.find(ev => ev.impact >= 4);
    if (crit) setUpcomingEvent(crit);

    fetchChart("EUR/USD", "D");
  }, []);

  useEffect(() => {
    fetchChart(activeSymbol, activeTimeframe);
    setDrawings([]);
    setDraft(null);
    setSelectedId(null);
    setActiveTool("select");
    setCrosshair(null);
  }, [activeTimeframe, activeSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const resolved = resolveSymbol(searchQuery);
    setActiveSymbol(resolved);
  };

  const THEME_INSTRUMENT_MAP: Record<string, { symbol: string; label: string; rationale: string }> = {
    "Monetary Policy & Rates":  { symbol: "EUR/USD",  label: "EUR/USD",   rationale: "EUR/USD is highly sensitive to Fed vs ECB rate differentials. A hawkish Fed lifts the dollar and pushes this pair lower — watch it as a real-time rate expectations barometer." },
    "Tech & AI Capex":          { symbol: "BTC/USD",  label: "BTC/USD",   rationale: "Bitcoin often leads risk appetite in tech/AI cycles. Institutional crypto flows correlate with tech capex sentiment and liquidity conditions." },
    "Consumer Sentiment":       { symbol: "XAU/USD",  label: "Gold",      rationale: "Gold inversely tracks consumer confidence and real rates. Weak sentiment drives safe-haven flows; strong sentiment pushes capital into risk assets away from gold." },
    "Labor Market Dynamics":    { symbol: "USD/JPY",  label: "USD/JPY",   rationale: "USD/JPY tracks US–Japan rate differentials which are driven by labor market conditions. Strong US jobs data = higher yields = stronger USD/JPY." },
    "Trade & Geopolitics":      { symbol: "XAU/USD",  label: "Gold",      rationale: "Gold is the classic geopolitical hedge. Trade war escalation and sanctions uncertainty drive safe-haven flows into gold first." },
    "Energy & Commodities":     { symbol: "WTI/USD",  label: "WTI Crude", rationale: "WTI crude is the most direct expression of energy themes. OPEC decisions, supply disruptions, and China demand all move this market first." },
    "Broader Macroeconomy":     { symbol: "EUR/USD",  label: "EUR/USD",   rationale: "EUR/USD tracks the global macro cycle — dollar strength in downturns, dollar weakness in recoveries. It is the world's most liquid macro barometer." },
    "General Market Risk":      { symbol: "XAU/USD",  label: "Gold",      rationale: "In risk-off periods gold rallies as equities sell off. It is the clearest expression of broad market fear and safe-haven demand." },
  };

  const handleConnectTheme = (theme: any) => {
    if (connectedTheme?.id === theme.id) { setConnectedTheme(null); return; }
    const match = Object.entries(THEME_INSTRUMENT_MAP).find(([key]) =>
      theme.name.toLowerCase().includes(key.split(" ")[0].toLowerCase()) ||
      key.toLowerCase().includes(theme.name.split(" ")[0].toLowerCase())
    );
    const instrument = match?.[1] ?? { symbol: "GC=F", label: "Gold", rationale: "Gold acts as a broad macro hedge and is sensitive to risk sentiment, dollar strength, and global uncertainty." };
    setConnectedTheme({ ...theme, instrument });
    setActiveSymbol(instrument.symbol);
    setSearchQuery(instrument.label);
  };

  const handleToolSelect = (tool: DrawingTool) => {
    if (tool === "eraser") {
      setDrawings([]); setDraft(null); setSelectedId(null); setActiveTool("select");
    } else {
      setSelectedId(null); setActiveTool(tool);
    }
  };

  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>): Pt => {
    const svg = overlayRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleOverlayMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === "select" || activeTool === "eraser") return;
    e.stopPropagation();
    const pt = getSVGPoint(e);
    drawingRef.current = { active: true, start: pt };
    const id = `d-${Date.now()}`;
    setDraft({ id, kind: activeTool as 'trendline' | 'box', p1: pt, p2: pt });
    setSelectedId(null);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawingRef.current.active || !drawingRef.current.start) return;
    const pt = getSVGPoint(e);
    setDraft(prev => prev ? { ...prev, p2: pt } : null);
  };

  const handleOverlayMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawingRef.current.active || !draft) { drawingRef.current = { active: false, start: null }; return; }
    drawingRef.current = { active: false, start: null };
    const dx = Math.abs(draft.p2.x - draft.p1.x);
    const dy = Math.abs(draft.p2.y - draft.p1.y);
    if (dx > 8 || dy > 8) { setDrawings(prev => [...prev, draft]); setSelectedId(draft.id); }
    setDraft(null);
    setActiveTool("select");
  };

  const handleSelectDrawing = (id: string) => {
    if (activeTool === "eraser") { setDrawings(prev => prev.filter(d => d.id !== id)); setSelectedId(null); }
    else { setSelectedId(prev => prev === id ? null : id); }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const annotations: Record<string, { type: string; explanation: string; tip: string; formula?: string }> = {
    resistance: { type: "Resistance Level", explanation: "A price ceiling where selling pressure has historically overwhelmed buying demand, causing the price to reverse downward. The more times a level is tested without breaking, the more significant it becomes.", tip: "Look for bearish candlestick patterns (Shooting Star, Bearish Engulfing) forming at resistance before entering a short. Volume confirmation strengthens the signal." },
    support:    { type: "Support Zone", explanation: "A price floor where buyers consistently step in, preventing further decline. Support often forms at prior highs, round numbers, or high-volume price areas. Once broken, support frequently becomes new resistance.", tip: "A bullish RSI divergence at support — price makes a lower low but RSI makes a higher low — is a high-probability reversal signal. Wait for a bullish candle close to confirm." },
    sma:        { type: "20-Period SMA", formula: "SMA = (C₁ + C₂ + ... + C₂₀) / 20", explanation: "The Simple Moving Average smooths price data to reveal the underlying trend direction. The 20-period SMA is widely watched by institutional traders and acts as dynamic support in uptrends, dynamic resistance in downtrends.", tip: "Price pulling back to touch the 20 SMA in a strong trend (steep angle, price above) often offers a low-risk entry in the trend direction. A flattening SMA signals weakening momentum." },
    rsi:        { type: "RSI — Relative Strength Index", formula: "RSI = 100 − (100 / (1 + RS))  where RS = Avg Gain / Avg Loss", explanation: "RSI measures momentum by comparing the size of recent gains to recent losses over 14 periods. Values above 70 indicate overbought conditions; below 30 indicates oversold. RSI divergence — where price and RSI move in opposite directions — often precedes reversals.", tip: "Don't just sell when RSI hits 70 in a strong trend — it can stay overbought for extended periods. Instead, wait for RSI to drop back below 70 as a more reliable sell signal." },
    candles:    { type: "Candlestick Charts", explanation: "Each candle shows four prices: Open, High, Low, Close. The body (thick part) spans open to close — green means price closed higher, red means lower. The wicks (thin lines) show the full high/low range. Candlestick patterns reveal the battle between buyers and sellers.", tip: "The most powerful patterns occur at key levels. A Doji (open ≈ close) at resistance signals indecision. A long lower wick at support shows buyers rejecting lower prices. Always confirm with the next candle." },
    bullish:    { type: "Bullish Bias", explanation: "The AI has identified bullish technical conditions — price action, momentum indicators, and pattern recognition suggest buyers have control. This could reflect an uptrend, a breakout above resistance, or oversold conditions reversing.", tip: "Bullish bias alone isn't a trade signal. Look for a specific entry trigger: pullback to support, a bullish engulfing candle, or RSI bouncing from oversold. Define your stop-loss before entering." },
    bearish:    { type: "Bearish Bias", explanation: "The AI has identified bearish technical conditions — price action and momentum suggest sellers are in control. This may reflect a downtrend, a breakdown below support, or overbought conditions starting to unwind.", tip: "In bearish conditions, avoid catching falling knives. Wait for a dead-cat bounce to resistance before considering a short entry. RSI reaching overbought on the bounce gives a cleaner risk/reward." },
    neutral:    { type: "Neutral / Consolidation", explanation: "Price is in a range or showing no clear directional bias. Neutral conditions occur during consolidation phases, often before a significant breakout. Volume tends to contract during these periods.", tip: "Neutral markets are best traded with range strategies: buy near support, sell near resistance, with tight stops. A volume spike breaking out of consolidation often signals the start of a new trend." },
    confidence: { type: "AI Confidence Score", explanation: "The confidence score reflects how clearly the AI identified a pattern in the chart data. Higher scores (85%+) indicate strong, unambiguous signals. Lower scores (50–65%) suggest mixed or conflicting indicators.", tip: "Only act on high-confidence signals (75%+) that align with your higher timeframe trend. A 90% confident bearish signal on the 1H chart means more in a daily downtrend than in a daily uptrend." },
    montecarlo: { type: "Monte Carlo Simulation", explanation: "Monte Carlo runs thousands of randomized price paths based on the asset's historical volatility and the AI's directional bias. The output shows the probability distribution of future price outcomes — not a prediction, but a range of scenarios.", tip: "Use Monte Carlo to size your position. If the worst-case scenario (5th percentile path) hits your stop loss, reduce position size until the risk is acceptable. Never risk more than 1–2% of capital on a single trade." },
  };

  const toolConfig = [
    { tool: "select"    as DrawingTool, icon: <MousePointer2 className="h-4 w-4" />, label: "Select"    },
    { tool: "trendline" as DrawingTool, icon: <LineChartIcon className="h-4 w-4" />, label: "Trendline" },
    { tool: "box"       as DrawingTool, icon: <BoxSelect className="h-4 w-4" />,     label: "Rectangle" },
    { tool: "eraser"    as DrawingTool, icon: <Eraser className="h-4 w-4" />,        label: "Clear"     },
  ];

  const ai   = chartData?.ai;
  const bias = ai?.bias;

  // ── Decimal places helper for tooltip ────────────────────────────────────
  const getDP = (val: number) => {
    if (!val) return 4;
    if (val >= 10000) return 2;
    if (val >= 100)   return 2;
    if (val >= 10)    return 3;
    return 5;
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A1929] text-white">

      {/* Demo Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 flex justify-between items-center sticky top-0 z-50 shadow-lg">
          <div className="flex items-center space-x-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <span className="font-bold">DEMO MODE ACTIVE</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4" />
              <span>Time Remaining: <span className="font-mono font-bold">{formatTime(demoTimeRemaining)}</span></span>
            </div>
            <Badge variant="secondary" className="bg-white/10 text-white border-none text-[10px]">
              SYMBOLS: EUR/USD, GBP/USD, BTC/USD
            </Badge>
          </div>
          <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-8" onClick={() => setShowUpgrade(true)}>
            UPGRADE TO PRO →
          </Button>
        </div>
      )}

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Market Analysis</h1>
            <p className="text-gray-400 text-sm">Live OHLCV data · AI-powered technical analysis · Real-time macro overlays</p>
          </div>
          {!isDemoMode && (
            <div className="relative group">
              <Button onClick={activateDemo} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 transition-all shadow-xl">
                <Play className="h-4 w-4 mr-2 fill-current" /> Try Interactive Demo
              </Button>
              <div className="absolute right-0 mt-3 w-72 bg-[#132F4C] border border-[#1E3A5F] rounded-xl shadow-2xl p-4 hidden group-hover:block z-50">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#FFB347]" /> What's in the Demo?</h4>
                <ul className="text-xs space-y-2 text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-400" /> Live candlestick charts with real data</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-400" /> AI-powered pattern recognition</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-400" /> RSI, SMA & support/resistance levels</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative z-30">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Forex: EURUSD, GBPUSD · Crypto: BTC, ETH · Commodities: GOLD, OIL"
                className="w-full bg-[#132F4C] border-[#1E3A5F] text-white pl-11 h-12 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={loading} className="bg-[#FFB347] hover:bg-[#FFA327] text-black font-bold h-12 px-8 rounded-xl active:scale-95">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
            </Button>
          </form>
        </div>

        {/* Connected Theme Banner */}
        {connectedTheme && (
          <div className="bg-[#FFB347]/10 border border-[#FFB347]/30 rounded-xl px-4 py-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-4 h-4 text-[#FFB347] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#FFB347]">{connectedTheme.name}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-[#FFB347]/20 text-[#FFB347] rounded-full font-bold uppercase tracking-wider">→ {connectedTheme.instrument?.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{connectedTheme.instrument?.rationale}</p>
              </div>
              <button onClick={() => setConnectedTheme(null)} className="text-gray-500 hover:text-white shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Chart Column ───────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            <Card className="bg-[#132F4C] border-[#1E3A5F] overflow-hidden rounded-2xl shadow-2xl relative">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[#1E3A5F] py-3 px-5 bg-[#132F4C]/50 backdrop-blur-sm">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-[#0A1929] px-3 py-1.5 rounded-lg border border-[#1E3A5F]">
                    <span className="text-emerald-400 font-bold text-sm">{activeSymbol.replace("=X", "")}</span>
                    {chartData && (
                      <>
                        <span className="text-white font-mono text-sm">{fmtPrice(chartData.last, activeSymbol)}</span>
                        <span className={`text-xs font-bold ${chartData.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {chartData.change >= 0 ? "+" : ""}{chartData.change?.toFixed(3)}%
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {(["1H","4H","D","W","1MO","1Y","5Y","10Y"] as Timeframe[]).map(tf => (
                      <Button key={tf} variant="ghost" disabled={loading} onClick={() => setActiveTimeframe(tf)}
                        className={`h-8 w-10 text-[10px] font-bold transition-all ${tf === activeTimeframe ? "bg-blue-600 text-white hover:bg-blue-500" : "text-gray-400 hover:bg-white/5"}`}>
                        {tf}
                      </Button>
                    ))}
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => fetchChart(activeSymbol, activeTimeframe)} disabled={loading}
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg" title="Refresh">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 font-bold tracking-tight text-[10px]">
                  {isDemoMode ? "DEMO SESSION" : "LIVE · Twelve Data"}
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                {/* ── Main chart area with crosshair tooltip ── */}
                <div className="h-[400px] w-full bg-[#0A1929] relative">

                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0A1929]/70 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#FFB347]" />
                        <span className="text-sm text-gray-400">Fetching live data…</span>
                      </div>
                    </div>
                  )}

                  {error && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
                        <p className="text-red-400 font-bold">{error}</p>
                        <Button onClick={() => fetchChart(activeSymbol, activeTimeframe)} size="sm" variant="outline" className="border-red-500/30 text-red-400">
                          Retry
                        </Button>
                      </div>
                    </div>
                  )}

                  {connectedTheme && (
                    <>
                      <div className="absolute inset-0 pointer-events-none bg-[#FFB347]/5 z-10 rounded-b-2xl" />
                      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-[#FFB347]/20 border border-[#FFB347]/40 rounded-full px-2.5 py-1 pointer-events-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFB347] animate-pulse" />
                        <span className="text-[10px] font-bold text-[#FFB347] uppercase tracking-wider">{connectedTheme.instrument?.label ?? "Theme"}</span>
                      </div>
                    </>
                  )}

                  {chartData && !error && (
                    <div
                      className="w-full h-full"
                      onMouseEnter={() => { if (!hoveredElement) setHoveredElement(annotations.candles); }}
                      onMouseLeave={() => { setHoveredElement(null); setCrosshair(null); }}
                    >
                      {/* ── CandlestickChart now fires onCandleHover ── */}
                      <CandlestickChart
                        candles={chartData.candles}
                        bollinger={chartData.bollinger}
                        support={chartData.support}
                        resistance={chartData.resistance}
                        timeframe={activeTimeframe}
                        height={340}
                        onCandleHover={(candle, x, y) => setCrosshair({ candle, x, y })}
                        onChartLeave={() => setCrosshair(null)}
                      />

                      {/* SMA hover hint */}
                      <div
                        className="absolute top-0 left-0 right-0 h-8 cursor-help"
                        onMouseEnter={() => setHoveredElement(annotations.sma)}
                        onMouseLeave={() => setHoveredElement(null)}
                        title="Hover to learn about the 20 SMA"
                      >
                        <div className="absolute top-1 left-3 text-[10px] text-blue-400/60 font-mono select-none">SMA 20 ↓</div>
                      </div>

                      {/* ── Vertical crosshair line ── */}
                      {crosshair && (
                        <div
                          className="absolute top-0 pointer-events-none z-40"
                          style={{
                            left: crosshair.x,
                            height: "340px",
                            width: "1px",
                            background: "rgba(255,255,255,0.18)",
                          }}
                        />
                      )}

                      {/* ── OHLC tooltip ── */}
                      {crosshair && (
                        <div
                          className="absolute pointer-events-none z-50 bg-[#132F4C] border border-[#2D5A88] rounded-xl p-3 shadow-2xl text-xs font-mono space-y-1.5 min-w-[155px]"
                          style={{
                            // flip to left side when too close to right edge
                            left: crosshair.x > 600 ? crosshair.x - 168 : crosshair.x + 14,
                            top: Math.max(8, crosshair.y - 80),
                          }}
                        >
                          {/* Timestamp */}
                          <div className="text-gray-400 pb-1.5 border-b border-[#1E3A5F] text-[10px] uppercase tracking-wider">
                            {fmtTime(crosshair.candle.time, activeTimeframe)}
                          </div>
                          {/* OHLC rows */}
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-500">O</span>
                            <span className="text-white">{crosshair.candle.open?.toFixed(getDP(crosshair.candle.open))}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-500">H</span>
                            <span className="text-emerald-400">{crosshair.candle.high?.toFixed(getDP(crosshair.candle.high))}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-500">L</span>
                            <span className="text-red-400">{crosshair.candle.low?.toFixed(getDP(crosshair.candle.low))}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-500">C</span>
                            <span className={crosshair.candle.close >= crosshair.candle.open ? "text-emerald-400" : "text-red-400"}>
                              {crosshair.candle.close?.toFixed(getDP(crosshair.candle.close))}
                            </span>
                          </div>
                          {/* Change for this candle */}
                          {crosshair.candle.open && crosshair.candle.close && (
                            <div className="flex justify-between gap-6 pt-1.5 border-t border-[#1E3A5F]">
                              <span className="text-gray-500">Chg</span>
                              <span className={crosshair.candle.close >= crosshair.candle.open ? "text-emerald-400" : "text-red-400"}>
                                {crosshair.candle.close >= crosshair.candle.open ? "+" : ""}
                                {(((crosshair.candle.close - crosshair.candle.open) / crosshair.candle.open) * 100).toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Drawing overlay — z-index above chart, below tooltip */}
                  <DrawingOverlay
                    drawings={drawings}
                    draft={draft}
                    selectedId={selectedId}
                    activeTool={activeTool}
                    svgRef={overlayRef}
                    onMouseDown={handleOverlayMouseDown}
                    onMouseMove={handleOverlayMouseMove}
                    onMouseUp={handleOverlayMouseUp}
                    onSelectDrawing={handleSelectDrawing}
                  />

                  {/* Drawing toolbar */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#132F4C]/90 backdrop-blur-md border border-[#1E3A5F] rounded-full p-1.5 flex items-center gap-1 shadow-2xl z-40">
                    {toolConfig.map((t, i) => (
                      <span key={t.tool} className="flex items-center">
                        {(i === 1 || i === 3) && <span className="w-px h-5 bg-white/10 mx-1 block" />}
                        <Button variant="ghost" size="icon" title={t.label} onClick={() => handleToolSelect(t.tool)}
                          className={`h-9 w-9 rounded-full transition-all ${
                            t.tool === "eraser"
                              ? drawings.length > 0 ? "text-red-400 hover:bg-red-400/10" : "text-gray-600 cursor-default"
                              : activeTool === t.tool
                                ? "bg-blue-600 text-white hover:bg-blue-500"
                                : "text-gray-300 hover:bg-white/10"
                          }`}>
                          {t.icon}
                        </Button>
                      </span>
                    ))}
                    {drawings.length > 0 && (
                      <span className="ml-1 text-[10px] text-gray-500 pr-1">{drawings.length}</span>
                    )}
                  </div>

                  {/* Modals */}
                  {showMonteCarlo && <MonteCarloModal ai={ai} symbol={activeSymbol.replace("=X","").replace("-","/")} onClose={() => setShowMonteCarlo(false)} />}
                  {showUpgrade && (
                    <div className="absolute inset-0 bg-[#0A1929]/80 backdrop-blur-sm flex items-center justify-center z-40 p-6">
                      <Card className="max-w-md bg-[#132F4C] border-[#1E3A5F] shadow-2xl rounded-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center relative">
                          <Lock className="w-12 h-12 text-white/50 absolute -top-4 -right-4 rotate-12" />
                          <h3 className="text-2xl font-black text-white">Unlock Full Analysis</h3>
                        </div>
                        <CardContent className="p-8 space-y-6">
                          <p className="text-sm text-gray-400 text-center">Join 50,000+ traders using Pro tools.</p>
                          <ul className="space-y-4">
                            {["50+ Assets including Stocks & Crypto","Unlimited Drawing & Analysis Persistence","AI-Driven Trade Idea Generation","Direct MetaTrader 5 Integration"].map((item, i) => (
                              <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                <div className="p-1 bg-green-500/20 rounded-full"><Check className="w-3 h-3 text-green-400" /></div>{item}
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-3">
                            <Button className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold h-12 rounded-xl" onClick={() => window.open("mailto:sales@makansense.app?subject=Pro%20Upgrade", "_blank")}>Go Pro - $29/mo</Button>
                            <Button variant="outline" className="flex-1 border-[#1E3A5F] text-gray-400 hover:text-white rounded-xl" onClick={() => setShowUpgrade(false)}>Later</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                {/* RSI sub-chart */}
                {chartData?.rsi?.length > 0 && (
                  <div
                    className="bg-[#0A1929] border-t border-[#1E3A5F] px-4 pt-2 pb-3 cursor-help"
                    onMouseEnter={() => setHoveredElement(annotations.rsi)}
                    onMouseLeave={() => setHoveredElement(null)}
                  >
                    <RSIChart data={chartData.rsi} timeframe={activeTimeframe} />
                  </div>
                )}

                {/* MACD sub-chart */}
                {chartData?.macd?.length > 0 && (() => {
                  const macdVals = chartData.macd.filter((d: any) => d.macd !== null && !isNaN(d.macd));
                  if (macdVals.length < 2) return null;
                  const allVals  = macdVals.flatMap((d: any) => [d.macd, d.signal, d.hist].filter((v: any) => v != null && !isNaN(v)));
                  const vMax     = Math.max(...allVals);
                  const vMin     = Math.min(...allVals);
                  const vRange   = vMax - vMin || 1;
                  const H        = 72;
                  const PAD      = { top: 4, right: 64, bottom: 18, left: 8 };
                  const chartW   = 1200 - PAD.left - PAD.right;
                  const chartH   = H - PAD.top - PAD.bottom;
                  const py       = (v: number) => PAD.top + ((vMax - v) / vRange) * chartH;
                  const cx       = (i: number, total: number) => PAD.left + (i + 0.5) * (chartW / total);
                  const zero     = py(0);
                  const candleW  = Math.max(1.5, Math.min(8, (chartW / macdVals.length) * 0.7));
                  const lastMacd = macdVals[macdVals.length - 1];
                  const macdColor = lastMacd?.macd > lastMacd?.signal ? "#10b981" : "#ef4444";
                  const macdLine = macdVals.map((d: any, i: number) =>
                    `${i === 0 ? "M" : "L"} ${cx(i, macdVals.length)},${py(d.macd)}`).join(" ");
                  const sigLine  = macdVals.filter((d: any) => d.signal != null).map((d: any, i: number) =>
                    `${i === 0 ? "M" : "L"} ${cx(i, macdVals.length)},${py(d.signal)}`).join(" ");
                  const tickCount = 3;
                  const yTicks    = Array.from({ length: tickCount }, (_, i) => {
                    const v = vMin + (vRange * i) / (tickCount - 1);
                    return { v, y: py(v) };
                  });
                  const dp = vMax > 10 ? 2 : vMax > 0.1 ? 4 : 6;
                  return (
                    <div className="bg-[#0A1929] border-t border-[#1E3A5F] px-4 pt-2 pb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">MACD (12, 26, 9)</span>
                        <span className={`text-[10px] font-mono font-bold ${lastMacd?.macd > lastMacd?.signal ? "text-emerald-400" : "text-red-400"}`}>
                          {lastMacd?.macd?.toFixed(dp)} / sig {lastMacd?.signal?.toFixed(dp)}
                        </span>
                      </div>
                      <svg viewBox={`0 0 1200 ${H}`} width="100%" height={H} style={{ display: "block" }}>
                        {zero >= PAD.top && zero <= H - PAD.bottom && (
                          <line x1={PAD.left} y1={zero} x2={1200 - PAD.right} y2={zero}
                            stroke="#ffffff" strokeWidth={0.5} strokeOpacity={0.15} />
                        )}
                        {macdVals.map((d: any, i: number) => {
                          if (d.hist == null || isNaN(d.hist)) return null;
                          const x    = cx(i, macdVals.length);
                          const yTop = d.hist >= 0 ? py(d.hist) : zero;
                          const yBot = d.hist >= 0 ? zero : py(d.hist);
                          const barH = Math.max(1, yBot - yTop);
                          const col  = d.hist >= 0 ? "#10b981" : "#ef4444";
                          return <rect key={i} x={x - candleW / 2} y={yTop} width={candleW} height={barH} fill={col} fillOpacity={0.55} />;
                        })}
                        {macdLine && <path d={macdLine} fill="none" stroke={macdColor} strokeWidth={1.5} strokeOpacity={0.9} />}
                        {sigLine  && <path d={sigLine}  fill="none" stroke="#f59e0b"   strokeWidth={1}   strokeDasharray="3,2" strokeOpacity={0.8} />}
                        {yTicks.map((t, i) => (
                          <text key={i} x={1200 - PAD.right + 3} y={t.y + 3}
                            fill="#4B6280" fontSize={8} fontFamily="monospace">{t.v.toFixed(dp)}</text>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* ── AI Analysis + Teaching Panel row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Card className="bg-[#132F4C] border-[#1E3A5F] rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl">
                      <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">AI Technical Analysis</h3>
                      <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/30">Powered by Llama 3.3</Badge>
                    </div>
                  </div>

                  {loading && (
                    <div className="space-y-2">
                      {[...Array(3)].map((_,i) => <div key={i} className="h-4 bg-[#1E3A5F] rounded animate-pulse" style={{ width: `${80-i*15}%` }} />)}
                    </div>
                  )}

                  {!loading && ai && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {bias === "Bullish"  && <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full cursor-help" onMouseEnter={() => setHoveredElement(annotations.bullish)} onMouseLeave={() => setHoveredElement(null)}><ArrowUp className="w-3 h-3 text-emerald-400" /><span className="text-xs font-black text-emerald-400">BULLISH</span></div>}
                        {bias === "Bearish"  && <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full cursor-help" onMouseEnter={() => setHoveredElement(annotations.bearish)} onMouseLeave={() => setHoveredElement(null)}><ArrowDown className="w-3 h-3 text-red-400" /><span className="text-xs font-black text-red-400">BEARISH</span></div>}
                        {bias === "Neutral"  && <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-500/20 border border-gray-500/30 rounded-full cursor-help" onMouseEnter={() => setHoveredElement(annotations.neutral)} onMouseLeave={() => setHoveredElement(null)}><Minus className="w-3 h-3 text-gray-400" /><span className="text-xs font-black text-gray-400">NEUTRAL</span></div>}
                        {ai.pattern && <span className="text-xs text-gray-400 font-mono">{ai.pattern}</span>}
                      </div>

                      {ai.summary && <p className="text-sm text-gray-200 leading-relaxed">{ai.summary}</p>}

                      <div className="bg-[#0A1929] border border-[#1E3A5F] rounded-xl p-3 space-y-2">
                        {ai.keyLevel && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Key Level</span>
                            <span className="text-[#FFB347] font-mono font-bold">{ai.keyLevel}</span>
                          </div>
                        )}
                        {ai.confidence && (
                          <div className="flex justify-between text-sm cursor-help" onMouseEnter={() => setHoveredElement(annotations.confidence)} onMouseLeave={() => setHoveredElement(null)}>
                            <span className="text-gray-500">Confidence</span>
                            <span className="text-white font-bold">{ai.confidence}%</span>
                          </div>
                        )}
                        {ai.riskNote && (
                          <div className="pt-2 border-t border-[#1E3A5F]">
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">⚠️ Risk</span>
                            <p className="text-xs text-gray-400">{ai.riskNote}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-center" onMouseEnter={() => setHoveredElement(annotations.support)} onMouseLeave={() => setHoveredElement(null)}>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Support</div>
                          <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{chartData?.support?.toFixed(4) ?? "—"}</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-center" onMouseEnter={() => setHoveredElement(annotations.resistance)} onMouseLeave={() => setHoveredElement(null)}>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Resistance</div>
                          <div className="text-sm font-mono font-bold text-red-400 mt-0.5">{chartData?.resistance?.toFixed(4) ?? "—"}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!loading && !ai && !error && (
                    <p className="text-sm text-gray-500 italic">AI analysis will appear after chart loads.</p>
                  )}

                  <Button
                    className="w-full mt-4 bg-[#1E3A5F] border border-[#FFB347]/20 hover:bg-[#FFB347] hover:text-black font-bold transition-all"
                    onClick={() => setShowMonteCarlo(true)}
                    disabled={!chartData || loading}
                    onMouseEnter={() => setHoveredElement(annotations.montecarlo)}
                    onMouseLeave={() => setHoveredElement(null)}
                  >
                    Run Monte Carlo Simulation
                  </Button>
                </CardContent>
              </Card>

              <TeachingPanel selection={hoveredElement} />
            </div>
          </div>

          {/* ── Live Themes Panel ─────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <Card className="bg-[#132F4C] border-[#1E3A5F] h-full flex flex-col rounded-2xl shadow-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-[#1E3A5F] bg-[#132F4C]/50">
                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
                  <Newspaper className="w-4 h-4 text-[#FFB347]" />
                  Active Live Themes
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 font-bold uppercase">Live DB</span>
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                {liveThemes.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm italic flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#FFB347] border-t-transparent rounded-full animate-spin" />
                    Loading live themes…
                  </div>
                ) : liveThemes.map((theme, i) => (
                  <div key={i} className={`block p-5 transition-all border-b border-[#1E3A5F] ${connectedTheme?.id === theme.id ? "bg-[#FFB347]/10 border-l-4 border-l-[#FFB347]" : "hover:bg-[#1E3A5F]/40"}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{theme.category}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${theme.heat > 80 ? "bg-red-500/20 text-red-400" : "bg-[#FFB347]/20 text-[#FFB347]"}`}>
                        {theme.heat}🔥
                      </span>
                    </div>
                    <h4 className={`text-sm font-bold leading-tight mb-1.5 ${connectedTheme?.id === theme.id ? "text-[#FFB347]" : "text-gray-100"}`}>
                      {theme.name}
                    </h4>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{theme.headline}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => handleConnectTheme(theme)}
                        className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-all ${connectedTheme?.id === theme.id ? "bg-[#FFB347]/20 text-[#FFB347]" : "text-amber-500/80 hover:bg-[#FFB347]/10 hover:text-[#FFB347]"}`}>
                        <ChevronRight className="w-3 h-3" />
                        {connectedTheme?.id === theme.id ? "Connected ✓" : "Connect to Chart"}
                      </button>
                      {theme.url && (
                        <a href={theme.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-gray-600 hover:text-gray-300" title="Open source">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
