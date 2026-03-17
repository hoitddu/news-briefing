import { XMLParser } from "fast-xml-parser";
import { supabase } from "@/lib/supabase";

// 대상 회사 목록
const COMPANIES = ["삼성전자", "현대차", "SK하이닉스"];

// 회사별 최대 기사 수
const MAX_ARTICLES = 3;

// --- 1. 뉴스 수집: Google News RSS ---
async function fetchNews(keyword) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;

  const res = await fetch(url);
  const xml = await res.text();
  const parser = new XMLParser();
  const parsed = parser.parse(xml);

  const items = parsed?.rss?.channel?.item || [];

  // 배열이 아닐 수 있음 (기사 1개인 경우)
  const articleList = Array.isArray(items) ? items : [items];

  return articleList.map((item) => ({
    title: item.title || "",
    link: item.link || "",
  }));
}

// --- 2. 중복 제거: 제목 기준 ---
function removeDuplicates(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    // 제목에서 공백 제거 후 비교
    const key = article.title.replace(/\s/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- 3. 요약 생성: 기사 제목 조합 (규칙 기반) ---
function generateSummary(company, articles) {
  if (articles.length === 0) {
    return `${company} 관련 최신 뉴스가 없습니다.`;
  }

  const titles = articles.map((a) => a.title.split(" - ")[0].trim());
  return `${company} 주요 뉴스: ${titles.join(" / ")}`;
}

// --- 4. 메인 수집 로직 ---
async function collectAndSave() {
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // "2025. 01. 15." → "2025-01-15"
  const dateStr = today
    .replace(/\. /g, "-")
    .replace(".", "")
    .trim();

  const results = [];

  for (const company of COMPANIES) {
    // 수집
    let articles = await fetchNews(company);

    // 중복 제거
    articles = removeDuplicates(articles);

    // 최대 3개
    articles = articles.slice(0, MAX_ARTICLES);

    // 요약 생성
    const summary = generateSummary(company, articles);

    // DB 저장 (upsert: 같은 날짜+회사면 업데이트)
    const { error } = await supabase
      .from("briefings")
      .upsert(
        {
          date: dateStr,
          company,
          summary,
          articles: articles.map((a) => ({
            title: a.title,
            link: a.link,
          })),
        },
        { onConflict: "date,company" }
      );

    if (error) {
      console.error(`[${company}] DB 저장 실패:`, error.message);
    }

    results.push({ company, summary, articleCount: articles.length });
  }

  return results;
}

// --- API 엔드포인트 ---
export async function GET(request) {
  // 간단한 보안: secret 확인
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await collectAndSave();
    return Response.json({ success: true, results });
  } catch (err) {
    console.error("수집 실패:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
