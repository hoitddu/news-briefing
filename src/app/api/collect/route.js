import { XMLParser } from "fast-xml-parser";
import { getSupabaseAdmin } from "@/lib/supabase";

const COMPANIES = ["삼성전자", "현대차", "SK하이닉스"];
const MAX_ARTICLES = 3;

async function fetchNews(keyword) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    keyword
  )}&hl=ko&gl=KR&ceid=KR:ko`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Google News RSS request failed (${response.status})`);
  }

  const xml = await response.text();
  const parser = new XMLParser();
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item || [];
  const articleList = Array.isArray(items) ? items : [items];

  return articleList.map((item) => ({
    title: item.title || "",
    link: item.link || "",
  }));
}

function removeDuplicates(articles) {
  const seen = new Set();

  return articles.filter((article) => {
    const key = article.title.replace(/\s/g, "");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function generateSummary(company, articles) {
  if (articles.length === 0) {
    return `${company} 관련 최신 뉴스가 없습니다.`;
  }

  const titles = articles.map((article) =>
    article.title.split(" - ")[0].trim()
  );

  return `${company} 주요 뉴스: ${titles.join(" / ")}`;
}

function getKoreanDate() {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaTime.getUTCFullYear();
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function collectAndSave() {
  const supabase = getSupabaseAdmin();
  const dateStr = getKoreanDate();
  const results = [];
  const failures = [];

  for (const company of COMPANIES) {
    try {
      let articles = await fetchNews(company);
      articles = removeDuplicates(articles).slice(0, MAX_ARTICLES);

      const summary = generateSummary(company, articles);
      const { error } = await supabase.from("briefings").upsert(
        {
          date: dateStr,
          company,
          summary,
          articles: articles.map((article) => ({
            title: article.title,
            link: article.link,
          })),
        },
        { onConflict: "date,company" }
      );

      if (error) {
        throw error;
      }

      results.push({
        company,
        summary,
        articleCount: articles.length,
      });
    } catch (error) {
      failures.push(`[${company}] ${error.message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join(" | "));
  }

  return results;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.CRON_SECRET) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await collectAndSave();
    return Response.json({ success: true, results });
  } catch (error) {
    console.error("Collect failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
