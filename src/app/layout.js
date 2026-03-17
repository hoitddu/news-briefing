import "./globals.css";

export const metadata = {
  title: "오늘의 뉴스 브리핑",
  description: "삼성전자, 현대차, SK하이닉스 뉴스 브리핑",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
