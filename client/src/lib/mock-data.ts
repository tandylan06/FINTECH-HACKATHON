export const MOCK_THEMES = [
  {
    id: "th-01",
    name: "US Inflation Resurgence",
    heat: 92,
    sentiment: -0.8,
    phase: "burst",
    trend: "up",
    description: "Stubborn services inflation and strong labor market data suggesting rates higher for longer.",
    category: "Macro Economics"
  },
  {
    id: "th-02",
    name: "Middle East Conflict Escalation",
    heat: 85,
    sentiment: -0.9,
    phase: "growing",
    trend: "up",
    description: "Rising tensions affecting Red Sea shipping routes and driving up oil risk premiums.",
    category: "Geopolitics"
  },
  {
    id: "th-03",
    name: "AI Infrastructure Capex",
    heat: 78,
    sentiment: 0.7,
    phase: "growing",
    trend: "up",
    description: "Massive corporate spending on data centers, energy, and cooling infrastructure to support AI models.",
    category: "Technology"
  },
  {
    id: "th-04",
    name: "Yen Carry Trade Reversal",
    heat: 65,
    sentiment: -0.4,
    phase: "early",
    trend: "up",
    description: "BOJ indicating potential policy shift causing unwinding of global carry trades.",
    category: "Central Banks"
  },
  {
    id: "th-05",
    name: "European Industrial Slump",
    heat: 45,
    sentiment: -0.6,
    phase: "cooling",
    trend: "down",
    description: "German manufacturing output reaching decade lows amid high energy costs.",
    category: "Macro Economics"
  }
];

export const MOCK_EVENTS = [
  {
    id: "ev-01",
    date: "2024-03-12",
    title: "US Core CPI beats expectations",
    themeId: "th-01",
    impact: "high",
    summary: "February Core CPI rose 0.4% MoM, beating the 0.3% estimate. Shelter and auto insurance were primary drivers.",
    source: "Bloomberg",
    url: "#"
  },
  {
    id: "ev-02",
    date: "2024-03-15",
    title: "Fed Chair Powell Speech",
    themeId: "th-01",
    impact: "high",
    summary: "Powell indicated that the committee needs 'greater confidence' before cutting rates, pushing market expectations to July.",
    source: "Federal Reserve",
    url: "#"
  },
  {
    id: "ev-03",
    date: "2024-03-18",
    title: "Houthi attacks target tanker",
    themeId: "th-02",
    impact: "medium",
    summary: "New attack in the Bab el-Mandeb strait forces more shipping companies to reroute around Africa, increasing freight costs.",
    source: "Reuters",
    url: "#"
  }
];

export const MOCK_UPCOMING_EVENTS = [
  {
    id: "ue-01",
    event: "US Core CPI (YoY)",
    country: "USA",
    time: new Date(Date.now() + 15 * 60000).toISOString(),
    volatility: "HIGH",
    previous: "3.1%",
    consensus: "3.2%",
    impact: "High volatility expected in USD and Equities."
  },
  {
    id: "ue-02",
    event: "ECB Interest Rate Decision",
    country: "EU",
    time: new Date(Date.now() + 45 * 60000).toISOString(),
    volatility: "HIGH",
    previous: "4.50%",
    consensus: "4.50%",
    impact: "Crucial for EUR/USD and European Bond yields."
  }
];

export const MOCK_NEWS = [
  {
    id: "news-01",
    title: "NVIDIA surges as AI demand remains insatiable",
    summary: "NVIDIA shares hit new all-time highs as data center revenue projections beat even the most optimistic analyst estimates.",
    source: "Yahoo Finance",
    time: "10 mins ago",
    category: "Technology",
    themeId: "th-03"
  },
  {
    id: "news-02",
    title: "Oil prices stabilize as Middle East tensions simmer",
    summary: "WTI crude holds near $80 as markets balance geopolitical risk premiums against higher-than-expected US inventory builds.",
    source: "Reuters",
    time: "25 mins ago",
    category: "Geopolitics",
    themeId: "th-02"
  },
  {
    id: "news-03",
    title: "Bitcoin breaks $70k as ETF inflows accelerate",
    summary: "The leading cryptocurrency touched record highs today driven by massive institutional buying through spot ETF vehicles.",
    source: "CoinDesk",
    time: "1 hour ago",
    category: "Crypto",
    themeId: null
  }
];

export const MOCK_RISK_CHAIN = {
  trigger: {
    title: "Red Sea Shipping Disruption",
    type: "Geopolitical Event"
  },
  effects: [
    {
      title: "Freight Costs +150%",
      type: "Supply Chain",
      severity: "high"
    },
    {
      title: "Oil Risk Premium +$5",
      type: "Commodities",
      severity: "medium"
    }
  ],
  secondOrder: [
    {
      title: "European Core Goods Inflation",
      type: "Macro",
      severity: "high",
      parents: [0, 1]
    },
    {
      title: "Retail Margin Compression",
      type: "Corporate Earnings",
      severity: "medium",
      parents: [0]
    }
  ],
  assets: [
    { name: "EUR/USD", impact: "Negative", conviction: "High" },
    { name: "European Consumer Discretionary", impact: "Negative", conviction: "Medium" },
    { name: "Global Shipping Equities", impact: "Positive", conviction: "High" }
  ]
};
