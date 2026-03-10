// Live financial news via rss2json.com (free, no API key, no CORS issues)
// Sources: Reuters Business, AP Business, MarketWatch, Seeking Alpha

export interface Article {
  title: string;
  description: string;
  url: string;
  source: string;
  category?: string;
}

let _cache: { articles: Article[]; ts: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

const RSS_FEEDS = [
  { url: "https://feeds.reuters.com/reuters/businessNews",       source: "Reuters" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines", source: "MarketWatch" },
  { url: "https://feeds.bloomberg.com/markets/news.rss",         source: "Bloomberg" },
  { url: "https://www.investing.com/rss/news_25.rss",            source: "Investing.com" },
];

const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

export function clearHeadlinesCache() { _cache = null; }

export async function fetchHeadlines(): Promise<Article[]> {
  if (_cache && Date.now() - _cache.ts < CACHE_MS) return _cache.articles;

  const results = await Promise.allSettled(
    RSS_FEEDS.map(feed =>
      fetch(RSS2JSON + encodeURIComponent(feed.url))
        .then(r => r.json())
        .then(data => ({ data, source: feed.source }))
    )
  );

  const seen     = new Set<string>();
  const articles: Article[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const { data, source } = r.value;
    for (const item of (data.items || [])) {
      if (!item.title || !item.link) continue;
      const key = item.title.slice(0, 50).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      articles.push({
        title:       item.title.split(" - ")[0].trim(),
        description: item.description?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
        url:         item.link,
        source,
        category:    "macro",
      });
    }
  }

  // Fallback: if all RSS feeds fail (e.g. CORS on some networks), use saurav static cache
  if (articles.length === 0) {
    const fallbacks = [
      "https://saurav.tech/NewsAPI/top-headlines/category/business/us.json",
      "https://saurav.tech/NewsAPI/top-headlines/category/general/us.json",
    ];
    const fb = await Promise.allSettled(fallbacks.map(u => fetch(u).then(r => r.json())));
    for (const r of fb) {
      if (r.status !== "fulfilled") continue;
      for (const a of (r.value.articles || [])) {
        if (!a.title || !a.url) continue;
        const key = a.title.slice(0, 50).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        articles.push({
          title:       a.title.split(" - ")[0].trim(),
          description: a.description || "",
          url:         a.url,
          source:      a.source?.name || "News",
          category:    "macro",
        });
      }
    }
  }

  _cache = { articles, ts: Date.now() };
  return articles;
}