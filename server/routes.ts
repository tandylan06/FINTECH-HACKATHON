import express from "express"
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/news", async (req, res) => {
    const query = (req.query.q as string) || "macro economics inflation fed rates";
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      res.json(data.articles || []);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.post("/api/briefing", async (req, res) => {
    const { themes, headlines, calendar } = req.body;

    const themeBlock    = (themes || []).map((t: any) => `- ${t.name} (Heat: ${t.heatIndex}/100, Phase: ${t.phase}): "${t.headline}"`).join("\n");
    const headlineBlock = (headlines || []).slice(0, 8).map((h: any) => `- ${h.title} [${h.source}]`).join("\n");
    const calBlock      = (calendar || []).slice(0, 4).map((e: any) => `- ${e.event} (${e.country}, ${e.time}, impact: ${"★".repeat(e.impact)})`).join("\n");

    const systemPrompt = `You are a sharp, experienced macro analyst writing a Morning Briefing Card for a financial dashboard. Your job is to get the user moving — tell them what they must not miss today, make it useful for both beginners and pros. 

Rules:
- Be specific. Name instruments, numbers, events. Never say "markets face uncertainty."
- Each item must have a headline (bold, scannable for pros) AND a why_it_matters line (1 sentence, plain English for beginners).
- For action items, name the exact thing to do and why TODAY specifically.
- For suggested reads, pick from the actual headlines provided — do not invent titles.
- Keep every field concise. No padding. No filler.`;

    const userPrompt = `Today's live macro themes (from real news):
${themeBlock}

Today's headlines:
${headlineBlock}

Upcoming economic events:
${calBlock}

Generate a Morning Briefing Card. Return ONLY valid JSON, no markdown:
{
  "market_snapshot": {
    "headline": "One sentence: what is the dominant market narrative right now",
    "why_it_matters": "One sentence in plain English for a beginner"
  },
  "watch_today": [
    {
      "title": "Short bold headline (max 8 words)",
      "why_it_matters": "Why this matters today specifically, plain English",
      "theme": "which macro theme this connects to",
      "urgency": "high or medium"
    }
  ],
  "action_suggestions": [
    {
      "action": "Specific thing to do or check (e.g. 'Open the EUR/USD chart and look for...')",
      "reason": "One sentence — why today specifically"
    }
  ],
  "dont_miss": {
    "title": "The single most important thing happening right now",
    "why_it_matters": "Plain English explanation",
    "theme": "which theme"
  },
  "suggested_reads": [
    {
      "headline": "Exact headline from the list provided",
      "source": "source name",
      "why": "One sentence on why this read is worth it today"
    }
  ],
  "market_temperature": {
    "signal": "Risk-On or Risk-Off or Neutral",
    "reason": "One sentence explanation"
  }
}

Rules: watch_today must have exactly 3 items. action_suggestions must have exactly 3 items. suggested_reads must have exactly 2 items picked from the actual headlines above.`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt }
          ],
          max_tokens: 1500
        })
      });
      const data    = await response.json();
      const raw     = data.choices?.[0]?.message?.content || "{}";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      let parsed: any = {};
      try { parsed = JSON.parse(cleaned); } catch { parsed = { error: "Parse failed", raw: cleaned }; }
      res.json({ briefing: parsed });
    } catch (err) {
      console.error("Groq briefing error:", err);
      res.status(500).json({ error: "Failed to generate briefing" });
    }
  });

  app.get("/api/themes", async (req, res) => {
    try {
      const newsUrl = `https://newsapi.org/v2/everything?q=macro economics inflation fed rates geopolitics&language=en&sortBy=publishedAt&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`;
      const newsResponse = await fetch(newsUrl);
      const newsData = await newsResponse.json();
      const headlines = newsData.articles
        ?.slice(0, 15)
        .map((a: any) => a.title)
        .join("\n") || "";

      const prompt = `You are a macro analyst. Based on these recent financial news headlines, identify the top 4 most important macro themes right now.

Headlines:
${headlines}

Respond ONLY with a valid JSON array, no markdown, no explanation, just the raw JSON like this:
[
  {
    "id": "1",
    "name": "Theme Name",
    "description": "2 sentence description of what is happening and why it matters to asset managers.",
    "heat": 85,
    "trend": "up",
    "phase": "burst",
    "category": "Monetary Policy"
  }
]

Rules:
- heat is a number 1-100 indicating how hot the theme is
- trend is either "up" or "down"
- phase is one of: "burst", "growing", "stable"
- category is one of: "Macronomic Releases", "Monetary Policy", "Central Bank Commentary", "Geopolitics", "Technology", "Energy", "Credit", "FX"
- Keep each description under 20 words
- Return exactly 4 themes`;

      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000
          })
        }
      );

      const groqData = await groqResponse.json();
      const text = groqData.choices?.[0]?.message?.content || "[]";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const themes = JSON.parse(cleaned);
      res.json(themes);
    } catch (err) {
      console.error("Themes error:", err);
      res.status(500).json({ error: "Failed to generate themes" });
    }
  });


  // ── Chart data ────────────────────────────────────────────────────────────
  app.get("/api/chart", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    try {
      const symbol   = String(req.query.symbol   || "EUR/USD");
      const interval = String(req.query.interval || "5min");

      // ── Map client interval → Twelve Data interval + candle count ──────────
      //
      // Button → client sends → TD interval → outputsize → window shown
      // 1H     → 1min         → 1min        → 60         → 1 hour
      // 4H     → 5min         → 5min        → 48         → 4 hours
      // D      → 5min         → 5min        → 78         → 1 trading day
      // W      → 1h           → 1h          → 35         → 1 week
      // 1MO    → 1day         → 1day        → 22         → 1 month
      // 1Y     → 1week        → 1week       → 52         → 1 year
      // 5Y     → 1week        → 1week       → 260        → 5 years
      // 10Y    → 1month       → 1month      → 120        → 10 years

      // Button → client sends → TD interval → outputsize → window
      // 1H     → 1min         → 1min        → 60         → 1 hour (60 × 1min)
      // 4H     → 5min         → 5min        → 48         → 4 hours (48 × 5min)
      // D      → 5min         → 5min        → 78         → 1 trading day (78 × 5min = 6.5h)
      // W      → 1h           → 1h          → 120        → 5 days (120 × 1h ÷ 24h)
      // 1MO    → 1day         → 1day        → 30         → 1 month (30 days)
      // 1Y     → 1week        → 1week       → 52         → 1 year (52 weeks)
      // 5Y     → 1week        → 1week       → 260        → 5 years (260 weeks)
      // 10Y    → 1month       → 1month      → 120        → 10 years (120 months)
      const tdIntervalMap: Record<string, string> = {
        "1min":   "1min",
        "5min":   "5min",
        "15min":  "15min",
        "1h":     "1h",
        "4h":     "4h",
        "1day":   "1day",
        "1week":  "1week",
        "1month": "1month",
        // legacy aliases
        "1H":  "1h",
        "4H":  "4h",
        "D":   "1day",
        "W":   "1week",
        "1MO": "1month",
      };

      const outputsizeMap: Record<string, number> = {
        "1min":   60,    // 1H  → 60 × 1min  = 1 hour
        "5min":   288,   // D   → 288 × 5min = 24 hours
        "15min":  96,
        "1h":     168,   // W   → 168 × 1h   = 7 days
        "4h":     48,
        "1day":   30,    // 1MO → 30 days
        "1week":  260,   // 5Y  → 260 weeks  = 5 years
        "1month": 120,   // 10Y → 120 months = 10 years
      };

      const tdInterval = tdIntervalMap[interval] || "1day";
      const outputsize = outputsizeMap[interval] || 22;

      const symbolMap: Record<string, string> = {
        "EURUSD=X": "EUR/USD", "GBPUSD=X": "GBP/USD", "USDJPY=X": "USD/JPY",
        "AUDUSD=X": "AUD/USD", "USDCAD=X": "USD/CAD", "USDCHF=X": "USD/CHF",
        "BTC-USD":  "BTC/USD", "ETH-USD":  "ETH/USD",
        "GC=F":     "XAU/USD", "CL=F":     "WTI/USD",
        "^GSPC":    "SPX",     "^IXIC":    "IXIC",    "^DJI": "DJI",
        "NVDA": "NVDA", "AAPL": "AAPL", "MSFT": "MSFT",
        "TSLA": "TSLA", "AMZN": "AMZN", "GOOGL": "GOOGL",
        "META": "META", "NFLX": "NFLX",
      };
      const tdSymbol = symbolMap[symbol] || symbol.replace("=X","").replace("-USD","/USD");

      // ── Fallback candle generator (deterministic, never fails) ────────────
      const basePriceMap: Record<string, number> = {
        "EUR/USD": 1.0845, "GBP/USD": 1.2650, "USD/JPY": 149.50,
        "AUD/USD": 0.6520, "USD/CAD": 1.3580, "USD/CHF": 0.8920,
        "BTC/USD": 83500,  "ETH/USD": 3150,
        "XAU/USD": 2920,   "WTI/USD": 71.5,
        "SPX": 5780, "IXIC": 18200, "DJI": 43500,
        "NVDA": 118, "AAPL": 213, "MSFT": 385,
        "TSLA": 248, "AMZN": 205, "GOOGL": 175,
        "META": 585, "NFLX": 920,
      };

      const msStepMap: Record<string, number> = {
        "1min":   60 * 1000,
        "5min":   5  * 60 * 1000,
        "15min":  15 * 60 * 1000,
        "1h":     60 * 60 * 1000,
        "4h":     4  * 60 * 60 * 1000,
        "1day":   86400000,
        "1week":  7  * 86400000,
        "1month": 30 * 86400000,
      };

      const base   = basePriceMap[tdSymbol] || 100;
      const volPct = base > 10000 ? 0.008 : base > 1000 ? 0.01 : base > 100 ? 0.007 : 0.002;
      const msStep = msStepMap[tdInterval] || 86400000;
      const dp     = base >= 100 ? 2 : 5;

      // Seeded PRNG — same symbol always produces same fallback shape
      let seed = tdSymbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
      };

      let price = base;
      const now = Date.now();
      const candles: any[] = [];
      for (let i = outputsize; i >= 0; i--) {
        const move  = (rand() - 0.497) * base * volPct;
        price      += move;
        price       = Math.max(price, base * 0.7);
        const open  = price;
        const close = price + (rand() - 0.5) * base * volPct * 0.6;
        const high  = Math.max(open, close) + rand() * base * volPct * 0.3;
        const low   = Math.min(open, close) - rand() * base * volPct * 0.3;
        candles.push({
          time:   now - i * msStep,
          open:   parseFloat(open.toFixed(dp)),
          high:   parseFloat(high.toFixed(dp)),
          low:    parseFloat(low.toFixed(dp)),
          close:  parseFloat(close.toFixed(dp)),
          volume: Math.floor(rand() * 5000 + 500),
        });
        price = close;
      }

      // ── Try Twelve Data for live prices ───────────────────────────────────
      let usedFallback = true;
      try {
        const tdUrl = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${tdInterval}&outputsize=${outputsize}&apikey=${process.env.TWELVEDATA_API_KEY || "demo"}`;
        const tdRes = await fetch(tdUrl, {
          headers: { "User-Agent": "MacroSense/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (tdRes.ok) {
          const tdData = await tdRes.json();
          if (Array.isArray(tdData?.values) && tdData.values.length > 4) {
            const live = tdData.values
              .reverse()
              .map((v: any) => ({
                time:   new Date(v.datetime.length === 10 ? v.datetime + "T00:00:00" : v.datetime.replace(" ", "T")).getTime(),
                open:   parseFloat(v.open),
                high:   parseFloat(v.high),
                low:    parseFloat(v.low),
                close:  parseFloat(v.close),
                volume: parseFloat(v.volume) || 0,
              }))
              .filter((c: any) => c.close > 0 && !isNaN(c.close));
            if (live.length > 4) {
              candles.length = 0;
              candles.push(...live);
              usedFallback = false;
            }
          }
        }
      } catch (_) { /* network unavailable — use generated candles */ }

      // ── Indicators ────────────────────────────────────────────────────────
      const closes = candles.map((c: any) => c.close as number);
      const last   = closes[closes.length - 1];
      const prev   = closes[closes.length - 2];
      const change = (prev && last) ? ((last - prev) / prev * 100) : 0;

      const smaMap: Record<number, number> = {};
      candles.forEach((_: any, i: number) => {
        if (i < 19) return;
        const avg = candles.slice(i - 19, i + 1).reduce((s: number, c: any) => s + c.close, 0) / 20;
        smaMap[candles[i].time] = parseFloat(avg.toFixed(dp));
      });

      const rsiData: { time: number; rsi: number }[] = [];
      for (let i = 14; i < candles.length; i++) {
        let g = 0, l = 0;
        for (let j = i - 13; j <= i; j++) {
          const d = candles[j].close - candles[j - 1].close;
          if (d > 0) g += d; else l -= d;
        }
        const rs = l === 0 ? 100 : g / l;
        rsiData.push({ time: candles[i].time, rsi: parseFloat((100 - 100 / (1 + rs)).toFixed(2)) });
      }

      const candlesWithSma = candles.map((c: any) => ({ ...c, sma: smaMap[c.time] ?? null }));
      const recent     = candles.slice(-20);
      const resistance = parseFloat(Math.max(...recent.map((c: any) => c.high as number)).toFixed(dp));
      const support    = parseFloat(Math.min(...recent.map((c: any) => c.low  as number)).toFixed(dp));
      const chartHigh  = Math.max(...candles.map((c: any) => c.high as number));
      const chartLow   = Math.min(...candles.map((c: any) => c.low  as number));

      // ── Groq AI analysis (optional) ───────────────────────────────────────
      let ai: any = {};
      try {
        const snippet = candles.slice(-10)
          .map((c: any) => `O:${(c.open as number).toFixed(dp)} H:${(c.high as number).toFixed(dp)} L:${(c.low as number).toFixed(dp)} C:${(c.close as number).toFixed(dp)}`)
          .join(", ");
        const lastRsi = rsiData[rsiData.length - 1]?.rsi ?? "N/A";
        const lastSma = smaMap[candles[candles.length - 1]?.time] ?? "N/A";

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(10000),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_KEY || process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 300,
            messages: [{
              role: "user",
              content: `Analyze this ${interval} chart for ${tdSymbol}. Candles: ${snippet}. Price:${last?.toFixed(dp)}, SMA20:${lastSma}, RSI:${lastRsi}, Resistance:${resistance}, Support:${support}. Reply ONLY valid JSON no markdown: {"pattern":"name","bias":"Bullish or Bearish or Neutral","summary":"2 sentences","keyLevel":"price","riskNote":"risk","confidence":75}`,
            }],
          }),
        });
        const gj  = await groqRes.json();
        const raw = gj.choices?.[0]?.message?.content?.replace(/```json|```/g, "").trim() || "{}";
        ai = JSON.parse(raw);
      } catch (_) { /* AI is optional */ }

      res.json({
        symbol, interval, tdSymbol, usedFallback,
        last:   parseFloat((last ?? 0).toFixed(dp)),
        change: parseFloat(change.toFixed(3)),
        candles: candlesWithSma,
        sma:    Object.entries(smaMap).map(([t, s]) => ({ time: Number(t), sma: s })),
        rsi:    rsiData,
        support, resistance, chartHigh, chartLow,
        chartRange: (chartHigh - chartLow) || 1,
        ai,
      });

    } catch (err: any) {
      console.error("[/api/chart]", err);
      res.status(500).json({ error: String(err?.message || "Internal error") });
    }
  });

  // ── Groq proxy (keeps API key server-side) ───────────────────────────────
  app.post("/api/groq", async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) { res.status(500).json({ error: "GROQ_API_KEY not set in .env" }); return; }
    try {
      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(req.body),
      });
      res.status(upstream.status).json(await upstream.json());
    } catch (e: any) { res.status(502).json({ error: e.message }); }
  });

  return httpServer;
}
