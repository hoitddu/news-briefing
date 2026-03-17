import { supabase } from "@/lib/supabase";

// 매 요청마다 최신 데이터 조회 (캐시 안 함)
export const dynamic = "force-dynamic";

async function getTodayBriefings() {
  // 한국 시간 기준 오늘 날짜
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = today
    .replace(/\. /g, "-")
    .replace(".", "")
    .trim();

  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("date", dateStr)
    .order("company");

  if (error) {
    console.error("조회 실패:", error.message);
    return [];
  }

  return data || [];
}

export default async function Home() {
  const briefings = await getTodayBriefings();

  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="container">
      <div className="header">
        <h1>오늘의 뉴스 브리핑</h1>
        <p className="date">{today}</p>
      </div>

      {briefings.length === 0 ? (
        <p className="empty">아직 오늘의 브리핑이 없습니다.</p>
      ) : (
        briefings.map((b) => (
          <div key={b.id} className="card">
            <div className="company-name">{b.company}</div>
            <div className="summary">{b.summary}</div>
            <ul className="article-list">
              {b.articles.map((article, i) => (
                <li key={i}>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
