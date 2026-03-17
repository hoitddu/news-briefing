import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getKoreanDate() {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaTime.getUTCFullYear();
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getTodayBriefings() {
  const supabase = getSupabase();
  const dateStr = getKoreanDate();
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("date", dateStr)
    .order("company");

  if (error) {
    console.error("Failed to load briefings:", error.message);
    return {
      briefings: [],
      error:
        "오늘 브리핑을 불러오지 못했습니다. Supabase 설정과 테이블 권한을 확인하세요.",
    };
  }

  return {
    briefings: data || [],
    error: null,
  };
}

export default async function Home() {
  const { briefings, error } = await getTodayBriefings();
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

      {error ? (
        <p className="error">{error}</p>
      ) : briefings.length === 0 ? (
        <p className="empty">아직 오늘의 브리핑이 없습니다.</p>
      ) : (
        briefings.map((briefing) => (
          <div key={briefing.id} className="card">
            <div className="company-name">{briefing.company}</div>
            <div className="summary">{briefing.summary}</div>
            <ul className="article-list">
              {briefing.articles.map((article, index) => (
                <li key={index}>
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
