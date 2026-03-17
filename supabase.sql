-- Supabase SQL Editor에서 실행하세요
CREATE TABLE briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  company TEXT NOT NULL,
  summary TEXT NOT NULL,
  articles JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 같은 날짜 + 같은 회사 중복 방지
CREATE UNIQUE INDEX idx_briefings_date_company ON briefings (date, company);

-- RLS (Row Level Security) 비활성화 - MVP이므로 단순하게
ALTER TABLE briefings DISABLE ROW LEVEL SECURITY;
